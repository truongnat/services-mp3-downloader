"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PlaylistTrackCard from "./PlaylistTrackCard"
import Image from "next/image"
import { YouTubePlaylistApiResponse, YouTubePlaylistInfo, YouTubeTrackInfo } from "@/types/youtube"

// Hàm tải mp3 từ API mới
async function downloadMp3FromApi(
  videoId: string,
  title: string,
  onProgress?: (percent: number) => void,
  quality: number = 128
) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `/api/youtube/download?url=${encodeURIComponent(videoUrl)}&quality=${quality}`;
  const audioRes = await fetch(apiUrl);
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

export default function PlaylistDownloaderYouTube() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<(YouTubeTrackInfo & { status?: "idle" | "downloading" | "done" | "error", progress?: number })[]>([]);
  const [error, setError] = useState("");
  const [playlistInfo, setPlaylistInfo] = useState<YouTubePlaylistInfo | null>(null);
  const [globalStatus, setGlobalStatus] = useState<"idle"|"downloading"|"done"|"error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTracks([]);
    setPlaylistInfo(null);
    setGlobalStatus("idle");
    try {
      const res = await fetch(`/api/youtube/playlist?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("Không lấy được playlist từ API!");
      const data: YouTubePlaylistApiResponse = await res.json();
      setPlaylistInfo({ ...data.playlistInfo });
      setTracks(data.tracks.map(track => ({ ...track, status: "idle", progress: 0 })));
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  // Tải từng bài
  const handleDownloadTrack = async (idx: number) => {
    setTracks(tracks =>
      tracks.map((t, i) =>
        i === idx ? { ...t, status: "downloading", progress: 0 } : t
      )
    );
    try {
      const track = tracks[idx];
      if (!track.videoId) throw new Error("Không có videoId cho bài hát này!");
      await downloadMp3FromApi(track.videoId, track.title, (percent: number) => {
        setTracks(tracks =>
          tracks.map((t, i) =>
            i === idx ? { ...t, progress: percent } : t
          )
        );
      });
      setTracks(tracks =>
        tracks.map((t, i) =>
          i === idx ? { ...t, status: "done", progress: 100 } : t
        )
      );
    } catch {
      setTracks(tracks =>
        tracks.map((t, i) =>
          i === idx ? { ...t, status: "error" } : t
        )
      );
    }
  };

  // Tải tất cả
  const handleDownloadAll = async () => {
    setGlobalStatus("downloading");
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].status === "done") continue;
      await handleDownloadTrack(i);
    }
    setGlobalStatus("done");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="url"
        placeholder="Enter YouTube playlist URL"
        value={url}
        onChange={e => setUrl(e.target.value)}
        required
        disabled={loading}
      />
      <Button className="w-full" type="submit" disabled={loading || !url}>
        {loading ? "Đang lấy playlist..." : "Lấy playlist"}
      </Button>
      {playlistInfo && (
        <div className="rounded-lg border bg-card p-4 flex gap-4 items-center mb-4">
          <Image src={playlistInfo.artwork || ""} alt={playlistInfo.title} width={64} height={64} className="rounded shadow" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate" title={playlistInfo.title}>{playlistInfo.title}</div>
            <div className="text-xs text-muted-foreground truncate" title={playlistInfo.description}>{playlistInfo.description}</div>
            <div className="text-xs mt-1">Số bài hát: {playlistInfo.tracksCount}</div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Button size="sm" onClick={handleDownloadAll} disabled={globalStatus === "downloading" || globalStatus === "done" || tracks.length === 0}>
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
                artist={track.artist || "Không rõ tác giả"}
                coverUrl={track.artwork}
                status={track.status}
                progress={track.progress}
                index={idx}
                onDownload={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDownloadTrack(idx);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
