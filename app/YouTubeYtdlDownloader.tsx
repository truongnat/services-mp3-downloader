'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Music, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useYouTubeDownloader } from '@/lib/hooks/use-youtube-ytdl-downloader';

export default function YouTubeYtdlDownloader() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'mp3' | 'm4a'>('mp3');
  const [quality, setQuality] = useState<'highestaudio' | 'lowestaudio'>('highestaudio');

  const {
    isLoading,
    isDownloading,
    progress,
    error,
    currentTrack,
    getVideoInfo,
    downloadTrack,
    reset
  } = useYouTubeDownloader({
    onComplete: (filename) => {
      console.log('Download completed:', filename);
    },
    onError: (error) => {
      console.error('Download error:', error);
    }
  });

  const handleGetInfo = async () => {
    if (!url.trim()) return;
    await getVideoInfo(url.trim());
  };

  const handleDownload = async () => {
    if (!url.trim()) return;
    await downloadTrack(url.trim(), { format, quality });
  };

  const isValidYouTubeUrl = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/shorts\/)([^&\n?#]+)/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            YouTube Downloader (ytdl-core + ffmpeg)
          </CardTitle>
          <CardDescription>
            Download YouTube videos as audio using @distube/ytdl-core and ffmpeg-static
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">YouTube URL</label>
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {url && !isValidYouTubeUrl(url) && (
              <p className="text-sm text-amber-600">Please enter a valid YouTube URL</p>
            )}
          </div>

          {/* Format & Quality Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'mp3' | 'm4a')}
                className="w-full p-2 border rounded-md"
              >
                <option value="mp3">MP3</option>
                <option value="m4a">M4A</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as 'highestaudio' | 'lowestaudio')}
                className="w-full p-2 border rounded-md"
              >
                <option value="highestaudio">Highest Audio</option>
                <option value="lowestaudio">Lowest Audio</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGetInfo}
              disabled={!url.trim() || !isValidYouTubeUrl(url) || isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Music className="h-4 w-4 mr-2" />
              )}
              Get Info
            </Button>
            
            <Button
              onClick={handleDownload}
              disabled={!url.trim() || !isValidYouTubeUrl(url) || isDownloading}
              className="flex-1"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          </div>

          {/* Reset Button */}
          {(error || currentTrack) && (
            <Button onClick={reset} variant="ghost" size="sm">
              Reset
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Video Info Display */}
      {currentTrack && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Video Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {currentTrack.artwork && (
                <img
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">{currentTrack.title}</h3>
                <p className="text-gray-600">{currentTrack.artist}</p>
                <p className="text-sm text-gray-500">
                  Duration: {Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toString().padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500">ID: {currentTrack.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Progress Display */}
      {isDownloading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Downloading...</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Paste any YouTube video URL (including from radio/mix playlists)</li>
            <li>• Click "Get Info" to fetch video details</li>
            <li>• Choose your preferred format and quality</li>
            <li>• Click "Download" to start the download</li>
            <li>• Radio/mix playlist URLs will be automatically cleaned to extract individual videos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}