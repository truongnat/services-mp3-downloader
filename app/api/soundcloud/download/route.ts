import { NextRequest, NextResponse } from "next/server";
import { resolveTrack } from "@/lib/soundcloud/soundcloud";

export const runtime = "nodejs";

// Helper function to sanitize filename for safe download
function sanitizeFilename(filename: string): string {
  return filename
    // First normalize Unicode characters
    .normalize('NFD')
    // Remove combining diacritical marks
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-ASCII characters with ASCII equivalents or remove them
    .replace(/[^\x00-\x7F]/g, function(char) {
      // Common Unicode to ASCII mappings
      const charCode = char.charCodeAt(0);
      if (charCode >= 0x0400 && charCode <= 0x04FF) {
        // Cyrillic characters - transliterate common ones
        const cyrillicMap: { [key: string]: string } = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
          'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
          'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
          'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
          'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
          'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
        };
        return cyrillicMap[char] || '';
      }
      // For other non-ASCII characters, remove them
      return '';
    })
    // Remove invalid filename characters
    .replace(/[<>:"/\\|?*]/g, '')
    // Replace multiple spaces/underscores with single underscore
    .replace(/[\s_]+/g, '_')
    // Remove leading/trailing underscores and dots
    .replace(/^[._]+|[._]+$/g, '')
    // Limit length and ensure we don't end with a dot
    .substring(0, 100)
    .replace(/\.$/, '')
    // Ensure we have at least some content
    || 'audio';
}

// Helper function to create safe Content-Disposition header
function createContentDispositionHeader(filename: string): string {
  const sanitizedFilename = sanitizeFilename(filename);
  
  // Use RFC 5987 encoding for filename* parameter to support Unicode
  const encodedFilename = encodeURIComponent(sanitizedFilename);
  
  // Use both filename and filename* for maximum compatibility
  return `attachment; filename="${sanitizedFilename}"; filename*=UTF-8''${encodedFilename}`;
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

    // Generate filename - use only track title as per specification
    const baseFilename = rawFilename || `${track.title}.mp3`;
    
    // Set up response headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Content-Disposition', createContentDispositionHeader(baseFilename));
    headers.set('Cache-Control', 'no-cache');
    
    // Copy content length if available
    const contentLength = audioResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    const finalFilename = sanitizeFilename(baseFilename);
    console.log(`[SoundCloud Download] Streaming audio file: ${finalFilename}`);

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