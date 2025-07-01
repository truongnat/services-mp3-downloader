"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import PlaylistTrackCard from "./PlaylistTrackCard"
import Image from "next/image"
import PlaylistDownloaderSoundCloud from "./PlaylistDownloaderSoundCloud"

export default function PlaylistDownloader() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">SoundCloud Playlist Downloader</h1>
      <PlaylistDownloaderSoundCloud />
    </main>
  )
}
