/**
 * Lightweight WebSocket relay server for Yjs collaboration.
 *
 * This server does NOT import yjs/lib0/y-protocols — it simply forwards
 * binary messages between clients in the same room. The Yjs sync protocol
 * (document updates, awareness/cursors) is handled entirely by the
 * client-side WebsocketProvider from y-websocket. This avoids the known
 * lib0 loading crash in Turbopack's server bundle.
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
    conns = new Set();
    rooms.set(room, conns);
  }
  conns.add(conn);
  connToRoom.set(conn, room);

  conn.on("message", (data: Buffer | Uint8Array | ArrayBuffer) => {
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
      const room = decodeURIComponent(
        url.split("/").filter(Boolean)[0] || "default"
      );
      setupConnection(conn, room);
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
