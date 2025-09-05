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

      console.log('Starting download for track:', track);
      const { blob, metadata, effectiveFormat, contentType } = await EnhancedDownloader.downloadTrack(downloadOptions);
      console.log('Download completed. Blob size:', blob.size, 'Metadata:', metadata);
      
      // For SoundCloud, the optimized downloader handles file saving automatically
      // For other platforms (including YouTube), generate filename and save manually
      if (track.platform !== 'soundcloud') {
        console.log('Platform is not SoundCloud, checking blob...');
        if (blob.size > 0) {
          console.log('Blob has content, generating filename...');
          // Determine final format from effective format/contentType or fallback to requested format
          let finalFormat = effectiveFormat || (contentType?.includes('audio/mp4') ? 'm4a' : contentType?.includes('audio/mpeg') ? 'mp3' : (downloadOptions.format || settings.format));
          const filename = EnhancedDownloader.generateFilename(
            metadata, 
            finalFormat, 
            settings,
            0 // Single track download gets index 0
          );
          console.log('Saving file with filename:', filename);
          console.log('Calling EnhancedDownloader.saveFile...');
          EnhancedDownloader.saveFile(blob, filename);
          console.log('EnhancedDownloader.saveFile completed');
        } else {
          console.warn('Skipping file save - blob is empty');
        }
      } else {
        console.log('SoundCloud track - file save handled by optimized downloader');
      }

      // Ensure UI shows completion state for this track
      setDownloadState(prev => ({
        ...prev,
        trackProgress: {
          ...prev.trackProgress,
          [track.id]: {
            ...(prev.trackProgress[track.id] || { percent: 100, downloaded: 0, total: 0 }),
            percent: 100,
          },
        },
      }));

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

          console.log(`Starting download for track ${i + 1}/${tracks.length}:`, track);
          const { blob, metadata, effectiveFormat, contentType } = await EnhancedDownloader.downloadTrack(downloadOptions);
          console.log(`Download completed for track ${i + 1}. Blob size:`, blob.size, 'Metadata:', metadata);
          
          // For SoundCloud, the optimized downloader handles file saving automatically
          // For other platforms (including YouTube), generate filename and save manually
          if (track.platform !== 'soundcloud') {
            console.log(`Track ${i + 1} is not SoundCloud, checking blob...`);
            if (blob.size > 0) {
              console.log(`Blob for track ${i + 1} has content, generating filename...`);
              let finalFormat = effectiveFormat || (contentType?.includes('audio/mp4') ? 'm4a' : contentType?.includes('audio/mpeg') ? 'mp3' : (downloadOptions.format || settings.format));
              const filename = EnhancedDownloader.generateFilename(
                metadata, 
                finalFormat, 
                settings,
                i // Use loop index for track numbering
              );
              console.log('Saving file with filename:', filename);
              console.log('Calling EnhancedDownloader.saveFile...');
              EnhancedDownloader.saveFile(blob, filename);
              console.log('EnhancedDownloader.saveFile completed');
            } else {
              console.warn(`Skipping file save for track ${i + 1} - blob is empty`);
            }
          } else {
            console.log(`Track ${i + 1} is SoundCloud - file save handled by optimized downloader`);
          }

          completed++;

          // Ensure per-track completion is reflected even if no content-length
          setDownloadState(prev => ({
            ...prev,
            trackProgress: {
              ...prev.trackProgress,
              [track.id]: {
                ...(prev.trackProgress[track.id] || { percent: 100, downloaded: 0, total: 0 }),
                percent: 100,
              },
            },
          }));
          
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