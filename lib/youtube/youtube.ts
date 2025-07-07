// Using Node.js built-in fetch instead of undici
import { Innertube } from "@imput/youtubei.js";
import { YouTubePlaylistInfo, YouTubeTrackInfo, YouTubePlaylistApiResponse, YouTubeAudioOptions, YouTubeAudioResult } from "@/types/youtube";
import { env } from "./config";
import { getCookie } from "./cookie-manager";
import { getYouTubeSession } from "./youtube-session";

const PLAYER_REFRESH_PERIOD = 1000 * 60 * 15; // ms

let innertube: Innertube | undefined;
let lastRefreshedAt = 0;

const clientsWithNoCipher = ['IOS', 'ANDROID', 'YTSTUDIO_ANDROID', 'YTMUSIC_ANDROID'];

// Utility function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
    const patterns = [
        // Standard YouTube URLs
        /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
        // Short URLs
        /(?:youtu\.be\/)([^&\n?#]+)/,
        // Embed URLs
        /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
        // YouTube Shorts
        /(?:youtube\.com\/shorts\/)([^&\n?#]+)/,
        // Mobile URLs
        /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
        // Direct video ID (11 characters)
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

// Utility function to extract playlist ID from YouTube URL
function extractPlaylistId(url: string): string | null {
    const patterns = [
        // Standard playlist URLs
        /[?&]list=([^&\n?#]+)/,
        // Direct playlist ID
        /^(PL[a-zA-Z0-9_-]+)$/,
        /^(UU[a-zA-Z0-9_-]+)$/,
        /^(FL[a-zA-Z0-9_-]+)$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Clean up the URL by removing tracking parameters
function cleanUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        ["si", "utm_source", "utm_medium", "utm_campaign", "t"].forEach(param => {
            urlObj.searchParams.delete(param);
        });
        return urlObj.toString();
    } catch {
        return url;
    }
}

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

async function downloadYouTubeAudio(options: YouTubeAudioOptions): Promise<YouTubeAudioResult> {
    const { id, quality = "1080", format = "m4a" } = options;

    // For audio-only downloads, we prefer certain settings
    let innertubeClient = env.customInnertubeClient || "IOS";

    // Use session for better audio quality if available
    let useSession = Boolean(env.ytSessionServer);

    if (env.ytAllowBetterAudio && quality === "max") {
        useSession = true;
        innertubeClient = env.ytSessionInnertubeClient || "WEB_EMBEDDED";
    }

    let yt: Innertube;
    try {
        yt = await cloneInnertube(
            undefined, // Let Innertube use its default fetch
            useSession
        );
    } catch (e) {
        if (e instanceof Error) {
            if (e.message === "no_session_tokens") {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "youtube.no_session_tokens"
                };
            } else if (e.message?.endsWith("decipher algorithm")) {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "youtube.decipher"
                };
            } else if (e.message?.includes("refresh access token")) {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "youtube.token_expired"
                };
            }
        }
        throw e;
    }

    let info: any;
    try {
        info = await yt.getBasicInfo(id, innertubeClient as any);
    } catch (e: any) {
        if (e?.info) {
            let errorInfo: any;
            try {
                errorInfo = JSON.parse(e.info);
            } catch { }

            if (errorInfo?.reason === "This video is private") {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "content.video.private"
                };
            }
            if (["INVALID_ARGUMENT", "UNAUTHENTICATED"].includes(errorInfo?.error?.status)) {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "youtube.api_error"
                };
            }
        }

        if (e?.message === "This video is unavailable") {
            return {
                type: "audio",
                isAudioOnly: true,
                urls: "",
                filename: "",
                bestAudio: format,
                error: "content.video.unavailable"
            };
        }

        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "fetch.fail"
        };
    }

    if (!info) {
        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "fetch.fail"
        };
    }

    const playability = info.playability_status;
    const basicInfo = info.basic_info;

    // Check playability status
    switch (playability.status) {
        case "LOGIN_REQUIRED":
            if (playability.reason?.endsWith("bot")) {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "youtube.login"
                };
            }
            if (playability.reason?.endsWith("age") || playability.reason?.endsWith("inappropriate for some users.")) {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "content.video.age"
                };
            }
            if (playability?.error_screen?.reason?.text === "Private video") {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "content.video.private"
                };
            }
            break;

        case "UNPLAYABLE":
            if (playability?.reason?.endsWith("request limit.")) {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "fetch.rate"
                };
            }
            if (playability?.error_screen?.subreason?.text?.endsWith("in your country")) {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "content.video.region"
                };
            }
            if (playability?.error_screen?.reason?.text === "Private video") {
                return {
                    type: "audio",
                    isAudioOnly: true,
                    urls: "",
                    filename: "",
                    bestAudio: format,
                    error: "content.video.private"
                };
            }
            break;

        case "AGE_VERIFICATION_REQUIRED":
            return {
                type: "audio",
                isAudioOnly: true,
                urls: "",
                filename: "",
                bestAudio: format,
                error: "content.video.age"
            };
    }

    if (playability.status !== "OK") {
        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "content.video.unavailable"
        };
    }

    if (basicInfo.is_live) {
        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "content.video.live"
        };
    }

    // Verify this is the correct video
    if (basicInfo.id !== id) {
        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "fetch.fail"
        };
    }

    // Extract audio formats
    const streamingData = info.streaming_data;
    if (!streamingData) {
        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "fetch.fail"
        };
    }

    // Get audio-only formats
    const audioFormats = streamingData.adaptive_formats?.filter((format: any) =>
        format.mime_type?.includes('audio/') && format.url
    ) || [];

    if (audioFormats.length === 0) {
        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "fetch.fail"
        };
    }

    // Choose best audio format based on preference
    let bestAudio: any;

    // For MP3, we'll use M4A as it's more compatible and can be converted
    const preferredCodecs = format === 'mp3' ? ['mp4a', 'opus'] :
        format === 'opus' ? ['opus', 'mp4a'] :
            ['mp4a', 'opus'];

    for (const codec of preferredCodecs) {
        bestAudio = audioFormats.find((f: any) =>
            f.mime_type?.includes(codec) && f.bitrate
        );
        if (bestAudio) break;
    }

    // Fallback to highest bitrate audio
    if (!bestAudio) {
        bestAudio = audioFormats.reduce((prev: any, current: any) =>
            (current.bitrate > prev.bitrate) ? current : prev
        );
    }

    if (!bestAudio) {
        return {
            type: "audio",
            isAudioOnly: true,
            urls: "",
            filename: "",
            bestAudio: format,
            error: "fetch.fail"
        };
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

    // Determine best audio format - if user requested MP3, we'll use M4A but label it as requested format
    const actualFormat = bestAudio.mime_type?.includes('mp4a') ? 'm4a' :
        bestAudio.mime_type?.includes('opus') ? 'opus' :
            bestAudio.mime_type?.includes('mp3') ? 'mp3' : 'm4a';

    // Use requested format for filename, but actual format for download
    const audioFormat = format === 'mp3' ? 'mp3' : actualFormat;

    // Create filename
    const sanitizedTitle = basicInfo.title?.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || 'audio';
    const filename = `${sanitizedTitle}_${id}.${audioFormat}`;

    // Get cover image
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

// Resolve single track from URL
export async function resolveTrack(url: string): Promise<YouTubeTrackInfo> {
    try {
        const clean = cleanUrl(url);
        const videoId = extractVideoId(clean);

        if (!videoId) {
            throw new Error("Invalid YouTube URL - could not extract video ID");
        }

        // Download to get stream URL and metadata
        const downloadResult = await downloadYouTubeAudio({
            id: videoId,
            quality: '720',
            format: 'mp3'
        });

        if (downloadResult.error) {
            throw new Error(downloadResult.error);
        }

        // Map to our track format
        const track: YouTubeTrackInfo = {
            id: videoId,
            title: downloadResult.fileMetadata?.title || 'Unknown',
            artist: downloadResult.fileMetadata?.artist || 'Unknown',
            duration: downloadResult.fileMetadata?.duration || 0,
            artwork: downloadResult.cover || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            streamUrl: Array.isArray(downloadResult.urls) ? downloadResult.urls[0] : downloadResult.urls,
            format: downloadResult.bestAudio,
            size: undefined,
            bitrate: undefined,
        };

        return track;
    } catch (error) {
        console.error('[YouTube API error]', error);
        throw error;
    }
}

// Resolve single video from URL
export async function resolveVideo(url: string): Promise<YouTubeTrackInfo> {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error("Invalid YouTube video URL - could not extract video ID");
        }

        // Use Innertube to get video info
        let yt: Innertube;
        try {
            yt = await cloneInnertube(
                undefined, // Let Innertube use its default fetch
                false // Don't use session for single video
            );
        } catch (e) {
            throw new Error("Failed to initialize YouTube client");
        }

        const video = await yt.getInfo(videoId);

        if (!video || !video.basic_info) {
            throw new Error("Video not found or unavailable");
        }

        // Extract video info
        const videoInfo: YouTubeTrackInfo = {
            id: videoId,
            title: video.basic_info.title || "Unknown Title",
            artist: video.basic_info.channel?.name || "Unknown Artist",
            duration: video.basic_info.duration || 0,
            artwork: video.basic_info.thumbnail?.[0]?.url || "",
            url: `https://www.youtube.com/watch?v=${videoId}`,
            streamUrl: "", // Will be populated when downloading
            format: undefined,
            size: undefined,
            bitrate: undefined,
        };

        return videoInfo;
    } catch (err) {
        console.error("Error resolving YouTube video:", err);
        throw err;
    }
}

