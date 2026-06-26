import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useUpdateQRCode } from '../../hooks/useQRCode';
import { RefreshCw, Clock, MapPin, Copy, Check } from 'lucide-react';
import type { QRCode } from '../../types';

interface QRCodeDisplayProps {
  qrCode: QRCode;
}

export function QRCodeDisplay({ qrCode }: QRCodeDisplayProps) {
  const [token, setToken] = useState(qrCode.current_token || '');
  const [timeLeft, setTimeLeft] = useState(qrCode.rotation_interval_seconds || 45);
  const [copied, setCopied] = useState(false);
  const updateQR = useUpdateQRCode();

  const rotateToken = useCallback(async () => {
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('') + '.' + Math.floor(Date.now() / 1000);

    setToken(newToken);
    setTimeLeft(qrCode.rotation_interval_seconds || 45);

    await updateQR.mutateAsync({
      id: qrCode.id,
      current_token: newToken,
      last_rotated_at: new Date().toISOString(),
    });
  }, [qrCode]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          rotateToken();
          return qrCode.rotation_interval_seconds || 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [rotateToken, qrCode.rotation_interval_seconds]);

  const qrData = JSON.stringify({
    code: qrCode.code,
    token: token,
    companyId: qrCode.company_id,
    branchId: qrCode.branch_id,
    timestamp: Date.now(),
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{qrCode.name}</CardTitle>
          <Badge variant={qrCode.status === 'active' ? 'success' : 'neutral'}>
            {qrCode.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative p-4 bg-white rounded-xl">
          <QRCodeSVG
            value={qrData}
            size={200}
            level="H"
            includeMargin={true}
            className="rounded-lg"
          />
          <div className="absolute top-2 right-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
              ${timeLeft <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500 text-white'}
            `}>
              {timeLeft}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Rotates in {timeLeft}s
          </span>
          {qrCode.gps_required && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              GPS required
            </span>
          )}
        </div>

        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={rotateToken}
            isLoading={updateQR.isPending}
            className="flex-1"
          >
            Rotate Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onClick={copyToClipboard}
            className="flex-1"
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono break-all">
          {qrCode.code}
        </div>
      </CardContent>
    </Card>
  );
}
