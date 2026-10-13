import { createRoomRecord, listRoomRecords } from "@/lib/rooms/store";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { language = "javascript", theme = "vs-dark" } = body;

    return Response.json(createRoomRecord({ language, theme }), { status: 201 });
  } catch (error) {
    console.error("Server error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);

  return Response.json(listRoomRecords(limit));
}
