export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  tracksCount: number;
}

export interface YouTubeTrackInfo {
  id: string;
  title: string;
  artist: string;
  duration: number; // ms
  artwork?: string;
  url: string;
  streamUrl: string | null;
  videoId?: string;
  itag?: string;
  size?: string;
  bitrate?: string;
  format?: string;
}

export interface YouTubePlaylistApiResponse {
  playlistInfo: YouTubePlaylistInfo;
  tracks: YouTubeTrackInfo[];
}
