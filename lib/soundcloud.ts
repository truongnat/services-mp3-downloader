import { PlaylistInfo, TrackInfo, PlaylistApiResponse } from "@/types/playlist";
import { Soundcloud } from "soundcloud.ts";
import type { SoundcloudPlaylist, SoundcloudTrack } from "soundcloud.ts";

const SOUNDCLOUD_CLIENT_ID = "1JEFtFgP4Mocy0oEGJj2zZ0il9pEpBrM";

interface SoundCloudPlaylistApi {
  tracks: SoundcloudTrack[];
}

const sc = new Soundcloud(SOUNDCLOUD_CLIENT_ID);

// Clean up the URL by removing tracking parameters
function cleanUrl(url: string): string {
  try {
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

async function fetchAllTracksPaged(playlistUrl: string, trackCount: number, maxTracks = 50): Promise<SoundcloudTrack[]> {
  const allTracks: SoundcloudTrack[] = [];
  const limit = 20;
  let offset = 0;
  while (offset < Math.min(trackCount, maxTracks)) {
    const url = `${playlistUrl}?limit=${limit}&offset=${offset}`;
    let playlistData: SoundCloudPlaylistApi | null = null;
    let fetchRetries = 0;
    while (fetchRetries < 2 && !playlistData) {
      try {
        playlistData = await retry(() => sc.playlists.get(url) as Promise<SoundCloudPlaylistApi>, 2, 300);
      } catch {
        fetchRetries++;
        await new Promise(res => setTimeout(res, 300));
      }
    }
    if (!playlistData || !Array.isArray(playlistData.tracks) || playlistData.tracks.length === 0) break;
    allTracks.push(...playlistData.tracks);
    offset += playlistData.tracks.length;
    await new Promise((res) => setTimeout(res, 200));
    if (allTracks.length >= maxTracks) break;
  }
  return allTracks.slice(0, maxTracks);
}

export async function resolvePlaylist(url: string): Promise<PlaylistApiResponse> {
  try {
    const clean = cleanUrl(url);
    // 1. Resolve playlist bằng soundcloud.ts, ép kiểu rõ ràng
    const playlist = await retry(() => sc.playlists.get(clean) as Promise<SoundcloudPlaylist>, 2, 500);
    if (!playlist || playlist.kind !== "playlist" || !Array.isArray(playlist.tracks)) {
      throw new Error("URL is not a valid playlist");
    }
    // 2. Map playlist info
    const playlistInfo: PlaylistInfo = {
      id: String(playlist.id),
      title: playlist.title,
      description: playlist.description || "",
      artwork: playlist.artwork_url || "",
      tracksCount: playlist.track_count || playlist.tracks.length,
    };
    // 3. Fetch all tracks if missing, limit 50
    let tracksRaw: SoundcloudTrack[] = playlist.tracks;
    if (playlistInfo.tracksCount > tracksRaw.length) {
      tracksRaw = await fetchAllTracksPaged(clean, playlistInfo.tracksCount, 50);
    }
    // 4. Map tracks (thêm streamUrl thực sự)
    const tracks: TrackInfo[] = await Promise.all(tracksRaw.map(async (track) => {
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
      } catch {}
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
    // eslint-disable-next-line no-console
    console.error("[SoundCloud API error]", err);
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
  const results: (string | null)[] = [];
  for (const track of tracks) {
    // Có thể thêm delay ở đây nếu cần tránh rate limit
    // eslint-disable-next-line no-await-in-loop
    results.push(await downloadTrack(track));
  }
  return results;
}

// Resolve single track info from URL
export async function resolveTrack(url: string) {
  try {
    const clean = cleanUrl(url);
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
    } catch {}
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
    // eslint-disable-next-line no-console
    console.error("[SoundCloud API error]", err);
    throw err;
  }
}
