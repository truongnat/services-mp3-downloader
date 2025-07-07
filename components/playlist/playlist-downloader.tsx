"use client"
import { useCallback } from "react";
import { usePlaylistDownloader } from "@/lib/hooks/use-playlist-downloader";
import { downloadTrack } from "@/lib/platform-downloads";
import { CommonTrackInfo, DownloadProgress } from "@/lib/download-utils";

// Components
import PlaylistInput from "./playlist-input";
import PlaylistHeader from "./playlist-header";
import TrackList from "./track-list";
import MacOSTip from "./macos-tip";

interface PlaylistDownloaderProps {
  platform: 'youtube' | 'soundcloud';
  apiEndpoint: string;
  title: string;
  setDisableTabs?: (v: boolean) => void;
}

export default function PlaylistDownloader({
  platform,
  apiEndpoint,
  title,
  setDisableTabs
}: PlaylistDownloaderProps) {
  const {
    playlist,
    downloadState,
    url,
    audioSettings,
    allDownloadsComplete,
    setUrl,
    loadPlaylist,
    updateTrackStatus,
    startDownloadSession,
    endDownloadSession,
    showMacOSTip,
    hideMacOSTip,
    getTrackStatus
  } = usePlaylistDownloader<CommonTrackInfo>();

  // Handle single track download
  const handleDownloadTrack = useCallback(async (track: CommonTrackInfo, index: number) => {
    const trackId = track.id;
    updateTrackStatus(trackId, { status: "downloading", progress: 0 });

    try {
      await downloadTrack(
        track,
        index,
        audioSettings,
        platform,
        (progress: DownloadProgress) => {
          updateTrackStatus(trackId, { progress: progress.percent });
        },
        showMacOSTip
      );

      updateTrackStatus(trackId, { status: "done", progress: 100 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      updateTrackStatus(trackId, { status: "error", progress: 0, error: message });
    }
  }, [audioSettings, platform, updateTrackStatus, showMacOSTip]);

  // Handle download all tracks
  const handleDownloadAll = useCallback(async () => {
    if (playlist.tracks.length === 0) return;

    startDownloadSession();
    setDisableTabs?.(true);

    try {
      // Download tracks sequentially to avoid overwhelming the server
      for (let i = 0; i < playlist.tracks.length; i++) {
        const track = playlist.tracks[i];
        const status = getTrackStatus(track.id);

        // Skip already downloaded tracks
        if (status.status === "done") continue;

        await handleDownloadTrack(track, i);
      }
    } finally {
      endDownloadSession();
      setDisableTabs?.(false);
    }
  }, [playlist.tracks, startDownloadSession, endDownloadSession, handleDownloadTrack, getTrackStatus, setDisableTabs]);

  // Handle load playlist
  const handleLoadPlaylist = useCallback(() => {
    loadPlaylist(apiEndpoint);
  }, [loadPlaylist, apiEndpoint]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>



      {/* URL Input */}
      <PlaylistInput
        url={url}
        onUrlChange={setUrl}
        onSubmit={handleLoadPlaylist}
        isLoading={playlist.isLoading}
        error={playlist.error}
        platform={platform}
      />

      {/* macOS Tip */}
      <MacOSTip
        show={downloadState.showMacTip}
        onClose={hideMacOSTip}
      />

      {/* Playlist Header */}
      {playlist.info && (
        <PlaylistHeader
          title={playlist.info.title}
          description={playlist.info.description}
          coverUrl={playlist.info.artwork}
          tracksCount={playlist.tracks.length}
          totalDuration={playlist.info.totalDuration}
          isDownloading={downloadState.isDownloading}
          downloadedCount={downloadState.downloadedCount}
          onDownloadAll={handleDownloadAll}
          platform={platform}
        />
      )}

      {/* Track List */}
      {playlist.tracks.length > 0 && (
        <TrackList
          tracks={playlist.tracks}
          getTrackStatus={getTrackStatus}
          onDownloadTrack={handleDownloadTrack}
          isDownloading={downloadState.isDownloading}
        />
      )}

      {/* Success Message */}
      {allDownloadsComplete && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium">
            🎉 All downloads completed successfully!
          </p>
        </div>
      )}
    </div>
  );
}
