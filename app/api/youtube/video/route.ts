import { NextRequest, NextResponse } from "next/server";
import { resolveVideo } from "@/lib/youtube/youtube";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const video = await resolveVideo(url);
    return NextResponse.json({ video });
  } catch (error) {
    console.error("YouTube video API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch video";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
