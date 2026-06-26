import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Company, CompanySettings, Branch, Department, Team, Shift, Profile, Holiday, LeaveType } from '../types';

export function useCompany() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return data as Company;
    },
    enabled: !!companyId,
  });
}

export function useCompanySettings() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['companySettings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as CompanySettings | null;
    },
    enabled: !!companyId,
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.companyId);

  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('company_settings')
        .update(updates)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
    },
  });
}

export function useBranches() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['branches', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('branches')
        .select('*, manager:manager_id(full_name)')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Branch[];
    },
    enabled: !!companyId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.companyId);

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('branches')
        .insert({ ...payload, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useDepartments() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['departments', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('*, manager:manager_id(full_name), branch:branch_id(name)')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Department[];
    },
    enabled: !!companyId,
  });
}

export function useTeams() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['teams', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*, lead:lead_id(full_name), department:department_id(name)')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Team[];
    },
    enabled: !!companyId,
  });
}

export function useShifts() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['shifts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Shift[];
    },
    enabled: !!companyId,
  });
}

export function useEmployees() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['employees', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*, department:department_id(name), team:team_id(name), branch:branch_id(name), manager:manager_id(full_name)')
        .eq('company_id', companyId)
        .neq('role', 'super_admin')
        .order('full_name');

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!companyId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((s) => s.companyId);

  return useMutation({
    mutationFn: async (payload: { email: string; password: string; full_name: string; role?: string; branch_id?: string; department_id?: string; job_title?: string; employee_id?: string; hourly_rate?: number }) => {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            company_id: companyId,
            role: payload.role || 'staff',
            full_name: payload.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: companyId,
          full_name: payload.full_name,
          role: payload.role || 'staff',
          branch_id: payload.branch_id || null,
          department_id: payload.department_id || null,
          job_title: payload.job_title || null,
          employee_id: payload.employee_id || null,
          hourly_rate: payload.hourly_rate || 0,
          status: 'active',
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (profileError) throw profileError;
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useHolidays() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['holidays', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('company_id', companyId)
        .order('date');

      if (error) throw error;
      return data as Holiday[];
    },
    enabled: !!companyId,
  });
}

export function useLeaveTypes() {
  const companyId = useAuthStore((s) => s.companyId);

  return useQuery({
    queryKey: ['leaveTypes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data as LeaveType[];
    },
    enabled: !!companyId,
  });
}
