import { useState, useEffect, useCallback } from "react";
import { CommonTrackInfo, ERROR_MESSAGES } from "@/lib/download-utils";
import { AudioSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { detectSoundCloudType, detectYouTubeType } from "@/lib/url-validator";
import { soundcloudToCommon, youtubeToCommon } from "@/lib/type-adapters";

// Download status for individual tracks
export interface TrackDownloadStatus {
  status: "idle" | "downloading" | "done" | "error";
  progress: number;
  error?: string;
}

// Playlist state
export interface PlaylistState<T = CommonTrackInfo> {
  info: any;
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

  // Get settings from localStorage (same as SettingsDialog)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);

  // Sync with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('audioSettings');
      if (savedSettings) {
        try {
          setAudioSettings(JSON.parse(savedSettings));
        } catch (error) {
          console.error('Failed to parse saved settings:', error);
        }
      }
    }

    // Listen for storage changes to sync across components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'audioSettings' && e.newValue) {
        try {
          setAudioSettings(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Failed to parse settings from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  // Load playlist function with smart URL detection
  const loadPlaylist = useCallback(async (apiEndpoint: string) => {
    if (!url.trim()) {
      setPlaylist(prev => ({ ...prev, error: ERROR_MESSAGES.INVALID_URL }));
      return;
    }

    setPlaylist(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let response;
      let data;

      // Detect if it's SoundCloud and what type
      if (apiEndpoint.includes('soundcloud')) {
        const urlType = detectSoundCloudType(url.trim());

        if (urlType === 'track') {
          // Definitely a track - call track API
          response = await fetch(`/api/soundcloud/track?url=${encodeURIComponent(url.trim())}`);
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
          response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(url.trim())}`);
          data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || ERROR_MESSAGES.FETCH_FAILED);
          }
        } else if (urlType === 'ambiguous') {
          // Could be either - try playlist first, then track
          try {
            // Try playlist API first
            response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(url.trim())}`);
            data = await response.json();

            if (!response.ok) {
              throw new Error('Not a playlist');
            }
          } catch (playlistError) {
            // If playlist fails, try track API
            try {
              response = await fetch(`/api/soundcloud/track?url=${encodeURIComponent(url.trim())}`);
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
      } else if (apiEndpoint.includes('youtube')) {
        // Handle YouTube URLs
        const urlType = detectYouTubeType(url.trim());

        if (urlType === 'video') {
          // Single video - call video API and convert to playlist format
          response = await fetch(`/api/youtube/video?url=${encodeURIComponent(url.trim())}`);
          const videoData = await response.json();

          if (!response.ok) {
            throw new Error(videoData.error || ERROR_MESSAGES.FETCH_FAILED);
          }

          // Convert single video to playlist format
          const video = youtubeToCommon(videoData.video);
          data = {
            playlistInfo: {
              id: video.id,
              title: video.title,
              description: `Single video: ${video.title}`,
              artwork: video.artwork,
              tracksCount: 1
            },
            tracks: [video]
          };
        } else if (urlType === 'playlist') {
          // Playlist - call playlist API
          response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(url.trim())}`);
          data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || ERROR_MESSAGES.FETCH_FAILED);
          }
        } else {
          throw new Error('Invalid YouTube URL format');
        }
      } else {
        // For other platforms, use original logic
        response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(url.trim())}`);
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || ERROR_MESSAGES.FETCH_FAILED);
        }
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
    audioSettings,
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
