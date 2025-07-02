import { NextRequest, NextResponse } from "next/server";
import { resolveTrack } from "@/lib/soundcloud";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Thiếu URL bài hát" }, { status: 400 });
  }
  try {
    const track = await resolveTrack(url);
    if (!track) throw new Error("Không tìm thấy bài hát");
    return NextResponse.json({ track });
  } catch (err) {
    let message = "Lỗi không xác định";
    if (err instanceof Error) {
      message = err.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
