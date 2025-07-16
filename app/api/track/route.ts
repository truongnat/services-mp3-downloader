import { NextRequest, NextResponse } from "next/server";
import { resolveTrack } from "@/lib/soundcloud";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing track URL" }, { status: 400 });
  }
  try {
    const track = await resolveTrack(url);
    if (!track) throw new Error("Track not found");
    return NextResponse.json({ track });
  } catch (err) {
    let message = "Unknown error";
    if (err instanceof Error) {
      message = err.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
