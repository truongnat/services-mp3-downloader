import { NextRequest, NextResponse } from "next/server";
import { getYouTubeVideoInfo } from "@/lib/youtube/ytdl-downloader";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const videoUrl = req.nextUrl.searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json({ error: "Missing video URL" }, { status: 400 });
  }

  try {
    console.log(`[YouTube ytdl-core] Getting video info: ${videoUrl}`);

    const videoInfo = await getYouTubeVideoInfo(videoUrl);
    
    console.log(`[YouTube ytdl-core] Video info retrieved: ${videoInfo.title}`);

    return NextResponse.json({
      success: true,
      data: videoInfo
    });

  } catch (error) {
    console.error('[YouTube ytdl-core] Info error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific error cases
    if (errorMessage.includes('Video unavailable')) {
      return NextResponse.json({
        error: "Video is unavailable or has been removed",
        code: "video_unavailable"
      }, { status: 404 });
    }
    
    if (errorMessage.includes('Private video')) {
      return NextResponse.json({
        error: "Private videos cannot be accessed",
        code: "private_video"
      }, { status: 403 });
    }
    
    if (errorMessage.includes('radio/mix')) {
      return NextResponse.json({
        error: errorMessage,
        code: "unsupported_playlist"
      }, { status: 400 });
    }
    
    if (errorMessage.includes('Invalid YouTube URL')) {
      return NextResponse.json({
        error: "Invalid YouTube URL provided",
        code: "invalid_url"
      }, { status: 400 });
    }

    return NextResponse.json({
      error: "Failed to get video information",
      details: errorMessage,
      code: "info_error"
    }, { status: 500 });
  }
}