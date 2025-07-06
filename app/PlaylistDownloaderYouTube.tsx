"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PlaylistTrackCard from "./PlaylistTrackCard"
import Image from "next/image"
import { YouTubePlaylistApiResponse, YouTubePlaylistInfo, YouTubeTrackInfo } from "@/types/youtube"

// Check if File System Access API is supported
function supportsFileSystemAccess() {
  return 'showSaveFilePicker' in window;
}

// Hàm download mp3 từ streamUrl thông qua API proxy
async function downloadMp3FromStreamUrl(streamUrl: string, title: string, onProgress?: (percent: number) => void, onMacOSDownload?: () => void) {
  try {
    // Use our API proxy to download the audio
    const proxyUrl = `/api/youtube/download?url=${encodeURIComponent(streamUrl)}&filename=${encodeURIComponent(title + '.mp3')}`;

    const audioRes = await fetch(proxyUrl);
    if (!audioRes.ok) {
      const errorText = await audioRes.text();
      throw new Error(`Download failed: ${audioRes.status} ${audioRes.statusText} - ${errorText}`);
    }

    if (!audioRes.body) {
      throw new Error("No response body received");
    }

    const contentLength = audioRes.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = audioRes.body.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (onProgress && total) {
          onProgress(Math.round((received / total) * 100));
        }
      }
    }

    if (chunks.length === 0) {
      throw new Error("No audio data received");
    }

    const blob = new Blob(chunks, { type: "audio/mpeg" });

    // Try to use File System Access API if supported (Chrome/Edge)
    if (supportsFileSystemAccess()) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: `${title}.mp3`,
          types: [{
            description: 'MP3 files',
            accept: { 'audio/mpeg': ['.mp3'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return; // Success, no need for fallback
      } catch (err) {
        // User cancelled or error, fall back to regular download
        console.log('File System Access API failed, falling back to regular download');
      }
    }

    // Fallback to regular download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.mp3`;
    document.body.appendChild(a);
    a.click();

    // Detect macOS and show tip
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac && onMacOSDownload) {
      onMacOSDownload();
    }

    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
}

interface PlaylistDownloaderYouTubeProps {
  setDisableTabs?: (v: boolean) => void;
}

