"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AUDIO_FORMATS, AUDIO_QUALITIES, AudioSettings, FILENAME_FORMAT_OPTIONS } from "@/lib/settings";
import { useSettings } from "@/lib/hooks/use-settings";
import { Badge } from "./ui/badge";

interface SettingsDialogProps {
  children: React.ReactNode;
}

export function SettingsDialog({ children }: SettingsDialogProps) {
  const { settings, updateSettings, resetSettings, isLoading } = useSettings();
  const [open, setOpen] = useState(false);

  // Handler functions
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

  // Computed values
  const getPreviewFilename = useMemo(() => {
    let preview = settings.filenameFormat;
    preview = preview.replace('{index:03d}', '001');
    preview = preview.replace('{index}', '01');
    preview = preview.replace('{artist}', 'Artist Name');
    preview = preview.replace('{title}', 'Song Title');
    preview = preview.replace('{album}', 'Album Name');
    
    // Apply settings
    if (!settings.includeIndex) {
      preview = preview.replace(/^\[?\d+\]?\s*[.-]?\s*/, '');
      preview = preview.replace(/\(\d+\)$/, '');
    }
    if (!settings.includeArtist) {
      preview = preview.replace(/.*?\s*-\s*/, '');
    }
    
    // Sanitize if enabled
    if (settings.sanitizeFilename) {
      preview = preview.replace(/[<>:"/\\|?*]/g, '').replace(/[.]{2,}/g, '.').replace(/\s+/g, '_');
    }
    
    return preview + '.' + settings.format;
  }, [settings]);

  const getCurrentFormatOption = useMemo(() => 
    FILENAME_FORMAT_OPTIONS.find(option => option.value === settings.filenameFormat),
    [settings.filenameFormat]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Audio Download Settings
            <Badge variant="secondary" className="text-xs">
              v2.0
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Customize audio quality, format, and filename patterns for downloads.
            Settings are automatically saved and synced across tabs.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
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
                <span className="font-medium">{getCurrentFormatOption?.label || 'Custom'}</span>
              </div>
              <div className="mt-2">
                <strong>Preview:</strong> 
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded ml-1">
                  {getPreviewFilename}
                </span>
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
            <Button variant="outline" onClick={resetSettings}>
              Reset to Defaults
            </Button>
            <Button onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
