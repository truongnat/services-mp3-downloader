import { useState, useEffect, useCallback } from "react";
import { CommonTrackInfo, ERROR_MESSAGES } from "@/types/common";
import { detectSoundCloudType } from "@/lib/url-validator";
import { soundcloudToCommon } from "@/lib/type-adapters";

// Download status for individual tracks
export interface TrackDownloadStatus {
  status: "idle" | "downloading" | "done" | "error";
  progress: number;
  error?: string;
}

// Playlist info interface
interface PlaylistInfo {
  id: string;
  title: string;
  description?: string;
  artwork?: string;
  tracksCount: number;
  totalDuration?: string;
}

// Playlist state
export interface PlaylistState<T = CommonTrackInfo> {
  info: PlaylistInfo | null;
  tracks: T[];
  isLoading: boolean;
  error: string | null;
}

// Download state
export interface DownloadState {
  isDownloading: boolean;
  downloadStatuses: Record<string, TrackDownloadStatus>;
  downloadedCount: number;
  totalCount: number;
  showMacTip: boolean;
}

// Hook for managing playlist downloader state
export function usePlaylistDownloader<T extends CommonTrackInfo>() {
  // Playlist state
  const [playlist, setPlaylist] = useState<PlaylistState<T>>({
    info: null,
    tracks: [],
    isLoading: false,
    error: null
  });

  // Download state
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    downloadStatuses: {},
    downloadedCount: 0,
    totalCount: 0,
    showMacTip: false
  });

  // URL input state
  const [url, setUrl] = useState("");

  // Protect against page unload during downloads
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: BeforeUnloadEvent) => {
      if (downloadState.isDownloading) {
        e.preventDefault();
        return "Are you sure you want to leave? Music is being downloaded!";
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [downloadState.isDownloading]);

  // Load playlist function for SoundCloud only
  const loadPlaylist = useCallback(async (apiEndpoint: string, explicitUrl?: string) => {
    const urlToUse = explicitUrl || url;
    
    if (!urlToUse.trim()) {
      setPlaylist(prev => ({ ...prev, error: ERROR_MESSAGES.INVALID_URL }));
      return;
    }

    setPlaylist(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let response;
      let data;

      // Only handle SoundCloud URLs
      if (apiEndpoint.includes('soundcloud')) {
        const urlType = detectSoundCloudType(urlToUse.trim());

        if (urlType === 'track') {
          // Definitely a track - call track API
          response = await fetch(`/api/soundcloud/track?url=${encodeURIComponent(urlToUse.trim())}`);
          const trackData = await response.json();

          if (!response.ok) {
            throw new Error(trackData.error || ERROR_MESSAGES.FETCH_FAILED);
          }

          // Convert single track to playlist format
          const track = soundcloudToCommon(trackData.track);
          data = {
            playlistInfo: {
              id: track.id,
              title: track.title,
              description: `Single track: ${track.title}`,
              artwork: track.artwork,
              tracksCount: 1
            },
            tracks: [track]
          };
        } else if (urlType === 'playlist') {
          // Definitely a playlist - call playlist API
          response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(urlToUse.trim())}`);
          data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || ERROR_MESSAGES.FETCH_FAILED);
          }
        } else if (urlType === 'ambiguous') {
          // Could be either - try playlist first, then track
          try {
            // Try playlist API first
            response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(urlToUse.trim())}`);
            data = await response.json();

            if (!response.ok) {
              throw new Error('Not a playlist');
            }
          } catch (playlistError) {
            // If playlist fails, try track API
            try {
              response = await fetch(`/api/soundcloud/track?url=${encodeURIComponent(urlToUse.trim())}`);
              const trackData = await response.json();

              if (!response.ok) {
                throw new Error(trackData.error || ERROR_MESSAGES.FETCH_FAILED);
              }

              // Convert single track to playlist format
              const track = soundcloudToCommon(trackData.track);
              data = {
                playlistInfo: {
                  id: track.id,
                  title: track.title,
                  description: `Single track: ${track.title}`,
                  artwork: track.artwork,
                  tracksCount: 1
                },
                tracks: [track]
              };
            } catch (trackError) {
              throw new Error('URL is not a valid SoundCloud playlist or track');
            }
          }
        } else {
          throw new Error('Invalid SoundCloud URL format');
        }
      } else {
        throw new Error('Only SoundCloud URLs are supported by this hook');
      }

      if (!data.tracks || data.tracks.length === 0) {
        throw new Error(ERROR_MESSAGES.NO_TRACKS);
      }

      setPlaylist({
        info: data.playlistInfo,
        tracks: data.tracks,
        isLoading: false,
        error: null
      });

      // Initialize download statuses
      const statuses: Record<string, TrackDownloadStatus> = {};
      data.tracks.forEach((track: CommonTrackInfo) => {
        statuses[track.id] = { status: "idle", progress: 0 };
      });
      setDownloadState(prev => ({
        ...prev,
        downloadStatuses: statuses,
        totalCount: data.tracks.length,
        downloadedCount: 0
      }));

    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      setPlaylist(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [url]);

  // Update track download status
  const updateTrackStatus = useCallback((trackId: string, status: Partial<TrackDownloadStatus>) => {
    setDownloadState(prev => {
      const newStatuses = {
        ...prev.downloadStatuses,
        [trackId]: { ...prev.downloadStatuses[trackId], ...status }
      };

      // Count completed downloads
      const downloadedCount = Object.values(newStatuses).filter(s => s.status === "done").length;

      return {
        ...prev,
        downloadStatuses: newStatuses,
        downloadedCount
      };
    });
  }, []);

  // Start download session
  const startDownloadSession = useCallback(() => {
    setDownloadState(prev => ({ ...prev, isDownloading: true }));
  }, []);

  // End download session
  const endDownloadSession = useCallback(() => {
    setDownloadState(prev => ({ ...prev, isDownloading: false }));
  }, []);

  // Show macOS tip
  const showMacOSTip = useCallback(() => {
    setDownloadState(prev => ({ ...prev, showMacTip: true }));
  }, []);

  // Hide macOS tip
  const hideMacOSTip = useCallback(() => {
    setDownloadState(prev => ({ ...prev, showMacTip: false }));
  }, []);

  // Reset playlist
  const resetPlaylist = useCallback(() => {
    setPlaylist({
      info: null,
      tracks: [],
      isLoading: false,
      error: null
    });
    setDownloadState({
      isDownloading: false,
      downloadStatuses: {},
      downloadedCount: 0,
      totalCount: 0,
      showMacTip: false
    });
  }, []);

  // Get track status
  const getTrackStatus = useCallback((trackId: string): TrackDownloadStatus => {
    return downloadState.downloadStatuses[trackId] || { status: "idle", progress: 0 };
  }, [downloadState.downloadStatuses]);

  // Check if all downloads are complete
  const allDownloadsComplete = downloadState.downloadedCount === downloadState.totalCount && downloadState.totalCount > 0;

  return {
    // State
    playlist,
    downloadState,
    url,
    allDownloadsComplete,

    // Actions
    setUrl,
    loadPlaylist,
    updateTrackStatus,
    startDownloadSession,
    endDownloadSession,
    showMacOSTip,
    hideMacOSTip,
    resetPlaylist,
    getTrackStatus,
  };
}