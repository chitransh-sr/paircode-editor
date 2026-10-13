export interface Room {
  id: string;
  language: string;
  theme: string;
  created_at: string;
  expires_at: string;
  created_by: string | null;
  is_read_only: boolean;
}

export interface CreateRoomInput {
  language?: string;
  theme?: string;
}

export interface UpdateRoomInput {
  language?: string;
  theme?: string;
  is_read_only?: boolean;
}
