import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MacOSTipProps {
  show: boolean;
  onClose: () => void;
}

export default function MacOSTip({ show, onClose }: MacOSTipProps) {
  if (!show) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-2">
              💡 macOS Download Tip
            </h3>
            <p className="text-blue-800 text-sm mb-3">
              Files are downloaded to your browser's default download folder. 
              You can find them in <strong>Downloads</strong> or check your browser's download history.
            </p>
            <p className="text-blue-700 text-xs">
              To change the download location, update your browser settings or use Chrome's 
              "Ask where to save each file before downloading" option.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-blue-600 hover:text-blue-800 ml-4"
          >
            ✕
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
