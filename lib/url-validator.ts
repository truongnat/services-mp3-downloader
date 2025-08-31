// URL validation and normalization utilities

export interface URLValidationResult {
  isValid: boolean;
  platform: 'soundcloud' | 'unknown';
  type: 'playlist' | 'track' | 'unknown';
  id?: string;
  normalizedUrl?: string;
  error?: string;
}

// SoundCloud URL patterns
const SOUNDCLOUD_PATTERNS = {
  track: [
    /^https?:\/\/soundcloud\.com\/[^\/]+\/[^\/]+(?:\?.*)?$/,
    /^https?:\/\/snd\.sc\/[^\/]+$/,
    /^https?:\/\/on\.soundcloud\.com\/[^\/]+$/
  ],
  playlist: [
    /^https?:\/\/soundcloud\.com\/[^\/]+\/sets\/[^\/]+(?:\?.*)?$/
  ]
};

export function validateSoundCloudURL(url: string): URLValidationResult {
  try {
    // Check for playlist URLs first (more specific)
    for (const pattern of SOUNDCLOUD_PATTERNS.playlist) {
      if (pattern.test(url)) {
        return {
          isValid: true,
          platform: 'soundcloud',
          type: 'playlist',
          normalizedUrl: url
        };
      }
    }

    // Check for track URLs (includes short URLs that could be either)
    for (const pattern of SOUNDCLOUD_PATTERNS.track) {
      if (pattern.test(url)) {
        return {
          isValid: true,
          platform: 'soundcloud',
          type: 'track',
          normalizedUrl: url
        };
      }
    }

    return {
      isValid: false,
      platform: 'soundcloud',
      type: 'unknown',
      error: 'Invalid SoundCloud URL format'
    };
  } catch (error) {
    return {
      isValid: false,
      platform: 'soundcloud',
      type: 'unknown',
      error: 'Failed to parse SoundCloud URL'
    };
  }
}

// Detect SoundCloud URL type specifically
export function detectSoundCloudType(url: string): 'track' | 'playlist' | 'ambiguous' | 'unknown' {
  // Playlist URLs have '/sets/' in them - definitely playlist
  if (url.includes('/sets/')) {
    return 'playlist';
  }

  // Standard track URLs - definitely track
  if (/^https?:\/\/soundcloud\.com\/[^\/]+\/[^\/]+(?:\?.*)?$/.test(url)) {
    return 'track';
  }

  // Short URLs - could be either track or playlist, need to try both
  if (url.includes('snd.sc/') || url.includes('on.soundcloud.com/')) {
    return 'ambiguous';
  }

  return 'unknown';
}

export function validateURL(url: string): URLValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      platform: 'unknown',
      type: 'unknown',
      error: 'Invalid URL provided'
    };
  }

  // Only detect SoundCloud platform
  if (url.includes('soundcloud.com') || url.includes('snd.sc') || url.includes('on.soundcloud.com')) {
    return validateSoundCloudURL(url);
  } else {
    return {
      isValid: false,
      platform: 'unknown',
      type: 'unknown',
      error: 'Only SoundCloud URLs are supported'
    };
  }
}

// Supported URL examples for documentation
export const SUPPORTED_URLS = {
  soundcloud: {
    track: [
      'https://soundcloud.com/artist/track-name',
      'https://snd.sc/shortcode',
      'https://on.soundcloud.com/shortcode'
    ],
    playlist: [
      'https://soundcloud.com/artist/sets/playlist-name'
    ]
  }
};
