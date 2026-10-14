export interface Room {
  id: string;
  language: string;
  theme: string;
  created_at: string;
  expires_at: string;
  created_by: string | null;
  is_read_only: boolean;
  /** Whether this room requires a password to join. */
  is_private: boolean;
  /** Hashed password — never sent to the client. */
  password_hash?: string;
}

export interface CreateRoomInput {
  language?: string;
  theme?: string;
  roomName?: string;
  /** Optional password for private/interview rooms. */
  password?: string;
  /** Whether the room is password-protected (interview mode). */
  is_private?: boolean;
}

export interface UpdateRoomInput {
  language?: string;
  theme?: string;
  is_read_only?: boolean;
}
