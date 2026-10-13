// Snapshot history is kept in memory only for the "Saved" acknowledgement —
// there is no snapshot browser UI, so persistence isn't needed.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { code, yjs_state } = await request.json();

    const snapshot = {
      id: `snapshot-${Date.now()}`,
      room_id: id,
      yjs_state: yjs_state || null,
      code: code || "",
      created_at: new Date().toISOString(),
    };
    return Response.json(snapshot, { status: 201 });
  } catch (error) {
    console.error("Server error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json([]);
}
