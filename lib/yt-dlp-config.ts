// lib/yt-dlp-config.ts
import path from "path";
import { create as createYtDlp } from "youtube-dl-exec";


// Định nghĩa interface cho kết quả tải xuống
export interface DownloadResult {
  status: boolean;
  message?: string;
  filename?: string;
  metadata?: unknown;
}

// Hàm hỗ trợ để trích xuất ID video YouTube
export function getYouTubeVideoId(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|v\/|embed\/|user\/[^\/\n\s]+\/)?(?:watch\?v=|v%3D|embed%2F|video%2F)?|youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

const manualPath  = path.join(
  process.cwd(),
  "node_modules",
  "yt-dlp-static",
    "bin",
    "win",
    "yt-dlp.exe"
  
);

// Tạo instance của youtube-dl-exec với đường dẫn binary ĐÃ ĐƯỢC XÁC ĐỊNH CHÍNH XÁC
export const customYtDlp = createYtDlp(manualPath);
