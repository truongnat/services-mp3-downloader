import { NextRequest, NextResponse } from "next/server";
import { 
  downloadYouTubeAudio, 
  getYouTubeVideoInfo, 
  convertToMp3,
  convertToMp3WithSmartFallback 
} from "@/lib/youtube/ytdl-downloader";

export const runtime = "nodejs";

// Helper function to sanitize filename
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

export async function GET(req: NextRequest) {
  const videoUrl = req.nextUrl.searchParams.get("url");
  const rawFilename = req.nextUrl.searchParams.get("filename");
  const format = req.nextUrl.searchParams.get("format") || "mp3";
  const quality = req.nextUrl.searchParams.get("quality") || "highestaudio";
  const skipConversion = req.nextUrl.searchParams.get("skipConversion") === "true";
  const timeout = parseInt(req.nextUrl.searchParams.get("timeout") || "30000");

  if (!videoUrl) {
    return NextResponse.json({ error: "Missing video URL" }, { status: 400 });
  }

  try {
    console.log(`[YouTube ytdl-core] Starting download: ${videoUrl}`);

    // Get video info first
    const videoInfo = await getYouTubeVideoInfo(videoUrl);
    
    console.log(`[YouTube ytdl-core] Video info: ${videoInfo.title} by ${videoInfo.artist}`);

    // Download audio stream
    const downloadResult = await downloadYouTubeAudio({
      url: videoUrl,
      quality: quality as any,
      format: format as any,
      filter: 'audioonly'
    });

    if (!downloadResult.success || !downloadResult.stream) {
      return NextResponse.json({ 
        error: downloadResult.error || "Failed to get audio stream",
        code: "download_failed"
      }, { status: 400 });
    }

    console.log(`[YouTube ytdl-core] Audio stream obtained, processing...`);

    // Convert to MP3 if needed with smart fallback
    let audioStream = downloadResult.stream;
    let actualFormat = format;
    
    if (format === 'mp3') {
      console.log(`🎵 Converting to MP3 with smart fallback...`);
      
      if (skipConversion) {
        console.log('⚠️ MP3 conversion skipped by request');
        actualFormat = 'm4a'; // Likely the original format
      } else {
        const conversionResult = await convertToMp3WithSmartFallback(downloadResult.stream, {
          maxRetries: 2,
          retryTimeout: timeout
        });
        
        audioStream = conversionResult.stream;
        if (!conversionResult.converted) {
          console.warn('⚠️ MP3 conversion failed, serving original format');
          actualFormat = 'm4a'; // Fallback format
        }
      }
    }
    
    // Generate filename with actual format
    const baseFilename = rawFilename 
      ? sanitizeFilename(rawFilename.replace(/\.[^/.]+$/, "")) // Remove extension if present
      : sanitizeFilename(videoInfo.title);
    
    const filename = `${baseFilename}.${actualFormat}`;

    // Set response headers with correct content type
    const headers = new Headers();
    headers.set('Content-Type', actualFormat === 'mp3' ? 'audio/mpeg' : 'audio/mp4');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    headers.set('Transfer-Encoding', 'chunked');
    
    // Add custom header to indicate if conversion was successful
    headers.set('X-Conversion-Status', actualFormat === format ? 'success' : 'fallback');

    console.log(`[YouTube ytdl-core] Streaming ${filename} (format: ${actualFormat})`);

    // Stream the response
    return new NextResponse(audioStream as any, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('[YouTube ytdl-core] Download error:', error);
    
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
        error: "Private videos cannot be downloaded",
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
      error: "Failed to download audio - please try again later",
      details: errorMessage,
      code: "download_error"
    }, { status: 500 });
  }
}