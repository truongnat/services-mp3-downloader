import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/icons";
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
    <Card className="mb-4 hover:shadow-lg transition-shadow group">
      <CardContent className="p-5 sm:p-4">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          <div className="flex items-start gap-4 mb-4">
            <span className="font-mono text-sm text-muted-foreground mt-1 flex-shrink-0 w-6">{index + 1}.</span>
            {coverUrl ? (
              <Image src={coverUrl} alt={title} width={70} height={70} className="rounded-xl shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-[70px] h-[70px] bg-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 flex-shrink-0">No Image</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg leading-tight mb-2" title={title}>{title}</div>
              {artist && <div className="text-base text-muted-foreground mb-3" title={artist}>{artist}</div>}
              <div className="flex gap-4 text-sm text-muted-foreground">
                {duration && <span>⏱ {duration}</span>}
                {format && <span>📁 {format}</span>}
              </div>
            </div>
          </div>

          {/* Progress bar for mobile */}
          {status === "downloading" && (
            <div className="mb-4">
              <div className="h-3 bg-gray-200 rounded-full">
                <div
                  className="h-3 bg-black rounded-full transition-all duration-300"
                  style={{ width: `${progress || 0}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground mt-2 text-center font-medium">{progress || 0}%</div>
            </div>
          )}

          <Button
            size="lg"
            variant="outline"
            onClick={onDownload}
            disabled={status === "downloading" || status === "done" || status === "error"}
            className="w-full h-12 touch-manipulation font-medium text-base flex items-center gap-2"
          >
            {status === "idle" && (
              <>
                <DownloadIcon width={18} height={18} />
                Download
              </>
            )}
            {status === "downloading" && "Đang tải..."}
            {status === "done" && "✓ Đã tải"}
            {status === "error" && "Thử lại"}
          </Button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center gap-4">
          <span className="font-mono text-xs text-muted-foreground w-6 text-right flex-shrink-0">{index + 1}.</span>
          {coverUrl ? (
            <Image src={coverUrl} alt={title} width={56} height={56} className="rounded shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400 flex-shrink-0">No Image</div>
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
          </div>

          {/* Progress bar for desktop */}
          {status === "downloading" && (
            <div className="flex-1 max-w-[200px]">
              <div className="h-1 bg-gray-200 rounded">
                <div
                  className="h-1 bg-black rounded"
                  style={{ width: `${progress || 0}%`, transition: "width 0.2s" }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{progress || 0}%</div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              disabled={status === "downloading" || status === "done" || status === "error"}
              className="min-w-[90px] flex items-center gap-1"
            >
              {status === "idle" && (
                <>
                  <DownloadIcon width={14} height={14} />
                  Download
                </>
              )}
              {status === "downloading" && "Đang tải..."}
              {status === "done" && "Đã tải"}
              {status === "error" && "Thử lại"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
