"use client"
import PlaylistDownloader from "@/components/playlist/playlist-downloader"

interface PlaylistDownloaderYouTubeProps {
  setDisableTabs?: (v: boolean) => void;
}

export default function PlaylistDownloaderYouTube({ setDisableTabs }: PlaylistDownloaderYouTubeProps) {
  return (
    <PlaylistDownloader
      platform="youtube"
      apiEndpoint="/api/youtube/playlist"
      title="YouTube Playlist Downloader"
      setDisableTabs={setDisableTabs}
    />
  );
}
