import { useEffect, useCallback } from 'react';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import type { OfflineAction } from '../types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function useOfflineSync() {
  const { offlineQueue, removeOfflineAction, updateOfflineAction, setLastSyncTime } = useAttendanceStore();
  const isOnline = useUIStore((s) => s.isOnline);
  const showToast = useUIStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  const syncAction = useCallback(async (action: OfflineAction) => {
    if (!user?.id) return false;

    updateOfflineAction(action.id, { status: 'syncing' });

    try {
      const companyId = user.company_id;
      if (!companyId) throw new Error('No company ID');

      const payload = {
        action: action.action,
        employeeId: user.id,
        companyId: companyId,
        ...action.payload,
      };

      const response = await fetch(`${EDGE_FUNCTION_URL}/attendance-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      updateOfflineAction(action.id, { status: 'completed' });
      return true;
    } catch (error: any) {
      updateOfflineAction(action.id, {
        status: 'failed',
        error: error.message,
      });
      return false;
    }
  }, [user, updateOfflineAction]);

  const syncAll = useCallback(async () => {
    if (!isOnline || offlineQueue.length === 0) return;

    const pendingActions = offlineQueue.filter((a) => a.status === 'pending' || a.status === 'failed');
    if (pendingActions.length === 0) return;

    showToast(`Syncing ${pendingActions.length} offline actions...`, 'info');

    let successCount = 0;
    let failCount = 0;

    for (const action of pendingActions) {
      const success = await syncAction(action);
      if (success) {
        successCount++;
        setTimeout(() => removeOfflineAction(action.id), 5000);
      } else {
        failCount++;
      }
    }

    setLastSyncTime(Date.now());

    if (failCount === 0) {
      showToast(`All ${successCount} actions synced successfully`, 'success');
    } else {
      showToast(`${successCount} synced, ${failCount} failed. Will retry later.`, 'warning');
    }
  }, [isOnline, offlineQueue, syncAction, removeOfflineAction, setLastSyncTime, showToast]);

  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(syncAll, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && offlineQueue.some((a) => a.status === 'pending' || a.status === 'failed')) {
        syncAll();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isOnline, offlineQueue, syncAll]);

  return {
    offlineQueue,
    syncAll,
    syncAction,
    pendingCount: offlineQueue.filter((a) => a.status === 'pending' || a.status === 'failed').length,
  };
}

export function useStoreOfflineAction() {
  const addOfflineAction = useAttendanceStore((s) => s.addOfflineAction);
  const isOnline = useUIStore((s) => s.isOnline);
  const showToast = useUIStore((s) => s.showToast);

  const storeAction = useCallback((action: Omit<OfflineAction, 'id'>) => {
    addOfflineAction(action);
    if (!isOnline) {
      showToast('Action saved offline. Will sync when connection is restored.', 'warning');
    }
  }, [addOfflineAction, isOnline, showToast]);

  return storeAction;
}
