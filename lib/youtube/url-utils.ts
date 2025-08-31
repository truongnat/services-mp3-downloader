/**
 * Client-safe YouTube URL utility functions
 * These functions can be safely imported in client-side components
 */

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract playlist ID from YouTube URL
 */
export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([^&\n?#]+)/,
    /^(PL[a-zA-Z0-9_-]+)$/,
    /^(UU[a-zA-Z0-9_-]+)$/,
    /^(FL[a-zA-Z0-9_-]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if URL contains a radio/mix playlist and clean it
 */
export function cleanRadioMixUrl(url: string): {
  isRadioMix: boolean;
  cleanUrl: string;
  videoId?: string;
} {
  const playlistMatch = url.match(/[?&]list=([^&\n?#]+)/);

  if (playlistMatch) {
    const playlistId = playlistMatch[1];
    if (playlistId.startsWith("RD")) {
      // Extract video ID from radio/mix URL
      const videoIdMatch = url.match(/[?&]v=([^&\n?#]+)/);
      if (videoIdMatch) {
        return {
          isRadioMix: true,
          cleanUrl: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
          videoId: videoIdMatch[1],
        };
      }
    }
  }

  return {
    isRadioMix: false,
    cleanUrl: url,
  };
}

/**
 * Helper to check if URL is a video or playlist
 */
export function isPlaylistUrl(url: string): boolean {
  const playlistId = extractPlaylistId(url);
  const videoId = extractVideoId(url);

  // If has playlist ID but no video ID, it's a playlist
  // If has both, treat as single video (common in YouTube Music)
  return !!playlistId && !videoId;
}

export function isVideoUrl(url: string): boolean {
  return !!extractVideoId(url);
}