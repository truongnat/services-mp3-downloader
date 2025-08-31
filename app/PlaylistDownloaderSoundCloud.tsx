"use client"
import { useCallback, useState } from "react";
import { usePlaylistDownloader } from "@/lib/hooks/use-playlist-downloader";
import { useEnhancedDownloader, TrackDownloadInfo } from "@/lib/hooks/use-enhanced-downloader";
import { CommonTrackInfo } from "@/types/common";

// Components
import PlaylistHeader from "@/components/playlist/playlist-header";
import TrackList from "@/components/playlist/track-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Link, Music } from "lucide-react";

interface PlaylistDownloaderSoundCloudProps {
  setDisableTabs?: (v: boolean) => void;
}

// Search results interface
interface SearchResult {
  tracks: CommonTrackInfo[];
  hasMore: boolean;
  total: number;
}

// Utility function to detect if input is a URL
function isUrl(input: string): boolean {
  const urlPattern = /^https?:\/\/(www\.)?(soundcloud\.com|snd\.sc|on\.soundcloud\.com)/;
  return urlPattern.test(input.trim());
}

export default function PlaylistDownloaderSoundCloud({ setDisableTabs }: PlaylistDownloaderSoundCloudProps) {
  const {
    playlist,
    url,
    setUrl,
    loadPlaylist,
  } = usePlaylistDownloader<CommonTrackInfo>();

  const {
    downloadState,
    downloadTrack,
    downloadPlaylist,
    cancelDownloads,
    resetDownloadState
  } = useEnhancedDownloader();

  // Unified input state
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'url' | 'search' | null>(null);

  // Handle unified input processing
  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    setSearchResults(null);
    
    try {
      if (isUrl(inputValue)) {
        // Handle URL input
        console.log('Detected URL input:', inputValue);
        setCurrentMode('url');
        
        // Set URL and load playlist immediately with the current input value
        const urlToLoad = inputValue.trim();
        setUrl(urlToLoad);
        
        // Load playlist with explicit URL to avoid race condition
        await loadPlaylist('/api/soundcloud/playlist', urlToLoad);
      } else {
        // Handle search input
        console.log('Detected search input:', inputValue);
        setCurrentMode('search');
        
        const response = await fetch(`/api/soundcloud/search?q=${encodeURIComponent(inputValue.trim())}&limit=50`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }
        
        setSearchResults(data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, setUrl, loadPlaylist]);

  // Clear all data including search results
  const clearInput = useCallback(() => {
    setInputValue("");
    setSearchResults(null);
    setError(null);
    setCurrentMode(null);
    setUrl("");
    // Reset playlist state to clear any loaded playlist data
    resetDownloadState();
  }, [setUrl, resetDownloadState]);

  // Handle single track download
  const handleDownloadTrack = useCallback(async (track: CommonTrackInfo) => {
    const trackInfo: TrackDownloadInfo = {
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      platform: 'soundcloud',
    };
    
    await downloadTrack(trackInfo);
  }, [downloadTrack]);

  // Handle download all tracks (for search results or playlist)
  const handleDownloadAll = useCallback(async () => {
    const tracks = currentMode === 'search' ? searchResults?.tracks : playlist.tracks;
    if (!tracks || tracks.length === 0) return;

    setDisableTabs?.(true);
    
    try {
      const tracksInfo: TrackDownloadInfo[] = tracks.map(track => ({
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist,
        platform: 'soundcloud' as const,
      }));

      await downloadPlaylist(tracksInfo);
    } finally {
      setDisableTabs?.(false);
    }
  }, [playlist.tracks, searchResults?.tracks, currentMode, downloadPlaylist, setDisableTabs]);

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

  // Determine which tracks and header info to show
  const currentTracks = currentMode === 'search' ? searchResults?.tracks || [] : playlist.tracks;
  const headerInfo = currentMode === 'search' 
    ? {
        title: `Search: "${inputValue}"`,
        description: `Found ${searchResults?.tracks.length || 0} tracks`,
        artwork: "",
        tracksCount: searchResults?.tracks.length || 0,
        totalDuration: undefined
      }
    : playlist.info;

  // Only show header when there's content and input is not empty
  const shouldShowHeader = inputValue.trim() && headerInfo && currentTracks.length > 0;

  // Determine the loading state
  const isLoading = currentMode === 'url' ? playlist.isLoading : isProcessing;
  
  // Determine the error to show
  const displayError = currentMode === 'url' ? playlist.error : error;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">SoundCloud Downloader</h1>

      {/* Enhanced Download Notice */}
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
        <p className="text-sm text-orange-700">
          ⭐ <strong>Smart Input:</strong> Type to search tracks or paste SoundCloud URLs for playlists/tracks
        </p>
      </div>

      {/* Unified Smart Input */}
      <div className="mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isUrl(inputValue) ? (
                <Link className="w-4 h-4 text-blue-500" />
              ) : (
                <Search className="w-4 h-4 text-gray-500" />
              )}
              <label className="text-sm font-medium">
                {isUrl(inputValue) ? 'SoundCloud URL detected' : 'Search or paste SoundCloud URL'}
              </label>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Type to search (e.g. 'lofi beats') or paste SoundCloud URL..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className={`pr-10 ${
                  isUrl(inputValue) ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {inputValue.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearInput}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              )}
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !inputValue.trim()}
              className="px-6 min-w-[100px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : isUrl(inputValue) ? (
                <span className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Load
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search
                </span>
              )}
            </Button>
          </div>
          
          {displayError && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {displayError}
            </div>
          )}
          
          {/* Input type indicator */}
          {inputValue.trim() && (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {isUrl(inputValue) ? (
                <>
                  <Link className="w-3 h-3 text-blue-500" />
                  <span>URL detected - will load playlist/track</span>
                </>
              ) : (
                <>
                  <Search className="w-3 h-3 text-gray-500" />
                  <span>Text detected - will search for tracks</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Playlist Header */}
      {shouldShowHeader && (
        <PlaylistHeader
          title={headerInfo.title}
          description={headerInfo.description}
          coverUrl={headerInfo.artwork}
          tracksCount={currentTracks.length}
          totalDuration={headerInfo.totalDuration}
          isDownloading={downloadState.isDownloading}
          downloadedCount={downloadState.overallProgress.completed}
          onDownloadAll={handleDownloadAll}
          platform="soundcloud"
        />
      )}

      {/* Enhanced Progress Display */}
      {downloadState.isDownloading && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-orange-800">
              Overall Progress: {downloadState.overallProgress.completed} / {downloadState.overallProgress.total}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={cancelDownloads}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancel
            </Button>
          </div>
          <div className="w-full bg-orange-200 rounded-full h-2">
            <div 
              className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${downloadState.overallProgress.percent}%` }}
            />
          </div>
          {downloadState.currentTrackIndex >= 0 && currentTracks[downloadState.currentTrackIndex] && (
            <p className="text-xs text-orange-600 mt-2">
              Currently downloading: {currentTracks[downloadState.currentTrackIndex].title}
            </p>
          )}
        </div>
      )}

      {/* Track List */}
      {currentTracks.length > 0 && (
        <TrackList
          tracks={currentTracks}
          getTrackStatus={getTrackStatus}
          onDownloadTrack={handleDownloadTrack}
          isDownloading={downloadState.isDownloading}
        />
      )}

      {/* Success Message */}
      {downloadState.overallProgress.percent === 100 && downloadState.overallProgress.total > 0 && (
        <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-orange-800 font-medium">
            🎉 All SoundCloud downloads completed successfully!
          </p>
        </div>
      )}
    </div>
  );
}
