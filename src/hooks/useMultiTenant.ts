import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../stores/uiStore';

export function useCompanySignup() {
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: async (data: {
      companyName: string;
      companyEmail: string;
      companyPhone?: string;
      companyIndustry?: string;
      adminName: string;
      adminEmail: string;
      password: string;
      plan: 'free' | 'pro' | 'enterprise';
    }) => {
      // 1. Create company
      const slug = data.companyName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: data.companyName,
          slug,
          email: data.companyEmail,
          phone: data.companyPhone,
          industry: data.companyIndustry,
          plan_id: data.plan,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          max_employees: data.plan === 'free' ? 5 : data.plan === 'pro' ? 50 : 500,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.adminName,
          },
        },
      });

      if (authError) throw authError;

      // 3. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user!.id,
          company_id: companyData.id,
          full_name: data.adminName,
          email: data.adminEmail,
          status: 'active',
          role: 'company_admin',
        });

      if (profileError) throw profileError;

      // 4. Create company settings
      const { error: settingsError } = await supabase
        .from('company_settings')
        .insert({
          company_id: companyData.id,
          work_start_time: '09:00',
          work_end_time: '17:00',
          break_duration_minutes: 60,
        });

      if (settingsError) throw settingsError;

      return {
        companyId: companyData.id,
        userId: authData.user!.id,
        company: companyData,
      };
    },
    onError: (error: any) => {
      showToast(error.message || 'Signup failed', 'error');
    },
  });
}

export function useEmployeeInvite() {
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: async (data: {
      companyId: string;
      fullName: string;
      email: string;
      role: string;
      branchId?: string;
      departmentId?: string;
      salary?: number;
    }) => {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // 1. Create auth user with temporary password
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError) throw authError;

      // 2. Create employee profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user!.id,
          company_id: data.companyId,
          full_name: data.fullName,
          email: data.email,
          role: data.role || 'staff',
          branch_id: data.branchId,
          department_id: data.departmentId,
          salary_amount: data.salary,
          status: 'active',
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 3. Send invitation email with temporary password
      // TODO: Integrate email service to send credentials
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: authData.user!.id,
          title: 'Welcome to ' + data.email.split('@')[0],
          message: `You've been invited to the system. Temporary password: ${tempPassword}. Please change your password after first login.`,
          type: 'invitation',
        });

      return {
        userId: authData.user!.id,
        tempPassword,
        profile: profileData,
      };
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to invite employee', 'error');
    },
  });
}

export function useMultiTenantLogin() {
  const showToast = useUIStore((s) => s.showToast);

  return useMutation({
    mutationFn: async (data: { email: string; password: string; companySlug?: string }) => {
      // 1. Sign in with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      // 2. Get user profile to determine company
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, company:company_id(slug)')
        .eq('id', authData.user!.id)
        .single();

      if (profileError) throw profileError;

      // 3. Validate company slug if provided
      if (data.companySlug && profileData.company?.slug !== data.companySlug) {
        throw new Error('Company not found');
      }

      return {
        user: authData.user,
        profile: profileData,
        companyId: profileData.company_id,
      };
    },
    onError: (error: any) => {
      showToast(error.message || 'Login failed', 'error');
    },
  });
}
