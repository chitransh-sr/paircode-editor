import * as Y from "yjs";
import type { Room } from "@/types/room";

export function createYjsDoc(): Y.Doc {
  return new Y.Doc();
}

export function getText(doc: Y.Doc): Y.Text {
  return doc.getText("monaco");
}

export function getRoomSettings(doc: Y.Doc): Y.Map<Room> {
  return doc.getMap("room-settings");
}

export { Y };
