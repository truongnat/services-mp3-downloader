import { NextRequest, NextResponse } from "next/server";
import { downloadYouTubeAudio } from "@/lib/youtube/youtube";

export const runtime = "nodejs";

// Helper function to sanitize filename for HTTP headers
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '') // Remove special characters except word chars, spaces, dots, hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

export async function GET(req: NextRequest) {
  const videoUrl = req.nextUrl.searchParams.get("url");
  const rawFilename = req.nextUrl.searchParams.get("filename") || "audio.mp3";
  const quality = req.nextUrl.searchParams.get("quality") || "720";
  const format = req.nextUrl.searchParams.get("format") || "mp3";

  if (!videoUrl) {
    return NextResponse.json({ error: "Missing video URL" }, { status: 400 });
  }

  try {
    // Add small delay to help with rate limiting
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000)); // 0.5-1.5s delay
    
    // Sanitize filename to prevent encoding issues
    const filename = sanitizeFilename(rawFilename);

    // Extract video ID from URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const videoId = videoIdMatch[1];

    // Get fresh stream URL and download immediately to avoid expiration
    // Use ANDROID client for better compatibility and less blocking
    const downloadResult = await downloadYouTubeAudio({
      id: videoId,
      quality,
      format,
      client: 'ANDROID' // Use Android client for better success rate
    });

    if (downloadResult.error) {
      return NextResponse.json({ 
        error: downloadResult.error,
        code: downloadResult.error 
      }, { status: 400 });
    }

    const streamUrl = Array.isArray(downloadResult.urls) ? downloadResult.urls[0] : downloadResult.urls;
    
    if (!streamUrl) {
      return NextResponse.json({ error: "No stream URL available" }, { status: 500 });
    }

    // Fetch the audio stream from YouTube with timeout - use fresh URL immediately
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

    // Try multiple User-Agent strings to increase success rate
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Retry logic with exponential backoff
    while (attempts < maxAttempts) {
      try {
        response = await fetch(streamUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': randomUserAgent,
            'Accept': 'audio/webm,audio/ogg,audio/*,*/*;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
          },
        });
        
        if (response.ok) {
          break; // Success, exit retry loop
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s
          console.log(`YouTube download attempt ${attempts} failed with ${response.status}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 1000;
          console.log(`YouTube download attempt ${attempts} failed with error, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      const status = response?.status || 500;
      const statusText = response?.statusText || 'Unknown error';
      
      console.error(`YouTube stream fetch failed after ${maxAttempts} attempts: ${status} ${statusText}`);
      
      // Provide more specific error messages
      if (status === 403) {
        return NextResponse.json({ 
          error: "YouTube access denied - this video may be restricted, private, or temporarily unavailable. YouTube has become more restrictive about downloads. Success rate is approximately 30-50%. Please try again or use a different video.",
          code: "youtube_blocked",
          retryable: true
        }, { status: 403 });
      } else if (status === 404) {
        return NextResponse.json({ 
          error: "Audio stream not found - the video may have been removed or is currently unavailable",
          code: "not_found"
        }, { status: 404 });
      } else if (status === 429) {
        return NextResponse.json({ 
          error: "Too many requests - please wait a few minutes before trying again",
          code: "rate_limited",
          retryable: true
        }, { status: 429 });
      } else {
        return NextResponse.json({ 
          error: `Failed to download audio after multiple attempts: ${status} ${statusText}. This may be due to YouTube's restrictions or network issues.`,
          code: "download_failed",
          retryable: true
        }, { status: status });
      }
    }

    // Set appropriate headers for download
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    // Copy content-length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Stream the response
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Download error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Download timeout - the video may be too large or the connection is slow' },
          { status: 408 }
        );
      } else if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Network error - please check your connection and try again' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to download audio - please try again later' },
      { status: 500 }
    );
  }
}
