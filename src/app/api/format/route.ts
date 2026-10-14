import { getLanguage } from "@/lib/execute/languages";
import { withSecurityHeaders } from "@/lib/security/headers";
import { executeRateLimiter } from "@/lib/security/rate-limit";

// Force Node.js runtime for the Prettier dependency
export const runtime = "nodejs";

/** Security: Maximum code length for formatting. */
const MAX_CODE_LENGTH = 50_000; // 50KB

const PARSER_BY_LANGUAGE: Record<string, "babel" | "typescript"> = {
  javascript: "babel",
  react: "babel",
  typescript: "typescript",
};

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "format-api";
}

export async function POST(request: Request): Promise<Response> {
  // Rate limit
  const clientIp = getClientIp(request);
  const rateCheck = executeRateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    return withSecurityHeaders(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)),
        },
      })
    );
  }

  let body: { code?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return withSecurityHeaders(
      new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
    );
  }

  const { code, language } = body;

  if (typeof code !== "string" || !code.trim()) {
    return withSecurityHeaders(
      new Response(JSON.stringify({ error: "Code is required" }), { status: 400 })
    );
  }

  // SECURITY: Enforce maximum code length
  if (code.length > MAX_CODE_LENGTH) {
    return withSecurityHeaders(
      new Response(JSON.stringify({ error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` }), { status: 413 })
    );
  }

  const langKey = typeof language === "string" ? language : "";
  const parser = PARSER_BY_LANGUAGE[langKey];
  if (!parser) {
    const label = getLanguage(langKey)?.label || langKey || "this language";
    return withSecurityHeaders(
      new Response(
        JSON.stringify({ error: `Formatting is not supported for ${label} yet` }),
        { status: 400 }
      )
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

    return withSecurityHeaders(
      new Response(JSON.stringify({ code: formatted }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": String(rateCheck.remaining),
        },
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Format failed";
    // Prettier errors include code frames — keep only the first line
    const firstLine = message.split("\n")[0].slice(0, 300);
    return withSecurityHeaders(
      new Response(JSON.stringify({ error: firstLine }), { status: 400 })
    );
  }
}
