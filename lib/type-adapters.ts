// Type adapters to convert platform-specific types to common types
import { CommonTrackInfo } from "@/types/common";
import { SoundCloudTrackInfo } from "@/types/soundcloud";

/**
 * Convert SoundCloud track info to common track info
 */
export function soundcloudToCommon(track: SoundCloudTrackInfo): CommonTrackInfo {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: Math.floor(track.duration / 1000), // Convert ms to seconds for consistency
    artwork: track.artwork,
    url: track.url,
    streamUrl: track.streamUrl,
    size: track.size,
    bitrate: track.bitrate,
    format: track.format,
  };
}

/**
 * Convert common track info to SoundCloud track info
 */
export function commonToSoundcloud(track: CommonTrackInfo): SoundCloudTrackInfo {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration * 1000, // Convert seconds to ms
    artwork: track.artwork,
    url: track.url,
    streamUrl: track.streamUrl,
    size: track.size,
    bitrate: track.bitrate,
    format: track.format,
  };
}