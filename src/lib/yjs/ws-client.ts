/**
 * Client-safe helper to compute the WebSocket server origin for a given room.
 * Only uses `window` access (no Node imports), so it can be bundled for
 * the browser without pulling in `ws` or other server-only modules.
 *
 * Note: y-websocket's WebsocketProvider appends '/' + roomname to the
 * serverUrl, so getWsUrl must return just the origin (host) without a path.
 */

const WS_PORT = 1234;

/** Return the WebSocket URL origin (without room path) for the browser client. */
export function getWsUrl(_roomId?: string): string {
  // In production, override via env var (e.g. wss://api.myapp.com).
  const envOrigin = process.env.NEXT_PUBLIC_WS_ORIGIN;
  if (envOrigin) {
    return envOrigin;
  }

  // In development, the WS server runs on its own port (1234) separate
  // from the Next.js dev server (3000). Build the URL from the current
  // hostname but swap in the WS port for localhost/127.0.0.1.
  if (typeof window !== "undefined" && window.location) {
    const loc = window.location;
    const proto = loc.protocol === "https:" ? "wss:" : "ws:";
    const host =
      loc.hostname === "localhost" || loc.hostname === "127.0.0.1"
        ? `${loc.hostname}:${WS_PORT}`
        : loc.host;
    return `${proto}//${host}`;
  }

  // SSR fallback (shouldn't be reached by client components).
  return `ws://localhost:${WS_PORT}`;
}
