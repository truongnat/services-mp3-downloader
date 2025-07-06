import { Innertube } from "@imput/youtubei.js";
import { YouTubePlaylistInfo, YouTubeTrackInfo, YouTubePlaylistApiResponse } from "@/types/youtube";
import { env } from "./youtube/config";
import { getCookie } from "./youtube/cookie-manager";
import { getYouTubeSession } from "./youtube/youtube-session";
import { updateJob, completeJob, failJob } from "./job-manager";

const PLAYER_REFRESH_PERIOD = 1000 * 60 * 15; // ms
let innertube: Innertube | undefined;
let lastRefreshedAt = 0;
const clientsWithNoCipher = ['IOS', 'ANDROID', 'YTSTUDIO_ANDROID', 'YTMUSIC_ANDROID'];

// Clone Innertube instance
const cloneInnertube = async (customFetch: any, useSession: boolean): Promise<Innertube> => {
    const shouldRefreshPlayer = lastRefreshedAt + PLAYER_REFRESH_PERIOD < Date.now();

    const rawCookie = getCookie('youtube');
    const cookie = rawCookie?.toString();

    const sessionTokens = getYouTubeSession();
    const retrieve_player = Boolean(sessionTokens || cookie);

    if (useSession && env.ytSessionServer && !sessionTokens?.potoken) {
        throw new Error("no_session_tokens");
    }

    if (!innertube || shouldRefreshPlayer) {
        innertube = await Innertube.create({
            fetch: customFetch,
            retrieve_player,
            cookie,
            po_token: useSession ? sessionTokens?.potoken : undefined,
            visitor_data: useSession ? sessionTokens?.visitor_data : undefined,
        });
        lastRefreshedAt = Date.now();
    }

    return innertube;
}

// Download YouTube audio info
async function downloadYouTubeAudio(options: { id: string; quality?: string; format?: string }): Promise<any> {
    const { id, quality = "1080", format = "m4a" } = options;

    let innertubeClient = env.customInnertubeClient || "IOS";
    let useSession = Boolean(env.ytSessionServer);
    
    if (env.ytAllowBetterAudio && quality === "max") {
        useSession = true;
        innertubeClient = env.ytSessionInnertubeClient || "WEB_EMBEDDED";
    }

    let yt: Innertube;
    try {
        yt = await cloneInnertube(undefined, useSession);
    } catch (e) {
        if (e instanceof Error) {
            if (e.message === "no_session_tokens") {
                return { error: "youtube.no_session_tokens" };
            } else if (e.message?.endsWith("decipher algorithm")) {
                return { error: "youtube.decipher" };
            } else if (e.message?.includes("refresh access token")) {
                return { error: "youtube.token_expired" };
            }
        }
        throw e;
    }

    let info: any;
    try {
        info = await yt.getBasicInfo(id, innertubeClient as any);
    } catch (e: any) {
        return { error: "fetch.fail" };
    }

    if (!info) {
        return { error: "fetch.fail" };
    }

    const playability = info.playability_status;
    const basicInfo = info.basic_info;

    // Check playability status
    if (playability.status !== "OK") {
        return { error: "content.video.unavailable" };
    }

    if (basicInfo.is_live) {
        return { error: "content.video.live" };
    }

    // Extract audio formats
    const streamingData = info.streaming_data;
    if (!streamingData) {
        return { error: "fetch.fail" };
    }

    const audioFormats = streamingData.adaptive_formats?.filter((format: any) =>
        format.mime_type?.includes('audio/') && format.url
    ) || [];

    if (audioFormats.length === 0) {
        return { error: "fetch.fail" };
    }

    // Choose best audio format
    let bestAudio: any;
    const preferredCodecs = format === 'mp3' ? ['mp4a', 'opus'] :
                           format === 'opus' ? ['opus', 'mp4a'] :
                           ['mp4a', 'opus'];

    for (const codec of preferredCodecs) {
        bestAudio = audioFormats.find((f: any) =>
            f.mime_type?.includes(codec) && f.bitrate
        );
        if (bestAudio) break;
    }

    if (!bestAudio) {
        bestAudio = audioFormats.reduce((prev: any, current: any) =>
            (current.bitrate > prev.bitrate) ? current : prev
        );
    }

    if (!bestAudio) {
        return { error: "fetch.fail" };
    }

    // Get audio URL
    let audioUrl = bestAudio.url;
    if (!clientsWithNoCipher.includes(innertubeClient) && innertube) {
        try {
            audioUrl = bestAudio.decipher(innertube.session.player);
        } catch (e) {
            console.warn('Failed to decipher audio URL:', e);
        }
    }

    const actualFormat = bestAudio.mime_type?.includes('mp4a') ? 'm4a' :
                         bestAudio.mime_type?.includes('opus') ? 'opus' :
                         bestAudio.mime_type?.includes('mp3') ? 'mp3' : 'm4a';

    const audioFormat = format === 'mp3' ? 'mp3' : actualFormat;
    const sanitizedTitle = basicInfo.title?.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || 'audio';
    const filename = `${sanitizedTitle}_${id}.${audioFormat}`;

    let cover = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    try {
        const testMaxCover = await fetch(cover)
            .then(r => r.status === 200)
            .catch(() => false);

        if (!testMaxCover) {
            cover = basicInfo.thumbnail?.[0]?.url || undefined;
        }
    } catch {
        cover = basicInfo.thumbnail?.[0]?.url || undefined;
    }

    return {
        type: "audio",
        isAudioOnly: true,
        urls: audioUrl,
        filename,
        bestAudio: audioFormat,
        cover,
        cropCover: basicInfo.author?.endsWith("- Topic"),
        fileMetadata: {
            title: basicInfo.title || 'Unknown',
            artist: basicInfo.author || 'Unknown',
            duration: basicInfo.duration || 0,
            year: basicInfo.publish_date ? new Date(basicInfo.publish_date).getFullYear() : undefined
        }
    };
}

