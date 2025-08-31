import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "i1.sndcdn.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "a1.sndcdn.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.sndcdn.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure ffmpeg-static binary is properly handled
      config.externals = config.externals || [];
      config.externals.push({
        "ffmpeg-static": "ffmpeg-static",
        "fluent-ffmpeg": "fluent-ffmpeg",
        "@distube/ytdl-core": "@distube/ytdl-core",
      });

      // Copy ffmpeg binary to the output directory
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
      };
    } else {
      // Client-side: completely exclude server-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        "fluent-ffmpeg": false,
        "ffmpeg-static": false,
        "@distube/ytdl-core": false,
        undici: false,
      };
    }

    return config;
  },
  // Turbopack configuration for development
  turbopack: {
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    resolveAlias: {
      // Handle binary dependencies
      "ffmpeg-static": "ffmpeg-static",
      "yt-dlp-static": "yt-dlp-static",
    },
  },
  // Ensure server-side code can access Node.js APIs
  serverExternalPackages: [
    "ffmpeg-static",
    "fluent-ffmpeg",
    "yt-dlp-static",
    "@distube/ytdl-core",
    "undici",
  ],
};

export default nextConfig;
