import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { AttendanceRecord, BreakRecord } from '../types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function useTodayAttendance() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['todayAttendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as AttendanceRecord | null;
    },
    refetchInterval: 30000,
    enabled: !!user?.id,
  });
}

export function useAttendanceHistory(days = 30) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['attendanceHistory', user?.id, days],
    queryFn: async () => {
      if (!user?.id) return [];

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', user.id)
        .gte('date', fromDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!user?.id,
  });
}

export function useCompanyAttendance(date?: string) {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['companyAttendance', companyId, date],
    queryFn: async () => {
      if (!companyId) return [];

      const targetDate = date || new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employee:employee_id(full_name, avatar_url, job_title)
        `)
        .eq('company_id', companyId)
        .eq('date', targetDate)
        .order('clock_in_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      companyId: string;
      branchId?: string;
      qrCodeId?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      address?: string;
      deviceId?: string;
    }) => {
      const response = await fetch(`${EDGE_FUNCTION_URL}/attendance-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'clock_in',
          employeeId: useAuthStore.getState().user?.id,
          ...payload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Clock in failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.attendanceId) {
        queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
        queryClient.invalidateQueries({ queryKey: ['companyAttendance'] });
      }
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      companyId: string;
      branchId?: string;
      qrCodeId?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      address?: string;
      deviceId?: string;
    }) => {
      const response = await fetch(`${EDGE_FUNCTION_URL}/attendance-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'clock_out',
          employeeId: useAuthStore.getState().user?.id,
          ...payload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Clock out failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['companyAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceHistory'] });
    },
  });
}

export function useBreakStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      companyId: string;
      latitude?: number;
      longitude?: number;
      deviceId?: string;
    }) => {
      const response = await fetch(`${EDGE_FUNCTION_URL}/attendance-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'break_start',
          employeeId: useAuthStore.getState().user?.id,
          ...payload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Break start failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
    },
  });
}

export function useBreakEnd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      companyId: string;
      latitude?: number;
      longitude?: number;
      deviceId?: string;
    }) => {
      const response = await fetch(`${EDGE_FUNCTION_URL}/attendance-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'break_end',
          employeeId: useAuthStore.getState().user?.id,
          ...payload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Break end failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceHistory'] });
    },
  });
}

export function useActiveBreak() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['activeBreak', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('break_records')
        .select('*')
        .eq('employee_id', user.id)
        .is('break_end_at', null)
        .order('break_start_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data as BreakRecord | null;
    },
    refetchInterval: 30000,
    enabled: !!user?.id,
  });
}
