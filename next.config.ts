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
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      // Ensure ffmpeg-static binary is properly handled
      config.externals = config.externals || [];
      config.externals.push({
        "ffmpeg-static": "commonjs ffmpeg-static",
        "fluent-ffmpeg": "commonjs fluent-ffmpeg",
        "@distube/ytdl-core": "commonjs @distube/ytdl-core",
        "child_process": "commonjs child_process",
        "fs": "commonjs fs",
        "path": "commonjs path",
        "os": "commonjs os",
        "util": "commonjs util",
        "events": "commonjs events",
        "stream": "commonjs stream",
        "buffer": "commonjs buffer",
      });
    } else {
      // Client-side: completely exclude server-only modules
      config.resolve.alias = {
        ...config.resolve.alias,
        "ffmpeg-static": false,
        "fluent-ffmpeg": false,
        "@distube/ytdl-core": false,
      };
    }

    // For both server and client: properly handle Node.js built-in modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      child_process: false,
      net: false,
      tls: false,
      os: false,
      path: false,
      util: false,
      events: false,
      stream: false,
      buffer: false,
    };

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
    "@distube/ytdl-core",
    "yt-dlp-static",
    "undici",
  ],
};

export default nextConfig;