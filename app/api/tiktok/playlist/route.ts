import { NextRequest, NextResponse } from "next/server";
import { resolvePlaylist } from "@/lib/tiktok/tiktok";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
  }

  try {
    const data = await resolvePlaylist(url);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in TikTok playlist API:", error);
    return NextResponse.json({ error: error.message || "Failed to resolve TikTok playlist" }, { status: 500 });
  }
}
