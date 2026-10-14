import { version as reactVersion } from "react";
import type { LanguageMeta } from "@/types/execution";

export type PreviewStrategy = NonNullable<LanguageMeta["preview"]>;

/** Escape user code embedded inside an inline <script> block. */
function escapeScript(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

/** Generate a cryptographically secure nonce for CSP script tags. */
function generateNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  // Fallback: use a random hex string
  return Math.random().toString(16).slice(2, 18) + Math.random().toString(16).slice(2, 18);
}

/** Escape user CSS embedded inside an inline <style> block. */
function escapeStyle(code: string): string {
  return code.replace(/<\/style/gi, "<\\/style");
}

function placeholderPage(message: string): string {
  return `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body style="font-family: system-ui, sans-serif; color: #64748b; padding: 24px;">
    ${message}
  </body>
</html>`;
}

function errorPage(message: string): string {
  const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body style="font-family: ui-monospace, monospace; background: #fef2f2; color: #b91c1c; padding: 24px; white-space: pre-wrap;">${safe}</body>
</html>`;
}

function htmlPage(code: string): string {
  if (/<html[\s>]/i.test(code)) return code;
  return `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
${code}
  </body>
</html>`;
}

function cssPage(css: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>CSS Preview</title>
    <style>
${escapeStyle(css)}
    </style>
  </head>
  <body>
    <h1>Hello, world!</h1>
    <p>Edit the CSS to style this preview live.</p>
    <button>Click me</button>
    <div class="card">
      <h2>Card title</h2>
      <p>Card body text.</p>
    </div>
  </body>
</html>`;
}

function scriptPage(js: string): string {
  return `<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body style="margin: 0; font-family: ui-monospace, monospace; font-size: 13px; background: #ffffff; color: #0f172a;">
    <div id="__out" style="padding: 12px;"></div>
    <script>
      (function () {
        var lines = [];
        function esc(s) {
          return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
        }
        function draw() {
          var el = document.getElementById("__out");
          if (!el) return;
          el.innerHTML = lines.length
            ? lines.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join("")
            : '<div style="color: #94a3b8;">No output yet &mdash; use console.log() to print.</div>';
        }
        function fmt(args) {
          return [].map.call(args, function (a) {
            try {
              return typeof a === "object" && a !== null ? JSON.stringify(a) : String(a);
            } catch (e) {
              return String(a);
            }
          }).join(" ");
        }
        console.log = function () { lines.push(fmt(arguments)); draw(); };
        console.error = function () { lines.push("Error: " + fmt(arguments)); draw(); };
        window.onerror = function (msg) { lines.push("Error: " + msg); draw(); };
        draw();
        try {
${escapeScript(js)}
        } catch (e) {
          lines.push("Error: " + ((e && e.message) || e));
          draw();
        }
      })();
    </script>
  </body>
</html>`;
}

