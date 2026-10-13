import { getRoomRecord, updateRoomRecord, deleteRoomRecord } from "@/lib/rooms/store";
import type { UpdateRoomInput } from "@/types/room";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return Response.json(getRoomRecord(id));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    const updates: UpdateRoomInput = {};
    if (body.language !== undefined) updates.language = body.language;
    if (body.theme !== undefined) updates.theme = body.theme;
    if (body.is_read_only !== undefined) updates.is_read_only = body.is_read_only;

    return Response.json(updateRoomRecord(id, updates));
  } catch (error) {
    console.error("Server error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteRoomRecord(id);
  return Response.json({ success: true });
}
