export interface SoundCloudPlaylistInfo {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  tracksCount: number;
}

export interface SoundCloudTrackInfo {
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

export interface SoundCloudPlaylistApiResponse {
  playlistInfo: SoundCloudPlaylistInfo;
  tracks: SoundCloudTrackInfo[];
}

export interface SoundCloudTrackApiResponse {
  track: SoundCloudTrackInfo;
}
