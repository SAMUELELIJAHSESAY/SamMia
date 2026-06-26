import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { AttendanceReport, PayrollPeriod } from '../types';

export function useReports() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['reports', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('attendance_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AttendanceReport[];
    },
    enabled: !!companyId,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.companyId);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      reportType: string;
      dateFrom?: string;
      dateTo?: string;
      employeeId?: string;
      departmentId?: string;
      branchId?: string;
      format?: string;
    }) => {
      const insertData: Record<string, unknown> = {
        company_id: companyId,
        name: payload.name,
        report_type: payload.reportType,
        date_from: payload.dateFrom || null,
        date_to: payload.dateTo || null,
        employee_id: payload.employeeId || null,
        department_id: payload.departmentId || null,
        branch_id: payload.branchId || null,
        format: payload.format || 'pdf',
        generated_by: userId,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('attendance_reports')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function usePayrollPeriods() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['payrollPeriods', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as PayrollPeriod[];
    },
    enabled: !!companyId,
  });
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.companyId);

  return useMutation({
    mutationFn: async (payload: { name: string; periodStart: string; periodEnd: string; payDate?: string }) => {
      const insertData: Record<string, unknown> = {
        company_id: companyId,
        name: payload.name,
        period_start: payload.periodStart,
        period_end: payload.periodEnd,
        pay_date: payload.payDate || null,
        status: 'draft',
      };

      const { data, error } = await supabase
        .from('payroll_periods')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollPeriods'] });
    },
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await supabase.rpc('generate_payroll_entries', {
        p_period_id: periodId,
      } as Record<string, unknown>);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollPeriods'] });
    },
  });
}
