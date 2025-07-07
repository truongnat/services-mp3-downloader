import { NextRequest, NextResponse } from "next/server";
import { createPlaylistJob } from "@/lib/youtube/youtube-playlist-job";

export const runtime = "nodejs";

// Utility function to extract playlist ID from YouTube URL
function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
}

// Start a new playlist processing job
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: "Missing playlist URL" }, { status: 400 });
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return NextResponse.json({ error: "Invalid YouTube playlist URL" }, { status: 400 });
    }

    // Create and start playlist job
    const jobId = await createPlaylistJob({ url });

    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Playlist processing job created'
    });

  } catch (error) {
    console.error('Error starting playlist job:', error);
    return NextResponse.json(
      { error: 'Failed to start playlist processing job' }, 
      { status: 500 }
    );
  }
}
