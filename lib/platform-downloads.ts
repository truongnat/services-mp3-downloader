import { CommonTrackInfo, downloadWithProgress, saveFile, generateFilename } from "@/lib/download-utils";
export type { DownloadProgress } from "@/lib/download-utils";
import { AudioSettings } from "@/lib/settings";

// YouTube-specific download function
export async function downloadYouTubeTrack(
  track: CommonTrackInfo,
  index: number,
  settings: AudioSettings,
  onProgress?: (progress: { percent: number; loaded: number; total: number }) => void,
): Promise<void> {
  const filename = generateFilename(track, index, settings);

  // Use YouTube API proxy for download
  const proxyUrl = `/api/youtube/download?url=${encodeURIComponent(track.streamUrl)}&filename=${encodeURIComponent(filename)}`;

  try {
    const blob = await downloadWithProgress(proxyUrl, onProgress);
    await saveFile(blob, filename);
  } catch (error) {
    console.error('YouTube download error:', error);
    throw error;
  }
}

// SoundCloud-specific download function
export async function downloadSoundCloudTrack(
  track: CommonTrackInfo,
  index: number,
  settings: AudioSettings,
  onProgress?: (progress: { percent: number; loaded: number; total: number }) => void,
): Promise<void> {
  const filename = generateFilename(track, index, settings);

  try {
    // Direct download from SoundCloud stream URL
    const blob = await downloadWithProgress(track.streamUrl, onProgress);
    await saveFile(blob, filename);
  } catch (error) {
    console.error('SoundCloud download error:', error);
    throw error;
  }
}

// Generic download function that detects platform
export async function downloadTrack(
  track: CommonTrackInfo,
  index: number,
  settings: AudioSettings,
  platform: 'youtube' | 'soundcloud',
  onProgress?: (progress: { percent: number; loaded: number; total: number }) => void,
): Promise<void> {
  switch (platform) {
    case 'youtube':
      return downloadYouTubeTrack(track, index, settings, onProgress);
    case 'soundcloud':
      return downloadSoundCloudTrack(track, index, settings, onProgress);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Batch download function with concurrency control
export async function downloadTracks(
  tracks: CommonTrackInfo[],
  settings: AudioSettings,
  platform: 'youtube' | 'soundcloud',
  onTrackProgress?: (trackIndex: number, progress: { percent: number; loaded: number; total: number }) => void,
  onTrackComplete?: (trackIndex: number) => void,
  onTrackError?: (trackIndex: number, error: Error) => void,
  maxConcurrent: number = 3
): Promise<void> {
  const downloadPromises: Promise<void>[] = [];
  let activeDownloads = 0;
  let completedDownloads = 0;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    
    const downloadPromise = new Promise<void>((resolve, reject) => {
      const startDownload = async () => {
        activeDownloads++;
        
        try {
          await downloadTrack(
            track,
            i,
            settings,
            platform,
            (progress) => onTrackProgress?.(i, progress),
          );
          
          completedDownloads++;
          onTrackComplete?.(i);
          resolve();
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Download failed');
          onTrackError?.(i, err);
          reject(err);
        } finally {
          activeDownloads--;
        }
      };

      // Wait for available slot if max concurrent reached
      const waitForSlot = () => {
        if (activeDownloads < maxConcurrent) {
          startDownload();
        } else {
          setTimeout(waitForSlot, 100);
        }
      };

      waitForSlot();
    });

    downloadPromises.push(downloadPromise);
  }

  // Wait for all downloads to complete (or fail)
  await Promise.allSettled(downloadPromises);
}
