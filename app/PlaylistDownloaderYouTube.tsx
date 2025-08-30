"use client"
import { useCallback, useState } from "react";
import { usePlaylistDownloader } from "@/lib/hooks/use-playlist-downloader";
import { useEnhancedDownloader, TrackDownloadInfo } from "@/lib/hooks/use-enhanced-downloader";
import { CommonTrackInfo } from "@/lib/download-utils";

// Components
import PlaylistInput from "@/components/playlist/playlist-input";
import PlaylistHeader from "@/components/playlist/playlist-header";
import TrackList from "@/components/playlist/track-list";
import { Button } from "@/components/ui/button";

interface PlaylistDownloaderYouTubeProps {
  setDisableTabs?: (v: boolean) => void;
}

export default function PlaylistDownloaderYouTube({ setDisableTabs }: PlaylistDownloaderYouTubeProps) {
  const {
    playlist,
    url,
    setUrl,
    loadPlaylist,
  } = usePlaylistDownloader<CommonTrackInfo>();

  const {
    downloadState,
    downloadTrack,
    downloadPlaylist,
    cancelDownloads,
    resetDownloadState
  } = useEnhancedDownloader();

  // Handle single track download
  const handleDownloadTrack = useCallback(async (track: CommonTrackInfo) => {
    const trackInfo: TrackDownloadInfo = {
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      platform: 'youtube',
    };
    
    await downloadTrack(trackInfo);
  }, [downloadTrack]);

  // Handle download all tracks
  const handleDownloadAll = useCallback(async () => {
    if (playlist.tracks.length === 0) return;

    setDisableTabs?.(true);
    
    try {
      const tracksInfo: TrackDownloadInfo[] = playlist.tracks.map(track => ({
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist,
        platform: 'youtube' as const,
      }));

      await downloadPlaylist(tracksInfo);
    } finally {
      setDisableTabs?.(false);
    }
  }, [playlist.tracks, downloadPlaylist, setDisableTabs]);

  // Handle load playlist
  const handleLoadPlaylist = useCallback(() => {
    loadPlaylist('/api/youtube/playlist');
  }, [loadPlaylist]);

  // Get track status for display
  const getTrackStatus = useCallback((trackId: string) => {
    const progress = downloadState.trackProgress[trackId];
    const error = downloadState.errors[trackId];
    
    if (error) {
      return { status: 'error' as const, progress: 0, error };
    }
    
    if (progress) {
      if (progress.percent === 100) {
        return { status: 'done' as const, progress: 100 };
      } else if (progress.percent > 0) {
        return { status: 'downloading' as const, progress: progress.percent };
      }
    }
    
    return { status: 'idle' as const, progress: 0 };
  }, [downloadState]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">YouTube Playlist Downloader</h1>

      {/* Enhanced Download Notice */}
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-700">
          ✨ <strong>Enhanced with ffmpeg-static + ytdl-core</strong> - Better audio quality and progress tracking
        </p>
      </div>

      {/* URL Input */}
      <PlaylistInput
        url={url}
        onUrlChange={setUrl}
        onSubmit={handleLoadPlaylist}
        isLoading={playlist.isLoading}
        error={playlist.error}
        platform="youtube"
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
          downloadedCount={downloadState.overallProgress.completed}
          onDownloadAll={handleDownloadAll}
          platform="youtube"
        />
      )}

      {/* Enhanced Progress Display */}
      {downloadState.isDownloading && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-red-800">
              Overall Progress: {downloadState.overallProgress.completed} / {downloadState.overallProgress.total}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={cancelDownloads}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancel
            </Button>
          </div>
          <div className="w-full bg-red-200 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${downloadState.overallProgress.percent}%` }}
            />
          </div>
          {downloadState.currentTrackIndex >= 0 && playlist.tracks[downloadState.currentTrackIndex] && (
            <p className="text-xs text-red-600 mt-2">
              Currently downloading: {playlist.tracks[downloadState.currentTrackIndex].title}
            </p>
          )}
        </div>
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
      {downloadState.overallProgress.percent === 100 && downloadState.overallProgress.total > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-medium">
            🎉 All YouTube downloads completed successfully!
          </p>
        </div>
      )}
    </div>
  );
}
