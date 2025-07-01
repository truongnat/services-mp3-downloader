"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PlaylistTrackCard from "./PlaylistTrackCard"
import Image from "next/image"
import { SoundCloudPlaylistApiResponse, SoundCloudPlaylistInfo, SoundCloudTrackInfo } from "@/types/soundcloud"

// Hàm download mp3 từ streamUrl cho client
async function downloadMp3FromStreamUrl(streamUrl: string, title: string, onProgress?: (percent: number) => void) {
  const audioRes = await fetch(streamUrl);
  if (!audioRes.ok || !audioRes.body) throw new Error("Không tải được file mp3");
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
  const blob = new Blob(chunks, { type: "audio/mpeg" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title}.mp3`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

interface PlaylistDownloaderSoundCloudProps {
  setDisableTabs?: (v: boolean) => void;
}

export default function PlaylistDownloaderSoundCloud({ setDisableTabs }: PlaylistDownloaderSoundCloudProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [playlistInfo, setPlaylistInfo] = useState<SoundCloudPlaylistInfo | null>(null)
  // Refactor: mỗi track có status và progress riêng
  const [tracks, setTracks] = useState<(
    SoundCloudTrackInfo & {
      status?: "idle" | "downloading" | "done" | "error"
      progress?: number
    }
  )[]>([])
  const [globalStatus, setGlobalStatus] = useState<"idle"|"downloading"|"done"|"error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setTracks([])
    setPlaylistInfo(null)
    setGlobalStatus("idle")
    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(url)}`)
      if (!res.ok) throw new Error("Không lấy được playlist từ API!")
      const data: SoundCloudPlaylistApiResponse = await res.json()
      setPlaylistInfo({ ...data.playlistInfo })
      setTracks(data.tracks.map(track => ({ ...track, status: "idle", progress: 0 })))
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Lỗi không xác định")
      }
    } finally {
      setLoading(false)
    }
  }

  // Tải 1 bài: chỉ update trạng thái/progress bài đó
  const handleDownloadTrack = async (idx: number) => {
    setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, status: "downloading", progress: 0 } : t))
    try {
      const track = tracks[idx];
      if (!track.streamUrl) throw new Error("Không có streamUrl cho bài hát này!");
      console.log("[DEBUG] Bắt đầu tải:", track.title, track.streamUrl);
      await downloadMp3FromStreamUrl(track.streamUrl, track.title, (percent) => {
        setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, progress: percent } : t))
        console.log(`[DEBUG] Progress ${track.title}:`, percent);
      });
      setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, status: "done", progress: 100 } : t))
      console.log("[DEBUG] Đã tải xong:", track.title);
    } catch (err) {
      console.error("[DEBUG] Download error:", err);
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
        if (!track.streamUrl) throw new Error("Không có streamUrl cho bài hát này!");
        await downloadMp3FromStreamUrl(track.streamUrl, track.title, (percent) => {
          setTracks(tracks => tracks.map((t, idx) => idx === i ? { ...t, progress: percent } : t))
        });
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
        e.returnValue = "Bạn có chắc muốn rời trang? Nhạc đang được tải!";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [tracks]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Input
          type="url"
          placeholder="Enter SoundCloud playlist URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
          disabled={loading || tracks.some(t => t.status === "downloading")}
          className="pr-10"
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
      <Button className="w-full" type="submit" disabled={loading || !url || tracks.some(t => t.status === "downloading")}> 
        {loading ? "Đang lấy playlist..." : "Lấy playlist"}
      </Button>
      {playlistInfo && (
        <div className="rounded-lg border bg-card p-4 flex gap-4 items-center mb-4">
          {playlistInfo.artwork ? (
            <Image src={playlistInfo.artwork} alt={playlistInfo.title} width={64} height={64} className="rounded shadow" />
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate" title={playlistInfo.title}>{playlistInfo.title}</div>
            <div className="text-xs text-muted-foreground truncate" title={playlistInfo.description}>{playlistInfo.description}</div>
            <div className="text-xs mt-1">Số bài hát: {playlistInfo.tracksCount}</div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Button size="sm" onClick={handleDownloadAll} disabled={globalStatus === "downloading" || tracks.length === 0 || tracks.every(t => t.status === "done")}>
              {globalStatus === "idle" && "Tải tất cả"}
              {globalStatus === "downloading" && "Đang tải..."}
              {globalStatus === "done" && "Đã tải tất cả"}
            </Button>
            {globalStatus === "downloading" && (
              <span className="text-xs text-muted-foreground mt-1">Đang tải toàn bộ</span>
            )}
          </div>
        </div>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {tracks.length > 0 && (
        <div className="mt-4">
          <div className="font-semibold mb-2">Danh sách bài hát:</div>
          <div>
            {tracks.map((track, idx) => (
              <PlaylistTrackCard
                key={track.id}
                title={track.title}
                artist={track.artist}
                coverUrl={track.artwork}
                duration={track.duration ? `${Math.floor(track.duration/60000)}:${((track.duration%60000)/1000).toFixed(0).padStart(2,"0")}` : undefined}
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
  )
}
