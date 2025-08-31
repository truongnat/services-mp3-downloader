import { SoundCloudPlaylistApiResponse, SoundCloudPlaylistInfo, SoundCloudTrackInfo } from "@/types/soundcloud";
import { Soundcloud } from "soundcloud.ts";
import type { SoundcloudPlaylist, SoundcloudTrack } from "soundcloud.ts";
import { getValidClientId } from "./client-id-manager";

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "59BqQCyB9AWNYAglJEiHbp1h6keJHfrU";

if (!SOUNDCLOUD_CLIENT_ID) {
  throw new Error('SOUNDCLOUD_CLIENT_ID environment variable is required');
}

// Interface for SoundCloud transcoding
interface SoundCloudTranscoding {
  url: string;
  format: {
    protocol: string;
    mime_type?: string;
  };
}

interface SoundCloudPlaylistApi {
  tracks: SoundcloudTrack[];
}

// Initialize SoundCloud client with environment variable only
const sc = new Soundcloud(SOUNDCLOUD_CLIENT_ID);

console.log('SoundCloud client initialized with env client ID:', SOUNDCLOUD_CLIENT_ID.substring(0, 8) + '...');

// Function to get dynamic client ID for API calls
async function getDynamicClientId(): Promise<string> {
  try {
    return await getValidClientId();
  } catch (error) {
    console.warn('Failed to get dynamic client ID, using fallback:', error);
    return SOUNDCLOUD_CLIENT_ID;
  }
}

// Expand short URLs and clean up tracking parameters
async function cleanUrl(url: string): Promise<string> {
  try {
    // Handle SoundCloud short URLs (snd.sc and on.soundcloud.com)
    if (url.includes('snd.sc/') || url.includes('on.soundcloud.com/')) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'manual'
        });
        const location = response.headers.get('location');
        if (location && location.includes('soundcloud.com')) {
          url = location;
        }
      } catch (error) {
        console.log('Failed to expand short URL:', error);
        // Continue with original URL if expansion fails
      }
    }

    const urlObj = new URL(url);
    // Remove all tracking and sharing parameters
    ["si", "utm_source", "utm_medium", "utm_campaign", "ref", "in", "from"].forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Clean up the URL completely - remove all parameters for better compatibility
    let cleanedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    
    // Ensure proper format for SoundCloud URLs
    if (cleanedUrl.endsWith('/')) {
      cleanedUrl = cleanedUrl.slice(0, -1);
    }
    
    console.log('Original URL:', url);
    console.log('Cleaned URL:', cleanedUrl);
    
    return cleanedUrl;
  } catch (error) {
    console.log('Error cleaning URL:', error);
    return url;
  }
}

