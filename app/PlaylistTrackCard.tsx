import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface PlaylistTrackCardProps {
  title: string;
  index: number;
  artist?: string;
  coverUrl?: string;
  duration?: string;
  size?: string;
  status?: "idle" | "downloading" | "done" | "error";
  progress?: number;
  bitrate?: string;
  format?: string;
  onDownload?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function PlaylistTrackCard({
  title,
  index,
  artist,
  coverUrl,
  duration,
  size,
  status = "idle",
  progress = 0,
  bitrate,
  format,
  onDownload,
}: PlaylistTrackCardProps) {
  return (
    <Card className="mb-2 hover:shadow-lg transition-shadow group">
      <CardContent className="py-3 flex items-center gap-4">
        <span className="font-mono text-xs text-muted-foreground w-6 text-right">{index + 1}.</span>
        {coverUrl ? (
          <Image src={coverUrl} alt={title} width={56} height={56} className="rounded shadow-sm" />
        ) : (
          <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">No Image</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold text-base" title={title}>{title}</div>
          {artist && <div className="truncate text-xs text-muted-foreground" title={artist}>{artist}</div>}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
            {duration && <span title="Duration">⏱ {duration}</span>}
            {size && <span title="File size">💾 {size}</span>}
            {bitrate && <span title="Bitrate">🎵 {bitrate}</span>}
            {format && <span title="Format">📁 {format}</span>}
          </div>
          {/* Progress bar nhỏ cho từng bài */}
          {status === "downloading" && (
            <div className="w-full mt-1">
              <div className="h-1 bg-gray-200 rounded">
                <div
                  className="h-1 bg-blue-500 rounded"
                  style={{ width: `${progress || 0}%`, transition: "width 0.2s" }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{progress || 0}%</div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 min-w-[90px]">
          <Button size="sm" variant="outline" onClick={onDownload} disabled={status === "downloading" || status === "done" || status === "error"}>
            {status === "idle" && "Download"}
            {status === "downloading" && "Đang tải..."}
            {status === "done" && "Đã tải"}
            {status === "error" && "Thử lại"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
