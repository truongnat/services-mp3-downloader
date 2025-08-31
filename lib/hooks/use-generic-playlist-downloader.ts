import { useState, useEffect, useCallback } from "react";
import { CommonTrackInfo, ERROR_MESSAGES } from "@/types/common";
import { detectSoundCloudType } from "@/lib/url-validator";
import { soundcloudToCommon } from "@/lib/type-adapters";
import { YouTubeTrackInfo } from "@/types/youtube";
import { isPlaylistUrl } from "@/lib/youtube/url-utils";

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

// Convert YouTube track to common format
function youtubeToCommon(track: YouTubeTrackInfo): CommonTrackInfo {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist || "Unknown",
    duration: track.duration, // YouTube uses seconds
    artwork: track.artwork,
    url: track.url,
    streamUrl: track.streamUrl,
    size: track.size,
    bitrate: track.bitrate,
    format: track.format,
  };
}

// Hook for managing playlist downloader state (supports both SoundCloud and YouTube)
export function useGenericPlaylistDownloader<T extends CommonTrackInfo>() {
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

  // Detect platform from URL
  const detectPlatform = useCallback((inputUrl: string): 'soundcloud' | 'youtube' | 'unknown' => {
    if (inputUrl.includes('soundcloud.com') || inputUrl.includes('snd.sc') || inputUrl.includes('on.soundcloud.com')) {
      return 'soundcloud';
    }
    if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
      return 'youtube';
    }
    return 'unknown';
  }, []);

  // Load playlist function for both SoundCloud and YouTube
  const loadPlaylist = useCallback(async (apiEndpoint: string, explicitUrl?: string) => {
    const urlToUse = explicitUrl || url;
    
    if (!urlToUse.trim()) {
      setPlaylist(prev => ({ ...prev, error: ERROR_MESSAGES.INVALID_URL }));
      return;
    }

    setPlaylist(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const platform = detectPlatform(urlToUse.trim());
      let response;
      let data;

      if (platform === 'soundcloud') {
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
      } else if (platform === 'youtube') {
        if (isPlaylistUrl(urlToUse.trim())) {
          // YouTube playlist
          response = await fetch(`${apiEndpoint}?url=${encodeURIComponent(urlToUse.trim())}`);
          data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || ERROR_MESSAGES.FETCH_FAILED);
          }

          // Convert YouTube tracks to common format
          data.tracks = data.data.tracks.map((track: YouTubeTrackInfo) => youtubeToCommon(track));
          data.playlistInfo = data.data.playlistInfo;
        } else {
          // Single YouTube video - convert to playlist format
          try {
            response = await fetch(`/api/youtube/ytdl-info?url=${encodeURIComponent(urlToUse.trim())}`);
            const videoData = await response.json();

            if (!response.ok) {
              throw new Error(videoData.error || 'Failed to get video info');
            }

            const track = youtubeToCommon(videoData.data);
            data = {
              playlistInfo: {
                id: track.id,
                title: track.title,
                description: `Single video: ${track.title}`,
                artwork: track.artwork,
                tracksCount: 1
              },
              tracks: [track]
            };
          } catch (error) {
            throw new Error('Failed to load YouTube video');
          }
        }
      } else {
        throw new Error('Unsupported URL format. Please use SoundCloud or YouTube URLs.');
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
  }, [url, detectPlatform]);

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

  // Start downloading
  const startDownloading = useCallback(() => {
    setDownloadState(prev => ({ ...prev, isDownloading: true }));
  }, []);

  // Stop downloading
  const stopDownloading = useCallback(() => {
    setDownloadState(prev => ({ ...prev, isDownloading: false }));
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
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

  // Show Mac tip
  const showMacTip = useCallback(() => {
    setDownloadState(prev => ({ ...prev, showMacTip: true }));
  }, []);

  // Hide Mac tip
  const hideMacTip = useCallback(() => {
    setDownloadState(prev => ({ ...prev, showMacTip: false }));
  }, []);

  return {
    playlist,
    downloadState,
    url,
    setUrl,
    loadPlaylist,
    updateTrackStatus,
    startDownloading,
    stopDownloading,
    clearData,
    showMacTip,
    hideMacTip
  };
}