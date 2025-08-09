import { CommonTrackInfo, downloadWithProgress, saveFile, generateFilename } from "@/lib/download-utils";
export type { DownloadProgress } from "@/lib/download-utils";
import { AudioSettings } from "@/lib/settings";

    throw error;
  }
}

// SoundCloud-specific download function
export async function downloadSoundCloudTrack(
  track: CommonTrackInfo,
  index: number,
  settings: AudioSettings,
  onProgress?: (progress: { percent: number; loaded: number; total: number }) => void,
  onMacOSDownload?: () => void
): Promise<void> {
  const filename = generateFilename(track, index, settings);

  try {
    // Direct download from SoundCloud stream URL
    const blob = await downloadWithProgress(track.streamUrl, onProgress);
    await saveFile(blob, filename, onMacOSDownload);
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
  onMacOSDownload?: () => void
): Promise<void> {
  switch (platform) {
    case 'youtube':
      // Sử dụng downloadYouTubeAudio cho YouTube
      // ...implement download logic here or import đúng hàm xử lý YouTube...
      throw new Error('YouTube download function chưa được implement hoặc import.');
    case 'soundcloud':
      return downloadSoundCloudTrack(track, index, settings, onProgress, onMacOSDownload);
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
  onMacOSDownload?: () => void,
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
            onMacOSDownload
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