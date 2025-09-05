/**
 * YouTube Playlist Fetcher using YouTube's public API
 * This works by parsing YouTube's playlist page HTML to extract video information
 */

import { YouTubeTrackInfo, YouTubePlaylistInfo, YouTubePlaylistApiResponse } from "@/types/youtube";
import { extractPlaylistId, extractVideoId } from "./url-utils";
import { getYouTubeVideoInfo } from "./ytdl-downloader";

/**
 * Fetch YouTube playlist information without using ytdl-core
 */
export async function fetchYouTubePlaylist(playlistUrl: string): Promise<YouTubePlaylistApiResponse> {
  try {
    console.log(`[YouTube Playlist Fetcher] Processing: ${playlistUrl}`);
    console.log(`[YouTube Playlist Fetcher] Playlist URL length: ${playlistUrl.length}`);
    console.log(`[YouTube Playlist Fetcher] Playlist URL contains list param: ${playlistUrl.includes('list=')}`);

    // Extract playlist ID
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      throw new Error("Invalid YouTube playlist URL");
    }

    // Check for radio/mix playlists
    if (playlistId.startsWith("RD")) {
      throw new Error("Radio/mix playlists are not supported. Please use individual video URLs instead.");
    }

    console.log(`[YouTube Playlist Fetcher] Fetching playlist ID: ${playlistId}`);

    // Construct playlist URL
    const fetchUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    // Fetch playlist page
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Extract playlist information from HTML
    const playlistInfo = extractPlaylistInfo(html, playlistId);
    const basicTracks = extractVideoList(html);

    console.log(`[YouTube Playlist Fetcher] Found ${basicTracks.length} tracks in playlist: ${playlistInfo.title}`);
    console.log(`[YouTube Playlist Fetcher] Fetching detailed metadata for each track...`);

    // Fetch detailed metadata for each track
    const tracks = await fetchDetailedTrackInfo(basicTracks);

    console.log(`[YouTube Playlist Fetcher] Successfully fetched detailed info for ${tracks.length} tracks`);

    return {
      playlistInfo,
      tracks
    };

  } catch (error) {
    console.error("[YouTube Playlist Fetcher] Error:", error);
    throw error;
  }
}

/**
 * Fetch detailed metadata for each track using ytdl-core directly
 */
