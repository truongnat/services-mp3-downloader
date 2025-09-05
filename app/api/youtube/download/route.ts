import { NextRequest, NextResponse } from "next/server";
import { isPlaylistUrl, isVideoUrl } from "@/lib/youtube/url-utils";
import { downloadYouTubeAudio, getYouTubeVideoInfo, convertToMp3WithSmartFallback } from "@/lib/youtube/ytdl-downloader";
import { Readable } from "stream";

export const runtime = "nodejs";

// Helper function to sanitize filename for safe download
function sanitizeFilename(filename: string): string {
  return (
    filename
      // First normalize Unicode characters
      .normalize("NFD")
      // Remove combining diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // Replace non-ASCII characters with ASCII equivalents or remove them
      .replace(/[^\x00-\x7F]/g, function (char) {
        // Common Unicode to ASCII mappings
        const charCode = char.charCodeAt(0);
        if (charCode >= 0x0400 && charCode <= 0x04ff) {
          // Cyrillic characters - transliterate common ones
          const cyrillicMap: { [key: string]: string } = {
            а: "a",
            б: "b",
            в: "v",
            г: "g",
            д: "d",
            е: "e",
            ё: "yo",
            ж: "zh",
            з: "z",
            и: "i",
            й: "y",
            к: "k",
            л: "l",
            м: "m",
            н: "n",
            о: "o",
            п: "p",
            р: "r",
            с: "s",
            т: "t",
            у: "u",
            ф: "f",
            х: "h",
            ц: "ts",
            ч: "ch",
            ш: "sh",
            щ: "shch",
            ъ: "",
            ы: "y",
            ь: "",
            э: "e",
            ю: "yu",
            я: "ya",
            А: "A",
            Б: "B",
            В: "V",
            Г: "G",
            Д: "D",
            Е: "E",
            Ё: "Yo",
            Ж: "Zh",
            З: "Z",
            И: "I",
            Й: "Y",
            К: "K",
            Л: "L",
            М: "M",
            Н: "N",
            О: "O",
            П: "P",
            Р: "R",
            С: "S",
            Т: "T",
            У: "U",
            Ф: "F",
            Х: "H",
            Ц: "Ts",
            Ч: "Ch",
            Ш: "Sh",
            Щ: "Shch",
            Ъ: "",
            Ы: "Y",
            Ь: "",
            Э: "E",
            Ю: "Yu",
            Я: "Ya",
          };
          return cyrillicMap[char] || "";
        }
        // For other non-ASCII characters, replace with underscore to prevent encoding issues
        return "_";
      })
      // Remove invalid filename characters
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      // Replace multiple spaces/underscores with single underscore
      .replace(/[\s_]+/g, "_")
      // Remove leading/trailing underscores and dots
      .replace(/^[._]+|[._]+$/g, "")
      // Limit length and ensure we don't end with a dot
      .substring(0, 100)
      .replace(/\.$/, "") ||
    // Ensure we have at least some content
    "audio"
  );
}

// Helper function to create safe Content-Disposition header
function createContentDispositionHeader(filename: string): string {
  const sanitizedFilename = sanitizeFilename(filename);

  // For ASCII-only filenames, use simple encoding
  if (/^[\x00-\x7F]*$/.test(sanitizedFilename)) {
    return `attachment; filename="${sanitizedFilename}"`;
  }

  // For Unicode filenames, use RFC 5987 encoding
  // First, ensure we have a clean ASCII fallback
  const asciiFilename = sanitizedFilename.replace(/[^\x00-\x7F]/g, "_").substring(0, 50) || "audio";
  const encodedFilename = encodeURIComponent(sanitizedFilename);

  // Use both filename (ASCII fallback) and filename* (Unicode) for maximum compatibility
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}

