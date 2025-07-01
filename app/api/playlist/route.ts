import { NextRequest, NextResponse } from "next/server";
import { resolvePlaylist } from "@/lib/soundcloud";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Thiếu URL playlist" }, { status: 400 });
  }
  try {
    const { playlistInfo, tracks } = await resolvePlaylist(url);
    return NextResponse.json({ playlistInfo, tracks });
  } catch (err) {
    let message = "Lỗi không xác định";
    if (err instanceof Error) {
      message = err.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
