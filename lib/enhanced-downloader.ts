// Enhanced downloader with improved functionality
import { AudioSettings } from "@/lib/settings";
import { downloadSoundCloudTrackOptimized, formatSpeed, formatFileSize } from "@/lib/soundcloud/optimized-downloader";

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
  speed?: number;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  duration?: number;
  artwork?: string;
}

export interface DownloadOptions {
  url: string;
  platform: 'youtube' | 'soundcloud';
  format?: 'mp3' | 'm4a' | 'opus' | 'webm';
  quality?: 'high' | 'medium' | 'low';
  bitrate?: string;
  onProgress?: (progress: DownloadProgress) => void;
  abortSignal?: AbortSignal;
}

export interface DownloadResult {
  blob: Blob;
  metadata: TrackMetadata;
}

export class EnhancedDownloader {
  /**
   * Download a track with enhanced features
   */
  static async downloadTrack(options: DownloadOptions): Promise<DownloadResult> {
    const { url, platform, format = 'mp3', quality = 'medium', onProgress, abortSignal } = options;

    try {
      if (platform === 'soundcloud') {
        // Use optimized SoundCloud downloader that downloads directly from stream
        await downloadSoundCloudTrackOptimized(url, (progress) => {
          if (onProgress) {
            onProgress({
              percent: progress.percent,
              downloaded: progress.loaded,
              total: progress.total,
              speed: progress.speed,
            });
          }
        }, abortSignal);

        // For SoundCloud optimized downloads, we trigger the download directly
        // Return empty blob and basic metadata since file is already downloaded
        const trackResponse = await fetch(`/api/soundcloud/track?url=${encodeURIComponent(url)}`);
        const trackData = await trackResponse.json();
        
        const metadata: TrackMetadata = {
          title: trackData.track?.title || 'Unknown',
          artist: trackData.track?.artist || 'Unknown',
          duration: trackData.track?.duration ? Math.floor(trackData.track.duration / 1000) : 0,
          artwork: trackData.track?.artwork,
        };

        // Return empty blob since download was triggered directly
        return { 
          blob: new Blob([], { type: 'audio/mpeg' }), 
          metadata 
        };
      }

      let downloadUrl: string;
      let metadata: TrackMetadata;

      if (platform === 'youtube') {
        // For YouTube, use the ytdl-download API
        const params = new URLSearchParams({
          url,
          format: format === 'opus' ? 'm4a' : format,
          quality: quality === 'high' ? 'highestaudio' : 'lowestaudio'
        });

        downloadUrl = `/api/youtube/ytdl-download?${params.toString()}`;

        // Get metadata first
        const infoResponse = await fetch(`/api/youtube/ytdl-info?url=${encodeURIComponent(url)}`);
        const infoData = await infoResponse.json();
        
        if (!infoResponse.ok) {
          throw new Error(infoData.error || 'Failed to get video info');
        }

        metadata = {
          title: infoData.data.title || 'Unknown',
          artist: infoData.data.artist || 'Unknown',
          duration: infoData.data.duration || 0,
          artwork: infoData.data.artwork,
        };
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Download the file for YouTube
      console.log('Starting download from URL:', downloadUrl);
      const response = await fetch(downloadUrl, {
        signal: abortSignal,
      });

      console.log('Download response status:', response.status);
      console.log('Download response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let downloaded = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          if (abortSignal?.aborted) {
            throw new Error('Download cancelled');
          }

          chunks.push(value);
          downloaded += value.length;

          if (onProgress && total > 0) {
            onProgress({
              percent: Math.round((downloaded / total) * 100),
              downloaded,
              total,
            });
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Combine chunks into blob
      const blob = new Blob(chunks, { 
        type: format === 'mp3' ? 'audio/mpeg' : 'audio/mp4' 
      });

      return { blob, metadata };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }
      throw error;
    }
  }

  /**
   * Generate a filename based on metadata and settings
   */
  static generateFilename(
    metadata: TrackMetadata, 
    format: string, 
    settings: AudioSettings,
    trackIndex?: number
  ): string {
    let filename: string;

    // Use song title as filename (following project specification)
    if (settings.sanitizeFilename) {
      // Remove special characters for compatibility
      filename = metadata.title
        .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    } else {
      filename = metadata.title;
    }

    // Add track number if it's part of a playlist
    if (trackIndex !== undefined && trackIndex >= 0) {
      const paddedIndex = (trackIndex + 1).toString().padStart(2, '0');
      filename = `${paddedIndex}. ${filename}`;
    }

    // Add file extension
    filename += `.${format}`;

    return filename;
  }

  /**
   * Save file to user's device
   */
  static saveFile(blob: Blob, filename: string): void {
    console.log('Saving file:', filename, 'Blob size:', blob.size, 'bytes');
    
    if (!EnhancedDownloader.isDownloadSupported()) {
      console.error('Downloads not supported in this browser');
      throw new Error('Downloads not supported in this browser');
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Ensure the link is added to DOM for download to work
    document.body.appendChild(link);
    console.log('Triggering download...');
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('Download triggered successfully');
  }

  /**
   * Check if the current browser supports file downloads
   */
  static isDownloadSupported(): boolean {
    return typeof window !== 'undefined' && 
           'URL' in window && 
           'createObjectURL' in window.URL;
  }
}