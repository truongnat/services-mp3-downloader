export interface TikTokPlaylistInfo {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  tracksCount: number;
}

export interface TikTokTrackInfo {
  id: string;
  title: string;
  author: string;
  duration: number; // ms
  artwork?: string;
  url: string;
  streamUrl: string | null;
  size?: string;
  bitrate?: string;
  format?: string;
}

export interface TikTokPlaylistApiResponse {
  playlistInfo: TikTokPlaylistInfo;
  tracks: TikTokTrackInfo[];
}