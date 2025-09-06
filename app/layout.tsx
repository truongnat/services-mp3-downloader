import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  }

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Music Playlist Downloader",
    template: "%s | Music Playlist Downloader",
  },
  description: "Download songs from YouTube and SoundCloud playlists as MP3",
  applicationName: "Music Playlist Downloader",
  keywords: [
    "youtube playlist downloader",
    "soundcloud playlist downloader",
    "mp3 downloader",
    "playlist to mp3",
    "audio downloader",
    "music downloader",
  ],
  authors: [{ name: "Music Playlist Downloader" }],
  creator: "Music Playlist Downloader",
  publisher: "Music Playlist Downloader",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Music Playlist Downloader",
    title: "Music Playlist Downloader",
    description: "Download songs from YouTube and SoundCloud playlists as MP3",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Music Playlist Downloader",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Music Playlist Downloader",
    description: "Download songs from YouTube and SoundCloud playlists as MP3",
    images: ["/twitter-image"],
  },
  icons: {
    // Next.js will auto-link PNG icons from app/icon.tsx (multiple sizes) and keep favicon.ico
    icon: [{ url: "/favicon.ico" }],
  },
  };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background font-sans antialiased">
          {children}
        </div>
      </body>
    </html>
  );
}
