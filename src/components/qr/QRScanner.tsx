import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useUIStore } from '../../stores/uiStore';
import { useGPS } from '../../hooks/useGPS';
import { X, CheckCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (code: string, token: string, location?: { latitude: number; longitude: number; accuracy: number; address?: string }) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getCurrentPosition, loading: gpsLoading } = useGPS();
  const showToast = useUIStore((s) => s.showToast);
  const scanInterval = useRef<ReturnType<typeof setInterval>>();

  const capture = useCallback(() => {
    if (!webcamRef.current || !scanning) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        setScanning(false);
        handleScannedCode(code.data);
      }
    };
    image.src = imageSrc;
  }, [scanning]);

  const handleScannedCode = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.code || !parsed.token) {
        throw new Error('Invalid QR code format');
      }

      showToast('QR code detected! Getting location...', 'info');
      const gpsLocation = await getCurrentPosition();

      onScan(parsed.code, parsed.token, gpsLocation || undefined);
    } catch (e: any) {
      setError(e.message || 'Invalid QR code');
      setScanning(true);
    }
  };

  useEffect(() => {
    scanInterval.current = setInterval(capture, 500);
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, [capture]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="relative aspect-square bg-black">
          {scanning ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/png"
                videoConstraints={{ facingMode: 'environment' }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500" />
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm">Point camera at QR code</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
              <p className="text-white text-lg font-medium">QR Code Scanned!</p>
              {gpsLoading && <p className="text-gray-300 text-sm">Getting location...</p>}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => { setError(null); setScanning(true); }}>
              Try Again
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
