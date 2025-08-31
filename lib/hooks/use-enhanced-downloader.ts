import { useState, useCallback } from 'react';
import { EnhancedDownloader, DownloadProgress, DownloadOptions, TrackMetadata } from '@/lib/enhanced-downloader';
import { useSettings } from '@/lib/hooks/use-settings';

export interface DownloadState {
  isDownloading: boolean;
  currentTrackIndex: number;
  trackProgress: Record<string, DownloadProgress>;
  overallProgress: {
    completed: number;
    total: number;
    percent: number;
  };
  errors: Record<string, string>;
}

export interface TrackDownloadInfo {
  id: string;
  url: string;
  title: string;
  artist: string;
  platform: 'youtube' | 'soundcloud';
}

export interface UseEnhancedDownloaderReturn {
  downloadState: DownloadState;
  downloadTrack: (track: TrackDownloadInfo, options?: Partial<DownloadOptions>) => Promise<void>;
  downloadPlaylist: (tracks: TrackDownloadInfo[], options?: Partial<DownloadOptions>) => Promise<void>;
  cancelDownloads: () => void;
  resetDownloadState: () => void;
}

export function useEnhancedDownloader(): UseEnhancedDownloaderReturn {
  const { settings } = useSettings();
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    currentTrackIndex: -1,
    trackProgress: {},
    overallProgress: {
      completed: 0,
      total: 0,
      percent: 0,
    },
    errors: {},
  });

  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const downloadTrack = useCallback(async (
    track: TrackDownloadInfo, 
    options: Partial<DownloadOptions> = {}
  ) => {
    try {
      setDownloadState(prev => ({
        ...prev,
        isDownloading: true,
        currentTrackIndex: 0,
        trackProgress: { [track.id]: { percent: 0, downloaded: 0, total: 0 } },
        overallProgress: { completed: 0, total: 1, percent: 0 },
        errors: {},
      }));

      const controller = new AbortController();
      setAbortController(controller);

      const downloadOptions: DownloadOptions = {
        url: track.url,
        platform: track.platform,
        format: settings.format,
        quality: settings.quality,
        bitrate: settings.quality === 'high' ? '320k' : settings.quality === 'medium' ? '192k' : '128k',
        ...options,
        onProgress: (progress) => {
          setDownloadState(prev => ({
            ...prev,
            trackProgress: {
              ...prev.trackProgress,
              [track.id]: progress,
            },
          }));
        },
        abortSignal: controller.signal,
      };

      const { blob, metadata } = await EnhancedDownloader.downloadTrack(downloadOptions);
      
      // For SoundCloud, the optimized downloader handles file saving automatically
      // For other platforms, generate filename and save manually
      if (track.platform !== 'soundcloud' && blob.size > 0) {
        const filename = EnhancedDownloader.generateFilename(
          metadata, 
          downloadOptions.format || settings.format, 
          settings,
          0 // Single track download gets index 0
        );
        EnhancedDownloader.saveFile(blob, filename);
      }

      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        overallProgress: { completed: 1, total: 1, percent: 100 },
      }));
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        errors: {
          ...prev.errors,
          [track.id]: error instanceof Error ? error.message : 'Download failed',
        },
      }));
    } finally {
      setAbortController(null);
    }
  }, [settings]);

  const downloadPlaylist = useCallback(async (
    tracks: TrackDownloadInfo[], 
    options: Partial<DownloadOptions> = {}
  ) => {
    try {
      setDownloadState(prev => ({
        ...prev,
        isDownloading: true,
        currentTrackIndex: 0,
        trackProgress: {},
        overallProgress: { completed: 0, total: tracks.length, percent: 0 },
        errors: {},
      }));

      const controller = new AbortController();
      setAbortController(controller);

      let completed = 0;

      for (let i = 0; i < tracks.length; i++) {
        if (controller.signal.aborted) {
          throw new Error('Download cancelled');
        }

        const track = tracks[i];

        try {
          setDownloadState(prev => ({
            ...prev,
            currentTrackIndex: i,
          }));

          const downloadOptions: DownloadOptions = {
            url: track.url,
            platform: track.platform,
            format: settings.format,
            quality: settings.quality,
            bitrate: settings.quality === 'high' ? '320k' : settings.quality === 'medium' ? '192k' : '128k',
            ...options,
            onProgress: (progress) => {
              setDownloadState(prev => ({
                ...prev,
                trackProgress: {
                  ...prev.trackProgress,
                  [track.id]: progress,
                },
              }));
            },
            abortSignal: controller.signal,
          };

          const { blob, metadata } = await EnhancedDownloader.downloadTrack(downloadOptions);
          
          // For SoundCloud, the optimized downloader handles file saving automatically
          // For other platforms, generate filename and save manually
          if (track.platform !== 'soundcloud' && blob.size > 0) {
            const filename = EnhancedDownloader.generateFilename(
              metadata, 
              downloadOptions.format || settings.format, 
              settings,
              i // Use loop index for track numbering
            );
            EnhancedDownloader.saveFile(blob, filename);
          }

          completed++;
          
          setDownloadState(prev => ({
            ...prev,
            overallProgress: {
              completed,
              total: tracks.length,
              percent: Math.round((completed / tracks.length) * 100),
            },
          }));

          // Small delay between downloads to prevent overwhelming
          if (i < tracks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Failed to download track ${i + 1}:`, error);
          setDownloadState(prev => ({
            ...prev,
            errors: {
              ...prev.errors,
              [track.id]: error instanceof Error ? error.message : 'Download failed',
            },
          }));
        }
      }

      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
      }));
    } catch (error) {
      console.error('Playlist download failed:', error);
      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        errors: {
          ...prev.errors,
          general: error instanceof Error ? error.message : 'Playlist download failed',
        },
      }));
    } finally {
      setAbortController(null);
    }
  }, [settings]);

  const cancelDownloads = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setDownloadState(prev => ({
      ...prev,
      isDownloading: false,
    }));
  }, [abortController]);

  const resetDownloadState = useCallback(() => {
    setDownloadState({
      isDownloading: false,
      currentTrackIndex: -1,
      trackProgress: {},
      overallProgress: {
        completed: 0,
        total: 0,
        percent: 0,
      },
      errors: {},
    });
  }, []);

  return {
    downloadState,
    downloadTrack,
    downloadPlaylist,
    cancelDownloads,
    resetDownloadState,
  };
}