export async function GET(req: NextRequest) {
  const videoUrl = req.nextUrl.searchParams.get("url");
  const rawFilename = req.nextUrl.searchParams.get("filename");
  const format = req.nextUrl.searchParams.get("format") || "mp3";
  const quality = req.nextUrl.searchParams.get("quality") || "highestaudio";
  const skipConversion =
    req.nextUrl.searchParams.get("skipConversion") === "true";
  const timeout = parseInt(req.nextUrl.searchParams.get("timeout") || "30000");

  // Log request parameters for debugging
  console.log("[YouTube Download API] Download request parameters:", {
    url: videoUrl,
    format,
    quality,
    skipConversion,
    timeout,
  });

  if (!videoUrl) {
    return NextResponse.json({ error: "Missing video URL" }, { status: 400 });
  }

  try {
    // Determine if it's a playlist or video URL
    const isPlaylist = isPlaylistUrl(videoUrl);
    const isVideo = isVideoUrl(videoUrl);

    console.log(`[YouTube Download API] URL Type - Playlist: ${isPlaylist}, Video: ${isVideo}`);

    if (isVideo) {
      // Handle individual video download (existing logic)
      console.log(`[YouTube Download API] Processing as video: ${videoUrl}`);

      // Get video info first (this will be reused for download)
      const videoInfo = await getYouTubeVideoInfo(videoUrl);

      console.log(
        `[YouTube Download API] Video info: ${videoInfo.title} by ${videoInfo.artist}`
      );

      // Download audio stream using the pre-fetched info for better efficiency
      // This avoids fetching the video info twice, improving performance
      const downloadResult = await downloadYouTubeAudio({
        url: videoUrl,
        quality: quality as any,
        format: format as any,
        filter: "audioonly",
        info: videoInfo.fullInfo, // Pass the pre-fetched info
      });

      console.log("[YouTube Download API] Download result:", {
        success: downloadResult.success,
        hasStream: !!downloadResult.stream,
        title: downloadResult.title,
        error: downloadResult.error,
      });

      if (!downloadResult.success || !downloadResult.stream) {
        return NextResponse.json(
          {
            error: downloadResult.error || "Failed to get audio stream",
            code: "download_failed",
          },
          { status: 400 }
        );
      }

      console.log(`[YouTube Download API] Audio stream obtained, processing...`);

      // Convert to MP3 if needed with smart fallback
      let audioStream = downloadResult.stream;
      let actualFormat = format;

      if (format === "mp3") {
        console.log(`🎵 Converting to MP3 with smart fallback...`);

        if (skipConversion) {
          console.log("⚠️ MP3 conversion skipped by request");
          actualFormat = "m4a"; // Likely the original format
        } else {
          console.log(
            "[YouTube Download API] Starting FFmpeg conversion with timeout:",
            timeout
          );
          const conversionResult = await convertToMp3WithSmartFallback(
            downloadResult.stream,
            {
              maxRetries: 2,
              retryTimeout: timeout,
            }
          );

          audioStream = conversionResult.stream;
          const converted = conversionResult.converted;
          console.log("[YouTube Download API] FFmpeg conversion result:", {
            converted,
            hasStream: !!audioStream,
          });

          if (!converted) {
            console.warn("⚠️ MP3 conversion failed, serving original format");
            actualFormat = "m4a"; // Fallback format
          }
        }
      }

      // Generate filename with actual format
      const baseFilename = rawFilename
        ? sanitizeFilename(rawFilename.replace(/\.[^/.]+$/, "")) // Remove extension if present
        : sanitizeFilename(videoInfo.title);

      const filename = `${baseFilename}.${actualFormat}`;

      // Log final response details
      console.log("[YouTube Download API] Final response details:", {
        filename,
        actualFormat,
        contentType: actualFormat === "mp3" ? "audio/mpeg" : "audio/mp4",
      });

      // Set response headers with correct content type
      const headers = new Headers();
      headers.set(
        "Content-Type",
        actualFormat === "mp3" ? "audio/mpeg" : "audio/mp4"
      );
      headers.set(
        "Content-Disposition",
        createContentDispositionHeader(filename)
      );
      headers.set("Transfer-Encoding", "chunked");

      // Add cache headers to prevent caching issues
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Expires", "0");

      // Add custom header to indicate if conversion was successful
      headers.set(
        "X-Conversion-Status",
        actualFormat === format ? "success" : "fallback"
      );

      console.log(
        `[YouTube Download API] Streaming ${filename} (format: ${actualFormat})`
      );

      // Convert Node.js stream to Web Stream for Next.js response
      const webStream = new ReadableStream({
        async start(controller) {
          audioStream.on('data', (chunk) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          
          audioStream.on('end', () => {
            controller.close();
          });
          
          audioStream.on('error', (err) => {
            controller.error(err);
          });
        },
        async cancel() {
          audioStream.destroy();
        }
      });
      
      // Stream the response
      return new NextResponse(webStream, {
        status: 200,
        headers,
      });
    } else if (isPlaylist) {
      // Handle playlist URL - this shouldn't happen as playlists are processed differently
      return NextResponse.json(
        {
          error: "Playlist URLs cannot be downloaded directly. Please process the playlist first and then download individual tracks.",
          code: "playlist_url_not_supported"
        },
        { status: 400 }
      );
    } else {
      // Neither video nor playlist
      return NextResponse.json(
        {
          error: "Invalid YouTube URL. Please provide a valid YouTube video URL.",
          code: "invalid_url"
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[YouTube Download API] Download error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "No stack trace";

    // Log detailed error information
    console.error("[YouTube Download API] Error details:", {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : "Unknown",
      url: videoUrl,
    });

    // Handle specific error cases
    if (errorMessage.includes("Video unavailable")) {
      return NextResponse.json(
        {
          error: "Video is unavailable or has been removed",
          code: "video_unavailable",
          details: errorMessage,
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes("Private video")) {
      return NextResponse.json(
        {
          error: "Private videos cannot be downloaded",
          code: "private_video",
          details: errorMessage,
        },
        { status: 403 }
      );
    }

    if (errorMessage.includes("radio/mix")) {
      return NextResponse.json(
        {
          error: errorMessage,
          code: "unsupported_playlist",
          details: errorMessage,
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes("Invalid YouTube URL")) {
      return NextResponse.json(
        {
          error: "Invalid YouTube URL provided",
          code: "invalid_url",
          details: errorMessage,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to download audio - please try again later",
        details: errorMessage,
        stack: errorStack,
        code: "download_error",
      },
      { status: 500 }
    );
  }
}