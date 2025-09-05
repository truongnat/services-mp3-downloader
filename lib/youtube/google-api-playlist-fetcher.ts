import { youtube } from "@googleapis/youtube";
import { extractPlaylistId } from "./url-utils";
import { getYouTubeVideoInfo } from "./ytdl-downloader";
import { YouTubeTrackInfo } from "@/types/youtube";

/**
 * Fetch YouTube playlist information using Google's official API
 */
export async function fetchYouTubePlaylistWithGoogleAPI(playlistUrl: string) {
  try {
    console.log(`[Google YouTube API] Processing playlist: ${playlistUrl}`);
    console.log(`[Google YouTube API] Playlist URL length: ${playlistUrl.length}`);
    console.log(`[Google YouTube API] Playlist URL contains list param: ${playlistUrl.includes('list=')}`);

    // Log the API key to see if it's loaded correctly
    console.log(`[Google YouTube API] API Key: ${process.env.YOUTUBE_API_KEY ? 'SET' : 'NOT SET'}`);
    if (process.env.YOUTUBE_API_KEY) {
      console.log(`[Google YouTube API] API Key length: ${process.env.YOUTUBE_API_KEY.length}`);
      // Log first and last few characters of API key for debugging (but not the full key)
      console.log(`[Google YouTube API] API Key prefix: ${process.env.YOUTUBE_API_KEY.substring(0, 10)}...`);
      console.log(`[Google YouTube API] API Key suffix: ...${process.env.YOUTUBE_API_KEY.substring(process.env.YOUTUBE_API_KEY.length - 5)}`);
    } else {
      console.error(`[Google YouTube API] ❌ API Key is NOT SET! This will cause the Google API to fail.`);
      throw new Error("YouTube API Key not configured");
    }

    // Initialize YouTube API client
    const youtubeClient = youtube({
      version: "v3",
      auth: process.env.YOUTUBE_API_KEY,
    });

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(playlistUrl);
    console.log(`[Google YouTube API] Extracted playlist ID: ${playlistId}`);
    if (!playlistId) {
      throw new Error("Invalid YouTube playlist URL");
    }

    console.log(`[Google YouTube API] Fetching playlist ID: ${playlistId}`);

    // Fetch playlist details
    console.log(`[Google YouTube API] Calling YouTube API to fetch playlist details...`);
    const playlistResponse = await youtubeClient.playlists.list({
      part: ["snippet", "contentDetails"],
      id: [playlistId],
    });
    console.log(`[Google YouTube API] YouTube API response received`);

    if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
      console.log(`[Google YouTube API] Playlist not found, might be private or deleted: ${playlistId}`);
      throw new Error("Playlist not found or inaccessible");
    }

    const playlist = playlistResponse.data.items[0];
    const playlistInfo = {
      id: playlist.id || playlistId,
      title: playlist.snippet?.title || `YouTube Playlist ${playlistId}`,
      description: playlist.snippet?.description || "",
      artwork: playlist.snippet?.thumbnails?.high?.url || playlist.snippet?.thumbnails?.default?.url || "",
      tracksCount: playlist.contentDetails?.itemCount || 0,
      author: playlist.snippet?.channelTitle || "Unknown",
    };

    console.log(`[Google YouTube API] Playlist info: ${playlistInfo.title} (${playlistInfo.tracksCount} tracks)`);

    // Fetch playlist items (videos)
    const tracks = await fetchPlaylistItems(youtubeClient, playlistId);

    console.log(`[Google YouTube API] Successfully fetched ${tracks.length} tracks`);

    return {
      playlistInfo,
      tracks,
    };
  } catch (error) {
    console.error("[Google YouTube API] Error:", error);
    throw error;
  }
}

/**
 * Fetch all items in a YouTube playlist
 */