export default function PlaylistDownloaderYouTube({ setDisableTabs }: PlaylistDownloaderYouTubeProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playlistInfo, setPlaylistInfo] = useState<YouTubePlaylistInfo | null>(null);
  // Refactor: mỗi track có status và progress riêng
  const [tracks, setTracks] = useState<(
    YouTubeTrackInfo & {
      status?: "idle" | "downloading" | "done" | "error";
      progress?: number;
    }
  )[]>([]);
  const [globalStatus, setGlobalStatus] = useState<"idle"|"downloading"|"done"|"error">("idle");
  // New: Detect playlist vs track in real-time
  const [isPlaylist, setIsPlaylist] = useState<boolean | null>(null);

  // Handle playlist job processing
  const handlePlaylistJob = async (url: string) => {
    try {
      // Start the job
      const startRes = await fetch('/api/youtube/playlist-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!startRes.ok) {
        const errorData = await startRes.json();
        throw new Error(errorData.error || "Failed to start playlist job!");
      }

      const { jobId } = await startRes.json();
      setCurrentJobId(jobId);
      setJobProgress({ progress: 0, message: 'Starting playlist processing...' });

      // Poll for job progress
      const pollInterval = setInterval(async () => {
        try {
          const progressRes = await fetch(`/api/youtube/job/${jobId}`);
          if (!progressRes.ok) {
            clearInterval(pollInterval);
            throw new Error("Failed to get job progress");
          }

          const jobData = await progressRes.json();
          setJobProgress({
            progress: jobData.progress,
            message: jobData.message,
            totalItems: jobData.totalItems,
            processedItems: jobData.processedItems
          });

          if (jobData.status === 'completed') {
            clearInterval(pollInterval);
            setCurrentJobId(null);
            setJobProgress(null);

            // Set the results
            const result = jobData.result;
            setPlaylistInfo({ ...result.playlistInfo });
            setTracks(result.tracks.map((track: any) => ({ ...track, status: "idle", progress: 0 })));
          } else if (jobData.status === 'failed') {
            clearInterval(pollInterval);
            setCurrentJobId(null);
            setJobProgress(null);
            throw new Error(jobData.error || "Job failed");
          }
        } catch (error) {
          clearInterval(pollInterval);
          setCurrentJobId(null);
          setJobProgress(null);
          throw error;
        }
      }, 1000); // Poll every second

    } catch (error) {
      setCurrentJobId(null);
      setJobProgress(null);
      throw error;
    }
  };
  // Show macOS download tip
  const [showMacTip, setShowMacTip] = useState(false);
  // Job tracking for large playlists
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<{
    progress: number;
    message: string;
    totalItems?: number;
    processedItems?: number;
  } | null>(null);
  // Scroll to top functionality
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Detect playlist/track on URL change
  useEffect(() => {
    if (!url) {
      setIsPlaylist(null);
      return;
    }
    try {
      const urlObj = new URL(url);
      // YouTube playlist URLs contain 'list=' parameter
      // If it has both 'list' and 'v', it's a video in a playlist - treat as single video
      // If it has only 'list', it's a playlist
      const hasPlaylist = urlObj.searchParams.has('list');
      const hasVideo = urlObj.searchParams.has('v');

      if (hasPlaylist && !hasVideo) {
        setIsPlaylist(true);
      } else {
        setIsPlaylist(false);
      }
    } catch {
      setIsPlaylist(null);
    }
  }, [url]);

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTracks([]);
    setPlaylistInfo(null);
    setGlobalStatus("idle");
    
    try {
      const urlObj = new URL(url);
      const hasPlaylist = urlObj.searchParams.has('list');
      const hasVideo = urlObj.searchParams.has('v');

      if (hasPlaylist && !hasVideo) {
        // Playlist flow - use job-based processing for large playlists
        await handlePlaylistJob(url);
      } else {
        // Single video flow (including video in playlist)
        const res = await fetch(`/api/youtube/track?url=${encodeURIComponent(url)}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch track info from API!");
        }
        const data = await res.json();
        if (!data.track) throw new Error("Track not found");
        setPlaylistInfo(null);
        setTracks([{ ...data.track, status: "idle", progress: 0 }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  }

  // Tải 1 bài: chỉ update trạng thái/progress bài đó
  const handleDownloadTrack = async (idx: number) => {
    setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, status: "downloading", progress: 0 } : t))
    try {
      const track = tracks[idx];
      if (!track.streamUrl) throw new Error("No streamUrl for this track!");
      await downloadMp3FromStreamUrl(track.streamUrl, track.title, (percent) => {
        setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, progress: percent } : t))
      }, () => setShowMacTip(true));
      setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, status: "done", progress: 100 } : t))
    } catch (err) {
      console.error("Download error:", err);
      setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, status: "error" } : t))
    }
  }

  // Tải tất cả: tuần tự, update từng bài
  const handleDownloadAll = async () => {
    setGlobalStatus("downloading");
    for (let i = 0; i < tracks.length; i++) {
      // Nếu đã done thì bỏ qua
      if (tracks[i].status === "done") continue;
      setTracks(tracks => tracks.map((t, idx) => idx === i ? { ...t, status: "downloading", progress: 0 } : t));
      try {
        const track = tracks[i];
        if (!track.streamUrl) throw new Error("No streamUrl for this track!");
        await downloadMp3FromStreamUrl(track.streamUrl, track.title, (percent) => {
          setTracks(tracks => tracks.map((t, idx) => idx === i ? { ...t, progress: percent } : t))
        }, () => setShowMacTip(true));
        setTracks(tracks => tracks.map((t, idx) => idx === i ? { ...t, status: "done", progress: 100 } : t));
      } catch {
        setTracks(tracks => tracks.map((t, idx) => idx === i ? { ...t, status: "error" } : t));
      }
    }
    setGlobalStatus("done");
  }

  // Disable tab & fetch khi đang tải
  useEffect(() => {
    const isDownloading = tracks.some(t => t.status === "downloading");
    setDisableTabs?.(isDownloading);  
  }, [tracks, setDisableTabs]);

  // Chặn reload/close khi đang tải
  useEffect(() => {
    const isDownloading = tracks.some(t => t.status === "downloading");
    const handler = (e: BeforeUnloadEvent) => {
      if (isDownloading) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave? Music is being downloaded!";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [tracks]);

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Input
          type="url"
          placeholder="Enter YouTube audio or playlist URL"
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setError("");
            setPlaylistInfo(null);
            setTracks([]);
            setGlobalStatus("idle");
          }}
          required
          disabled={loading || tracks.some(t => t.status === "downloading") || currentJobId !== null}
          className="pr-10 h-14 text-lg sm:h-12 sm:text-base"
        />
        {url && !loading && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none"
            onClick={() => setUrl("")}
            tabIndex={-1}
            aria-label="Clear URL"
            style={{ background: "none", border: "none", padding: 0, margin: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="6" x2="14" y2="14"/><line x1="14" y1="6" x2="6" y2="14"/></svg>
          </button>
        )}
      </div>
      <Button className="w-full h-14 text-lg sm:h-12 sm:text-base font-medium" type="submit" disabled={loading || !url || tracks.some(t => t.status === "downloading") || currentJobId !== null}>
        {loading
          ? (isPlaylist === false ? "Fetching audio..." : "Fetching playlist...")
          : currentJobId
            ? "Processing playlist..."
            : (isPlaylist === null
                ? "Fetch info"
                : isPlaylist
                  ? "Fetch playlist"
                  : "Download audio")
        }
      </Button>

      {/* Job Progress Display */}
      {jobProgress && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 sm:p-4">
          <div className="text-center mb-4 sm:mb-3">
            <div className="text-base sm:text-sm font-medium text-gray-800 mb-2 sm:mb-1">Processing Playlist</div>
            <div className="text-3xl sm:text-2xl font-bold text-gray-900">{jobProgress.progress}%</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 sm:h-3 mb-4 sm:mb-3">
            <div
              className="bg-black h-4 sm:h-3 rounded-full transition-all duration-300"
              style={{ width: `${jobProgress.progress}%` }}
            ></div>
          </div>
          <div className="text-base sm:text-sm text-gray-700 text-center mb-3 sm:mb-2">{jobProgress.message}</div>
          {jobProgress.totalItems && (
            <div className="text-sm sm:text-xs text-gray-600 text-center">
              {jobProgress.processedItems || 0} / {jobProgress.totalItems} items processed
            </div>
          )}
        </div>
      )}

      {playlistInfo && (
        <div className="rounded-lg border bg-card mb-4">
          {/* Mobile Layout */}
          <div className="sm:hidden p-5">
            <div className="text-center mb-5">
              {playlistInfo.artwork && (
                <Image src={playlistInfo.artwork} alt={playlistInfo.title} width={100} height={100} className="rounded-xl shadow-lg mx-auto mb-4" />
              )}
              <div className="font-bold text-xl leading-tight mb-2" title={playlistInfo.title}>{playlistInfo.title}</div>
              {playlistInfo.description && (
                <div className="text-base text-muted-foreground mb-3" title={playlistInfo.description}>{playlistInfo.description}</div>
              )}
              <div className="text-base font-medium text-muted-foreground">
                {playlistInfo.tracksCount} audios
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleDownloadAll}
              disabled={globalStatus === "downloading" || tracks.length === 0 || tracks.every(t => t.status === "done")}
              className="w-full h-12 font-medium text-base"
            >
              {globalStatus === "idle" && "Download all"}
              {globalStatus === "downloading" && "Downloading..."}
              {globalStatus === "done" && "All downloaded"}
            </Button>
            {globalStatus === "downloading" && (
              <div className="text-sm text-muted-foreground mt-3 text-center">Downloading all tracks...</div>
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center gap-4 p-4">
            {playlistInfo.artwork && (
              <Image src={playlistInfo.artwork} alt={playlistInfo.title} width={64} height={64} className="rounded shadow flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg truncate" title={playlistInfo.title}>{playlistInfo.title}</div>
              <div className="text-xs text-muted-foreground truncate" title={playlistInfo.description}>{playlistInfo.description}</div>
              <div className="text-xs mt-1">Audios: {playlistInfo.tracksCount}</div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Button size="sm" onClick={handleDownloadAll} disabled={globalStatus === "downloading" || tracks.length === 0 || tracks.every(t => t.status === "done")}>
                {globalStatus === "idle" && "Download all"}
                {globalStatus === "downloading" && "Downloading..."}
                {globalStatus === "done" && "All downloaded"}
              </Button>
              {globalStatus === "downloading" && (
                <span className="text-xs text-muted-foreground mt-1">Downloading all</span>
              )}
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {showMacTip && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm">
          <div className="flex items-start gap-2">
            <div className="text-gray-600 mt-0.5 text-sm">💡</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 mb-1">Download Location Tip</div>
              <div className="text-gray-700 mb-2">
                To avoid the save dialog each time:
              </div>
              {supportsFileSystemAccess() ? (
                <div className="text-gray-700 text-xs mb-2">
                  <strong>Chrome/Edge users:</strong> The browser will remember your chosen folder after the first download.
                </div>
              ) : (
                <ol className="text-gray-700 text-xs space-y-1 ml-4 list-decimal mb-2 break-words">
                  <li>Open browser Preferences → Downloads</li>
                  <li>Set "File download location" to your preferred folder</li>
                  <li>Uncheck "Ask where to save each file before downloading"</li>
                </ol>
              )}
              <button
                onClick={() => setShowMacTip(false)}
                className="text-gray-600 hover:text-black text-xs underline touch-manipulation"
              >
                Got it, don't show again
              </button>
            </div>
          </div>
        </div>
      )}
      {tracks.length > 0 && (
        <div className="mt-4">
          <div className="font-semibold mb-2">Audio list:</div>
          <div>
            {tracks.map((track, idx) => (
              <PlaylistTrackCard
                key={track.id}
                title={track.title}
                artist={track.artist}
                coverUrl={track.artwork}
                duration={track.duration ? `${Math.floor(track.duration/60)}:${(track.duration%60).toString().padStart(2,"0")}` : undefined}
                size={track.size}
                status={track.status}
                progress={track.progress}
                bitrate={track.bitrate}
                format={track.format}
                index={idx}
                onDownload={e => { e.stopPropagation?.(); e.preventDefault?.(); handleDownloadTrack(idx); }}
              />
            ))}
          </div>
        </div>
      )}
    </form>

    {/* Scroll to Top Button - Outside form to prevent event bubbling */}
    {showScrollTop && (
      <button
        onClick={scrollToTop}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-black hover:bg-gray-800 text-white p-2 sm:p-3 rounded-full shadow-lg transition-all duration-300 z-50 touch-manipulation"
        aria-label="Scroll to top"
        type="button"
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    )}
  </>
  )
}
