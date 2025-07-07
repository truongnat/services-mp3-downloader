"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AUDIO_FORMATS, AUDIO_QUALITIES, AudioSettings, DEFAULT_SETTINGS, FILENAME_FORMAT_OPTIONS } from "@/lib/settings";


interface SettingsDialogProps {
  children: React.ReactNode;
}

export function SettingsDialog({ children, }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('audioSettings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (error) {
          console.error('Failed to parse saved settings:', error);
        }
      }
    }
  }, []);
  const [open, setOpen] = useState(false);

  // Save settings to localStorage and notify parent
  const updateSettings = (newSettings: AudioSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioSettings', JSON.stringify(newSettings));
    }
  };

  const handleQualityChange = (quality: string) => {
    updateSettings({ ...settings, quality: quality as AudioSettings['quality'] });
  };

  const handleFormatChange = (format: string) => {
    updateSettings({ ...settings, format: format as AudioSettings['format'] });
  };

  const handleFilenameFormatChange = (filenameFormat: string) => {
    updateSettings({ ...settings, filenameFormat });
  };

  const handleToggleChange = (key: keyof AudioSettings, value: boolean) => {
    updateSettings({ ...settings, [key]: value });
  };

  const resetToDefaults = () => {
    updateSettings(DEFAULT_SETTINGS);
  };

  const getPreviewFilename = () => {
    let preview = settings.filenameFormat;
    preview = preview.replace('{index:03d}', '001');
    preview = preview.replace('{index}', '01');
    preview = preview.replace('{artist}', 'Artist Name');
    preview = preview.replace('{title}', 'Song Title');
    preview = preview.replace('{album}', 'Album Name');
    return preview + '.' + settings.format;
  };

  const getCurrentFormatOption = () => FILENAME_FORMAT_OPTIONS.find(option => option.value === settings.filenameFormat)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audio Download Settings</DialogTitle>
          <DialogDescription>
            Customize audio quality, format, and filename patterns for downloads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Audio Quality */}
          <div className="space-y-2">
            <Label htmlFor="quality">Audio Quality</Label>
            <Select value={settings.quality} onValueChange={handleQualityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                {
                  AUDIO_QUALITIES.map((quality) => (
                    <SelectItem key={quality.value} value={quality.value}>
                      {quality.label}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Audio Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Audio Format</Label>
            <Select value={settings.format} onValueChange={handleFormatChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {
                  AUDIO_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Filename Format */}
          <div className="space-y-3">
            <Label htmlFor="filename">Filename Format</Label>
            <Select value={settings.filenameFormat} onValueChange={handleFilenameFormatChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select filename format" />
              </SelectTrigger>
              <SelectContent>
                {FILENAME_FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground font-mono">{option.example}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Current format:</span>
                <span className="font-medium">{getCurrentFormatOption()?.label || 'Custom'}</span>
              </div>
              <div className="mt-2">
                <strong>Preview:</strong> <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{getPreviewFilename()}</span>
              </div>
            </div>
          </div>

          {/* Filename Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-artist">Include Artist</Label>
                <div className="text-xs text-muted-foreground">Add artist name to filename</div>
              </div>
              <Switch
                id="include-artist"
                checked={settings.includeArtist}
                onCheckedChange={(checked) => handleToggleChange('includeArtist', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="include-index">Include Track Number</Label>
                <div className="text-xs text-muted-foreground">Add track number to filename</div>
              </div>
              <Switch
                id="include-index"
                checked={settings.includeIndex}
                onCheckedChange={(checked) => handleToggleChange('includeIndex', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sanitize">Sanitize Filenames</Label>
                <div className="text-xs text-muted-foreground">Remove special characters for compatibility</div>
              </div>
              <Switch
                id="sanitize"
                checked={settings.sanitizeFilename}
                onCheckedChange={(checked) => handleToggleChange('sanitizeFilename', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