async function fetchPlaylistItems(youtubeClient: any, playlistId: string): Promise<YouTubeTrackInfo[]> {
  const tracks: YouTubeTrackInfo[] = [];
  let nextPageToken: string | undefined;

  try {
    console.log(`[Google YouTube API] Starting to fetch playlist items for playlist ID: ${playlistId}`);
    let pageCount = 0;
    
    do {
      pageCount++;
      console.log(`[Google YouTube API] Fetching page ${pageCount} of playlist items...`);
      
      // Fetch playlist items
      const response = await youtubeClient.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId: playlistId,
        maxResults: 50, // Maximum allowed by YouTube API
        pageToken: nextPageToken,
      });
      console.log(`[Google YouTube API] Page ${pageCount} response received`);

      const items = response.data.items || [];
      console.log(`[Google YouTube API] Fetched ${items.length} items in this batch (page ${pageCount})`);

      // Process each item
      for (const item of items) {
        if (item.snippet && item.contentDetails) {
          const titleText = (item.snippet.title || "").trim();
          const titleLower = titleText.toLowerCase();
          // Skip private or deleted videos
          if (titleLower === 'private video' || titleLower === 'deleted video') {
            console.log(`[Google YouTube API] Skipping ${titleText}`);
            continue;
          }

          const videoId = item.contentDetails.videoId || "";
          if (!videoId) continue;

          const track: YouTubeTrackInfo = {
            id: videoId,
            title: titleText || "Unknown",
            artist: item.snippet.videoOwnerChannelTitle || "Unknown",
            duration: 0, // Will be updated when individual video is loaded
            artwork: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || "",
            url: `https://www.youtube.com/watch?v=${videoId}`,
            streamUrl: null,
          };

          tracks.push(track);
        }
      }

      // Check if there are more pages
      nextPageToken = response.data.nextPageToken || undefined;
      if (nextPageToken) {
        console.log(`[Google YouTube API] More items available, fetching next page...`);
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } while (nextPageToken);
    
    console.log(`[Google YouTube API] Finished fetching all playlist items. Total pages: ${pageCount}, Total tracks: ${tracks.length}`);

    console.log(`[Google YouTube API] Total tracks extracted: ${tracks.length}`);
    
    // Fetch detailed metadata for each track using ytdl-core directly
    if (tracks.length > 0) {
      console.log(`[Google YouTube API] Fetching detailed metadata for ${tracks.length} tracks...`);
      return await fetchDetailedTrackInfo(tracks);
    }

    return tracks;
  } catch (error) {
    console.error("[Google YouTube API] Error fetching playlist items:", error);
    throw error;
  }
}

/**
 * Fetch detailed metadata for each track using ytdl-core directly
 */
async function fetchDetailedTrackInfo(basicTracks: YouTubeTrackInfo[]): Promise<YouTubeTrackInfo[]> {
  const detailedTracks: YouTubeTrackInfo[] = [];
  
  console.log(`[Google YouTube API] Fetching detailed info for ${basicTracks.length} tracks...`);
  
  // Process tracks in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < basicTracks.length; i += batchSize) {
    const batch = basicTracks.slice(i, i + batchSize);
    
    // Fetch details for each track in the batch
    const batchPromises = batch.map(async (track, index) => {
      try {
        console.log(`[Google YouTube API] (${i + index + 1}/${basicTracks.length}) Fetching details for: ${track.title}`);
        const detailedInfo = await getYouTubeVideoInfo(track.url);
        console.log(`[Google YouTube API] ✅ Got details for: ${detailedInfo.title} by ${detailedInfo.artist}`);
        // Strip heavy fullInfo before returning to client to avoid oversized payloads
        const { fullInfo, ...sanitized } = detailedInfo as any;
        return sanitized as YouTubeTrackInfo;
      } catch (error) {
        console.warn(`[Google YouTube API] ⚠️ Failed to get details for ${track.id}:`, error);
        // Skip tracks that cannot be fetched
        return null as any;
      }
    });
    
    // Wait for the batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Add successful results to the detailed tracks array
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        detailedTracks.push(result.value);
      } else {
        console.warn(`[Google YouTube API] Skipping track ${batch[index].id} due to failed fetch`);
      }
    });
    
    // Small delay between batches to be respectful
    if (i + batchSize < basicTracks.length) {
      console.log(`[Google YouTube API] Processed ${Math.min(i + batchSize, basicTracks.length)}/${basicTracks.length} tracks, waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  console.log(`[Google YouTube API] ✅ Successfully processed ${detailedTracks.length} tracks with detailed metadata`);
  return detailedTracks;
}
