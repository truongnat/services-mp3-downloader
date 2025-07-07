"use client"
import PlaylistDownloader from "@/components/playlist/playlist-downloader"

interface PlaylistDownloaderSoundCloudProps {
  setDisableTabs?: (v: boolean) => void;
}

export default function PlaylistDownloaderSoundCloud({ setDisableTabs }: PlaylistDownloaderSoundCloudProps) {
  return (
    <PlaylistDownloader
      platform="soundcloud"
      apiEndpoint="/api/soundcloud/playlist"
      title="SoundCloud Playlist Downloader"
      setDisableTabs={setDisableTabs}
    />
  );
}