// Retry helper with exponential backoff
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(res => setTimeout(res, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

async function fetchAllTracksPaged(
  playlistUrl: string,
  trackCount: number,
  maxTracks = 500 // Increased default limit
): Promise<SoundcloudTrack[]> {
  const allTracks: SoundcloudTrack[] = [];
  const limit = 20;
  let offset = 0;
  const targetCount = Math.min(trackCount, maxTracks);

  console.log(`Fetching ${targetCount} tracks from SoundCloud playlist...`);

  while (offset < targetCount) {
    const url = `${playlistUrl}?limit=${limit}&offset=${offset}`;
    let playlistData: SoundCloudPlaylistApi | null = null;
    let fetchRetries = 0;

    while (fetchRetries < 3 && !playlistData) {
      try {
        playlistData = await retry(() => sc.playlists.get(url) as Promise<SoundCloudPlaylistApi>, 2, 300);
      } catch (error) {
        fetchRetries++;
        console.log(`Retry ${fetchRetries}/3 for offset ${offset}:`, error);
        await new Promise(res => setTimeout(res, 500)); // Longer delay on retry
      }
    }

    if (!playlistData || !Array.isArray(playlistData.tracks) || playlistData.tracks.length === 0) {
      console.log(`No more tracks found at offset ${offset}`);
      break;
    }

    allTracks.push(...playlistData.tracks);
    offset += playlistData.tracks.length;

    // Rate limiting delay
    await new Promise((res) => setTimeout(res, 300));

    if (allTracks.length >= maxTracks) break;
  }

  console.log(`Successfully fetched ${allTracks.length} tracks`);
  return allTracks.slice(0, maxTracks);
}

export async function resolvePlaylist(
  url: string,
  maxTracks = 500
): Promise<SoundCloudPlaylistApiResponse> {
  try {
    const clean = await cleanUrl(url);
    const clientId = await getDynamicClientId();
    console.log('Attempting to resolve SoundCloud URL:', clean);
    console.log('Using client ID:', clientId.substring(0, 8) + '...');

    // First, try the generic resolve method which is more reliable
    try {
      console.log('Using sc.resolve.get method...');
      const resolved = await retry(() => sc.resolve.get(clean), 3, 1000);
      console.log('Resolve response:', resolved ? { 
        kind: resolved.kind, 
        id: resolved.id, 
        title: resolved.title,
        tracksLength: resolved.tracks?.length || 0
      } : 'null');
      
      if (resolved) {
        if (resolved.kind === "playlist" && Array.isArray(resolved.tracks)) {
          console.log('Successfully resolved as playlist via resolve method');
          return await handlePlaylist(resolved, clean, maxTracks);
        } else if (resolved.kind === "track") {
          console.log('Successfully resolved as track via resolve method');
          return await handleSingleTrack(resolved);
        } else {
          console.log('Resolved but unknown type:', resolved.kind);
        }
      }
    } catch (resolveError) {
      console.log('General resolve failed:', resolveError instanceof Error ? resolveError.message : resolveError);
    }

    // Try to resolve as playlist using specific playlist method
    try {
      console.log('Trying specific playlist method...');
      const playlist = await retry(() => sc.playlists.get(clean) as Promise<SoundcloudPlaylist>, 3, 1000);
      console.log('Playlist response:', playlist ? { kind: playlist.kind, id: playlist.id, title: playlist.title } : 'null');
      
      if (playlist && playlist.kind === "playlist" && Array.isArray(playlist.tracks)) {
        console.log('Successfully resolved as playlist');
        return await handlePlaylist(playlist, clean, maxTracks);
      } else {
        console.log('Response is not a valid playlist:', playlist?.kind);
      }
    } catch (playlistError) {
      console.log('Playlist resolution failed:', playlistError instanceof Error ? playlistError.message : playlistError);
    }

    // Try to resolve as single track using specific track method
    try {
      console.log('Trying specific track method...');
      const track = await retry(() => sc.tracks.get(clean) as Promise<SoundcloudTrack>, 3, 1000);
      console.log('Track response:', track ? { kind: track.kind, id: track.id, title: track.title } : 'null');
      
      if (track && track.kind === "track") {
        console.log('Successfully resolved as track');
        return await handleSingleTrack(track);
      } else {
        console.log('Response is not a valid track:', track?.kind);
      }
    } catch (trackError) {
      console.log('Track resolution failed:', trackError instanceof Error ? trackError.message : trackError);
    }

    // If all methods fail, provide detailed error information
    const errorDetails = {
      originalUrl: url,
      cleanedUrl: clean,
      clientId: clientId ? 'Present' : 'Missing'
    };
    
    console.error('All resolution methods failed. Details:', errorDetails);
    throw new Error(`Unable to resolve SoundCloud URL: ${clean}. This could be because:\n- The playlist/track is private or deleted\n- The SoundCloud API is temporarily unavailable\n- Invalid URL format\n- Client ID is expired (update SOUNDCLOUD_CLIENT_ID in .env)\nPlease verify the URL is public and try again.`);
  } catch (err) {
    console.error("Error resolving SoundCloud URL:", err);
    throw err;
  }
}

// Handle playlist logic
async function handlePlaylist(
  playlist: SoundcloudPlaylist,
  clean: string,
  maxTracks: number
): Promise<SoundCloudPlaylistApiResponse> {
  try {
    // 2. Map playlist info with user avatar fallback
    const playlistInfo: SoundCloudPlaylistInfo = {
      id: String(playlist.id),
      title: playlist.title,
      description: playlist.description || "",
      artwork: playlist.artwork_url || playlist.user?.avatar_url || "",
      tracksCount: playlist.track_count || playlist.tracks.length,
    };
    // 3. Fetch all tracks if missing, with configurable limit
    let tracksRaw: SoundcloudTrack[] = playlist.tracks;
    if (playlistInfo.tracksCount > tracksRaw.length) {
      tracksRaw = await fetchAllTracksPaged(clean, playlistInfo.tracksCount, maxTracks);
    }
    // 4. Map tracks (thêm streamUrl thực sự)
    const tracks: SoundCloudTrackInfo[] = await Promise.all(tracksRaw.map(async (track) => {
      let streamUrl: string | null = null;
      try {
        if (track.media && Array.isArray(track.media.transcodings)) {
          const progressive = track.media.transcodings.find((t: SoundCloudTranscoding) => t.format.protocol === "progressive");
          if (progressive) {
            const clientId = await getDynamicClientId();
            const url = `${progressive.url}?client_id=${clientId}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              streamUrl = data.url || null;
            }
          }
        }
      } catch { }
      return {
        id: String(track.id),
        title: track.title,
        artist: track.user?.username || "",
        duration: track.duration,
        artwork: track.artwork_url || playlist.artwork_url || track.user?.avatar_url || "",
        url: track.permalink_url,
        streamUrl,
        size: undefined,
        bitrate: undefined,
        format: undefined,
      };
    }));
    return { playlistInfo, tracks };
  } catch (err) {
    throw err;
  }
}

// Handle single track logic
async function handleSingleTrack(track: SoundcloudTrack): Promise<SoundCloudPlaylistApiResponse> {
  try {
    // Get stream URL
    let streamUrl: string | null = null;
    try {
      if (track.media && Array.isArray(track.media.transcodings)) {
        const progressive = track.media.transcodings.find((t: any) => t.format.protocol === "progressive");
        if (progressive) {
          const clientId = await getDynamicClientId();
          const url = `${progressive.url}?client_id=${clientId}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            streamUrl = data.url || null;
          }
        }
      }
    } catch { }

    // Create playlist-like response for single track
    const playlistInfo: SoundCloudPlaylistInfo = {
      id: String(track.id),
      title: track.title,
      description: `Single track: ${track.title}`,
      artwork: track.artwork_url || track.user?.avatar_url || "",
      tracksCount: 1,
    };

    const tracks: SoundCloudTrackInfo[] = [{
      id: String(track.id),
      title: track.title,
      artist: track.user?.username || "",
      duration: track.duration,
      artwork: track.artwork_url || track.user?.avatar_url || "",
      url: track.permalink_url,
      streamUrl,
      size: undefined,
      bitrate: undefined,
      format: undefined,
    }];

    return { playlistInfo, tracks };
  } catch (err) {
    console.error("[SoundCloud Single Track API error]", err);
    throw err;
  }
}

// Download 1 track: lấy stream url thực sự
export async function downloadTrack(track: SoundcloudTrack): Promise<string | null> {
  if (!track.media || !Array.isArray(track.media.transcodings)) return null;
  const progressive = track.media.transcodings.find((t: any) => t.format.protocol === "progressive");
  if (!progressive) return null;
  const clientId = await getDynamicClientId();
  const url = `${progressive.url}?client_id=${clientId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

// Download 1 track: lấy stream url thực sự và tải file mp3 với progress
export async function downloadTrackWithProgress(track: SoundcloudTrack, onProgress?: (percent: number) => void): Promise<void> {
  if (!track.media || !Array.isArray(track.media.transcodings)) return;
  const progressive = track.media.transcodings.find((t: any) => t.format.protocol === "progressive");
  if (!progressive) return;
  const clientId = await getDynamicClientId();
  const url = `${progressive.url}?client_id=${clientId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.url) return;
    // Tải file mp3 thực sự với progress
    const audioRes = await fetch(data.url);
    if (!audioRes.ok || !audioRes.body) return;
    const contentLength = audioRes.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = audioRes.body.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (onProgress && total) {
          onProgress(Math.round((received / total) * 100));
        }
      }
    }
    // Gộp chunk và tạo file mp3 với tên là title của bài hát
    const blob = new Blob(chunks, { type: "audio/mpeg" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    // Sanitize filename và chỉ dùng title
    const sanitizedTitle = track.title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/[.]{2,}/g, '.') // Replace multiple dots with single dot
      .trim();
    a.download = `${sanitizedTitle}.mp3`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  } catch {
    // ignore
  }
}

// Download all: trả về mảng stream url cho toàn bộ track (có thể dùng Promise.all, chú ý rate limit)
export async function downloadAllTracks(tracks: SoundcloudTrack[]): Promise<(string | null)[]> {
  const downloadPromises = tracks.map(track => downloadTrack(track));
  const results = await Promise.all(downloadPromises);
  return results;
}

// Resolve single track info from URL
// Search tracks on SoundCloud
export async function searchTracks(
  query: string,
  limit = 20,
  offset = 0
): Promise<{ tracks: SoundCloudTrackInfo[]; hasMore: boolean }> {
  try {
    const searchResponse = await retry(() => 
      sc.tracks.search({
        q: query,
        limit,
        offset
      }),
      2,
      500
    );

    console.log('Search response structure:', {
      type: typeof searchResponse,
      isArray: Array.isArray(searchResponse),
      hasCollection: searchResponse && 'collection' in searchResponse,
      keys: searchResponse ? Object.keys(searchResponse) : []
    });

    // Handle different response structures
    let searchResults: SoundcloudTrack[];
    if (Array.isArray(searchResponse)) {
      searchResults = searchResponse;
    } else if (searchResponse && Array.isArray((searchResponse as any).collection)) {
      searchResults = (searchResponse as any).collection;
    } else if (searchResponse && Array.isArray((searchResponse as any).tracks)) {
      searchResults = (searchResponse as any).tracks;
    } else {
      console.error('Unexpected search response structure:', searchResponse);
      throw new Error(`Search API returned unexpected structure: ${typeof searchResponse}`);
    }

    console.log(`Found ${searchResults.length} search results`);

    // Filter out tracks that aren't streamable
    const streamableTracks = searchResults.filter(track => 
      track && 
      track.streamable && 
      track.media && 
      Array.isArray(track.media.transcodings) &&
      track.media.transcodings.length > 0
    );

    console.log(`${streamableTracks.length} tracks are streamable`);

    // Map tracks to our format
    const tracks: SoundCloudTrackInfo[] = await Promise.all(
      streamableTracks.map(async (track) => {
        let streamUrl: string | null = null;
        try {
          if (track.media && Array.isArray(track.media.transcodings)) {
            const progressive = track.media.transcodings.find((t: SoundCloudTranscoding) => t.format.protocol === "progressive");
            if (progressive) {
              const clientId = await getDynamicClientId();
              const url = `${progressive.url}?client_id=${clientId}`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                streamUrl = data.url || null;
              }
            }
          }
        } catch { }
        
        return {
          id: String(track.id),
          title: track.title,
          artist: track.user?.username || "",
          duration: track.duration,
          artwork: track.artwork_url || track.user?.avatar_url || "",
          url: track.permalink_url,
          streamUrl,
          size: undefined,
          bitrate: undefined,
          format: undefined,
        };
      })
    );

    return {
      tracks,
      hasMore: searchResults.length === limit // If we got the full limit, there might be more
    };
  } catch (err) {
    console.error("Error searching SoundCloud tracks:", err);
    throw err;
  }
}

export async function resolveTrack(url: string) {
  try {
    const clean = await cleanUrl(url);
    // 1. Resolve track bằng soundcloud.ts
    const track = await retry(() => sc.tracks.get(clean) as Promise<SoundcloudTrack>, 2, 500);
    if (!track || track.kind !== "track") {
      throw new Error("URL is not a valid track");
    }
    // 2. Map track info (thêm streamUrl thực sự)
    let streamUrl: string | null = null;
    try {
      if (track.media && Array.isArray(track.media.transcodings)) {
        const progressive = track.media.transcodings.find((t: any) => t.format.protocol === "progressive");
        if (progressive) {
          const clientId = await getDynamicClientId();
          const url = `${progressive.url}?client_id=${clientId}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            streamUrl = data.url || null;
          }
        }
      }
    } catch { }
    return {
      id: String(track.id),
      title: track.title,
      artist: track.user?.username || "",
      duration: track.duration,
      artwork: track.artwork_url || track.user?.avatar_url || "",
      url: track.permalink_url,
      streamUrl,
      size: undefined,
      bitrate: undefined,
      format: undefined,
    };
  } catch (err) {
    throw err;
  }
}
