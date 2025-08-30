"use client"
import { useCallback, useState } from "react";
import { usePlaylistDownloader } from "@/lib/hooks/use-playlist-downloader";
import { useEnhancedDownloader, TrackDownloadInfo } from "@/lib/hooks/use-enhanced-downloader";
import { CommonTrackInfo } from "@/lib/download-utils";

// Components
import PlaylistInput from "@/components/playlist/playlist-input";
import PlaylistHeader from "@/components/playlist/playlist-header";
import TrackList from "@/components/playlist/track-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface PlaylistDownloaderSoundCloudProps {
  setDisableTabs?: (v: boolean) => void;
}

// Search results interface
interface SearchResult {
  tracks: CommonTrackInfo[];
  hasMore: boolean;
  total: number;
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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'url' | 'search'>('url');

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    
    try {
      const response = await fetch(`/api/soundcloud/search?q=${encodeURIComponent(searchQuery.trim())}&limit=50`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }
      
      setSearchResults(data);
      setCurrentMode('search');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
    setSearchError(null);
    setCurrentMode('url');
  }, []);

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

  // Handle load playlist
  const handleLoadPlaylist = useCallback(() => {
    setCurrentMode('url');
    loadPlaylist('/api/soundcloud/playlist');
  }, [loadPlaylist]);

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
        title: `Search: "${searchQuery}"`,
        description: `Found ${searchResults?.tracks.length || 0} tracks`,
        artwork: "",
        tracksCount: searchResults?.tracks.length || 0
      }
    : playlist.info;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">SoundCloud Downloader</h1>

      {/* Enhanced Download Notice */}
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-md">
        <p className="text-sm text-orange-700">
          ⭐ <strong>Enhanced with soundcloud.ts</strong> - Search tracks, paste URLs for playlists/tracks
        </p>
      </div>

      {/* Search and URL Input */}
      <div className="space-y-4 mb-6">
        {/* Search Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium">Search SoundCloud Tracks</label>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search for tracks (e.g. 'lofi beats', 'jazz music')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
              className="px-6"
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
            {(searchResults || searchError) && (
              <Button variant="outline" onClick={clearSearch}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {searchError && (
            <p className="text-red-600 text-sm mt-2">{searchError}</p>
          )}
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-sm text-gray-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Paste SoundCloud URL</label>
          <PlaylistInput
            url={url}
            onUrlChange={setUrl}
            onSubmit={handleLoadPlaylist}
            isLoading={playlist.isLoading}
            error={playlist.error}
            platform="soundcloud"
            placeholder="Paste playlist or track URL here..."
          />
        </div>
      </div>

      {/* Playlist Header */}
      {headerInfo && (
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
