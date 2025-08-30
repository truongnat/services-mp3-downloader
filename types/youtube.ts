export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  tracksCount: number;
  author?: string;
}

export interface YouTubeTrackInfo {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  artwork?: string;
  url: string;
  streamUrl: string | null;
  size?: string;
  bitrate?: string;
  format?: string;
}

export interface YouTubePlaylistApiResponse {
  playlistInfo: YouTubePlaylistInfo;
  tracks: YouTubeTrackInfo[];
}

export interface YouTubeAudioOptions {
  id: string;
  quality?: 'max' | '1080' | '720' | '480' | '360' | '240' | '144';
  codec?: 'h264' | 'vp9' | 'av1';
  format?: 'mp3' | 'm4a' | 'opus';
  client?: string;
}

export interface YouTubeAudioResult {
  type: 'audio';
  isAudioOnly: true;
  urls: string | string[];
  filename: string;
  bestAudio: string;
  cover?: string;
  cropCover?: boolean;
  fileMetadata?: {
    title: string;
    artist: string;
    album?: string;
    year?: number;
    duration?: number;
  };
  error?: string;
}
