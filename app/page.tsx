"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useState } from "react";
import PlaylistDownloaderSoundCloud from "./PlaylistDownloaderSoundCloud";

export default function Home() {
  const [disableTabs, setDisableTabs] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center mb-8">
          Music Playlist Downloader
        </h1>

        <Tabs defaultValue="soundcloud" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="soundcloud"
              className="flex items-center gap-2"
              disabled={disableTabs}
            >
              <Image src="/window.svg" alt="SoundCloud" width={20} height={20} />
              SoundCloud
            </TabsTrigger>
            <TabsTrigger
              value="youtube"
              className="flex items-center gap-2"
              disabled
            >
              <Image src="/globe.svg" alt="YouTube" width={20} height={20} />
              YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="soundcloud">
            <Card>
              <CardHeader>
                <CardTitle>SoundCloud Playlist Downloader</CardTitle>
                <CardDescription>
                  Enter a SoundCloud playlist URL to download all songs as MP3 files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlaylistDownloaderSoundCloud setDisableTabs={setDisableTabs} />
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                Supported format: SoundCloud playlist URLs
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="youtube">
            <Card>
              <CardHeader>
                <CardTitle>YouTube Playlist Downloader</CardTitle>
                <CardDescription>
                  Enter a YouTube playlist URL to download all songs as MP3 files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <></>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                Supported format: YouTube playlist URLs
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
