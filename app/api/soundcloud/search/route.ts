import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/soundcloud/soundcloud";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  
  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }
  
  try {
    const { tracks, hasMore } = await searchTracks(query.trim(), limit, offset);
    return NextResponse.json({ tracks, hasMore, total: tracks.length });
  } catch (err) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    }
    console.error('SoundCloud search API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}