// Resolve playlist from URL
export async function resolvePlaylist(url: string): Promise<YouTubePlaylistApiResponse> {
    try {
        const clean = cleanUrl(url);
        const playlistId = extractPlaylistId(clean);

        if (!playlistId) {
            throw new Error("Invalid YouTube playlist URL - could not extract playlist ID");
        }

        // Use Innertube to get playlist info
        let yt: Innertube;
        try {
            yt = await cloneInnertube(
                undefined, // Let Innertube use its default fetch
                false // Don't use session for playlist
            );
        } catch (e) {
            throw new Error("Failed to initialize YouTube client");
        }

        // Get playlist info
        let playlistInfo: any;
        try {
            playlistInfo = await yt.getPlaylist(playlistId);
        } catch (e: any) {
            console.error('[YouTube] Error getting playlist info:', e);
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

        // Get all videos from playlist with pagination
        let allVideos: any[] = [];
        let videos = playlistInfo.videos || [];

        // Add initial batch
        allVideos.push(...videos);

        // Continue fetching if there are more videos
        let continuation = playlistInfo.has_continuation;
        let maxPages = 10; // Limit to prevent infinite loops (10 pages = ~500 videos)
        let currentPage = 1;

        while (continuation && currentPage < maxPages) {
            try {
                console.log(`[YouTube] Fetching page ${currentPage + 1} of playlist...`);
                const nextBatch = await playlistInfo.getContinuation();
                if (nextBatch && nextBatch.videos) {
                    allVideos.push(...nextBatch.videos);
                    continuation = nextBatch.has_continuation;
                    playlistInfo = nextBatch; // Update for next iteration
                    currentPage++;
                } else {
                    break;
                }
            } catch (error) {
                console.warn('[YouTube] Error fetching continuation:', error);
                break;
            }
        }

        console.log(`[YouTube] Total videos found: ${allVideos.length}`);

        // Limit to reasonable number for processing (can be increased)
        const maxTracks = 200; // Increased from 50
        const videosToProcess = allVideos.slice(0, maxTracks);

        // Process each video to get audio info
        const tracks: YouTubeTrackInfo[] = [];

        for (const video of videosToProcess) {
            try {
                // Skip if video is unavailable
                if (!video.id || video.id === 'N/A') continue;

                // Get audio info for this video
                const audioResult = await downloadYouTubeAudio({
                    id: video.id,
                    quality: '720',
                    format: 'mp3'
                });

                if (audioResult.error) {
                    console.warn(`[YouTube] Skipping video ${video.id}: ${audioResult.error}`);
                    continue;
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

                tracks.push(track);
            } catch (error) {
                console.warn(`[YouTube] Error processing video ${video.id}:`, error);
                // Continue with next video
            }
        }

        if (tracks.length === 0) {
            throw new Error("No playable tracks found in playlist");
        }

        return {
            playlistInfo: playlistData,
            tracks
        };

    } catch (error) {
        console.error('[YouTube Playlist API error]', error);
        throw error;
    }
}

// Check if URL is a playlist
export function isPlaylistUrl(url: string): boolean {
    return url.includes('list=') && !url.includes('watch?v=');
}

// Check if URL is a video
export function isVideoUrl(url: string): boolean {
    return extractVideoId(url) !== null;
}
