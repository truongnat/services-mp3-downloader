import { NextRequest, NextResponse } from "next/server";
import { resolvePlaylist } from "@/lib/soundcloud/soundcloud";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const maxTracks = parseInt(req.nextUrl.searchParams.get("maxTracks") || "500");
  
  if (!url) {
    return NextResponse.json({ error: "Missing playlist URL" }, { status: 400 });
  }
  
  try {
    const { playlistInfo, tracks } = await resolvePlaylist(url, maxTracks);
    return NextResponse.json({ playlistInfo, tracks });
  } catch (err) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    }
    console.error('SoundCloud playlist API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}