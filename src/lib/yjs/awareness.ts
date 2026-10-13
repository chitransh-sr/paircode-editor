import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import type { AwarenessState, UserPresence } from "@/types/presence";

export { Awareness };
export type { AwarenessState };

export function createAwareness(doc: Y.Doc): Awareness {
  return new Awareness(doc);
}

export function setAwarenessState(awareness: Awareness, state: AwarenessState) {
  awareness.setLocalState(state);
}

export function getAwarenessStates(awareness: Awareness): Map<number, AwarenessState> {
  return awareness.getStates() as Map<number, AwarenessState>;
}

export function buildPresenceFromAwareness(
  awareness: Awareness,
  currentClientId: number,
  userName: string,
  userColor: string
): UserPresence[] {
  const states = getAwarenessStates(awareness);
  const users: UserPresence[] = [];

  states.forEach((state, clientId) => {
    if (clientId === currentClientId && !state.user) return;

    const user: UserPresence = {
      id: state.user?.id || `anon-${clientId}`,
      name: state.user?.name || userName,
      color: state.user?.color || userColor,
      cursor: state.cursor,
      selection: state.selection,
      lastActive: new Date().toISOString(),
    };

    users.push(user);
  });

  return users;
}

export function buildLocalAwarenessState(
  clientId: number,
  name: string,
  color: string
): AwarenessState {
  return {
    user: {
      id: clientId.toString(),
      name,
      color,
    },
  };
}
