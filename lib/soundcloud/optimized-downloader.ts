// Optimized SoundCloud downloader using direct streaming
export interface SoundCloudDownloadInfo {
  streamUrl: string;
  filename: string;
  metadata: {
    title: string;
    artist: string;
    duration?: number;
    artwork?: string;
  };
}

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
  speed?: number;
}

/**
 * Download SoundCloud track using optimized blob approach
 */
export async function downloadSoundCloudTrackOptimized(
  trackUrl: string,
  onProgress?: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    // Get direct stream info from API
    const response = await fetch(`/api/soundcloud/download?direct=true&url=${encodeURIComponent(trackUrl)}`, {
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Failed to get stream info: ${response.statusText}`);
    }

    const downloadInfo: SoundCloudDownloadInfo = await response.json();
    console.log('Got download info:', downloadInfo);

    // Download directly from SoundCloud stream URL using blob approach
    await downloadFromStreamUrl(downloadInfo, onProgress, abortSignal);

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Download cancelled');
    }
    
    console.error('Optimized download failed, falling back to server proxy:', error);
    
    // Fallback to server-side streaming
    await downloadSoundCloudTrackFallback(trackUrl, onProgress, abortSignal);
  }
}

/**
 * Download directly from SoundCloud stream URL using fetch and blob
 */
async function downloadFromStreamUrl(
  downloadInfo: SoundCloudDownloadInfo,
  onProgress?: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('Starting direct stream download from:', downloadInfo.streamUrl);
    
    const response = await fetch(downloadInfo.streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'audio/*,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://soundcloud.com/',
      },
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Stream fetch failed: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (abortSignal?.aborted) {
          throw new Error('Download cancelled');
        }

        chunks.push(value);
        loaded += value.length;

        // Calculate progress and speed
        if (onProgress) {
          const elapsed = (Date.now() - startTime) / 1000; // seconds
          const speed = elapsed > 0 ? loaded / elapsed : 0; // bytes per second
          
          onProgress({
            loaded,
            total,
            percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
            speed,
          });
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Create blob and trigger download
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    triggerBlobDownload(blob, downloadInfo.filename);
    
    console.log('Direct stream download completed successfully');

  } catch (error) {
    console.error('Direct stream download failed:', error);
    throw error;
  }
}

/**
 * Fallback to server-side streaming download
 */
async function downloadSoundCloudTrackFallback(
  trackUrl: string,
  onProgress?: (progress: DownloadProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('Using fallback server-side streaming for:', trackUrl);
    
    const response = await fetch(`/api/soundcloud/download?url=${encodeURIComponent(trackUrl)}`, {
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Fallback download failed: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (abortSignal?.aborted) {
          throw new Error('Download cancelled');
        }

        chunks.push(value);
        loaded += value.length;

        // Calculate progress and speed
        if (onProgress) {
          const elapsed = (Date.now() - startTime) / 1000; // seconds
          const speed = elapsed > 0 ? loaded / elapsed : 0; // bytes per second
          
          onProgress({
            loaded,
            total,
            percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
            speed,
          });
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Create blob and trigger download
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'audio.mp3';
    
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }
    
    triggerBlobDownload(blob, filename);
    
    console.log('Fallback download completed successfully');

  } catch (error) {
    console.error('Fallback download failed:', error);
    throw error;
  }
}

/**
 * Trigger file download using blob URL
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error) {
    console.error('Failed to trigger download:', error);
    throw new Error('Failed to save file');
  }
}

/**
 * Format download speed for display
 */
export function formatSpeed(bytesPerSecond: number): string {
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let speed = bytesPerSecond;
  let unitIndex = 0;
  
  while (speed >= 1024 && unitIndex < units.length - 1) {
    speed /= 1024;
    unitIndex++;
  }
  
  return `${speed.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}