"use client"

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supportsFileSystemAccess } from "@/lib/download-utils";

interface DownloadLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  onConfirm: (useCustomLocation: boolean, customPath?: string) => void;
  onCancel: () => void;
}

export function DownloadLocationDialog({
  open,
  onOpenChange,
  filename,
  onConfirm,
  onCancel
}: DownloadLocationDialogProps) {
  const [customPath, setCustomPath] = useState("");
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  
  const supportsFileAPI = supportsFileSystemAccess();

  const handleConfirm = () => {
    onConfirm(useCustomLocation, customPath);
    onOpenChange(false);
    setCustomPath("");
    setUseCustomLocation(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
    setCustomPath("");
    setUseCustomLocation(false);
  };

  const handleChooseLocation = async () => {
    if (supportsFileAPI) {
      setUseCustomLocation(true);
    } else {
      // For browsers that don't support File System Access API
      // We'll just use the default download location
      setUseCustomLocation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận tải xuống</DialogTitle>
          <DialogDescription>
            Chọn vị trí lưu file cho: <strong>{filename}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vị trí lưu file:</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="default-location"
                  name="location"
                  checked={!useCustomLocation}
                  onChange={() => setUseCustomLocation(false)}
                  className="w-4 h-4"
                />
                <Label htmlFor="default-location" className="text-sm font-normal">
                  Thư mục Downloads mặc định
                </Label>
              </div>
              
              {supportsFileAPI && (
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="custom-location"
                    name="location"
                    checked={useCustomLocation}
                    onChange={() => setUseCustomLocation(true)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="custom-location" className="text-sm font-normal">
                    Chọn vị trí khác
                  </Label>
                </div>
              )}
            </div>
          </div>

          {useCustomLocation && supportsFileAPI && (
            <div className="space-y-2">
              <Label htmlFor="custom-path">Đường dẫn tùy chỉnh:</Label>
              <div className="flex space-x-2">
                <Input
                  id="custom-path"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="Chọn thư mục..."
                  readOnly
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChooseLocation}
                  className="whitespace-nowrap"
                >
                  Chọn thư mục
                </Button>
              </div>
            </div>
          )}

          {!supportsFileAPI && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Lưu ý:</strong> Trình duyệt của bạn sẽ tải file về thư mục Downloads mặc định. 
                Để thay đổi vị trí lưu, vui lòng cập nhật cài đặt trình duyệt.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
            Hủy
          </Button>
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            Tải xuống
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}