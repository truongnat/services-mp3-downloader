import { useState, useCallback } from 'react';
import { YouTubeTrackInfo } from '@/types/youtube';

export interface UseYouTubeDownloaderOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (filename: string) => void;
  onError?: (error: string) => void;
}

export interface YouTubeDownloadState {
  isLoading: boolean;
  isDownloading: boolean;
  progress: number;
  error: string | null;
  currentTrack: YouTubeTrackInfo | null;
}

export function useYouTubeDownloader(options: UseYouTubeDownloaderOptions = {}) {
  const [state, setState] = useState<YouTubeDownloadState>({
    isLoading: false,
    isDownloading: false,
    progress: 0,
    error: null,
    currentTrack: null,
  });

  const getVideoInfo = useCallback(async (url: string): Promise<YouTubeTrackInfo | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the new unified endpoint
      const response = await fetch(`/api/youtube?url=${encodeURIComponent(url)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get video info');
      }

      // Check if it's actually a video
      if (result.type !== 'video') {
        throw new Error('URL is not a YouTube video');
      }

      const trackInfo = result.data;
      setState(prev => ({ ...prev, currentTrack: trackInfo, isLoading: false }));
      return trackInfo;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      options.onError?.(errorMessage);
      return null;
    }
  }, [options]);

  const downloadTrack = useCallback(async (
    url: string, 
    downloadOptions: { 
      filename?: string; 
      format?: 'mp3' | 'm4a'; 
      quality?: 'highestaudio' | 'lowestaudio' 
    } = {}
  ) => {
    setState(prev => ({ 
      ...prev, 
      isDownloading: true, 
      progress: 0, 
      error: null 
    }));

    try {
      const { filename, format = 'mp3', quality = 'highestaudio' } = downloadOptions;
      
      // Build download URL using the new unified endpoint
      const params = new URLSearchParams({
        url,
        format,
        quality
      });
      
      if (filename) {
        params.append('filename', filename);
      }

      const downloadUrl = `/api/youtube/download?${params.toString()}`;
      
      // Start download
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const downloadFilename = filenameMatch?.[1] || `audio.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl2 = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl2;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(downloadUrl2);

      setState(prev => ({ ...prev, isDownloading: false, progress: 100 }));
      options.onComplete?.(downloadFilename);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      setState(prev => ({ 
        ...prev, 
        isDownloading: false, 
        progress: 0, 
        error: errorMessage 
      }));
      options.onError?.(errorMessage);
    }
  }, [options]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isDownloading: false,
      progress: 0,
      error: null,
      currentTrack: null,
    });
  }, []);

  return {
    ...state,
    getVideoInfo,
    downloadTrack,
    reset,
  };
}