function webPage(html: string, css: string): string {
  const styleTag = `\n    <style>\n${escapeStyle(css)}\n    </style>`;
  if (/<\/head\s*>/i.test(html)) {
    return html.replace(/<\/head\s*>/i, `${styleTag}\n  </head>`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}\n  <head>${styleTag}\n  </head>`);
  }
  return `<!DOCTYPE html>
<html>
  <head>${styleTag}
  </head>
  <body>
${html}
  </body>
</html>`;
}

/** Merged HTML+CSS document for Web (multi-file) rooms. */
export function buildWebPreviewHtml(htmlCode: string, cssCode: string): string {
  if (!htmlCode.trim() && !cssCode.trim()) {
    return placeholderPage("Start typing to see a live preview…");
  }
  return webPage(htmlCode, cssCode);
}

async function toPlainJs(
  code: string,
  transforms: ("typescript" | "jsx" | "imports")[],
  production = false
): Promise<string> {
  const { transform } = await import("sucrase");
  return transform(code, { transforms, production }).code;
}

/** Strip TypeScript types so TS snippets can run in the script preview. */
export async function stripTypeScript(code: string): Promise<string> {
  return toPlainJs(code, ["typescript"]);
}

/** Standalone error document for preview failures outside the builders. */
export function previewError(message: string): string {
  return errorPage(message);
}

function hasReactImport(code: string): boolean {
  return /from\s+["']react["']|require\(\s*["']react["']\s*\)/.test(code);
}

function hasCreateRootImport(code: string): boolean {
  return /from\s+["']react-dom\/client["']|require\(\s*["']react-dom\/client["']\s*\)/.test(code);
}

async function reactPage(code: string): Promise<string> {
  let compiled: string;
  try {
    // Keep ESM imports so bare "react" / "react-dom/*" specifiers resolve
    // through the import map below.
    const prelude =
      (hasReactImport(code) ? "" : 'import React from "react";\n') +
      (hasCreateRootImport(code) ? "" : 'import { createRoot } from "react-dom/client";\n');
    // Normalize exports so every shape renders: strip named-export keywords
    // and capture `export default` into a variable we can render.
    // (Import/export statements are only valid at module top level, so the
    // compiled output must NOT be wrapped in a try{} block below.)
    let source = prelude + code;
    // `react-dom/server` is a Node-only build — importing it in the browser
    // preview either 404s on esm.sh or throws at evaluation, which aborts
    // the whole module before our createRoot render runs (blank white
    // preview). Strip it and stub renderToString; the visual preview renders
    // via createRoot, so server rendering is unnecessary here.
    const needsServerStub = /from\s+["']react-dom\/server[^"']*["']/.test(source);
    source = source.replace(
      /^\s*import\s+[^;]*?\bfrom\s+["']react-dom\/server[^"']*["']\s*;?\s*$/gm,
      ""
    );
    source = source.replace(/export\s+default\s+/g, "const __DefaultExport = ");
    source = source.replace(
      /^(\s*)export\s+(?=(async\s+function|function|const|let|var|class))/gm,
      "$1"
    );
    source = source.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");
    source = source.replace(/^\s*export\s*\*[^;]*;?\s*$/gm, "");
    if (needsServerStub) {
      source += `\nfunction renderToString() { return ""; }\n`;
    }
    compiled = await toPlainJs(source, ["jsx"], true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSX compile failed";
    return errorPage(`JSX compile failed: ${message.split("\n")[0]}`);
  }

  // NOTE: `compiled` contains top-level `import` statements, which are a
  // SyntaxError anywhere but the module top level. It must stay outside any
  // try{} / IIFE block — previously it was inside `try {`, so the whole
  // module failed to parse and the preview stayed blank white with no error.

  // Security: pin the exact React version so esm.sh can't silently swap a
  // different major under us (supply-chain mitigation). The nonce below is
  // generated per build and mirrored into the frame's own CSP — module
  // scripts ignore 'unsafe-inline', so without a matching nonce the whole
  // preview stays blank white.
  const REACT_VERSION = "19.3.0";
  const nonce = generateNonce();

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <!-- Security: Restrict this sandbox frame's own CSP -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://esm.sh; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src https://fonts.gstatic.com; connect-src 'none'; object-src 'none'; base-uri 'none';">
    <script type="importmap" nonce="${nonce}">
      {
        "imports": {
          "react": "https://esm.sh/react@${REACT_VERSION}",
          "react-dom/": "https://esm.sh/react-dom@${REACT_VERSION}/"
        }
      }
    </script>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; padding: 16px; }
      #__err:empty { display: none; }
      #__err {
        margin-top: 12px; padding: 12px; border-radius: 8px;
        font-family: ui-monospace, monospace; font-size: 13px; white-space: pre-wrap;
        background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <div id="__err"></div>
    <script type="module" nonce="${nonce}">
      function showError(m) {
        var el = document.getElementById("__err");
        if (el) el.textContent = "Error: " + m;
      }
      window.addEventListener("error", function (e) { showError(e.message || (e.error && e.error.message) || e.error); });
      window.addEventListener("unhandledrejection", function (e) { showError((e.reason && e.reason.message) || e.reason); });
${escapeScript(compiled)}
      try {
        var __Target = (typeof App !== "undefined")
          ? App
          : (typeof __DefaultExport !== "undefined" ? __DefaultExport : null);
        if (__Target) {
          createRoot(document.getElementById("root")).render(React.createElement(__Target));
        } else {
          showError("Define an App component (function App) or a default export to preview it.");
        }
      } catch (e) {
        showError((e && e.message) || e);
      }
    </script>
  </body>
</html>`;
}

/** Build a complete sandboxed preview document for the given strategy + code. */
export async function buildPreviewHtml(
  strategy: PreviewStrategy,
  code: string | { html: string; css: string }
): Promise<string> {
  if (typeof code !== "string") {
    if (!code.html.trim() && !code.css.trim()) {
      return placeholderPage("Start typing to see a live preview…");
    }
    return webPage(code.html, code.css);
  }
  if (!code.trim()) {
    return placeholderPage("Start typing to see a live preview…");
  }
  switch (strategy) {
    case "html":
      return htmlPage(code);
    case "css":
      return cssPage(code);
    case "script":
      return scriptPage(code);
    case "react":
      return reactPage(code);
    case "web":
      return webPage(code, "");
  }
}
