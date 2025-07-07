import { NextRequest, NextResponse } from "next/server";
import { resolvePlaylist } from "@/lib/soundcloud/soundcloud";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const maxTracksParam = req.nextUrl.searchParams.get("maxTracks");
  const maxTracks = maxTracksParam ? parseInt(maxTracksParam, 10) : 500;

  if (!url) {
    return NextResponse.json({ error: "Missing playlist URL" }, { status: 400 });
  }

  if (maxTracks < 1 || maxTracks > 1000) {
    return NextResponse.json({ error: "maxTracks must be between 1 and 1000" }, { status: 400 });
  }

  try {
    const { playlistInfo, tracks } = await resolvePlaylist(url, maxTracks);
    return NextResponse.json({
      playlistInfo,
      tracks,
      meta: {
        requestedMaxTracks: maxTracks,
        actualTracksReturned: tracks.length,
        totalTracksInPlaylist: playlistInfo.tracksCount
      }
    });
  } catch (err) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
