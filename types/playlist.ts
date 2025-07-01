export interface PlaylistInfo {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  tracksCount: number;
}

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  duration: number; // ms
  artwork?: string;
  url: string;
  streamUrl: string | null;
  size?: string;
  bitrate?: string;
  format?: string;
}

export interface PlaylistApiResponse {
  playlistInfo: PlaylistInfo;
  tracks: TrackInfo[];
}
