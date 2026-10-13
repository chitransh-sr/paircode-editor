import type { ExecutionResult } from "@/types/execution";

// Force Node.js runtime for child_process access
export const runtime = "nodejs";

// Map language IDs to file extensions
const LANGUAGE_EXTENSIONS: Record<number, string> = {
  63: "js",
  74: "ts",
  100: "jsx",
  71: "py",
  60: "go",
  73: "rs",
  62: "java",
  54: "cpp",
  50: "c",
  72: "rb",
  68: "php",
};

// Map language IDs to interpreter/runtime commands (interpreted only;
// compiled languages and special cases branch to dedicated handlers above)
const LANGUAGE_RUNTIMES: Record<number, { cmd: string; args: string[]; usesFile: boolean }> = {
  63: { cmd: "node", args: ["--input-type=module"], usesFile: true },
  71: { cmd: "python3", args: [], usesFile: true },
  60: { cmd: "go", args: ["run"], usesFile: true },
  72: { cmd: "ruby", args: [], usesFile: true },
  68: { cmd: "php", args: ["-r"], usesFile: false },
};

/** Shape of errors thrown by execFile/promisify. */
interface ExecError {
  stdout?: string;
  stderr?: string;
  code?: number;
  signal?: string;
  killed?: boolean;
  message?: string;
}

/** Recursively remove a directory (best-effort, cross-platform). */
async function removeDir(dirPath: string): Promise<void> {
  const { rm } = await import("fs/promises");
  await rm(dirPath, { recursive: true, force: true });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { code, languageId, stdin } = await request.json();

    if (!code || !languageId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Code and languageId are required",
        } as ExecutionResult),
        { status: 400 }
      );
    }

    // Render-only languages (HTML/CSS) have no compiler — use Preview instead
    if (languageId === 101 || languageId === 102) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "HTML and CSS can't be executed — open the Preview tab instead",
        } as ExecutionResult),
        { status: 400 }
      );
    }

    const result = await executeCodeLocally(code, languageId, stdin || "");

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("Execution error:", error);
    const result: ExecutionResult = {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
    };
    return new Response(JSON.stringify(result), { status: 500 });
  }
}

