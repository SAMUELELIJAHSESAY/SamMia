import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AttendanceRecord, BreakRecord, OfflineAction } from '../types';

interface AttendanceState {
  currentAttendance: AttendanceRecord | null;
  currentBreak: BreakRecord | null;
  isClockedIn: boolean;
  isOnBreak: boolean;
  offlineQueue: OfflineAction[];
  lastSyncTime: number | null;
  setCurrentAttendance: (attendance: AttendanceRecord | null) => void;
  setCurrentBreak: (breakRecord: BreakRecord | null) => void;
  setClockedIn: (isClockedIn: boolean) => void;
  setOnBreak: (isOnBreak: boolean) => void;
  addOfflineAction: (action: Omit<OfflineAction, 'id'>) => void;
  removeOfflineAction: (id: string) => void;
  updateOfflineAction: (id: string, updates: Partial<OfflineAction>) => void;
  clearOfflineQueue: () => void;
  setLastSyncTime: (time: number) => void;
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set, get) => ({
      currentAttendance: null,
      currentBreak: null,
      isClockedIn: false,
      isOnBreak: false,
      offlineQueue: [],
      lastSyncTime: null,

      setCurrentAttendance: (attendance) => set({
        currentAttendance: attendance,
        isClockedIn: !!attendance && !attendance.clock_out_at,
      }),

      setCurrentBreak: (breakRecord) => set({
        currentBreak: breakRecord,
        isOnBreak: !!breakRecord && !breakRecord.break_end_at,
      }),

      setClockedIn: (isClockedIn) => set({ isClockedIn }),
      setOnBreak: (isOnBreak) => set({ isOnBreak }),

      addOfflineAction: (action) => {
        const newAction: OfflineAction = {
          ...action,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        set({ offlineQueue: [...get().offlineQueue, newAction] });
      },

      removeOfflineAction: (id) => {
        set({ offlineQueue: get().offlineQueue.filter((a) => a.id !== id) });
      },

      updateOfflineAction: (id, updates) => {
        set({
          offlineQueue: get().offlineQueue.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        });
      },

      clearOfflineQueue: () => set({ offlineQueue: [] }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
    }),
    {
      name: 'attendance-storage',
      partialize: (state) => ({
        offlineQueue: state.offlineQueue,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
