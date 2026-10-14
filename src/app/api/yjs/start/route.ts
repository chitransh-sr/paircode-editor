/**
 * API route that lazily starts the Yjs WebSocket server on first request.
 * Uses globalThis to persist the server across module re-evaluations
 * (important for Next.js dev mode with Turbopack HMR).
 *
 * Call GET /api/yjs/start once on app load to ensure the server is running.
 */
import { startWebSocketServer } from "@/lib/yjs/websocket-server";

export const runtime = "nodejs";

export async function GET(_request: Request) {
  const wss = startWebSocketServer();
  if (!wss) {
    // Port already in use — server is already running from another request.
    return new Response(
      JSON.stringify({ status: "already_running", port: 1234 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({ status: "started", port: 1234 }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
