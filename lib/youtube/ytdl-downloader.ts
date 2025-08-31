import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { Readable } from "stream";
import { YouTubeTrackInfo } from "@/types/youtube";

// Set ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface YouTubeDownloadOptions {
  url: string;
  quality?: "highest" | "lowest" | "highestaudio" | "lowestaudio";
  format?: "mp3" | "m4a" | "webm";
  filter?: "audioonly" | "videoonly" | "audioandvideo";
}

export interface YouTubeDownloadResult {
  success: boolean;
  title?: string;
  duration?: number;
  thumbnail?: string;
  author?: string;
  stream?: Readable;
  error?: string;
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract playlist ID from YouTube URL
 */
export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([^&\n?#]+)/,
    /^(PL[a-zA-Z0-9_-]+)$/,
    /^(UU[a-zA-Z0-9_-]+)$/,
    /^(FL[a-zA-Z0-9_-]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if URL contains a radio/mix playlist and clean it
 */
export function cleanRadioMixUrl(url: string): {
  isRadioMix: boolean;
  cleanUrl: string;
  videoId?: string;
} {
  const playlistMatch = url.match(/[?&]list=([^&\n?#]+)/);

  if (playlistMatch) {
    const playlistId = playlistMatch[1];
    if (playlistId.startsWith("RD")) {
      // Extract video ID from radio/mix URL
      const videoIdMatch = url.match(/[?&]v=([^&\n?#]+)/);
      if (videoIdMatch) {
        return {
          isRadioMix: true,
          cleanUrl: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
          videoId: videoIdMatch[1],
        };
      }
    }
  }

  return {
    isRadioMix: false,
    cleanUrl: url,
  };
}

/**
 * Get YouTube video info using ytdl-core
 */
export async function getYouTubeVideoInfo(
  url: string
): Promise<YouTubeTrackInfo> {
  try {
    // Clean radio/mix URLs
    const { isRadioMix, cleanUrl } = cleanRadioMixUrl(url);

    if (isRadioMix) {
      console.log(`Detected radio/mix playlist, using clean URL: ${cleanUrl}`);
    }

    // Validate video URL
    if (!ytdl.validateURL(cleanUrl)) {
      throw new Error("Invalid YouTube URL");
    }

    // Get video info
    const info = await ytdl.getInfo(cleanUrl);
    const videoDetails = info.videoDetails;

    const trackInfo: YouTubeTrackInfo = {
      id: videoDetails.videoId,
      title: videoDetails.title,
      artist: videoDetails.author.name,
      duration: parseInt(videoDetails.lengthSeconds) || 0,
      artwork:
        videoDetails.thumbnails?.[0]?.url ||
        `https://i.ytimg.com/vi/${videoDetails.videoId}/maxresdefault.jpg`,
      url: cleanUrl,
      streamUrl: "", // Will be populated during download
      format: undefined,
      size: undefined,
      bitrate: undefined,
    };

    return trackInfo;
  } catch (error) {
    console.error("[YouTube ytdl-core] Error getting video info:", error);
    throw error;
  }
}

/**
 * Download YouTube video as audio stream
 */
export async function downloadYouTubeAudio(
  options: YouTubeDownloadOptions
): Promise<YouTubeDownloadResult> {
  try {
    const {
      url,
      quality = "highestaudio",
      format = "mp3",
      filter = "audioonly",
    } = options;

    // Clean radio/mix URLs
    const { isRadioMix, cleanUrl } = cleanRadioMixUrl(url);

    if (isRadioMix) {
      console.log(`Detected radio/mix playlist, using clean URL: ${cleanUrl}`);
    }

    // Validate URL
    if (!ytdl.validateURL(cleanUrl)) {
      return {
        success: false,
        error: "Invalid YouTube URL",
      };
    }

    // Get video info
    const info = await ytdl.getInfo(cleanUrl);
    const videoDetails = info.videoDetails;

    // Check if video is available
    if (videoDetails.isLiveContent) {
      return {
        success: false,
        error: "Live streams are not supported",
      };
    }

    if (videoDetails.isPrivate) {
      return {
        success: false,
        error: "Private videos cannot be downloaded",
      };
    }

    // Create audio stream
    const audioStream = ytdl(cleanUrl, {
      quality,
      filter,
      highWaterMark: 1024 * 1024 * 32, // 32MB buffer
    });

    return {
      success: true,
      title: videoDetails.title,
      duration: parseInt(videoDetails.lengthSeconds) || 0,
      thumbnail: videoDetails.thumbnails?.[0]?.url,
      author: videoDetails.author.name,
      stream: audioStream,
    };
  } catch (error) {
    console.error("[YouTube ytdl-core] Download error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Convert audio stream to MP3 using ffmpeg
 */
export function convertToMp3(inputStream: Readable): Readable {
  return ffmpeg(inputStream)
    .audioCodec("libmp3lame")
    .audioBitrate(128)
    .audioChannels(2)
    .audioFrequency(44100)
    .format("mp3")
    .on("start", (commandLine) => {
      console.log("FFmpeg process started:", commandLine);
    })
    .on("error", (err) => {
      console.error("FFmpeg error:", err);
    })
    .pipe() as Readable;
}

/**
 * Helper to check if URL is a video or playlist
 */
export function isPlaylistUrl(url: string): boolean {
  const playlistId = extractPlaylistId(url);
  const videoId = extractVideoId(url);

  // If has playlist ID but no video ID, it's a playlist
  // If has both, treat as single video (common in YouTube Music)
  return !!playlistId && !videoId;
}

export function isVideoUrl(url: string): boolean {
  return !!extractVideoId(url);
}
