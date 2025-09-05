import { NextRequest, NextResponse } from "next/server";
import { fetchYouTubePlaylist } from "@/lib/youtube/playlist-fetcher";
import { fetchYouTubePlaylistWithGoogleAPI } from "@/lib/youtube/google-api-playlist-fetcher";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const playlistUrl = req.nextUrl.searchParams.get("url");

  console.log('[YouTube Playlist API] Raw request URL:', req.nextUrl.toString());
  console.log('[YouTube Playlist API] Received playlistUrl parameter:', playlistUrl);
  console.log('[YouTube Playlist API] playlistUrl length:', playlistUrl?.length);
  console.log('[YouTube Playlist API] Current YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? `${process.env.YOUTUBE_API_KEY.substring(0, 10)}...` : 'NOT SET');

  if (!playlistUrl) {
    return NextResponse.json({ error: "Missing playlist URL" }, { status: 400 });
  }

  try {
    console.log(`[YouTube Playlist API] Getting playlist info: ${playlistUrl}`);
    console.log(`[YouTube Playlist API] URL contains list param: ${playlistUrl.includes('list=')}`);
    console.log(`[YouTube Playlist API] API Key available: ${process.env.YOUTUBE_API_KEY ? 'YES' : 'NO'}`);

    let playlistData;
    
    // Try Google API first (more reliable for large playlists)
    try {
      console.log(`[YouTube Playlist API] Trying Google API method...`);
      playlistData = await fetchYouTubePlaylistWithGoogleAPI(playlistUrl);
      console.log(`[YouTube Playlist API] Google API method successful, tracks count: ${playlistData.tracks.length}`);
    } catch (googleApiError) {
      console.warn(`[YouTube Playlist API] Google API method failed, falling back to HTML parsing:`, googleApiError);
      
      // Fallback to HTML parsing method
      playlistData = await fetchYouTubePlaylist(playlistUrl);
      console.log(`[YouTube Playlist API] HTML parsing method successful, tracks count: ${playlistData.tracks.length}`);
    }
    
    // Update tracks count
    playlistData.playlistInfo.tracksCount = playlistData.tracks.length;
    
    console.log(`[YouTube Playlist API] Playlist info retrieved: ${playlistData.playlistInfo.title} (${playlistData.tracks.length} tracks)`);

    return NextResponse.json({
      success: true,
      data: playlistData
    });

  } catch (error) {
    console.error('[YouTube Playlist API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific error cases
    if (errorMessage.includes('Radio/mix playlists are not supported')) {
      return NextResponse.json({
        error: "Radio/mix playlists are not supported. Please use individual video URLs instead.",
        code: "unsupported_playlist_type"
      }, { status: 400 });
    }
    
    if (errorMessage.includes('Invalid YouTube playlist URL')) {
      return NextResponse.json({
        error: "Invalid YouTube playlist URL provided",
        code: "invalid_url"
      }, { status: 400 });
    }
    
    if (errorMessage.includes('Failed to fetch playlist')) {
      return NextResponse.json({
        error: "Failed to fetch playlist. It may be private or deleted.",
        code: "fetch_failed"
      }, { status: 404 });
    }

    return NextResponse.json({
      error: "Failed to get playlist information",
      details: errorMessage,
      code: "playlist_error"
    }, { status: 500 });
  }
}