"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { SoundCloudIcon, YouTubeIcon } from "@/components/icons";
import PlaylistDownloaderSoundCloud from "./PlaylistDownloaderSoundCloud";
import PlaylistDownloaderYouTube from "./PlaylistDownloaderYouTube";

export default function Home() {
  const [disableTabs, setDisableTabs] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 lg:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between">
        <h1 className="scroll-m-20 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-center mb-6 sm:mb-8 px-2">
          Music Playlist Downloader
        </h1>

        <Tabs defaultValue="soundcloud" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 sm:h-10">
            <TabsTrigger
              value="soundcloud"
              className="flex items-center gap-2 text-sm sm:text-base h-10 sm:h-8"
              disabled={disableTabs}
            >
              <SoundCloudIcon width={18} height={18} className="sm:w-5 sm:h-5" />
              <span className="hidden xs:inline sm:inline">SoundCloud</span>
              <span className="xs:hidden sm:hidden">SC</span>
            </TabsTrigger>
            <TabsTrigger
              value="youtube"
              className="flex items-center gap-2 text-sm sm:text-base h-10 sm:h-8"
              disabled={disableTabs}
            >
              <YouTubeIcon width={18} height={18} className="sm:w-5 sm:h-5" />
              <span className="hidden xs:inline sm:inline">YouTube</span>
              <span className="xs:hidden sm:hidden">YT</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="soundcloud" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">SoundCloud Playlist Downloader</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Enter a SoundCloud playlist URL to download all songs as MP3 files.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-4 sm:px-6">
                <PlaylistDownloaderSoundCloud setDisableTabs={setDisableTabs} />
              </CardContent>
              <CardFooter className="text-xs sm:text-sm text-muted-foreground px-4 sm:px-6">
                Supported format: SoundCloud playlist URLs
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="youtube" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">YouTube Playlist Downloader</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Enter a YouTube audio or playlist URL to download as MP3 files.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-4 sm:px-6">
                <PlaylistDownloaderYouTube setDisableTabs={setDisableTabs} />
              </CardContent>
              <CardFooter className="text-xs sm:text-sm text-muted-foreground px-4 sm:px-6">
                Supported format: YouTube audio and playlist URLs
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
