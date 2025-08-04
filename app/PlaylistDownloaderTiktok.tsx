"use client"
import PlaylistDownloader from "@/components/playlist/playlist-downloader"

interface PlaylistDownloaderTiktokProps {
  setDisableTabs?: (v: boolean) => void;
}

export default function PlaylistDownloaderTiktok({ setDisableTabs }: PlaylistDownloaderTiktokProps) {
  return (
    <PlaylistDownloader
      platform="tiktok"
      apiEndpoint="/api/tiktok/playlist"
      title="TikTok Video Downloader"
      setDisableTabs={setDisableTabs}
    />
  );
}