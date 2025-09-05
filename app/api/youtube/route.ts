import { NextRequest, NextResponse } from "next/server";
import { isPlaylistUrl, isVideoUrl } from "@/lib/youtube/url-utils";
import { fetchYouTubePlaylist } from "@/lib/youtube/playlist-fetcher";
import { fetchYouTubePlaylistWithGoogleAPI } from "@/lib/youtube/google-api-playlist-fetcher";
import { getYouTubeVideoInfo } from "@/lib/youtube/ytdl-downloader";

export const runtime = "nodejs";

// Unified endpoint to handle both YouTube videos and playlists
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  console.log('[YouTube Unified API] Raw request URL:', req.nextUrl.toString());
  console.log('[YouTube Unified API] Received URL parameter:', url);

  if (!url) {
    return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
  }

  try {
    // Determine if it's a playlist or video URL
    const isPlaylist = isPlaylistUrl(url);
    const isVideo = isVideoUrl(url);

    console.log(`[YouTube Unified API] URL Type - Playlist: ${isPlaylist}, Video: ${isVideo}`);

    if (isPlaylist) {
      // Handle playlist URL
      console.log(`[YouTube Unified API] Processing as playlist: ${url}`);
      
      let playlistData;
      
      // Try Google API first (more reliable for large playlists)
      try {
        console.log(`[YouTube Unified API] Trying Google API method...`);
        playlistData = await fetchYouTubePlaylistWithGoogleAPI(url);
        console.log(`[YouTube Unified API] Google API method successful, tracks count: ${playlistData.tracks.length}`);
        console.log(`[YouTube Unified API] Google API playlist info:`, playlistData.playlistInfo);
      } catch (googleApiError) {
        console.warn(`[YouTube Unified API] Google API method failed, falling back to HTML parsing:`, googleApiError);
        
        // Fallback to HTML parsing method
        playlistData = await fetchYouTubePlaylist(url);
        console.log(`[YouTube Unified API] HTML parsing method successful, tracks count: ${playlistData.tracks.length}`);
        console.log(`[YouTube Unified API] HTML parsing playlist info:`, playlistData.playlistInfo);
      }
      
      // Update tracks count
      if (playlistData && playlistData.tracks) {
        playlistData.playlistInfo.tracksCount = playlistData.tracks.length;
        console.log(`[YouTube Unified API] Final playlist info:`, playlistData.playlistInfo);
        console.log(`[YouTube Unified API] Final tracks count: ${playlistData.tracks.length}`);
      }
      
      console.log(`[YouTube Unified API] Playlist info retrieved: ${playlistData.playlistInfo.title} (${playlistData.tracks.length} tracks)`);

      return NextResponse.json({
        success: true,
        type: "playlist",
        data: playlistData
      });

    } else if (isVideo) {
      // Handle individual video URL
      console.log(`[YouTube Unified API] Processing as video: ${url}`);
      
      const videoInfo = await getYouTubeVideoInfo(url);
      
      console.log(`[YouTube Unified API] Video info retrieved: ${videoInfo.title}`);

      return NextResponse.json({
        success: true,
        type: "video",
        data: videoInfo
      });

    } else {
      // Neither video nor playlist
      return NextResponse.json({
        error: "Invalid YouTube URL. Please provide a valid YouTube video or playlist URL.",
        code: "invalid_url"
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[YouTube Unified API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific error cases
    if (errorMessage.includes('Radio/mix playlists are not supported')) {
      return NextResponse.json({
        error: "Radio/mix playlists are not supported. Please use individual video URLs instead.",
        code: "unsupported_playlist_type"
      }, { status: 400 });
    }
    
    if (errorMessage.includes('Invalid YouTube')) {
      return NextResponse.json({
        error: "Invalid YouTube URL provided",
        code: "invalid_url"
      }, { status: 400 });
    }
    
    if (errorMessage.includes('Video unavailable')) {
      return NextResponse.json({
        error: "Video is unavailable or has been removed",
        code: "video_unavailable"
      }, { status: 404 });
    }
    
    if (errorMessage.includes('Private video')) {
      return NextResponse.json({
        error: "Private videos cannot be accessed",
        code: "private_video"
      }, { status: 403 });
    }

    return NextResponse.json({
      error: "Failed to process YouTube URL",
      details: errorMessage,
      code: "processing_error"
    }, { status: 500 });
  }
}