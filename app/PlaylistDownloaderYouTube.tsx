"use client"
import { useCallback, useState } from "react"
import { useGenericPlaylistDownloader } from "@/lib/hooks/use-generic-playlist-downloader"
import { useEnhancedDownloader, TrackDownloadInfo } from "@/lib/hooks/use-enhanced-downloader"
import { YouTubeTrackInfo } from "@/types/youtube"

// Components
import PlaylistHeader from "@/components/playlist/playlist-header"
import TrackList from "@/components/playlist/track-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, X, Link, Music, AlertCircle, Play } from "lucide-react"
import { isPlaylistUrl, isVideoUrl } from "@/lib/youtube/url-utils"

interface PlaylistDownloaderYouTubeProps {
    setDisableTabs?: (v: boolean) => void
}

// Utility function to detect if input is a playlist URL
function isYouTubePlaylistUrl(input: string): boolean {
    return isPlaylistUrl(input.trim())
}

// Utility function to detect if input is a video URL
function isYouTubeVideoUrl(input: string): boolean {
    return isVideoUrl(input.trim())
}


export default function PlaylistDownloaderYouTube({ setDisableTabs }: PlaylistDownloaderYouTubeProps) {
    const {
        playlist,
        url,
        setUrl,
        loadPlaylist,
        clearData,
    } = useGenericPlaylistDownloader<YouTubeTrackInfo>()

    const {
        downloadState,
        downloadTrack,
        downloadPlaylist,
        cancelDownloads,
        resetDownloadState
    } = useEnhancedDownloader()

    // Input state
    const [inputValue, setInputValue] = useState("")
    const [error, setError] = useState<string | null>(null)

    // Handle input processing for both playlists and individual videos
    const handleSubmit = useCallback(async () => {
        if (!inputValue.trim()) return

        setError(null)

        try {
            const trimmedInput = inputValue.trim()
            // Always delegate to the generic loader which handles both video (via ytdl-info) and playlist (via Google API)
            setUrl(trimmedInput)
            await loadPlaylist('/api/youtube', trimmedInput)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to process input')
        }
    }, [inputValue, setUrl, loadPlaylist])

    // Clear all data
    const clearInput = useCallback(() => {
        setInputValue("")
        setError(null)
        setUrl("")
        resetDownloadState()
        clearData()
    }, [setUrl, resetDownloadState, clearData])

    // Handle single track download
    const handleDownloadTrack = useCallback(async (track: YouTubeTrackInfo) => {
        const trackInfo: TrackDownloadInfo = {
            id: track.id,
            url: track.url,
            title: track.title,
            artist: track.artist || "Unknown",
            platform: 'youtube',
        }

        await downloadTrack(trackInfo)
    }, [downloadTrack])

    // Handle download all tracks
    const handleDownloadAll = useCallback(async () => {
        const tracks = playlist.tracks
        if (!tracks || tracks.length === 0) return

        setDisableTabs?.(true)
        try {
            if (tracks.length === 1) {
                const track = tracks[0]
                const trackInfo: TrackDownloadInfo = {
                    id: track.id,
                    url: track.url,
                    title: track.title,
                    artist: track.artist || "Unknown",
                    platform: 'youtube',
                }
                await downloadTrack(trackInfo)
            } else {
                const tracksInfo: TrackDownloadInfo[] = tracks.map(track => ({
                    id: track.id,
                    url: track.url,
                    title: track.title,
                    artist: track.artist || "Unknown",
                    platform: 'youtube' as const,
                }))
                await downloadPlaylist(tracksInfo)
            }
        } finally {
            setDisableTabs?.(false)
        }
    }, [playlist.tracks, downloadTrack, downloadPlaylist, setDisableTabs])

    // Get track status for display
    const getTrackStatus = useCallback((trackId: string) => {
        const progress = downloadState.trackProgress[trackId]
        const error = downloadState.errors[trackId]

        if (error) {
            return { status: 'error' as const, progress: 0, error }
        }

        if (progress) {
            if (progress.percent === 100) {
                return { status: 'done' as const, progress: 100 }
            } else if (progress.percent > 0) {
                return { status: 'downloading' as const, progress: progress.percent }
            }
        }

        return { status: 'idle' as const, progress: 0 }
    }, [downloadState])

    // Determine the loading state
    const isLoading = playlist.isLoading

    // Determine the error to show
    const displayError = playlist.error || error

    // Determine what to show
    const shouldShowHeader = inputValue.trim() && playlist.info && playlist.tracks.length > 0

    const headerInfo = playlist.info

    const currentTracks = playlist.tracks

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">YouTube Downloader</h1>

            {/* Information Notice */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                    ⭐ <strong>Smart Input:</strong> Enter a YouTube playlist URL or individual video URL to download
                </p>
            </div>

            {/* URL Input */}
            <div className="mb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {isYouTubePlaylistUrl(inputValue) ? (
                                <Music className="w-4 h-4 text-red-500" />
                            ) : isYouTubeVideoUrl(inputValue) ? (
                                <Play className="w-4 h-4 text-red-500" />
                            ) : (
                                <Link className="w-4 h-4 text-gray-500" />
                            )}
                            <label className="text-sm font-medium">
                                {isYouTubePlaylistUrl(inputValue) ? 'YouTube Playlist Detected' :
                                    isYouTubeVideoUrl(inputValue) ? 'YouTube Video Detected' :
                                        'YouTube URL'}
                            </label>
                        </div>
                    </div>

                    <div className="relative">
                        <Input
                            type="url"
                            placeholder="https://www.youtube.com/playlist?list=... or https://www.youtube.com/watch?v=..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            className={`pr-10 ${isYouTubePlaylistUrl(inputValue) ? 'border-red-300 bg-red-50' :
                                    isYouTubeVideoUrl(inputValue) ? 'border-blue-300 bg-blue-50' :
                                        'border-gray-300'
                                }`}
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
                    {inputValue.trim() && !isYouTubePlaylistUrl(inputValue) && !isYouTubeVideoUrl(inputValue) && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Please enter a valid YouTube playlist or video URL
                        </p>
                    )}

                    {/* Input type indicator */}
                    {inputValue.trim() && (
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                            {isYouTubePlaylistUrl(inputValue) ? (
                                <>
                                    <Music className="w-3 h-3 text-red-500" />
                                    <span>Playlist URL detected - will load all videos</span>
                                </>
                            ) : isYouTubeVideoUrl(inputValue) ? (
                                <>
                                    <Play className="w-3 h-3 text-blue-500" />
                                    <span>Video URL detected - will load single video</span>
                                </>
                            ) : (
                                <>
                                    <Link className="w-3 h-3 text-gray-500" />
                                    <span>Enter a valid YouTube URL</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || (!isYouTubePlaylistUrl(inputValue) && !isYouTubeVideoUrl(inputValue)) || isLoading}
                        className="flex-1"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {isYouTubePlaylistUrl(inputValue) ? 'Loading Playlist...' :
                                    isYouTubeVideoUrl(inputValue) ? 'Loading Video...' : 'Processing...'}
                            </>
                        ) : (
                            <>
                                <Link className="w-4 h-4 mr-2" />
                                {isYouTubePlaylistUrl(inputValue) ? 'Load Playlist' :
                                    isYouTubeVideoUrl(inputValue) ? 'Load Video' : 'Process'}
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

            {/* Header */}
            {shouldShowHeader && (
                <PlaylistHeader
                    title={headerInfo?.title || 'Unknown'}
                    description={headerInfo?.description}
                    coverUrl={headerInfo?.artwork}
                    tracksCount={playlist.tracks.length}
                    isDownloading={downloadState.isDownloading}
                    downloadedCount={downloadState.overallProgress.completed}
                    onDownloadAll={handleDownloadAll}
                    platform="youtube"
                />
            )}

            {/* Track List */}
            {currentTracks.length > 0 && (
                <TrackList
                    tracks={currentTracks}
                    onDownloadTrack={handleDownloadTrack}
                    getTrackStatus={getTrackStatus}
                    isDownloading={downloadState.isDownloading}
                />
            )}

            {/* Instructions */}
            {!currentTracks.length && !isLoading && !displayError && (
                <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-md">
                    <h3 className="font-medium text-gray-900 mb-3">How to use:</h3>
                    <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">1.</span>
                            <span>Copy a YouTube playlist URL (e.g., https://www.youtube.com/playlist?list=...)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">2.</span>
                            <span>Or copy a YouTube video URL (e.g., https://www.youtube.com/watch?v=...)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">3.</span>
                            <span>Paste it in the input field above</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">4.</span>
                            <span>Click "Load" to fetch the content</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">5.</span>
                            <span>Download individual videos or the entire playlist</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    )
}