import { SoundCloudPlaylistApiResponse, SoundCloudPlaylistInfo, SoundCloudTrackInfo } from "@/types/soundcloud";
import { Soundcloud } from "soundcloud.ts";
import type { SoundcloudPlaylist, SoundcloudTrack } from "soundcloud.ts";

const SOUNDCLOUD_CLIENT_ID = "59BqQCyB9AWNYAglJEiHbp1h6keJHfrU";

interface SoundCloudPlaylistApi {
  tracks: SoundcloudTrack[];
}

const sc = new Soundcloud(SOUNDCLOUD_CLIENT_ID);

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
    ["si", "utm_source", "utm_medium", "utm_campaign"].forEach(param => {
      urlObj.searchParams.delete(param);
    });
    return urlObj.toString().split("?")[0];
  } catch {
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

    // Try to resolve as playlist first
    try {
      const playlist = await retry(() => sc.playlists.get(clean) as Promise<SoundcloudPlaylist>, 2, 500);
      if (playlist && playlist.kind === "playlist" && Array.isArray(playlist.tracks)) {
        return await handlePlaylist(playlist, clean, maxTracks);
      }
    } catch (playlistError) {
      console.log('Not a playlist, trying as single track...');
    }

    // If not a playlist, try to resolve as single track
    try {
      const track = await retry(() => sc.tracks.get(clean) as Promise<SoundcloudTrack>, 2, 500);
      if (track && track.kind === "track") {
        return await handleSingleTrack(track);
      }
    } catch (trackError) {
      console.log('Not a track either');
    }

    throw new Error("URL is not a valid SoundCloud playlist or track");
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
    // 2. Map playlist info
    const playlistInfo: SoundCloudPlaylistInfo = {
      id: String(playlist.id),
      title: playlist.title,
      description: playlist.description || "",
      artwork: playlist.artwork_url || "",
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
          const progressive = track.media.transcodings.find(t => t.format.protocol === "progressive");
          if (progressive) {
            const url = `${progressive.url}?client_id=${SOUNDCLOUD_CLIENT_ID}`;
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
        artwork: track.artwork_url || playlist.artwork_url || "",
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
        const progressive = track.media.transcodings.find(t => t.format.protocol === "progressive");
        if (progressive) {
          const url = `${progressive.url}?client_id=${SOUNDCLOUD_CLIENT_ID}`;
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
      artwork: track.artwork_url || "",
      tracksCount: 1,
    };

    const tracks: SoundCloudTrackInfo[] = [{
      id: String(track.id),
      title: track.title,
      artist: track.user?.username || "",
      duration: track.duration,
      artwork: track.artwork_url || "",
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
  const progressive = track.media.transcodings.find(t => t.format.protocol === "progressive");
  if (!progressive) return null;
  const url = `${progressive.url}?client_id=${SOUNDCLOUD_CLIENT_ID}`;
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
  const progressive = track.media.transcodings.find(t => t.format.protocol === "progressive");
  if (!progressive) return;
  const url = `${progressive.url}?client_id=${SOUNDCLOUD_CLIENT_ID}`;
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
    // Gộp chunk và tạo file mp3
    const blob = new Blob(chunks, { type: "audio/mpeg" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${track.title}.mp3`;
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
        const progressive = track.media.transcodings.find(t => t.format.protocol === "progressive");
        if (progressive) {
          const url = `${progressive.url}?client_id=${SOUNDCLOUD_CLIENT_ID}`;
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
      artwork: track.artwork_url || "",
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
