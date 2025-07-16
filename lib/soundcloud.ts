import { Soundcloud } from "soundcloud.ts";
import {
  SoundCloudPlaylistInfo,
  SoundCloudTrackInfo,
} from "@/types/soundcloud";

const soundcloud = new Soundcloud();

const cleanUrl = (url: string) => {
  const urlObj = new URL(url);
  urlObj.search = "";
  return urlObj.toString();
};

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await delay(delayMs);
      return retry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

async function fetchAllTracks(initialTracks: SoundCloudTrackInfo[]) {
  let allTracks = [...initialTracks];
  let nextHref = (initialTracks as any).next_href;

  while (nextHref) {
    const result = await retry(() => soundcloud.resolve.get(nextHref));
    allTracks = allTracks.concat(result.collection);
    nextHref = result.next_href;
  }

  return allTracks;
}

export async function resolvePlaylist(url: string) {
  const playlist = await retry(() =>
    soundcloud.playlists.resolve(cleanUrl(url))
  );
  const tracks = await fetchAllTracks(playlist.tracks);
  return {
    playlistInfo: playlist as SoundCloudPlaylistInfo,
    tracks: tracks as SoundCloudTrackInfo[],
  };
}

export async function resolveTrack(url: string) {
  const track = await retry(() => soundcloud.tracks.resolve(cleanUrl(url)));
  return track as SoundCloudTrackInfo;
}

export async function getTrackDownloadUrl(track: SoundCloudTrackInfo) {
  const streamUrl = await soundcloud.util.streamLink(track);
  if (!streamUrl)
    throw new Error(
      `Could not get stream URL for track: ${track.title}. The track may not be available for streaming or downloading.`
    );
  return streamUrl;
}

export async function downloadTrack(track: SoundCloudTrackInfo) {
  const streamUrl = await getTrackDownloadUrl(track);
  const res = await fetch(streamUrl);
  return res.body;
}

export async function downloadTrackWithProgress(
  track: SoundCloudTrackInfo,
  onProgress: (progress: number) => void
) {
  const streamUrl = await getTrackDownloadUrl(track);
  const res = await fetch(streamUrl);
  const totalSize = Number(res.headers.get("content-length"));
  let downloadedSize = 0;

  const reader = res.body!.getReader();
  const stream = new ReadableStream({
    start(controller) {
      function push() {
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          downloadedSize += value.length;
          onProgress(downloadedSize / totalSize);
          controller.enqueue(value);
          push();
        });
      }
      push();
    },
  });

  return stream;
}

export async function downloadAllTracks(
  tracks: SoundCloudTrackInfo[],
  onProgress: (progress: number, track: SoundCloudTrackInfo) => void
) {
  const streams = await Promise.all(
    tracks.map(async (track) => {
      const stream = await downloadTrackWithProgress(track, (p) =>
        onProgress(p, track)
      );
      return stream;
    })
  );
  return streams;
}
