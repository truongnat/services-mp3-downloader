import { NextRequest, NextResponse } from "next/server";
import { resolveTrack } from "@/lib/soundcloud/soundcloud";

export const runtime = "nodejs";

// Helper function to sanitize filename
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

export async function GET(req: NextRequest) {
  const trackUrl = req.nextUrl.searchParams.get("url");
  const rawFilename = req.nextUrl.searchParams.get("filename");

  if (!trackUrl) {
    return NextResponse.json({ error: "Missing track URL" }, { status: 400 });
  }

  try {
    console.log(`[SoundCloud Download] Starting download: ${trackUrl}`);

    // Get track info with stream URL
    const track = await resolveTrack(trackUrl);
    
    if (!track || !track.streamUrl) {
      return NextResponse.json({ 
        error: "No stream URL available for this track",
        code: "no_stream_url"
      }, { status: 400 });
    }

    console.log(`[SoundCloud Download] Track info: ${track.title} by ${track.artist}`);
    console.log(`[SoundCloud Download] Stream URL: ${track.streamUrl}`);

    // Fetch the audio stream from SoundCloud
    const audioResponse = await fetch(track.streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'audio/*,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://soundcloud.com/',
      }
    });

    if (!audioResponse.ok) {
      console.error(`[SoundCloud Download] Audio fetch failed: ${audioResponse.status} ${audioResponse.statusText}`);
      return NextResponse.json({ 
        error: `Failed to fetch audio: ${audioResponse.statusText}`,
        code: "audio_fetch_failed"
      }, { status: audioResponse.status });
    }

    // Generate filename
    const filename = rawFilename || sanitizeFilename(`${track.title}.mp3`);

    // Set up response headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Cache-Control', 'no-cache');
    
    // Copy content length if available
    const contentLength = audioResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    console.log(`[SoundCloud Download] Streaming audio file: ${filename}`);

    // Stream the audio data directly to the client
    return new NextResponse(audioResponse.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('[SoundCloud Download] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      error: "Failed to download track",
      details: errorMessage,
      code: "download_error"
    }, { status: 500 });
  }
}