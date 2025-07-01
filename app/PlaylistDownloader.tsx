"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import PlaylistTrackCard from "./PlaylistTrackCard"
import Image from "next/image"
import { PlaylistApiResponse, PlaylistInfo, TrackInfo } from "@/types/playlist"

interface PlaylistDownloaderProps {
  service: "youtube" | "soundcloud"
}

export default function PlaylistDownloader({ service }: PlaylistDownloaderProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [tracks, setTracks] = useState<(TrackInfo & { status?: "idle" | "downloading" | "done" | "error" })[]>([])
  const [error, setError] = useState("")
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null)
  const [globalStatus, setGlobalStatus] = useState<"idle"|"downloading"|"done"|"error">("idle")

  // Fake fetch for demo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setTracks([])
    setProgress(0)
    setPlaylistInfo(null)
    setGlobalStatus("idle")
    if (service === "soundcloud") {
      try {
        const res = await fetch(`/api/playlist?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error("Không lấy được playlist từ API!")
        const data: PlaylistApiResponse = await res.json()
        setPlaylistInfo({ ...data.playlistInfo, service })
        setTracks(data.tracks.map(track => ({ ...track, status: "idle" })))
      } catch (err: any) {
        setError(err.message || "Lỗi không xác định")
      } finally {
        setLoading(false)
      }
      return
    } else {
      setTimeout(() => {
        let fakeTracks, fakeInfo
        if (service === "soundcloud") {
          fakeInfo = {
            title: "SoundCloud Demo Playlist",
            description: "A sample SoundCloud playlist for demo UI.",
            artwork: "https://placehold.co/128x128?text=SC",
            tracksCount: 4,
            service: "soundcloud" as const
          }
          fakeTracks = [
            { title: "SC Song 1", artist: "SC Artist A", coverUrl: "https://placehold.co/56x56?text=SC1", duration: "3:45", size: "4.2 MB", status: "idle" as const, bitrate: "320kbps", format: "MP3" },
            { title: "SC Song 2", artist: "SC Artist B", coverUrl: "https://placehold.co/56x56?text=SC2", duration: "4:12", size: "5.1 MB", status: "idle" as const, bitrate: "256kbps", format: "MP3" },
            { title: "SC Song 3", artist: "SC Artist C", coverUrl: "https://placehold.co/56x56?text=SC3", duration: "2:58", size: "3.7 MB", status: "idle" as const, bitrate: "128kbps", format: "MP3" },
            { title: "SC Song 4", artist: "SC Artist D", coverUrl: "https://placehold.co/56x56?text=SC4", duration: "5:01", size: "6.0 MB", status: "idle" as const, bitrate: "320kbps", format: "MP3" },
          ]
        } else {
          fakeInfo = {
            title: "YouTube Demo Playlist",
            description: "A sample YouTube playlist for demo UI.",
            artwork: "https://placehold.co/128x128?text=YT",
            tracksCount: 4,
            service: "youtube" as const
          }
          fakeTracks = [
            { title: "YT Song 1", artist: "YT Artist A", coverUrl: "https://placehold.co/56x56?text=YT1", duration: "3:11", size: "3.9 MB", status: "idle" as const, bitrate: "128kbps", format: "MP3" },
            { title: "YT Song 2", artist: "YT Artist B", coverUrl: "https://placehold.co/56x56?text=YT2", duration: "4:00", size: "4.8 MB", status: "idle" as const, bitrate: "192kbps", format: "MP3" },
            { title: "YT Song 3", artist: "YT Artist C", coverUrl: "https://placehold.co/56x56?text=YT3", duration: "2:45", size: "3.2 MB", status: "idle" as const, bitrate: "256kbps", format: "MP3" },
            { title: "YT Song 4", artist: "YT Artist D", coverUrl: "https://placehold.co/56x56?text=YT4", duration: "5:10", size: "6.3 MB", status: "idle" as const, bitrate: "320kbps", format: "MP3" },
          ]
        }
        setPlaylistInfo(fakeInfo)
        setTracks(fakeTracks)
        setLoading(false)
      }, 1000)
    }
  }

  // Hàm xử lý tải tất cả
  const handleDownloadAll = () => {
    setGlobalStatus("downloading")
    setTracks(tracks => tracks.map(t => ({ ...t, status: "downloading" as const })))
    let prog = 0
    setProgress(0)
    const interval = setInterval(() => {
      prog += 100 / (tracks.length || 1)
      setProgress(Math.min(100, prog))
      if (prog >= 100) {
        clearInterval(interval)
        setTracks(tracks => tracks.map(t => ({ ...t, status: "done" as const })))
        setGlobalStatus("done")
      }
    }, 800)
  }

  // Hàm xử lý tải từng bài
  const handleDownloadTrack = (idx: number) => {
    setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, status: "downloading" as const } : t))
    setTimeout(() => {
      const isSuccess = Math.random() > 0.1
      setTracks(tracks => tracks.map((t, i) => i === idx ? { ...t, status: isSuccess ? "done" as const : "error" as const } : t))
    }, 1200)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="url"
        placeholder={`Enter ${service === "youtube" ? "YouTube" : "SoundCloud"} playlist URL`}
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
            <div className="text-xs mt-1">Số bài hát: {playlistInfo.tracksCount} | Dịch vụ: {playlistInfo.service === "youtube" ? "YouTube" : "SoundCloud"}</div>
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
      {loading && <Progress value={progress} className="w-full" />}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {tracks.length > 0 && (
        <div className="mt-4">
          <div className="font-semibold mb-2">Danh sách bài hát:</div>
          <div>
            {tracks.map((track, idx) => (
              <PlaylistTrackCard
                key={idx}
                title={track.title}
                artist={track.artist}
                coverUrl={track.coverUrl}
                duration={track.duration}
                size={track.size}
                status={track.status}
                bitrate={track.bitrate}
                format={track.format}
                index={idx}
                onDownload={() => handleDownloadTrack(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </form>
  )
}
