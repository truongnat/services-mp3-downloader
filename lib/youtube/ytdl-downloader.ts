import ytdl from "@distube/ytdl-core";
import { Readable } from "stream";
import { YouTubeTrackInfo, YouTubePlaylistInfo, YouTubePlaylistApiResponse } from "@/types/youtube";
import { 
  convertToMp3 as ffmpegConvertToMp3, 
  convertToMp3WithFallback,
  isFFmpegAvailable 
} from "@/lib/ffmpeg-utils";
import {
  extractVideoId,
  extractPlaylistId,
  cleanRadioMixUrl,
  isPlaylistUrl,
  isVideoUrl
} from "@/lib/youtube/url-utils";

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
export async function convertToMp3(
  inputStream: Readable, 
  options: { 
    skipConversion?: boolean;
    timeout?: number;
  } = {}
): Promise<Readable> {
  const { skipConversion = false, timeout = 30000 } = options;
  
  // Skip conversion if requested
  if (skipConversion) {
    console.log('⚠️ Skipping FFmpeg conversion as requested');
    return inputStream;
  }
  
  try {
    return await ffmpegConvertToMp3(inputStream, {
      bitrate: 128,
      channels: 2,
      frequency: 44100,
      timeout
    });
  } catch (error) {
    console.error('Failed to convert audio to MP3:', error);
    // Return original stream as fallback
    return inputStream;
  }
}

/**
 * Convert audio stream to MP3 using ffmpeg with smart fallback
 */
export async function convertToMp3WithSmartFallback(
  inputStream: Readable,
  options: {
    maxRetries?: number;
    retryTimeout?: number;
  } = {}
): Promise<{ stream: Readable; converted: boolean }> {
  return await convertToMp3WithFallback(inputStream, {
    bitrate: 128,
    channels: 2,
    frequency: 44100,
    maxRetries: options.maxRetries || 2,
    retryTimeout: options.retryTimeout || 15000
  });
}

/**
 * Get YouTube playlist info using ytdl-core
 * Note: This is a basic implementation since ytdl-core has limited playlist support
 */
export async function getYouTubePlaylistInfo(
  playlistUrl: string
): Promise<YouTubePlaylistApiResponse> {
  try {
    console.log(`[YouTube Playlist] Processing: ${playlistUrl}`);

    // Extract playlist ID
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      throw new Error("Invalid YouTube playlist URL");
    }

    // Check for radio/mix playlists
    if (playlistId.startsWith("RD")) {
      throw new Error("Radio/mix playlists are not supported. Please use individual video URLs instead.");
    }

    console.log(`[YouTube Playlist] Getting playlist info for ID: ${playlistId}`);

    // For now, return a limited response since ytdl-core doesn't fully support playlists
    // This is a placeholder implementation that users can enhance with external services
    const playlistInfo: YouTubePlaylistInfo = {
      id: playlistId,
      title: "YouTube Playlist (Limited Support)",
      description: "Due to ytdl-core limitations, full playlist enumeration is not available. Please download videos individually.",
      artwork: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      tracksCount: 0,
      author: "YouTube"
    };

    // Return empty tracks array with informational message
    const tracks: YouTubeTrackInfo[] = [];

    console.log(`[YouTube Playlist] Returning limited playlist info for ${playlistId}`);

    return {
      playlistInfo,
      tracks
    };

  } catch (error) {
    console.error("[YouTube Playlist] Error getting playlist info:", error);
    throw error;
  }
}
