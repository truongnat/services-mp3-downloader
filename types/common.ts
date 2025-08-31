// Common types shared across platforms
export interface CommonTrackInfo {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds for YouTube, milliseconds for SoundCloud
  artwork?: string;
  url: string;
  streamUrl: string | null;
  size?: string;
  bitrate?: string;
  format?: string;
}

export interface CommonPlaylistInfo {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  tracksCount: number;
  author?: string;
}

export interface CommonPlaylistApiResponse {
  playlistInfo: CommonPlaylistInfo;
  tracks: CommonTrackInfo[];
}

// Error messages
export const ERROR_MESSAGES = {
  INVALID_URL: "Invalid URL provided",
  FETCH_FAILED: "Failed to fetch data",
  NO_TRACKS: "No tracks found",
  UNKNOWN_ERROR: "An unknown error occurred",
  VIDEO_UNAVAILABLE: "Video is unavailable or has been removed",
  PRIVATE_VIDEO: "Private videos cannot be accessed",
  PLAYLIST_NOT_FOUND: "Playlist not found or is private",
  NETWORK_ERROR: "Network error occurred",
  RATE_LIMITED: "Rate limited, please try again later"
} as const;

// Utility functions
export function formatDuration(duration: number | string | undefined): string | undefined {
  if (!duration) return undefined;
  
  const durationNum = typeof duration === 'string' ? parseInt(duration, 10) : duration;
  if (isNaN(durationNum)) return undefined;
  
  // Convert milliseconds to seconds if needed (SoundCloud uses ms, YouTube uses seconds)
  const seconds = durationNum > 10000 ? Math.floor(durationNum / 1000) : durationNum;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatFileSize(size: string | number | undefined): string | undefined {
  if (!size) return undefined;
  
  const sizeNum = typeof size === 'string' ? parseFloat(size) : size;
  if (isNaN(sizeNum)) return undefined;
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = sizeNum;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
}

export function formatBitrate(bitrate: string | number | undefined): string | undefined {
  if (!bitrate) return undefined;
  
  const bitrateNum = typeof bitrate === 'string' ? parseInt(bitrate, 10) : bitrate;
  if (isNaN(bitrateNum)) return undefined;
  
  return `${bitrateNum} kbps`;
}