// Process YouTube playlist with job tracking
export async function processYouTubePlaylistJob(jobId: string, playlistId: string): Promise<void> {
    try {
        updateJob(jobId, {
            status: 'running',
            progress: 5,
            message: 'Initializing YouTube client...'
        });

        // Initialize Innertube
        let yt: Innertube;
        try {
            yt = await cloneInnertube(undefined, false);
        } catch (e) {
            throw new Error("Failed to initialize YouTube client");
        }

        updateJob(jobId, {
            progress: 10,
            message: 'Fetching playlist information...'
        });

        // Get playlist info
        let playlistInfo: any;
        try {
            playlistInfo = await yt.getPlaylist(playlistId);
        } catch (e: any) {
            throw new Error("Failed to fetch playlist information");
        }

        if (!playlistInfo) {
            throw new Error("Playlist not found");
        }

        // Extract basic playlist info
        const basicInfo = playlistInfo.info;
        const playlistData: YouTubePlaylistInfo = {
            id: playlistId,
            title: basicInfo.title || 'Unknown Playlist',
            description: basicInfo.description || '',
            artwork: basicInfo.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${playlistId}/maxresdefault.jpg`,
            tracksCount: playlistInfo.video_count || 0,
            author: basicInfo.author || 'Unknown'
        };

        updateJob(jobId, {
            progress: 15,
            message: 'Fetching all videos from playlist...',
            totalItems: playlistData.tracksCount
        });

        // Get all videos with pagination
        let allVideos: any[] = [];
        let videos = playlistInfo.videos || [];
        allVideos.push(...videos);

        let continuation = playlistInfo.has_continuation;
        let maxPages = 20; // Allow more pages for large playlists
        let currentPage = 1;

        while (continuation && currentPage < maxPages) {
            try {
                updateJob(jobId, {
                    progress: 15 + (currentPage * 5), // Progress from 15% to 35%
                    message: `Fetching page ${currentPage + 1} of playlist...`
                });

                const nextBatch = await playlistInfo.getContinuation();
                if (nextBatch && nextBatch.videos) {
                    allVideos.push(...nextBatch.videos);
                    continuation = nextBatch.has_continuation;
                    playlistInfo = nextBatch;
                    currentPage++;
                } else {
                    break;
                }
            } catch (error) {
                console.warn('[YouTube] Error fetching continuation:', error);
                break;
            }
        }

        updateJob(jobId, {
            progress: 40,
            message: `Found ${allVideos.length} videos. Processing audio information...`,
            totalItems: allVideos.length,
            processedItems: 0
        });

        // Process each video to get audio info
        const tracks: YouTubeTrackInfo[] = [];
        const batchSize = 5; // Process 5 videos at a time
        
        for (let i = 0; i < allVideos.length; i += batchSize) {
            const batch = allVideos.slice(i, i + batchSize);
            const batchPromises = batch.map(async (video) => {
                try {
                    if (!video.id || video.id === 'N/A') return null;
                    
                    const audioResult = await downloadYouTubeAudio({
                        id: video.id,
                        quality: '720',
                        format: 'mp3'
                    });

                    if (audioResult.error) {
                        console.warn(`[YouTube] Skipping video ${video.id}: ${audioResult.error}`);
                        return null;
                    }

                    const track: YouTubeTrackInfo = {
                        id: video.id,
                        title: audioResult.fileMetadata?.title || video.title || 'Unknown',
                        artist: audioResult.fileMetadata?.artist || video.author || 'Unknown',
                        duration: audioResult.fileMetadata?.duration || video.duration || 0,
                        artwork: audioResult.cover || `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`,
                        url: `https://www.youtube.com/watch?v=${video.id}`,
                        streamUrl: Array.isArray(audioResult.urls) ? audioResult.urls[0] : audioResult.urls,
                        format: audioResult.bestAudio,
                        size: undefined,
                        bitrate: undefined,
                    };

                    return track;
                } catch (error) {
                    console.warn(`[YouTube] Error processing video ${video.id}:`, error);
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            const validTracks = batchResults.filter(track => track !== null) as YouTubeTrackInfo[];
            tracks.push(...validTracks);

            // Update progress
            const processedItems = Math.min(i + batchSize, allVideos.length);
            const progress = 40 + Math.round((processedItems / allVideos.length) * 55); // Progress from 40% to 95%
            
            updateJob(jobId, {
                progress,
                message: `Processed ${processedItems}/${allVideos.length} videos (${tracks.length} valid tracks)`,
                processedItems
            });
        }

        if (tracks.length === 0) {
            throw new Error("No playable tracks found in playlist");
        }

        const result: YouTubePlaylistApiResponse = {
            playlistInfo: { ...playlistData, tracksCount: tracks.length },
            tracks
        };

        completeJob(jobId, result);

    } catch (error) {
        console.error('[YouTube Playlist Job error]', error);
        failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    }
}
