import { createJob, updateJob, getJob, generateJobId } from '../job-manager';
import { resolvePlaylist } from './youtube';

export interface PlaylistJobOptions {
  url: string;
  maxTracks?: number;
}

export async function createPlaylistJob(options: PlaylistJobOptions): Promise<string> {
  const jobId = generateJobId();
  createJob(jobId);

  // Start background processing
  processPlaylistJob(jobId, options).catch(error => {
    updateJob(jobId, {
      status: 'failed',
      error: error.message,
      message: 'Failed to process playlist'
    });
  });

  return jobId;
}

async function processPlaylistJob(jobId: string, options: PlaylistJobOptions) {
  const { url, maxTracks = 200 } = options;
  
  try {
    updateJob(jobId, {
      status: 'processing',
      progress: 5,
      message: 'Initializing YouTube client...'
    });

    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));

    updateJob(jobId, {
      progress: 10,
      message: 'Resolving playlist information...'
    });

    const { playlistInfo, tracks } = await resolvePlaylist(url);

    updateJob(jobId, {
      progress: 95,
      message: 'Finalizing track information...',
      totalItems: playlistInfo.tracksCount,
      processedItems: tracks.length
    });

    // Simulate finalization delay
    await new Promise(resolve => setTimeout(resolve, 300));

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message: `Successfully processed ${tracks.length} tracks`,
      result: {
        playlistInfo,
        tracks,
        meta: {
          requestedMaxTracks: maxTracks,
          actualTracksReturned: tracks.length,
          totalTracksInPlaylist: playlistInfo.tracksCount
        }
      }
    });

  } catch (error) {
    updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to process playlist',
      progress: 0
    });
  }
}

export function getPlaylistJobStatus(jobId: string) {
  return getJob(jobId);
}
