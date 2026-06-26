import { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { QRScanner } from '../qr/QRScanner';
import { useClockIn, useClockOut, useBreakStart, useBreakEnd } from '../../hooks/useAttendance';
import { useGPS } from '../../hooks/useGPS';
import { useQRCodeValidation } from '../../hooks/useQRCode';
import { useAuthStore } from '../../stores/authStore';
import { useAttendanceStore } from '../../stores/attendanceStore';
import { useUIStore } from '../../stores/uiStore';
import { Clock, LogOut, Coffee } from 'lucide-react';
import type { AttendanceRecord, BreakRecord } from '../../types';

interface ClockButtonProps {
  currentAttendance: AttendanceRecord | null;
  currentBreak: BreakRecord | null;
}

export function ClockButton({ currentAttendance, currentBreak }: ClockButtonProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [pendingAction, setPendingAction] = useState<'clock_in' | 'clock_out' | 'break_start' | 'break_end' | null>(null);
  const { getCurrentPosition } = useGPS();
  const validateQR = useQRCodeValidation();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();
  const companyId = useAuthStore((s) => s.companyId);
  const showToast = useUIStore((s) => s.showToast);
  const { addOfflineAction } = useAttendanceStore();
  const isOnline = useUIStore((s) => s.isOnline);

  const isClockedIn = !!currentAttendance && !currentAttendance.clock_out_at;
  const isOnBreak = !!currentBreak && !currentBreak.break_end_at;

  const determineAction = useCallback((): 'clock_in' | 'clock_out' | 'break_start' | 'break_end' => {
    if (!isClockedIn) return 'clock_in';
    if (isOnBreak) return 'break_end';
    return 'clock_out';
  }, [isClockedIn, isOnBreak]);

  const handleButtonClick = () => {
    const action = determineAction();
    setPendingAction(action);
    setShowScanner(true);
  };

  const handleScan = async (code: string, token: string, location?: { latitude: number; longitude: number; accuracy: number; address?: string }) => {
    if (!pendingAction || !companyId) return;

    try {
      const validation = await validateQR.mutateAsync({
        code,
        token,
        latitude: location?.latitude,
        longitude: location?.longitude,
        deviceId: navigator.userAgent,
      });

      if (!validation.valid) {
        showToast(validation.error || 'Invalid QR code', 'error');
        setShowScanner(false);
        setPendingAction(null);
        return;
      }

      let gpsLocation = location;
      if (!gpsLocation) {
        gpsLocation = await getCurrentPosition() || undefined;
      }

      const payload = {
        companyId,
        qrCodeId: validation.qrCodeId,
        branchId: validation.branchId,
        latitude: gpsLocation?.latitude,
        longitude: gpsLocation?.longitude,
        accuracy: gpsLocation?.accuracy,
        address: gpsLocation?.address,
        deviceId: navigator.userAgent,
      };

      if (!isOnline) {
        addOfflineAction({
          action: pendingAction,
          payload,
          localTimestamp: Date.now(),
          status: 'pending',
        });
        showToast('Action saved offline. Will sync when online.', 'warning');
        setShowScanner(false);
        setPendingAction(null);
        return;
      }

      switch (pendingAction) {
        case 'clock_in':
          await clockIn.mutateAsync(payload);
          showToast('Clocked in successfully!', 'success');
          break;
        case 'clock_out':
          await clockOut.mutateAsync(payload);
          showToast('Clocked out successfully!', 'success');
          break;
        case 'break_start':
          await breakStart.mutateAsync({
            companyId,
            latitude: gpsLocation?.latitude,
            longitude: gpsLocation?.longitude,
            deviceId: navigator.userAgent,
          });
          showToast('Break started!', 'success');
          break;
        case 'break_end':
          await breakEnd.mutateAsync({
            companyId,
            latitude: gpsLocation?.latitude,
            longitude: gpsLocation?.longitude,
            deviceId: navigator.userAgent,
          });
          showToast('Break ended!', 'success');
          break;
      }
    } catch (error: any) {
      showToast(error.message || 'Action failed', 'error');
    } finally {
      setShowScanner(false);
      setPendingAction(null);
    }
  };

  const getButtonConfig = () => {
    if (!isClockedIn) {
      return {
        label: 'Clock In',
        icon: <Clock className="w-5 h-5" />,
        variant: 'primary' as const,
        color: 'bg-blue-600 hover:bg-blue-700',
      };
    }
    if (isOnBreak) {
      return {
        label: 'End Break',
        icon: <Coffee className="w-5 h-5" />,
        variant: 'secondary' as const,
        color: 'bg-orange-500 hover:bg-orange-600',
      };
    }
    return {
      label: 'Clock Out',
      icon: <LogOut className="w-5 h-5" />,
      variant: 'danger' as const,
      color: 'bg-red-600 hover:bg-red-700',
    };
  };

  const config = getButtonConfig();

  return (
    <>
      <Button
        size="lg"
        leftIcon={config.icon}
        onClick={handleButtonClick}
        className={`w-full py-6 text-lg font-semibold ${config.color}`}
        isLoading={clockIn.isPending || clockOut.isPending || breakStart.isPending || breakEnd.isPending}
      >
        {config.label}
      </Button>

      {isClockedIn && !isOnBreak && (
        <Button
          size="md"
          variant="outline"
          leftIcon={<Coffee className="w-4 h-4" />}
          onClick={() => {
            setPendingAction('break_start');
            setShowScanner(true);
          }}
          className="w-full mt-2"
        >
          Start Break
        </Button>
      )}

      {isOnBreak && (
        <Button
          size="md"
          variant="outline"
          leftIcon={<Coffee className="w-4 h-4" />}
          onClick={() => {
            setPendingAction('break_end');
            setShowScanner(true);
          }}
          className="w-full mt-2"
        >
          End Break
        </Button>
      )}

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => {
            setShowScanner(false);
            setPendingAction(null);
          }}
        />
      )}
    </>
  );
}
