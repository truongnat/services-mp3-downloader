"use client"
import { useCallback, useState } from "react";
import { useGenericPlaylistDownloader } from "@/lib/hooks/use-generic-playlist-downloader";
import { useEnhancedDownloader, TrackDownloadInfo } from "@/lib/hooks/use-enhanced-downloader";
import { YouTubeTrackInfo } from "@/types/youtube";

// Components
import PlaylistHeader from "@/components/playlist/playlist-header";
import TrackList from "@/components/playlist/track-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Link, Music, AlertCircle } from "lucide-react";
import { extractPlaylistId, isPlaylistUrl } from "@/lib/youtube/url-utils";

interface PlaylistDownloaderYouTubeProps {
    setDisableTabs?: (v: boolean) => void;
}

// Utility function to detect if input is a playlist URL
function isYouTubePlaylistUrl(input: string): boolean {
    return isPlaylistUrl(input.trim());
}

export default function PlaylistDownloaderYouTube({ setDisableTabs }: PlaylistDownloaderYouTubeProps) {
    const {
        playlist,
        url,
        setUrl,
        loadPlaylist,
    } = useGenericPlaylistDownloader<YouTubeTrackInfo>();

    const {
        downloadState,
        downloadTrack,
        downloadPlaylist,
        cancelDownloads,
        resetDownloadState
    } = useEnhancedDownloader();

    // Input state
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Handle playlist URL input
    const handleSubmit = useCallback(async () => {
        if (!inputValue.trim()) return;

        setIsProcessing(true);
        setError(null);

        try {
            if (!isYouTubePlaylistUrl(inputValue)) {
                throw new Error("Please enter a valid YouTube playlist URL");
            }

            console.log('Loading YouTube playlist:', inputValue);

            // Set URL and load playlist immediately with the current input value
            const urlToLoad = inputValue.trim();
            setUrl(urlToLoad);

            // Load playlist with explicit URL to avoid race condition
            await loadPlaylist('/api/youtube/playlist', urlToLoad);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to load playlist');
        } finally {
            setIsProcessing(false);
        }
    }, [inputValue, setUrl, loadPlaylist]);

    // Clear all data
    const clearInput = useCallback(() => {
        setInputValue("");
        setError(null);
        setUrl("");
        resetDownloadState();
    }, [setUrl, resetDownloadState]);

    // Handle single track download using existing YouTube API
    const handleDownloadTrack = useCallback(async (track: YouTubeTrackInfo) => {
        const trackInfo: TrackDownloadInfo = {
            id: track.id,
            url: track.url,
            title: track.title,
            artist: track.artist || "Unknown",
            platform: 'youtube',
        };

        await downloadTrack(trackInfo);
    }, [downloadTrack]);

    // Handle download all tracks
    const handleDownloadAll = useCallback(async () => {
        const tracks = playlist.tracks;
        if (!tracks || tracks.length === 0) return;

        setDisableTabs?.(true);

        try {
            const tracksInfo: TrackDownloadInfo[] = tracks.map(track => ({
                id: track.id,
                url: track.url,
                title: track.title,
                artist: track.artist || "Unknown",
                platform: 'youtube' as const,
            }));

            await downloadPlaylist(tracksInfo);
        } finally {
            setDisableTabs?.(false);
        }
    }, [playlist.tracks, downloadPlaylist, setDisableTabs]);

    // Get track status for display
    const getTrackStatus = useCallback((trackId: string) => {
        const progress = downloadState.trackProgress[trackId];
        const error = downloadState.errors[trackId];

        if (error) {
            return { status: 'error' as const, progress: 0, error };
        }

        if (progress) {
            if (progress.percent === 100) {
                return { status: 'done' as const, progress: 100 };
            } else if (progress.percent > 0) {
                return { status: 'downloading' as const, progress: progress.percent };
            }
        }

        return { status: 'idle' as const, progress: 0 };
    }, [downloadState]);

    // Determine the loading state
    const isLoading = playlist.isLoading || isProcessing;

    // Determine the error to show
    const displayError = playlist.error || error;

    // Only show header when there's content and input is not empty
    const shouldShowHeader = inputValue.trim() && playlist.info && playlist.tracks.length > 0;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">YouTube Playlist Downloader</h1>

            {/* Information Notice */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                    ⭐ <strong>YouTube Playlist Support:</strong> Enter a YouTube playlist URL to view all videos and download them individually
                </p>
            </div>

            {/* Playlist URL Input */}
            <div className="mb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Link className="w-4 h-4 text-red-500" />
                            <label className="text-sm font-medium">YouTube Playlist URL</label>
                        </div>
                    </div>

                    <div className="relative">
                        <Input
                            type="url"
                            placeholder="https://www.youtube.com/playlist?list=..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="pr-10"
                            disabled={isLoading}
                        />
                        {inputValue && (
                            <button
                                onClick={clearInput}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                disabled={isLoading}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* URL Validation */}
                    {inputValue && !isYouTubePlaylistUrl(inputValue) && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Please enter a valid YouTube playlist URL
                        </p>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || !isYouTubePlaylistUrl(inputValue) || isLoading}
                        className="flex-1"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Loading Playlist...
                            </>
                        ) : (
                            <>
                                <Music className="w-4 h-4 mr-2" />
                                Load Playlist
                            </>
                        )}
                    </Button>

                    {inputValue && (
                        <Button
                            onClick={clearInput}
                            variant="outline"
                            disabled={isLoading}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {displayError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Error</span>
                    </div>
                    <p className="text-red-600 mt-1 text-sm">{displayError}</p>
                </div>
            )}

            {/* Playlist Header */}
            {shouldShowHeader && (
                <PlaylistHeader
                    title={playlist.info?.title || 'Unknown Playlist'}
                    description={playlist.info?.description}
                    coverUrl={playlist.info?.artwork}
                    tracksCount={playlist.tracks.length}
                    isDownloading={downloadState.isDownloading}
                    downloadedCount={downloadState.overallProgress.completed}
                    onDownloadAll={handleDownloadAll}
                    platform="youtube"
                />
            )}

            {/* Track List */}
            {playlist.tracks.length > 0 && (
                <TrackList
                    tracks={playlist.tracks}
                    onDownloadTrack={handleDownloadTrack}
                    getTrackStatus={getTrackStatus}
                    isDownloading={downloadState.isDownloading}
                />
            )}

            {/* Instructions */}
            {!playlist.tracks.length && !isLoading && !displayError && (
                <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-md">
                    <h3 className="font-medium text-gray-900 mb-3">How to use:</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">1.</span>
                            <span>Copy a YouTube playlist URL (e.g., https://www.youtube.com/playlist?list=...)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">2.</span>
                            <span>Paste it in the input field above</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">3.</span>
                            <span>Click "Load Playlist" to fetch all videos</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">4.</span>
                            <span>Download individual videos or the entire playlist</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}