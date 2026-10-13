export interface CursorPosition {
  line: number;
  ch: number;
}

export interface Selection {
  anchor: CursorPosition;
  head: CursorPosition;
}

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  selection?: Selection;
  lastActive: string;
}

export interface AwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
  };
  cursor?: CursorPosition;
  selection?: Selection;
}
