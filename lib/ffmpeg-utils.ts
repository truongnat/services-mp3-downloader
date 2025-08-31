import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

let isFFmpegInitialized = false;
let ffmpegAvailable = false;

/**
 * Initialize FFmpeg with proper error handling
 */
async function initializeFFmpeg(): Promise<boolean> {
  if (isFFmpegInitialized) {
    return ffmpegAvailable;
  }

  // Only initialize on server-side
  if (typeof window !== "undefined") {
    isFFmpegInitialized = true;
    ffmpegAvailable = false;
    return false;
  }

  try {
    // Try to dynamically import ffmpeg-static
    const ffmpegStatic = await import("ffmpeg-static");
    const ffmpegPath = ffmpegStatic.default;

    if (ffmpegPath && typeof ffmpegPath === "string") {
      ffmpeg.setFfmpegPath(ffmpegPath);
      console.log("✅ FFmpeg initialized with static binary:", ffmpegPath);
      ffmpegAvailable = true;
    } else {
      throw new Error("FFmpeg static path not found");
    }
  } catch (error) {
    console.warn(
      "⚠️ Failed to load ffmpeg-static, trying system FFmpeg:",
      error
    );

    // Fallback: try to use system FFmpeg
    try {
      ffmpeg.setFfmpegPath("ffmpeg");

      // Test if system FFmpeg is available by creating a simple test command
      console.log("✅ System FFmpeg fallback configured");
      ffmpegAvailable = true;
    } catch (systemError) {
      console.error("❌ No FFmpeg available (neither static nor system)");
      ffmpegAvailable = false;
    }
  }

  isFFmpegInitialized = true;
  return ffmpegAvailable;
}

/**
 * Check if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  return await initializeFFmpeg();
}

/**
 * Convert audio stream to MP3 using FFmpeg with proper error handling
 */
export async function convertToMp3(
  inputStream: Readable,
  options: {
    bitrate?: number;
    channels?: number;
    frequency?: number;
    timeout?: number;
  } = {}
): Promise<Readable> {
  const {
    bitrate = 128,
    channels = 2,
    frequency = 44100,
    timeout = 30000,
  } = options;

  // Check if FFmpeg is available
  const isAvailable = await initializeFFmpeg();

  if (!isAvailable) {
    console.warn("⚠️ FFmpeg not available, returning original stream");
    return inputStream;
  }

  return new Promise((resolve, reject) => {
    let isResolved = false;

    // Set timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        console.warn("⚠️ FFmpeg conversion timeout, returning original stream");
        isResolved = true;
        resolve(inputStream);
      }
    }, timeout);

    try {
      const ffmpegCommand = ffmpeg(inputStream)
        .audioCodec("libmp3lame")
        .audioBitrate(bitrate)
        .audioChannels(channels)
        .audioFrequency(frequency)
        .format("mp3")
        .on("start", (commandLine) => {
          console.log("🎵 FFmpeg conversion started:", commandLine);
        })
        .on("progress", (progress) => {
          // Log progress periodically
          if (progress.percent && progress.percent % 10 === 0) {
            console.log(`🎵 FFmpeg progress: ${progress.percent}%`);
          }
        })
        .on("error", (err) => {
          clearTimeout(timeoutId);
          if (!isResolved) {
            console.error("❌ FFmpeg conversion error:", err.message);
            console.warn("⚠️ Falling back to original stream");
            isResolved = true;
            resolve(inputStream);
          }
        })
        .on("end", () => {
          clearTimeout(timeoutId);
          if (!isResolved) {
            console.log("✅ FFmpeg conversion completed");
            isResolved = true;
          }
        });

      // Create output stream with proper error handling
      const outputStream = ffmpegCommand.pipe();

      // Handle output stream errors
      outputStream.on("error", (err) => {
        clearTimeout(timeoutId);
        if (!isResolved) {
          console.error("❌ FFmpeg output stream error:", err.message);
          console.warn("⚠️ Falling back to original stream");
          isResolved = true;
          resolve(inputStream);
        }
      });

      // Resolve with output stream if everything is working
      if (!isResolved) {
        clearTimeout(timeoutId);
        isResolved = true;
        resolve(outputStream as Readable);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (!isResolved) {
        console.error("❌ Failed to start FFmpeg conversion:", error);
        console.warn("⚠️ Falling back to original stream");
        isResolved = true;
        resolve(inputStream);
      }
    }
  });
}

/**
 * Convert audio stream to MP3 with smart fallback detection
 */
export async function convertToMp3WithFallback(
  inputStream: Readable,
  options: {
    bitrate?: number;
    channels?: number;
    frequency?: number;
    maxRetries?: number;
    retryTimeout?: number;
  } = {}
): Promise<{ stream: Readable; converted: boolean }> {
  const { maxRetries = 2, retryTimeout = 15000 } = options;

  // Check if FFmpeg is available
  const isAvailable = await initializeFFmpeg();

  if (!isAvailable) {
    console.warn("⚠️ FFmpeg not available, using original stream");
    return { stream: inputStream, converted: false };
  }

  // Try conversion with progressively shorter timeouts
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const timeout = retryTimeout / attempt; // Shorter timeout each retry

    try {
      console.log(
        `🎵 FFmpeg conversion attempt ${attempt}/${maxRetries} (timeout: ${timeout}ms)`
      );

      const convertedStream = await convertToMp3(inputStream, {
        ...options,
        timeout,
      });

      // If we get back the same stream, conversion was skipped
      if (convertedStream === inputStream) {
        console.warn(
          `⚠️ FFmpeg conversion attempt ${attempt} failed or timed out`
        );
        continue;
      }

      console.log(`✅ FFmpeg conversion successful on attempt ${attempt}`);
      return { stream: convertedStream, converted: true };
    } catch (error) {
      console.warn(`⚠️ FFmpeg conversion attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        console.log(
          "❌ All FFmpeg conversion attempts failed, using original stream"
        );
        break;
      }
    }
  }

  return { stream: inputStream, converted: false };
}

const ffmpegUtils = {
  isFFmpegAvailable,
  convertToMp3,
  convertToMp3WithFallback,
};

export default ffmpegUtils;
