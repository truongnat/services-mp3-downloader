import { CommonTrackInfo } from "@/lib/download-utils";
import { YouTubeTrackInfo } from "@/types/youtube";
import { SoundCloudTrackInfo } from "@/types/soundcloud";

// Convert YouTube track to common format
export function youtubeToCommon(track: YouTubeTrackInfo): CommonTrackInfo {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    artwork: track.artwork,
    url: track.url,
    streamUrl: track.streamUrl || '',
    format: track.format,
    size: typeof track.size === 'string' ? parseInt(track.size) : undefined,
    bitrate: typeof track.bitrate === 'string' ? parseInt(track.bitrate) : undefined
  };
}

// Convert SoundCloud track to common format
export function soundcloudToCommon(track: SoundCloudTrackInfo): CommonTrackInfo {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    artwork: track.artwork,
    url: track.url,
    streamUrl: track.streamUrl || '',
    format: track.format,
    size: typeof track.size === 'string' ? parseInt(track.size) : undefined,
    bitrate: typeof track.bitrate === 'string' ? parseInt(track.bitrate) : undefined
  };
}

// Convert array of YouTube tracks
export function youtubeTracksToCommon(tracks: YouTubeTrackInfo[]): CommonTrackInfo[] {
  return tracks.map(youtubeToCommon);
}

// Convert array of SoundCloud tracks
export function soundcloudTracksToCommon(tracks: SoundCloudTrackInfo[]): CommonTrackInfo[] {
  return tracks.map(soundcloudToCommon);
}

// Generic converter function
export function tracksToCommon<T extends YouTubeTrackInfo | SoundCloudTrackInfo>(
  tracks: T[],
  platform: 'youtube' | 'soundcloud'
): CommonTrackInfo[] {
  switch (platform) {
    case 'youtube':
      return youtubeTracksToCommon(tracks as YouTubeTrackInfo[]);
    case 'soundcloud':
      return soundcloudTracksToCommon(tracks as SoundCloudTrackInfo[]);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
