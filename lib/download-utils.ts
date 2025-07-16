import { AudioSettings } from "@/lib/settings";

// Common track interface for both platforms
export interface CommonTrackInfo {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  artwork?: string;
  url: string;
  streamUrl: string;
  format?: string;
  size?: number;
  bitrate?: number;
}

// Check if File System Access API is supported
export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

// Generate filename based on settings
export function generateFilename(track: CommonTrackInfo, index: number, settings: AudioSettings): string {
  let filename = settings.filenameFormat;

  // Replace variables with proper formatting
  filename = filename.replace('{index:03d}', String(index + 1).padStart(3, '0'));
  filename = filename.replace('{index}', String(index + 1).padStart(2, '0'));
  filename = filename.replace('{artist}', track.artist || 'Unknown Artist');
  filename = filename.replace('{title}', track.title || 'Unknown Title');
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
    filename = filename.replace(/[^\w\s\-_.()[\]]/g, '').replace(/\s+/g, '_');
  }

  return filename + '.' + settings.format;
}

// Format duration from milliseconds to MM:SS
export function formatDuration(durationMs?: number): string {
  if (!durationMs) return "0:00";
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format file size
export function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// Format bitrate
export function formatBitrate(bitrate?: number): string {
  if (!bitrate) return "Unknown";
  return `${bitrate} kbps`;
}

// Download progress tracking
export interface DownloadProgress {
  percent: number;
  loaded: number;
  total: number;
}

// Common download function with progress tracking
export async function downloadWithProgress(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const contentLength = response.headers.get("Content-Length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const reader = response.body.getReader();
  let loaded = 0;
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (onProgress && total > 0) {
      const percent = Math.round((loaded / total) * 100);
      onProgress({ percent, loaded, total });
    }
  }

  return new Blob(chunks);
}

// Save file using File System Access API or fallback to download
export async function saveFile(
  blob: Blob,
  filename: string,
  onMacOSDownload?: () => void
): Promise<void> {
  // Try File System Access API first (Chrome/Edge)
  if (supportsFileSystemAccess()) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Audio files',
          accept: { 'audio/*': ['.mp3', '.m4a', '.wav'] }
        }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Success, no need for fallback

    } catch {
      // User cancelled or error, fall back to regular download
      console.log('File System Access API failed, falling back to regular download');
    }
  }

  // Fallback: Regular download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Detect macOS and show tip
  const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  if (isMac && onMacOSDownload) {
    onMacOSDownload();
  }
}

// Save file with location confirmation
export async function saveFileWithConfirmation(
  blob: Blob,
  filename: string,
  useCustomLocation: boolean,
  onMacOSDownload?: () => void
): Promise<void> {
  if (useCustomLocation && supportsFileSystemAccess()) {
    // Use File System Access API to let user choose location
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Audio files',
          accept: { 'audio/*': ['.mp3', '.m4a', '.wav'] }
        }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      // User cancelled or error, fall back to regular download
      console.log('File System Access API failed, falling back to regular download');
    }
  }

  // Use default download location
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Detect macOS and show tip
  const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  if (isMac && onMacOSDownload) {
    onMacOSDownload();
  }
}



// Common error messages
export const ERROR_MESSAGES = {
  INVALID_URL: "Please enter a valid URL",
  FETCH_FAILED: "Failed to fetch playlist information",
  DOWNLOAD_FAILED: "Failed to download track",
  NO_TRACKS: "No tracks found in playlist",
  NETWORK_ERROR: "Network error occurred",
  UNKNOWN_ERROR: "An unknown error occurred"
} as const;

// Common success messages
export const SUCCESS_MESSAGES = {
  PLAYLIST_LOADED: "Playlist loaded successfully",
  DOWNLOAD_COMPLETE: "Download completed",
  ALL_DOWNLOADS_COMPLETE: "All downloads completed"
} as const;
