"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SoundCloudIcon, YouTubeIcon, SettingsIcon } from "@/components/icons";
import { SettingsDialog } from "@/components/settings-dialog";
import PlaylistDownloaderSoundCloud from "./PlaylistDownloaderSoundCloud";
import PlaylistDownloaderYouTube from "./PlaylistDownloaderYouTube";

export default function Home() {
  const [disableTabs, setDisableTabs] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-8 lg:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between">
        <div className="flex items-center justify-between mb-6 sm:mb-8 px-2">
          <h1 className="scroll-m-20 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-center flex-1">
            Music Playlist Downloader
          </h1>
          <SettingsDialog>
            <Button variant="outline" size="sm" className="ml-4">
              <SettingsIcon width={16} height={16} className="mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </SettingsDialog>
        </div>

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
            <Card className="pt-0">
              <CardContent className="py-0 px-4 sm:px-6">
                <PlaylistDownloaderSoundCloud setDisableTabs={setDisableTabs} />
              </CardContent>
              <CardFooter className="text-xs sm:text-sm text-muted-foreground px-4 sm:px-6">
                Search tracks or paste SoundCloud playlist/track URLs
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="youtube" className="mt-4 sm:mt-6">
            <Card className="pt-0">
              <CardContent className="py-0 px-4 sm:px-6">
                <PlaylistDownloaderYouTube setDisableTabs={setDisableTabs} />
              </CardContent>
              <CardFooter className="text-xs sm:text-sm text-muted-foreground px-4 sm:px-6">
                YouTube playlist and individual video downloader
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}