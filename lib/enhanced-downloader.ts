// Enhanced downloader with improved functionality
import { AudioSettings } from "@/lib/settings";
import { downloadSoundCloudTrackOptimized } from "@/lib/soundcloud/optimized-downloader";

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
  contentType?: string;
  effectiveFormat?: 'mp3' | 'm4a' | 'opus' | 'webm';
}

export class EnhancedDownloader {
  /**
   * Download a track with enhanced features
   */
  static async downloadTrack(options: DownloadOptions): Promise<DownloadResult> {
    const { url, platform, format = 'mp3', quality = 'medium', onProgress, abortSignal, bitrate } = options;

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

      if (platform === 'youtube') {
        // Get metadata first using the new unified endpoint
        const infoResponse = await fetch(`/api/youtube?url=${encodeURIComponent(url)}`);
        const infoData = await infoResponse.json();
        
        if (!infoResponse.ok) {
          throw new Error(infoData.error || 'Failed to get video info');
        }

        // Check if it's a video or playlist
        if (infoData.type !== 'video') {
          throw new Error('URL must be a YouTube video URL, not a playlist');
        }

        const metadata: TrackMetadata = {
          title: infoData.data.title || 'Unknown',
          artist: infoData.data.artist || 'Unknown',
          duration: infoData.data.duration || 0,
          artwork: infoData.data.artwork,
        };

        // For YouTube, use the new unified download API with the info we already have
        // This avoids fetching the info twice
        const params = new URLSearchParams({
          url,
          format: format === 'opus' ? 'm4a' : format,
          quality: quality === 'high' ? 'highestaudio' : 'lowestaudio'
        });

        // Use the new unified download endpoint
        const downloadUrl = `/api/youtube/download?${params.toString()}`;
        
        // For YouTube, we stream the download to get progress updates
        // This is more reliable than direct download for providing feedback
        // Estimate total size if Content-Length is missing using duration and bitrate
        let expectedTotalBytes: number | undefined;
        if ((format === 'mp3' || format === 'm4a') && metadata.duration && metadata.duration > 0) {
          // bitrate may be like '320k' | '192k' | '128k'
          const kbps = typeof bitrate === 'string' && /\d+/.test(bitrate) ? parseInt(bitrate.match(/\d+/)![0], 10) : (quality === 'high' ? 320 : quality === 'low' ? 96 : 192);
          expectedTotalBytes = Math.floor((metadata.duration as number) * (kbps * 1000) / 8);
        }

        const streamed = await this.streamDownload(downloadUrl, onProgress, abortSignal, expectedTotalBytes);

        // Determine effective format from response headers if conversion fell back
        let effectiveFormat: 'mp3' | 'm4a' | 'opus' | 'webm' | undefined = undefined;
        const ctLower = streamed.contentType?.toLowerCase() || '';
        if (ctLower.includes('audio/mpeg')) effectiveFormat = 'mp3';
        else if (ctLower.includes('audio/mp4')) effectiveFormat = 'm4a';
        else if (ctLower.includes('audio/webm')) effectiveFormat = 'webm';
        else if (ctLower.includes('audio/ogg') || ctLower.includes('opus')) effectiveFormat = 'opus';

        return { blob: streamed.blob, metadata, contentType: streamed.contentType, effectiveFormat };
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }
      throw error;
    }
  }

  /**
   * Trigger direct download using a link
   */
  static triggerDirectDownload(url: string, metadata: TrackMetadata, format: string): void {
    console.log('Triggering direct download for URL:', url);
    
    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with minimal settings
      const settings = {
        format: format as 'mp3' | 'm4a',
        quality: 'medium' as const,
        filenameFormat: '{title}',
        includeArtist: false,
        includeIndex: false,
        sanitizeFilename: true,
      };
      
      const filename = this.generateFilename(metadata, format, settings);
      
      link.download = filename;
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      console.log('Triggering click on download link with filename:', filename);
      link.click();
      document.body.removeChild(link);
      
      console.log('Direct download triggered successfully');
    } catch (error) {
      console.error('Failed to trigger direct download:', error);
      // Don't throw error to prevent breaking the UI
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
      // More intelligent sanitization that preserves Unicode characters
      filename = metadata.title
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove only invalid filesystem characters
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      // Limit filename length to prevent filesystem issues (Windows has 260 char limit)
      if (filename.length > 150) {
        filename = filename.substring(0, 150).trim();
      }
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
    console.log('Saving file:', filename, 'Blob size:', blob.size, 'bytes, Type:', blob.type);
    
    if (!EnhancedDownloader.isDownloadSupported()) {
      console.error('Downloads not supported in this browser');
      throw new Error('Downloads not supported in this browser');
    }
    
    // Check if blob is valid
    if (!blob || blob.size === 0) {
      console.error('Invalid blob or empty blob provided for download');
      throw new Error('Cannot download empty file');
    }
    
    try {
      console.log('Creating object URL from blob...');
      const url = window.URL.createObjectURL(blob);
      console.log('Created object URL:', url);
      
      console.log('Creating download link element...');
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      console.log('Created download link with filename:', filename);
      console.log('Link href:', link.href);
      console.log('Link download attribute:', link.download);
      
      // Ensure the link is added to DOM for download to work
      console.log('Adding link to document body...');
      document.body.appendChild(link);
      console.log('Added link to DOM, triggering click...');
      link.click();
      console.log('Click event triggered');
      
      // Clean up
      console.log('Cleaning up - removing link from DOM...');
      document.body.removeChild(link);
      console.log('Revoking object URL...');
      window.URL.revokeObjectURL(url);
      console.log('Download triggered successfully and cleaned up');
    } catch (error) {
      console.error('Error during file save process:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Download a file with progress tracking using fetch and streaming
   */
  static async streamDownload(
    url: string,
    onProgress?: (progress: DownloadProgress) => void,
    abortSignal?: AbortSignal,
    expectedTotalBytes?: number
  ): Promise<{ blob: Blob; contentType: string; conversionStatus: string | null }> {
    const response = await fetch(url, { signal: abortSignal });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const contentLengthHeader = response.headers.get('content-length');
    const totalHeader = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const conversionStatus = response.headers.get('x-conversion-status') || null;

    // Prefer real Content-Length; otherwise fall back to expected
    const total = totalHeader > 0 ? totalHeader : (expectedTotalBytes || 0);
    let loaded = 0;
    let lastLoaded = 0;
    let lastTime = Date.now();

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    
    if (!reader) {
      throw new Error('ReadableStream not supported');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;

        if (onProgress) {
          const now = Date.now();
          const dt = (now - lastTime) / 1000;
          const dBytes = loaded - lastLoaded;
          const speed = dt > 0 ? dBytes / dt : 0;
          lastTime = now;
          lastLoaded = loaded;

          let percent = 0;
          if (total > 0) {
            percent = Math.max(1, Math.min(99, Math.round((loaded / total) * 100)));
          }

          onProgress({
            percent,
            downloaded: loaded,
            total: total,
            speed,
          });
        }
      }
      
      // Combine all chunks into a single Uint8Array
      const combinedChunks = new Uint8Array(loaded);
      let position = 0;
      for (const chunk of chunks) {
        combinedChunks.set(chunk, position);
        position += chunk.length;
      }

      // Final progress update to 100%
      if (onProgress) {
        onProgress({ percent: 100, downloaded: loaded, total: total || loaded, speed: 0 });
      }

      return { blob: new Blob([combinedChunks], { type: contentType }), contentType, conversionStatus };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if the current browser supports file downloads
   */
  static isDownloadSupported(): boolean {
    return typeof window !== 'undefined' && 
           'URL' in window && 
           'createObjectURL' in window.URL;
  }

  /**
   * Check if FFmpeg is available for conversion
   */
  static async isFFmpegAvailable(): Promise<boolean> {
    try {
      const { isFFmpegAvailable } = await import('@/lib/ffmpeg-utils');
      return await isFFmpegAvailable();
    } catch (error) {
      console.warn('Failed to check FFmpeg availability:', error);
      return false;
    }
  }
}