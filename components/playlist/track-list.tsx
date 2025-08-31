import { useState } from "react";
import { Button } from "@/components/ui/button";
import PlaylistTrackCard from "@/app/PlaylistTrackCard";
import { CommonTrackInfo, formatDuration, formatFileSize, formatBitrate } from "@/types/common";
import { TrackDownloadStatus } from "@/lib/hooks/use-playlist-downloader";

interface TrackListProps<T extends CommonTrackInfo> {
  tracks: T[];
  getTrackStatus: (trackId: string) => TrackDownloadStatus;
  onDownloadTrack: (track: T, index: number) => void;
  isDownloading: boolean;
}

export default function TrackList<T extends CommonTrackInfo>({
  tracks,
  getTrackStatus,
  onDownloadTrack,
  isDownloading
}: TrackListProps<T>) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Show scroll to top button when list is long
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 500);
  };

  const scrollToTop = () => {
    const container = document.querySelector('.track-list-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No tracks found
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        className="track-list-container space-y-3 max-h-[600px] overflow-y-auto"
        onScroll={handleScroll}
      >
        {tracks.map((track, index) => {
          const status = getTrackStatus(track.id);
          
          return (
            <PlaylistTrackCard
              key={track.id}
              title={track.title}
              index={index}
              artist={track.artist}
              coverUrl={track.artwork}
              duration={formatDuration(track.duration)}
              size={formatFileSize(track.size)}
              bitrate={formatBitrate(track.bitrate)}
              format={track.format}
              status={status.status}
              progress={status.progress}
              onDownload={(e) => {
                e.preventDefault();
                if (status.status === "idle" && !isDownloading) {
                  onDownloadTrack(track, index);
                }
              }}
            />
          );
        })}
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg z-10"
          size="sm"
        >
          ↑
        </Button>
      )}

      {/* Track count summary */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Showing {tracks.length} tracks
      </div>
    </div>
  );
}
