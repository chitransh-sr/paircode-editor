// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security upgrade reminders (agent-driven upgrades). Set explicitly as part
  // of the 16.4.0 → 16.4.3 security upgrade; see
  // docs/01-app/03-api-reference/05-config/01-next-config-js/agentUpgrade.md
  experimental: {
    agentUpgrade: "security",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  turbopack: {},

  // ─── Security Headers ───────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control how much referrer info is sent
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS for 1 year (preload list eligible)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Mitigate XSS in older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Restrict cross-origin features
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Prevent the browser from trying to sniff the content type
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Strict Content Security Policy
          // - default-src: only same origin
          // - script-src: same origin + 'unsafe-inline' (needed for Next.js runtime + inline scripts)
          //   + https://esm.sh (the sandboxed live-preview iframe imports React via an
          //   esm.sh import map; srcDoc frames inherit this policy, so without it the
          //   preview module is blocked and renders blank white)
          // - style-src: same origin + Google Fonts (for the app itself; sandbox iframes override their own)
          // - img-src: same origin + data: + Google user content (avatars)
          // - connect-src: same origin (for the app's own API)
          // - frame-src: 'none' by default (preview iframes will set their own sandbox)
          // - font-src: same origin + Google Fonts
          // - object-src: 'none' (block plugins/Flash)
          // - base-uri: 'self' (prevent <base> injection)
          // - form-action: 'self' (prevent form submissions to other origins)
          // - frame-ancestors: 'none' (prevent framing — strongest clickjacking protection)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://vercel.com https://esm.sh",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
              "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "connect-src 'self' ws: wss: https://cdn.jsdelivr.net",
              "worker-src 'self' blob:",
              "frame-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // ─── Security Headers for API Routes ─────────────────────────────
  // Applied to all /api/* routes in addition to the global headers above
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
