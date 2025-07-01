import { NextRequest } from "next/server";
import { YouTubeTrackInfo, YouTubePlaylistInfo } from "@/types/youtube";
export const runtime = "nodejs";

const YOUTUBE_PLAYLIST_ITEMS_API =
  "https://www.googleapis.com/youtube/v3/playlistItems";
const YOUTUBE_PLAYLIST_API = "https://www.googleapis.com/youtube/v3/playlists";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!);
  const url = searchParams.get("url");
  if (!url || !url.includes("youtube.com")) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing YouTube playlist URL" }),
      { status: 400 }
    );
  }
  try {
    // Extract playlistId from URL
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    const playlistId = match ? match[1] : null;
    if (!playlistId) throw new Error("Không tìm thấy playlistId trong URL!");
    const apiKey = "AIzaSyBFtoJDI5tUxwsnXUzH3dJV1yoGNOEu7Bs";
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set in environment");

    // Fetch playlist info
    const playlistInfoRes = await fetch(
      `${YOUTUBE_PLAYLIST_API}?part=snippet&id=${playlistId}&key=${apiKey}`
    );
    const playlistInfoJson = await playlistInfoRes.json();
    const playlistSnippet = playlistInfoJson.items?.[0]?.snippet;
    if (!playlistSnippet) throw new Error("Không lấy được thông tin playlist");

    // Fetch all playlist items (handle pagination)
    let nextPageToken: string | undefined = undefined;
    let tracks: YouTubeTrackInfo[] = [];
    do {
      const apiUrl: string =
        `${YOUTUBE_PLAYLIST_ITEMS_API}?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}` +
        (nextPageToken ? `&pageToken=${nextPageToken}` : "");
      const res: Response = await fetch(apiUrl);
      type PlaylistItemApi = {
        snippet: {
          resourceId?: { videoId?: string };
          title: string;
          videoOwnerChannelTitle?: string;
          channelTitle?: string;
          thumbnails?: {
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
        id: string;
      };
      const data = (await res.json()) as {
        items: PlaylistItemApi[];
        nextPageToken?: string;
      };

      if (!data.items) break;
      // Chỉ lấy thông tin cơ bản cho từng track, không lấy streamUrl/audio
      const pageTracks: YouTubeTrackInfo[] = data.items.map((item: PlaylistItemApi) => {
        const s = item.snippet;
        const videoId = s.resourceId?.videoId || item.id;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        return {
          id: videoId,
          title: s.title,
          artist: s.videoOwnerChannelTitle || s.channelTitle || "",
          duration: 0,
          artwork: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || "",
          url,
          streamUrl: null,
          videoId,
        };
      });
      tracks = tracks.concat(pageTracks);
      nextPageToken = data.nextPageToken;
    } while (nextPageToken && tracks.length < 200);

    const playlistInfo: YouTubePlaylistInfo = {
      id: playlistId,
      title: playlistSnippet.title,
      description: playlistSnippet.description || undefined,
      artwork:
        playlistSnippet.thumbnails?.medium?.url ||
        playlistSnippet.thumbnails?.default?.url ||
        "",
      tracksCount: tracks.length,
    };
    return new Response(JSON.stringify({ playlistInfo, tracks }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
