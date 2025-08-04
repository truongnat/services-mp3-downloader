import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/icons";
import Image from "next/image";

interface PlaylistHeaderProps {
  title: string;
  description?: string;
  coverUrl?: string;
  tracksCount: number;
  totalDuration?: string;
  isDownloading: boolean;
  downloadedCount: number;
  onDownloadAll: () => void;
  platform: 'youtube' | 'soundcloud' | 'tiktok';
}

export default function PlaylistHeader({
  title,
  description,
  coverUrl,
  tracksCount,
  totalDuration,
  isDownloading,
  downloadedCount,
  onDownloadAll,
  platform
}: PlaylistHeaderProps) {
  const platformColors = {
    youtube: 'bg-red-500',
    soundcloud: 'bg-orange-500',
    tiktok: 'bg-black'
  };

  const platformNames = {
    youtube: 'YouTube',
    soundcloud: 'SoundCloud',
    tiktok: 'TikTok'
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Playlist Cover */}
          <div className="flex-shrink-0">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={title}
                width={120}
                height={120}
                className="rounded-lg object-cover"
                unoptimized
              />
            ) : (
              <div className="w-[120px] h-[120px] bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">No Cover</span>
              </div>
            )}
          </div>

          {/* Playlist Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`px-2 py-1 rounded text-xs text-white ${platformColors[platform]}`}>
                {platformNames[platform]}
              </div>
            </div>
            
            <h2 className="text-xl font-bold mb-2 line-clamp-2">{title}</h2>
            
            {description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
              <span>{tracksCount} tracks</span>
              {totalDuration && <span>{totalDuration}</span>}
              {downloadedCount > 0 && (
                <span className="text-green-600 font-medium">
                  {downloadedCount}/{tracksCount} downloaded
                </span>
              )}
            </div>

            {/* Download All Button */}
            <Button
              onClick={onDownloadAll}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              {isDownloading ? "Downloading..." : "Download All"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
