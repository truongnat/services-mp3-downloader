import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface PlaylistInputProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
  platform: 'youtube' | 'soundcloud';
  placeholder?: string;
}

export default function PlaylistInput({
  url,
  onUrlChange,
  onSubmit,
  isLoading,
  error,
  platform,
  placeholder
}: PlaylistInputProps) {
  const platformExamples = {
    youtube: [
      'https://www.youtube.com/playlist?list=...',
      'https://youtu.be/VIDEO_ID',
      'https://www.youtube.com/watch?v=VIDEO_ID'
    ],
    soundcloud: [
      'https://soundcloud.com/artist/sets/playlist',
      'https://soundcloud.com/artist/track',
      'https://on.soundcloud.com/SHORT_ID'
    ]
  };

  const defaultPlaceholder = platform === 'youtube' 
    ? 'Enter YouTube playlist or video URL...'
    : 'Enter SoundCloud playlist or track URL...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="url"
                placeholder={placeholder || defaultPlaceholder}
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                className="pr-10"
                disabled={isLoading}
              />
              {url.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onUrlChange('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-6"
            >
              {isLoading ? "Loading..." : "Load"}
            </Button>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p className="font-medium mb-1">Supported formats:</p>
            <ul className="space-y-1">
              {platformExamples[platform].map((example, index) => (
                <li key={index} className="font-mono">• {example}</li>
              ))}
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
