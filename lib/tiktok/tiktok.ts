import { TikTokPlaylistApiResponse, TikTokTrackInfo } from "@/types/tiktok";
import Tiktok from "@tobyg74/tiktok-api-dl";

// Utility function to extract video ID from TikTok URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:tiktok\.com\/@(?:[\w.-]+)\/video\/(\d+))/, // Standard video URL
    /(?:tiktok\.com\/v\/(\d+))/, // Short video URL
    /(?:vm\.tiktok\.com\/([\w-]+))/, // vm.tiktok.com short URL
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Clean up the URL by removing tracking parameters
function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    ["_r", "is_from_webapp", "sender_device", "sender_web_id"].forEach(param => {
      urlObj.searchParams.delete(param);
    });
    return urlObj.toString();
  } catch {
    return url;
  }
}

export async function resolveTrack(url: string): Promise<TikTokTrackInfo> {
  try {
    const clean = cleanUrl(url);
    const videoId = extractVideoId(clean);

    if (!videoId) {
      throw new Error("Invalid TikTok URL - could not extract video ID");
    }

    // Try different versions with timeout
    let result;
    const versions = ["v3", "v2", "v1"] as const;
    let lastError: any;

    for (const version of versions) {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${version} API timeout`)), 15000);
        });

        const apiPromise = Tiktok.Downloader(clean, { version });

        result = await Promise.race([apiPromise, timeoutPromise]);
        break;
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    if (!result) {
      throw new Error(`All TikTok API versions failed. Last error: ${lastError?.message || lastError}`);
    }

    if (!result) {
      throw new Error("TikTok API returned null/undefined response");
    }

    if (result.status === "error") {
      // Handle specific error cases
      if (result.message?.includes("ECONNREFUSED")) {
        throw new Error("TikTok service is currently unavailable due to network connectivity issues. This may be caused by firewall restrictions, regional blocking, or service maintenance. Please try again later or check your network configuration.");
      } else if (result.message?.includes("Video not found") || result.message?.includes("404")) {
        throw new Error("TikTok video not found. The video may have been deleted, made private, or the URL is incorrect.");
      } else if (result.message?.includes("Private video") || result.message?.includes("403")) {
        throw new Error("This TikTok video is private and cannot be accessed.");
      } else if (result.message?.includes("timeout")) {
        throw new Error("TikTok API request timed out. The service may be experiencing high load. Please try again later.");
      } else if (result.message?.includes("rate limit") || result.message?.includes("429")) {
        throw new Error("TikTok API rate limit exceeded. Please wait a few minutes before trying again.");
      } else {
        throw new Error(`TikTok API error: ${result.message || 'Unknown error'}. Please try again later.`);
      }
    }

    if (result.status !== "success") {
      throw new Error(`TikTok API request failed: ${result.message || 'Unknown error'}`);
    }

    if (!result.result) {
      throw new Error("TikTok API returned no video data. The video may be unavailable or restricted.");
    }

    const videoData = result.result;

    // Find the best quality video URL without watermark
    const streamUrl = videoData.video?.playAddr?.[0] || null;

    if (!streamUrl) {
      throw new Error("No downloadable video found for this TikTok");
    }

    const track: TikTokTrackInfo = {
      id: videoId,
      title: videoData.desc || `TikTok Video ${videoId}`,
      author: videoData.author?.nickname || "Unknown",
      duration: 0, // Duration not directly available from this API
      artwork: videoData.author?.avatar || "",
      url: clean,
      streamUrl: streamUrl,
      size: undefined, // Not directly available from this API
      bitrate: undefined, // Not directly available from this API
      format: "mp4", // Assuming mp4 for video downloads
    };

    return track;
  } catch (error) {
    console.error("[TikTok API error]", error);
    throw error;
  }
}

// For now, TikTok doesn't have a direct playlist concept like YouTube/SoundCloud.
// This function will resolve a single track and return it in a playlist-like structure.
export async function resolvePlaylist(url: string): Promise<TikTokPlaylistApiResponse> {
  try {
    const track = await resolveTrack(url);

    const playlistInfo = {
      id: track.id,
      title: track.title,
      description: `Single TikTok video: ${track.title}`,
      artwork: track.artwork,
      tracksCount: 1,
    };

    return {
      playlistInfo: playlistInfo,
      tracks: [track],
    };
  } catch (error) {
    console.error("[TikTok Playlist API error]", error);
    throw error;
  }
}

export function isVideoUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

// For now, we'll treat any valid video URL as a "playlist" of one.
export function isPlaylistUrl(url: string): boolean {
  return isVideoUrl(url);
}