async function fetchDetailedTrackInfo(basicTracks: YouTubeTrackInfo[]): Promise<YouTubeTrackInfo[]> {
  const detailedTracks: YouTubeTrackInfo[] = [];
  
  console.log(`[YouTube Playlist Fetcher] Fetching detailed info for ${basicTracks.length} tracks...`);
  
  // Process tracks in batches to avoid overwhelming the API
  // Increase batch size for better performance with larger playlists
  const batchSize = 5;
  for (let i = 0; i < basicTracks.length; i += batchSize) {
    const batch = basicTracks.slice(i, i + batchSize);
    
    // Fetch details for each track in the batch
    const batchPromises = batch.map(async (track, index) => {
      try {
        console.log(`[YouTube Playlist Fetcher] (${i + index + 1}/${basicTracks.length}) Fetching details for: ${track.title}`);
        const detailedInfo = await getYouTubeVideoInfo(track.url);
        console.log(`[YouTube Playlist Fetcher] ✅ Got details for: ${detailedInfo.title} by ${detailedInfo.artist}`);
        const { fullInfo, ...sanitized } = detailedInfo as any;
        return sanitized as YouTubeTrackInfo;
      } catch (error) {
        console.warn(`[YouTube Playlist Fetcher] ⚠️ Failed to get details for ${track.id}:`, error);
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
        console.warn(`[YouTube Playlist Fetcher] Skipping track ${batch[index].id} due to failed fetch`);
      }
    });
    
    // Small delay between batches to be respectful
    if (i + batchSize < basicTracks.length) {
      console.log(`[YouTube Playlist Fetcher] Processed ${Math.min(i + batchSize, basicTracks.length)}/${basicTracks.length} tracks, waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  console.log(`[YouTube Playlist Fetcher] ✅ Successfully processed ${detailedTracks.length} tracks with detailed metadata`);
  return detailedTracks;
}

/**
 * Extract playlist metadata from HTML
 */
function extractPlaylistInfo(html: string, playlistId: string): YouTubePlaylistInfo {
  try {
    // Try to extract title from meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `YouTube Playlist ${playlistId}`;

    // Extract description
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const description = descMatch ? descMatch[1] : "";

    // Extract thumbnail
    const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const artwork = thumbMatch ? thumbMatch[1] : "";

    // Try to extract author/channel name
    const authorMatch = html.match(/"ownerText":{"runs":\[{"text":"([^"]+)"/);
    const author = authorMatch ? authorMatch[1] : "Unknown";

    return {
      id: playlistId,
      title: title.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
      description: description.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
      artwork,
      tracksCount: 0, // Will be updated after extracting tracks
      author
    };
  } catch (error) {
    console.warn("Failed to extract playlist info:", error);
    return {
      id: playlistId,
      title: `YouTube Playlist ${playlistId}`,
      description: "YouTube playlist",
      artwork: "",
      tracksCount: 0,
      author: "Unknown"
    };
  }
}

/**
 * Extract video list from HTML
 */
function extractVideoList(html: string): YouTubeTrackInfo[] {
  const tracks: YouTubeTrackInfo[] = [];

  try {
    // Look for video data in the HTML
    // YouTube embeds video data in JSON within script tags
    // Enhanced pattern to capture more video entries
    const scriptMatches = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"[^}]*?"title":{"runs":\[{"text":"([^"]+)"/g);
    
    if (scriptMatches) {
      const seenVideoIds = new Set<string>();
      
      for (const match of scriptMatches) {
        const videoIdMatch = match.match(/"videoId":"([^"]+)"/);
        const titleMatch = match.match(/"title":{"runs":\[{"text":"([^"]+)"/);
        
        if (videoIdMatch && titleMatch) {
          const videoId = videoIdMatch[1];
          const title = titleMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"');
          
          // Avoid duplicates
          if (seenVideoIds.has(videoId)) continue;
          seenVideoIds.add(videoId);
          
          const titleLower = title.toLowerCase();
          if (titleLower === 'private video' || titleLower === 'deleted video') {
            console.log(`[YouTube Playlist Fetcher] Skipping ${title}`);
            continue;
          }

          const track: YouTubeTrackInfo = {
            id: videoId,
            title,
            artist: "Unknown",
            duration: 0,
            artwork: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            streamUrl: null,
          };
          
          tracks.push(track);
        }
      }
    }

    // Fallback: try alternative pattern
    if (tracks.length === 0) {
      const altPattern = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const titlePattern = /"title":"([^"]+)"/g;
      
      const videoIds = [...html.matchAll(altPattern)].map(m => m[1]);
      const titles = [...html.matchAll(titlePattern)].map(m => m[1]);
      
      const minLength = Math.min(videoIds.length, titles.length);
      const seenVideoIds = new Set<string>();
      
      for (let i = 0; i < minLength; i++) {
        const videoId = videoIds[i];
        const title = titles[i];
        
        if (seenVideoIds.has(videoId)) continue;
        seenVideoIds.add(videoId);
        
        const normalizedTitle = title.replace(/\\u0026/g, '&').replace(/\\"/g, '"');
        const titleLower = normalizedTitle.toLowerCase();
        if (titleLower === 'private video' || titleLower === 'deleted video') {
          console.log(`[YouTube Playlist Fetcher] Skipping ${normalizedTitle}`);
          continue;
        }

        tracks.push({
          id: videoId,
          title: normalizedTitle,
          artist: "Unknown",
          duration: 0,
          artwork: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          streamUrl: null,
        });
      }
    }
    
    // Additional pattern for more comprehensive video extraction
    if (tracks.length === 0) {
      // Try to find video data in ytInitialData script
      const ytInitialDataMatch = html.match(/var ytInitialData = ([^;]*);/);
      if (ytInitialDataMatch) {
        try {
          const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
          // Extract videos from the playlist data
          const playlistContents = ytInitialData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
          
          if (Array.isArray(playlistContents)) {
            const seenVideoIds = new Set<string>();
            for (const item of playlistContents) {
              const video = item?.playlistVideoRenderer;
              if (video?.videoId && video?.title?.runs?.[0]?.text) {
                const videoId = video.videoId;
                const title = video.title.runs[0].text;
                const titleLower = title.toLowerCase();
                if (titleLower === 'private video' || titleLower === 'deleted video') {
                  console.log(`[YouTube Playlist Fetcher] Skipping ${title}`);
                  continue;
                }
                
                if (seenVideoIds.has(videoId)) continue;
                seenVideoIds.add(videoId);
                
                tracks.push({
                  id: videoId,
                  title,
                  artist: "Unknown",
                  duration: 0,
                  artwork: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  streamUrl: null,
                });
              }
            }
          }
        } catch (parseError) {
          console.warn("Failed to parse ytInitialData:", parseError);
        }
      }
    }

    console.log(`[YouTube Playlist Fetcher] Extracted ${tracks.length} tracks`);
    return tracks;

  } catch (error) {
    console.error("Error extracting video list:", error);
    return [];
  }
}