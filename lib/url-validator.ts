// URL validation and normalization utilities

export interface URLValidationResult {
  isValid: boolean;
  platform: 'youtube' | 'soundcloud' | 'unknown';
  type: 'video' | 'playlist' | 'track' | 'unknown';
  id?: string;
  normalizedUrl?: string;
  error?: string;
}

// YouTube URL patterns
const YOUTUBE_PATTERNS = {
  video: [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
    /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ],
  playlist: [
    /[?&]list=([^&\n?#]+)/,
    /^(PL[a-zA-Z0-9_-]+)$/,
    /^(UU[a-zA-Z0-9_-]+)$/,
    /^(FL[a-zA-Z0-9_-]+)$/
  ]
};

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

export function validateYouTubeURL(url: string): URLValidationResult {
  try {
    // Check for video ID
    for (const pattern of YOUTUBE_PATTERNS.video) {
      const match = url.match(pattern);
      if (match) {
        return {
          isValid: true,
          platform: 'youtube',
          type: 'video',
          id: match[1],
          normalizedUrl: `https://www.youtube.com/watch?v=${match[1]}`
        };
      }
    }

    // Check for playlist ID
    for (const pattern of YOUTUBE_PATTERNS.playlist) {
      const match = url.match(pattern);
      if (match) {
        return {
          isValid: true,
          platform: 'youtube',
          type: 'playlist',
          id: match[1],
          normalizedUrl: `https://www.youtube.com/playlist?list=${match[1]}`
        };
      }
    }

    return {
      isValid: false,
      platform: 'youtube',
      type: 'unknown',
      error: 'Invalid YouTube URL format'
    };
  } catch (error) {
    return {
      isValid: false,
      platform: 'youtube',
      type: 'unknown',
      error: 'Failed to parse YouTube URL'
    };
  }
}

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

// Detect YouTube URL type specifically
export function detectYouTubeType(url: string): 'video' | 'playlist' | 'unknown' {
  // Check for playlist parameter
  if (url.includes('list=') || url.includes('&list=') || url.includes('?list=')) {
    return 'playlist';
  }

  // Check for video patterns
  for (const pattern of YOUTUBE_PATTERNS.video) {
    if (pattern.test(url)) {
      return 'video';
    }
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

  // Detect platform
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return validateYouTubeURL(url);
  } else if (url.includes('soundcloud.com') || url.includes('snd.sc') || url.includes('on.soundcloud.com')) {
    return validateSoundCloudURL(url);
  } else {
    return {
      isValid: false,
      platform: 'unknown',
      type: 'unknown',
      error: 'Unsupported platform'
    };
  }
}

// Supported URL examples for documentation
export const SUPPORTED_URLS = {
  youtube: {
    video: [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'dQw4w9WgXcQ'
    ],
    playlist: [
      'https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMt9xaJGA6H_VjlXEL',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy6nuLMt9xaJGA6H_VjlXEL',
      'PLrAXtmRdnEQy6nuLMt9xaJGA6H_VjlXEL'
    ]
  },
  soundcloud: {
    track: [
      'https://soundcloud.com/artist/track-name',
      'https://snd.sc/abc123',
      'https://on.soundcloud.com/0nFvzj8oFP9Od6YJma'
    ],
    playlist: [
      'https://soundcloud.com/artist/sets/playlist-name',
      'https://snd.sc/playlist123',
      'https://on.soundcloud.com/G0AB3jVHxn3qWbRHJj'
    ]
  },
  tiktok: {
    video: [
      'https://www.tiktok.com/@username/video/1234567890123456789',
      'https://vm.tiktok.com/ZM8c9g9g9/'
    ]
  }
};
