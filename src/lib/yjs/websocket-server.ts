/**
 * Lightweight WebSocket relay server for Yjs collaboration.
 *
 * This server does NOT import yjs/lib0/y-protocols — it simply forwards
 * binary messages between clients in the same room. The Yjs sync protocol
 * (document updates, awareness/cursors) is handled entirely by the
 * client-side WebsocketProvider from y-websocket. This avoids the known
 * lib0 loading crash in Turbopack's server bundle.
 *
 * ── Security Hardening ───────────────────────────────────────────
 * • Message size limits (MAX_MESSAGE_SIZE) prevent memory-exhaustion DoS.
 * • Room name sanitization prevents path traversal / injection.
 * • Per-IP connection limits (MAX_CONNECTIONS_PER_IP) prevent flooding.
 * • Maximum rooms cap (MAX_ROOMS) prevents memory exhaustion.
 * • All messages are bounded; oversized messages are rejected.
 *
 * Why a relay works:
 *  • SyncStep1 from a new client → relayed to existing clients → they reply
 *    with SyncStep2 (their document state) → relayed back to the new client.
 *  • Awareness QueryAwareness → relayed → existing clients reply with their
 *    awareness → relayed back → new client sees remote cursors immediately.
 *  • Text/cursor updates → broadcast to all peers in the room.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";

const WS_PORT = 1234;

/** All connected WebSocket clients, grouped by room name. */
const rooms = new Map<string, Set<WebSocket>>();

/** Track which room each connection belongs to (for cleanup). */
const connToRoom = new Map<WebSocket, string>();

/** Track connections per IP for rate limiting. */
const connByIP = new Map<string, Set<WebSocket>>();

/** Maximum WebSocket message size (1 MB — Yjs updates are typically < 1KB). */
const MAX_MESSAGE_SIZE = 1024 * 1024;

/** Maximum connections per IP address (prevents connection-flooding DoS). */
const MAX_CONNECTIONS_PER_IP = 50;

/** Maximum concurrent rooms (prevents memory exhaustion from room spam). */
const MAX_ROOMS = 1000;

/**
 * Sanitize a room name to prevent injection or path traversal.
 * Room names come from the URL path, so only allow alphanumeric,
 * hyphen, and underscore characters.
 */
function sanitizeRoomName(raw: string): string {
  // Take only the first path segment
  const room = decodeURIComponent(raw.split("/").filter(Boolean)[0] || "");
  // Only allow safe characters; fall back to "default" if invalid
  if (!/^[a-zA-Z0-9_-]+$/.test(room) && room !== "") return "default";
  return room || "default";
}

/** Extract the client's IP address from a WebSocket upgrade request. */
function getConnIP(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return request.socket.remoteAddress || "unknown";
}

/** Broadcast a message to every connection in a room except optionally one. */
function broadcast(room: string, data: Uint8Array, skip?: WebSocket) {
  const conns = rooms.get(room);
  if (!conns) return;
  conns.forEach((conn) => {
    if (conn !== skip && conn.readyState === WebSocket.OPEN) {
      conn.send(data);
    }
  });
}

function setupConnection(conn: WebSocket, room: string) {
  // Join the room
  let conns = rooms.get(room);
  if (!conns) {
    // Enforce max rooms
    if (rooms.size >= MAX_ROOMS) {
      conn.close(1003, "Server at room capacity");
      return;
    }
    conns = new Set();
    rooms.set(room, conns);
  }
  conns.add(conn);
  connToRoom.set(conn, room);

  conn.on("message", (data: Buffer | Uint8Array | ArrayBuffer) => {
    // SECURITY: Reject messages that exceed the size limit
    if (data.byteLength > MAX_MESSAGE_SIZE) {
      conn.close(1008, "Message too large");
      return;
    }

    // Normalize to Uint8Array
    let message: Uint8Array;
    if (data instanceof ArrayBuffer) {
      message = new Uint8Array(data);
    } else if (Buffer.isBuffer(data)) {
      message = new Uint8Array(data);
    } else {
      message = data;
    }

    // Relay the message to all other clients in the same room.
    // The Yjs protocol messages (sync, awareness, queryAwareness) are
    // handled by the receiving clients' WebsocketProvider.
    broadcast(room, message, conn);
  });

  conn.on("close", () => {
    conns.delete(conn);
    connToRoom.delete(conn);
    // Clean up empty rooms
    if (conns.size === 0) {
      rooms.delete(room);
    }
  });

  conn.on("error", (err: Error) => {
    console.error("WebSocket connection error:", err);
  });
}

let wss: WebSocketServer | null = null;
let portTaken = false;

// Persist server state across HMR re-evaluations (important for dev mode).
if (typeof globalThis !== "undefined") {
  const g = globalThis as typeof globalThis & {
    __paircode_wsServer?: WebSocketServer | null;
    __paircode_portTaken?: boolean;
  };
  if (g.__paircode_wsServer) wss = g.__paircode_wsServer;
  if (g.__paircode_portTaken) portTaken = g.__paircode_portTaken;
}

/** Start the singleton WebSocket server (idempotent). */
export function startWebSocketServer(): WebSocketServer | null {
  if (wss) return wss;
  if (portTaken) return null;

  try {
    const server = new WebSocketServer({ port: WS_PORT });

    wss = server;
    // Persist on globalThis for HMR-safe restarts
    if (typeof globalThis !== "undefined") {
      const g = globalThis as typeof globalThis & {
        __paircode_wsServer?: WebSocketServer | null;
        __paircode_portTaken?: boolean;
      };
      g.__paircode_wsServer = server;
    }

    server.on("connection", (conn: WebSocket, request: IncomingMessage) => {
      const url = request.url || "";
      // SECURITY: Sanitize room name to prevent injection
      const room = sanitizeRoomName(url);

      // SECURITY: Enforce per-IP connection limits
      const clientIp = getConnIP(request);
      let ipConns = connByIP.get(clientIp);
      if (!ipConns) {
        ipConns = new Set();
        connByIP.set(clientIp, ipConns);
      }
      if (ipConns.size >= MAX_CONNECTIONS_PER_IP) {
        conn.close(1008, "Too many connections from this IP");
        return;
      }
      ipConns.add(conn);

      setupConnection(conn, room);

      conn.on("close", () => {
        ipConns?.delete(conn);
        if (ipConns && ipConns.size === 0) {
          connByIP.delete(clientIp);
        }
      });
    });

    server.on("listening", () => {
      console.info(`[yjs] WebSocket server listening on port ${WS_PORT}`);
    });

    server.on("error", (err: Error & { code?: string }) => {
      if (err.code === "EADDRINUSE") {
        portTaken = true;
        wss = null;
        if (typeof globalThis !== "undefined") {
          const g = globalThis as typeof globalThis & {
            __paircode_wsServer?: WebSocketServer | null;
            __paircode_portTaken?: boolean;
          };
          g.__paircode_portTaken = true;
          g.__paircode_wsServer = null;
        }
        console.info(
          `[yjs] WebSocket server already running on port ${WS_PORT}`
        );
        return;
      }
      console.error("WebSocket server error:", err);
    });

    return server;
  } catch (_err) {
    portTaken = true;
    wss = null;
    return null;
  }
}