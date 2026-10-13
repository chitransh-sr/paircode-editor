import { getLanguage } from "@/lib/execute/languages";

// Force Node.js runtime for the Prettier dependency
export const runtime = "nodejs";

const PARSER_BY_LANGUAGE: Record<string, "babel" | "typescript"> = {
  javascript: "babel",
  react: "babel",
  typescript: "typescript",
};

export async function POST(request: Request): Promise<Response> {
  let body: { code?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { code, language } = body;

  if (typeof code !== "string" || !code.trim()) {
    return new Response(JSON.stringify({ error: "Code is required" }), { status: 400 });
  }

  const langKey = typeof language === "string" ? language : "";
  const parser = PARSER_BY_LANGUAGE[langKey];
  if (!parser) {
    const label = getLanguage(langKey)?.label || langKey || "this language";
    return new Response(
      JSON.stringify({ error: `Formatting is not supported for ${label} yet` }),
      { status: 400 }
    );
  }

  try {
    const prettier = await import("prettier");
    const [babel, typescript, estree] = await Promise.all([
      import("prettier/plugins/babel"),
      import("prettier/plugins/typescript"),
      import("prettier/plugins/estree"),
    ]);

    const formatted = await prettier.format(code, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prettier plugin types
      parser: parser as any,
      plugins: [babel, typescript, estree],
      tabWidth: 2,
    });

    return new Response(JSON.stringify({ code: formatted }), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Format failed";
    // Prettier errors include code frames — keep only the first line
    const firstLine = message.split("\n")[0].slice(0, 300);
    return new Response(JSON.stringify({ error: firstLine }), { status: 400 });
  }
}
