// Browser-compatible enhanced downloader
// Uses API endpoints instead of direct Node.js library imports

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

      // For browser environment, we'll fetch stream URL via API
      const response = await fetch(`/api/youtube/track?url=${encodeURIComponent(url)}`, {
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
      throw new Error(`YouTube download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error('Failed to fetch audio stream');
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
   * Generate filename from metadata
   */
  static generateFilename(metadata: TrackMetadata, format: string): string {
    const sanitizedTitle = metadata.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const sanitizedArtist = metadata.artist.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    return `${sanitizedArtist} - ${sanitizedTitle}.${format}`;
  }
}