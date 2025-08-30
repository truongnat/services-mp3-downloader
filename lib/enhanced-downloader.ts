// Browser-compatible enhanced downloader
// Uses API endpoints instead of direct Node.js library imports

import { AudioSettings } from '@/lib/settings';
import { CommonTrackInfo } from '@/lib/download-utils';

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || "59BqQCyB9AWNYAglJEiHbp1h6keJHfrU";

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
  speed?: number;
  eta?: number;
}

export interface DownloadOptions {
  url: string;
  platform: 'youtube' | 'soundcloud';
  format?: 'mp3' | 'm4a' | 'opus';
  quality?: 'highest' | 'high' | 'medium' | 'low';
  bitrate?: string;
  onProgress?: (progress: DownloadProgress) => void;
  abortSignal?: AbortSignal;
}

export interface TrackMetadata {
  title: string;
  artist: string;
  duration: number;
  thumbnail?: string;
  id: string;
}

export class EnhancedDownloader {
  /**
   * Download and convert audio from YouTube or SoundCloud
   * Browser-only version without ffmpeg processing
   */
  static async downloadTrack(options: DownloadOptions): Promise<{ blob: Blob; metadata: TrackMetadata }> {
    const { url, platform, format = 'mp3', quality = 'high', onProgress, abortSignal } = options;

    if (platform === 'youtube') {
      return await this.downloadYouTubeTrack(url, format, quality, onProgress, abortSignal);
    } else if (platform === 'soundcloud') {
      return await this.downloadSoundCloudTrack(url, format, quality, onProgress, abortSignal);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Download YouTube track with ytdl-core (browser version)
   */
  private static async downloadYouTubeTrack(
    url: string,
    format: string,
    quality: string,
    onProgress?: (progress: DownloadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<{ blob: Blob; metadata: TrackMetadata }> {
    try {
      // Extract video ID
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Get basic track information first
      const trackResponse = await fetch(`/api/youtube/track?url=${encodeURIComponent(url)}`, {
        signal: abortSignal
      });
      
      if (!trackResponse.ok) {
        if (trackResponse.status === 400) {
          throw new Error('Invalid YouTube URL format');
        } else if (trackResponse.status === 404) {
          throw new Error('Video not found or unavailable');
        } else if (trackResponse.status >= 500) {
          throw new Error('Server error - please try again later');
        } else {
          throw new Error('Failed to get track information');
        }
      }
      
      const trackData = await trackResponse.json();
      const trackInfo = trackData.track;
      
      const metadata: TrackMetadata = {
        id: trackInfo.id,
        title: trackInfo.title,
        artist: trackInfo.artist,
        duration: trackInfo.duration,
        thumbnail: trackInfo.artwork,
      };

      // Download directly through the enhanced download endpoint
      // This endpoint will generate fresh stream URLs and download immediately
      const audioBlob = await this.downloadStreamWithProgress(
        `/api/youtube/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(metadata.title + '.mp3')}&quality=${quality}&format=${format}`, 
        onProgress, 
        abortSignal
      );

      return { blob: audioBlob, metadata };
    } catch (error) {
      // Handle different types of errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check your internet connection and try again');
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Download was cancelled');
      } else if (error instanceof Error) {
        // Re-throw our custom error messages
        throw error;
      } else {
        throw new Error(`YouTube download failed: Unknown error`);
      }
    }
  }

  /**
   * Download SoundCloud track
   */
  private static async downloadSoundCloudTrack(
    url: string,
    format: string,
    quality: string,
    onProgress?: (progress: DownloadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<{ blob: Blob; metadata: TrackMetadata }> {
    try {
      // For browser environment, we'll fetch stream URL via API
      const response = await fetch(`/api/soundcloud/track?url=${encodeURIComponent(url)}`, {
        signal: abortSignal
      });
      
      if (!response.ok) {
        throw new Error('Failed to get track information');
      }
      
      const data = await response.json();
      const trackInfo = data.track;
      
      const metadata: TrackMetadata = {
        id: trackInfo.id,
        title: trackInfo.title,
        artist: trackInfo.artist,
        duration: trackInfo.duration,
        thumbnail: trackInfo.artwork,
      };

      // Download the audio stream
      const audioBlob = await this.downloadStreamWithProgress(
        trackInfo.streamUrl, 
        onProgress, 
        abortSignal
      );

      return { blob: audioBlob, metadata };
    } catch (error) {
      throw new Error(`SoundCloud download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download stream with progress tracking (browser version)
   */
  private static async downloadStreamWithProgress(
    streamUrl: string,
    onProgress?: (progress: DownloadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<Blob> {
    if (!streamUrl) {
      throw new Error('No stream URL available');
    }

    const response = await fetch(streamUrl, {
      signal: abortSignal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*,*/*;q=0.9',
      },
    });

    if (!response.ok || !response.body) {
      // Handle API error responses (JSON) vs stream responses
      const contentType = response.headers.get('Content-Type');
      
      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        
        // Handle specific YouTube error codes
        if (errorData.code === 'youtube_blocked') {
          throw new Error(errorData.error + ' YouTube downloads have approximately 30-50% success rate due to their restrictions.');
        } else if (errorData.code === 'rate_limited') {
          throw new Error('Too many requests - please wait a few minutes before trying again.');
        } else if (errorData.retryable) {
          throw new Error(errorData.error + ' You can try downloading this track again.');
        } else {
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
      }
      
      // Provide more specific error messages for stream responses
      if (response.status === 403) {
        throw new Error('Access denied - this content may be restricted or require authentication');
      } else if (response.status === 404) {
        throw new Error('Audio stream not found - the video may have been removed');
      } else if (response.status >= 500) {
        throw new Error('YouTube server error - please try again later');
      } else {
        throw new Error(`Failed to fetch audio stream (${response.status})`);
      }
    }

    const contentLength = response.headers.get('Content-Length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    
    // Read the stream with progress tracking
    const reader = response.body.getReader();
    let downloadedBytes = 0;
    const chunks: Uint8Array[] = [];
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      downloadedBytes += value.length;

      // Calculate progress and speed
      if (onProgress && totalBytes > 0) {
        const percent = Math.round((downloadedBytes / totalBytes) * 100);
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const speed = downloadedBytes / elapsed; // bytes per second
        const remaining = totalBytes - downloadedBytes;
        const eta = speed > 0 ? remaining / speed : 0; // seconds

        onProgress({
          percent,
          downloaded: downloadedBytes,
          total: totalBytes,
          speed,
          eta,
        });
      }
    }

    return new Blob(chunks, { type: 'audio/mpeg' });
  }

  /**
   * Extract YouTube video ID from URL
   */
  private static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Save blob as file
   */
  static saveFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Generate filename from metadata with settings support
   */
  static generateFilename(
    metadata: TrackMetadata, 
    format: string, 
    settings: AudioSettings,
    index?: number
  ): string {
    let filename = settings.filenameFormat;

    // Replace variables with proper formatting
    if (index !== undefined) {
      filename = filename.replace('{index:03d}', String(index + 1).padStart(3, '0'));
      filename = filename.replace('{index}', String(index + 1).padStart(2, '0'));
    }
    filename = filename.replace('{artist}', metadata.artist || 'Unknown Artist');
    filename = filename.replace('{title}', metadata.title || 'Unknown Title');
    filename = filename.replace('{album}', 'Unknown Album'); // Most platforms don't have album info

    // Apply settings
    if (!settings.includeIndex) {
      filename = filename.replace(/^\[?\d+\]?\s*[.-]?\s*/, ''); // Remove leading number with various formats
      filename = filename.replace(/\(\d+\)$/, ''); // Remove trailing number in parentheses
    }
    if (!settings.includeArtist) {
      filename = filename.replace(/.*?\s*-\s*/, ''); // Remove artist part
    }

    // Sanitize filename if enabled
    if (settings.sanitizeFilename) {
      filename = filename.replace(/[<>:"/\\|?*]/g, '').replace(/[.]{2,}/g, '.').replace(/\s+/g, '_');
    }

    return filename + '.' + format;
  }
}