async function executeCodeLocally(
  code: string,
  languageId: number,
  stdin: string
): Promise<ExecutionResult> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { writeFile, mkdir } = await import("fs/promises");

  const execFileAsync = promisify(execFile);
  const startTime = Date.now();
  const timeout = 5000;
  const maxBuffer = 1024 * 1024; // 1MB

  // Helper to run a command with timeout
  const runCommand = async (
    cmd: string,
    args: string[],
    input: string = stdin,
    cwd?: string
  ) => {
    return await execFileAsync(cmd, args, {
      timeout,
      maxBuffer,
      input,
      cwd,
      killSignal: "SIGKILL" as const,
    } as Record<string, unknown>);
  };

  const execDir = `/tmp/code_exec_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    await mkdir(execDir, { recursive: true });

    // Special handling per language
    if (languageId === 74) {
      return await executeTypeScript(code, stdin, execFileAsync, execDir, startTime);
    }

    if (languageId === 100) {
      return await executeJsx(code, stdin, execDir, startTime);
    }

    if (languageId === 62) {
      return await executeJava(code, stdin, execFileAsync, execDir, startTime);
    }

    if (languageId === 73 || languageId === 50 || languageId === 54) {
      return await executeCompiled(code, languageId, stdin, execDir, startTime);
    }

    const ext = LANGUAGE_EXTENSIONS[languageId] || "txt";
    const fileName = `${execDir}/code.${ext}`;

    const runtime = LANGUAGE_RUNTIMES[languageId];
    if (!runtime) {
      return {
        success: false,
        error: `Language with ID ${languageId} is not supported for execution`,
      };
    }

    // Write the code to file
    await writeFile(fileName, code, "utf-8");

    if (runtime.usesFile) {
      const { stdout, stderr } = await runCommand(runtime.cmd, [...runtime.args, fileName], stdin, execDir);
      return {
        success: true,
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
        exit_code: 0,
        execution_time: (Date.now() - startTime) / 1000,
      };
    } else {
      // For PHP -r mode (strip any <?php ... ?> tags from the snippet)
      const phpCode = code
        .replace(/^\s*<\?php\s?/, "")
        .replace(/\s*\?>\s*$/, "");
      const { stdout, stderr } = await runCommand(runtime.cmd, [...runtime.args, phpCode], stdin);
      return {
        success: true,
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
        exit_code: 0,
        execution_time: (Date.now() - startTime) / 1000,
      };
    }
  } catch (error: unknown) {
    const errMsg = (error as Record<string, unknown>) || {};
    const executionTime = (Date.now() - startTime) / 1000;

    // For timeout (process killed by SIGKILL)
    if (errMsg.signal === "SIGKILL" || errMsg.killed) {
      return {
        success: true,
        stdout: String((error as ExecError).stdout || ""),
        stderr: String((error as ExecError).stderr || "Execution timed out (5s limit)"),
        exit_code: 124,
        execution_time: executionTime,
      };
    }

    const exitCode =
      typeof (error as ExecError).code === "number" ? (error as ExecError).code as number : 1;
    return {
      success: true,
      stdout: String((error as ExecError).stdout || ""),
      stderr: String((error as ExecError).stderr || (error as Error)?.message || ""),
      exit_code: exitCode,
      execution_time: executionTime,
    };
  } finally {
    // Cleanup temp directory (best-effort)
    try {
      await removeDir(execDir);
    } catch {
      // ignore cleanup errors
    }
  }
}

/** Compile React JSX with Sucrase, then run the output with Node. */
async function executeJsx(
  code: string,
  stdin: string,
  execDir: string,
  startTime: number
): Promise<ExecutionResult> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { writeFile } = await import("fs/promises");
  const { join } = await import("path");
  const execFileAsync = promisify(execFile);

  const run = async (stdout = "", stderr = "", exit_code = 0) => ({
    success: true as const,
    stdout: String(stdout),
    stderr: String(stderr),
    exit_code,
    execution_time: (Date.now() - startTime) / 1000,
  });

  // Transpile JSX (and ESM import syntax) to plain CommonJS
  let compiled: string;
  try {
    const { transform } = await import("sucrase");
    // Sucrase emits React.createElement calls, so ensure React is in scope
    // even when the snippet uses JSX without importing it.
    const needsReact =
      !/from\s+["']react["']|require\(\s*["']react["']\s*\)/.test(code);
    const source = needsReact ? `import React from "react";\n${code}` : code;
    compiled = transform(source, { transforms: ["jsx", "imports"] }).code;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? `JSX compile failed: ${error.message}`
          : "JSX compile failed",
    };
  }

  const fileName = join(execDir, "code.compiled.cjs");
  await writeFile(fileName, compiled, "utf-8");

  try {
    const { stdout, stderr } = await execFileAsync("node", [fileName], {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      input: stdin,
      cwd: execDir,
      killSignal: "SIGKILL" as const,
      // Let `require("react")` / `require("react-dom/server")` resolve to
      // the project's own node_modules from the temp exec dir.
      env: {
        ...process.env,
        NODE_ENV: "production",
        NODE_PATH: join(process.cwd(), "node_modules"),
      },
    } as Record<string, unknown>);
    return run(stdout, stderr, 0);
  } catch (error: unknown) {
    const err = error as ExecError;
    if (err.signal === "SIGKILL" || err.killed) {
      return run(
        err.stdout || "",
        err.stderr || "Execution timed out (5s limit)",
        124
      );
    }
    return run(
      err.stdout || "",
      err.stderr || (error as Error)?.message || "JSX execution failed",
      err.code || 1
    );
  }
}

const COMPILED_LANGUAGES: Record<number, { cmd: string; ext: string }> = {
  73: { cmd: "rustc", ext: "rs" },
  50: { cmd: "gcc", ext: "c" },
  54: { cmd: "g++", ext: "cpp" },
};

/** Compile C / C++ / Rust to a unique binary inside the exec dir, then run it. */
async function executeCompiled(
  code: string,
  languageId: number,
  stdin: string,
  execDir: string,
  startTime: number
): Promise<ExecutionResult> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { writeFile } = await import("fs/promises");
  const { join } = await import("path");
  const execFileAsync = promisify(execFile);

  const meta = COMPILED_LANGUAGES[languageId];
  const finish = (stdout = "", stderr = "", exit_code = 0) => ({
    success: true as const,
    stdout: String(stdout),
    stderr: String(stderr),
    exit_code,
    execution_time: (Date.now() - startTime) / 1000,
  });

  const fileName = join(execDir, `code.${meta.ext}`);
  const binary = join(execDir, "program");
  await writeFile(fileName, code, "utf-8");

  try {
    await execFileAsync(meta.cmd, ["-o", binary, fileName], {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      cwd: execDir,
    });
  } catch (error: unknown) {
    const err = error as ExecError;
    const exitCode = typeof err.code === "number" ? err.code : 1;
    return finish(
      err.stdout || "",
      err.stderr || (error as Error)?.message || "Compilation failed",
      exitCode
    );
  }

  try {
    const { stdout, stderr } = await execFileAsync(binary, [], {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      input: stdin,
      cwd: execDir,
      killSignal: "SIGKILL" as const,
    } as Record<string, unknown>) as { stdout: string; stderr: string };
    return finish(stdout, stderr, 0);
  } catch (error: unknown) {
    const err = error as ExecError;
    if (err.signal === "SIGKILL" || err.killed) {
      return finish(err.stdout || "", err.stderr || "Execution timed out (5s limit)", 124);
    }
    return finish(
      err.stdout || "",
      err.stderr || (error as Error)?.message || "Execution failed",
      err.code || 1
    );
  }
}

/** Transpile TypeScript with Sucrase (no ts-node needed), then run with Node. */
async function executeTypeScript(
  code: string,
  stdin: string,
  execFileAsync: (cmd: string, args: string[], opts?: Record<string, unknown>) => Promise<{ stdout: string; stderr: string }>,
  execDir: string,
  startTime: number
): Promise<ExecutionResult> {
  const { writeFile } = await import("fs/promises");
  const { join } = await import("path");

  let compiled: string;
  try {
    const { transform } = await import("sucrase");
    compiled = transform(code, { transforms: ["typescript", "imports"] }).code;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? `TypeScript compile failed: ${error.message}`
          : "TypeScript compile failed",
    };
  }

  const fileName = join(execDir, "code.compiled.cjs");
  await writeFile(fileName, compiled, "utf-8");

  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [fileName],
      {
        timeout: 5000,
        maxBuffer: 1024 * 1024,
        input: stdin,
        cwd: execDir,
        killSignal: "SIGKILL",
      }
    );

    return {
      success: true,
      stdout: String(stdout || ""),
      stderr: String(stderr || ""),
      exit_code: 0,
      execution_time: (Date.now() - startTime) / 1000,
    };
  } catch (error: unknown) {
    const err = error as ExecError;
    if (err.signal === "SIGKILL" || err.killed) {
      return {
        success: true,
        stdout: String(err.stdout || ""),
        stderr: String(err.stderr || "Execution timed out (5s limit)"),
        exit_code: 124,
        execution_time: (Date.now() - startTime) / 1000,
      };
    }
    return {
      success: true,
      stdout: String(err.stdout || ""),
      stderr: String(err.stderr || (error as Error)?.message || "TypeScript execution failed"),
      exit_code: err.code || 1,
      execution_time: (Date.now() - startTime) / 1000,
    };
  }
}

async function executeJava(
  code: string,
  stdin: string,
  execFileAsync: (cmd: string, args: string[], opts?: Record<string, unknown>) => Promise<{ stdout: string; stderr: string }>,
  execDir: string,
  startTime: number
): Promise<ExecutionResult> {
  const { writeFile } = await import("fs/promises");

  // Extract class name from code
  const classNameMatch = code.match(/class\s+(\w+)/);
  const className = classNameMatch ? classNameMatch[1] : "Main";
  const fileName = `${execDir}/${className}.java`;

  await writeFile(fileName, code, "utf-8");

  try {
    // Compile
    await execFileAsync("javac", [fileName, "-d", execDir], {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      cwd: execDir,
    });

    // Run
    const { stdout, stderr } = await execFileAsync(
      "java",
      ["-cp", execDir, className],
      {
        timeout: 5000,
        maxBuffer: 1024 * 1024,
        input: stdin,
        cwd: execDir,
      }
    );

    return {
      success: true,
      stdout: String(stdout || ""),
      stderr: String(stderr || ""),
      exit_code: 0,
      execution_time: (Date.now() - startTime) / 1000,
    };
  } catch (error: unknown) {
    return {
      success: true,
      stdout: String((error as ExecError).stdout || ""),
      stderr: String((error as ExecError).stderr || (error as Error)?.message || "Java execution failed"),
      exit_code: (error as ExecError).code || 1,
      execution_time: (Date.now() - startTime) / 1000,
    };
  }
}
