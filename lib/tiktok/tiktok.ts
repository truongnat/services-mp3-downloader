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

    console.log('[TikTok] Attempting to fetch video data for URL:', clean);
    console.log('[TikTok] Extracted video ID:', videoId);

    const result = await Tiktok.Downloader(clean, {
      version: "v2", // Use v2 for better results
    });

    console.log('[TikTok] API response:', JSON.stringify(result, null, 2));

    if (!result) {
      throw new Error("TikTok API returned null/undefined response");
    }

    if (!result.status) {
      throw new Error(`TikTok API request failed: ${result.message || 'Unknown error'}`);
    }

    if (!result.result) {
      throw new Error("TikTok API returned no video data");
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