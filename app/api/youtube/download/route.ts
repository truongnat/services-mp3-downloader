// app/api/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { customYtDlp, getYouTubeVideoId } from "@/lib/yt-dlp-config";

// Tải xuống chỉ MP3
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");
  // Quan trọng: audioQuality phải là string, ví dụ: '128K', '320K', 'bestaudio'
  // Nếu không có, mặc định là '128K' (hoặc 'bestaudio' tùy chọn của bạn)
  const audioQuality = searchParams.get("quality") || '128K'; // Đã sửa từ 128 thành '128K'

  // --- Thêm log ở đây để đảm bảo nó luôn hiển thị ---
  console.log(`[API] Nhận yêu cầu tải MP3. URL: ${videoUrl}, Chất lượng: ${audioQuality}`);

  if (!videoUrl) {
    console.warn('[API] Thiếu tham số "url".');
    return NextResponse.json(
      { status: false, message: 'Missing "url" parameter.' },
      { status: 400 }
    );
  }

  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) {
    console.warn(`[API] URL YouTube không hợp lệ: ${videoUrl}`);
    return NextResponse.json(
      { status: false, message: "Invalid YouTube URL." },
      { status: 400 }
    );
  }

  try {
    // Lấy thông tin video để tạo tên file
    // Log này sẽ chỉ chạy nếu customYtDlp không ném lỗi ngay lập tức
    console.log(`[API] Đang lấy thông tin video cho URL: ${videoUrl}`);
    const info = await customYtDlp(videoUrl, { printJson: true });
    
    const title = info.title
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .trim();
    const filename = `${title}_${audioQuality}.mp3`;

    console.log(
      `[API] Bắt đầu stream MP3 từ: ${videoUrl} (Chất lượng: ${audioQuality})`
    );

    // Gọi yt-dlp để trích xuất âm thanh và stream ra stdout
    // Đảm bảo không có output khác ngoài luồng media để tránh làm hỏng stream
    const ytDlpProcess = customYtDlp.exec(videoUrl, {
      extractAudio: true,
      audioFormat: "mp3",
      audioQuality: audioQuality, // Đã sửa: truyền thẳng chuỗi audioQuality
      output: "-", // "-": stream ra stdout
      noProgress: true, // Quan trọng: Tắt thanh tiến trình để không làm bẩn stream
      quiet: true, // Quan trọng: Tắt tất cả output không cần thiết
    });

    // Tạo ReadableStream từ stdout của yt-dlp
    const stream = new ReadableStream({
      start(controller) {
        if (ytDlpProcess.stdout) {
          ytDlpProcess.stdout.on("data", (chunk) => {
            controller.enqueue(chunk);
          });
          ytDlpProcess.stdout.on("end", () => {
            console.log(`[API] Stream MP3 hoàn tất cho ${filename}.`);
            controller.close();
          });
        } else {
          // Xử lý trường hợp stdout là null (rất hiếm nhưng có thể xảy ra)
          console.error('[API] ytDlpProcess.stdout is null, cannot start stream.');
          controller.error(new Error("ytDlpProcess.stdout is null, cannot start stream."));
          return; // Dừng hàm start
        }

        // Luôn gắn listener cho stderr và close/error
        if (ytDlpProcess.stderr) {
          ytDlpProcess.stderr.on("data", (data) => {
            const errorMsg = data.toString().trim();
            console.error(`[yt-dlp ERR] ${errorMsg}`);
            controller.error(new Error(`yt-dlp error: ${errorMsg}`));
          });
        }

        ytDlpProcess.on("close", (code) => {
          if (code !== 0) {
            console.error(`[yt-dlp] Tiến trình thoát với mã lỗi: ${code}`);
            // Đảm bảo stream được báo lỗi nếu process thoát không thành công
            controller.error(
              new Error(`yt-dlp process exited with code ${code}`)
            );
          } else {
            // Nếu stream đã kết thúc (on 'end') thì không cần đóng lại.
            // Nếu nó đóng trước 'end', controller.close() sẽ không có tác dụng phụ.
            if (!ytDlpProcess.stdout?.readableEnded) { // Kiểm tra nếu stdout chưa kết thúc
                controller.close();
            }
          }
        });
        
        // Thêm listener cho lỗi của bản thân process (ví dụ: không thể spawn)
        ytDlpProcess.on('error', (err) => {
            console.error(`[yt-dlp PROCESS ERROR] ${err.message}`);
            controller.error(new Error(`yt-dlp process error: ${err.message}`));
        });
      },
      cancel(reason) {
        console.warn(`[API] Stream bị hủy bởi client: ${reason}`);
        // Cố gắng dừng tiến trình yt-dlp nếu stream bị hủy sớm
        if (!ytDlpProcess.killed) {
          ytDlpProcess.kill("SIGTERM");
          console.log('[API] Đã gửi SIGTERM tới tiến trình yt-dlp.');
        }
      },
    });

    // Thiết lập headers cho phản hồi stream
    const headers = new Headers({
      "Content-Type": "audio/mpeg", // Định dạng cho MP3
      "Content-Disposition": `attachment; filename="${filename}"`, // Buộc trình duyệt tải xuống file
      "Cache-Control": "no-cache, no-store, must-revalidate", // Tắt cache cho stream
      Pragma: "no-cache",
      Expires: "0",
    });

    return new NextResponse(stream, { headers });
  } catch (error: unknown) {
    // Xử lý lỗi từ yt-dlp (ví dụ: video không tồn tại, lỗi network)
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[API] Lỗi trong quá trình xử lý stream: ${message}`);
    
    // Log chi tiết lỗi nếu có thể
    if (error && typeof error === 'object' && 'stderr' in error && typeof error.stderr === 'string') {
        console.error(`[API] yt-dlp stderr: ${error.stderr}`);
        return NextResponse.json(
            { status: false, message: `Lỗi yt-dlp: ${error.stderr}` },
            { status: 500 }
        );
    }

    return NextResponse.json(
      { status: false, message: `Lỗi trong quá trình xử lý: ${message}` },
      { status: 500 }
    );
  }
}
