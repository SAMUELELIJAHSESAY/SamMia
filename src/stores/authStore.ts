import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

interface AuthState {
  user: Profile | null;
  session: unknown | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  companyId: string | null;
  theme: 'light' | 'dark' | 'system';
  setUser: (user: Profile | null) => void;
  setSession: (session: unknown | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
  isStaff: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      role: null,
      isLoading: true,
      isAuthenticated: false,
      companyId: null,
      theme: 'system',

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setRole: (role) => set({ role }),
      setLoading: (isLoading) => set({ isLoading }),
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      login: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Check if email is verified
            if (!data.user.email_confirmed_at) {
              return { 
                success: false, 
                error: 'Please verify your email before logging in. Check your inbox for a verification link.',
                needsEmailVerification: true
              };
            }

            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profile) {
              const role: UserRole = {
                role: profile.role,
                companyId: profile.company_id,
                permissions: getRolePermissions(profile.role),
              };

              set({
                user: profile as Profile,
                session: data.session,
                role,
                isAuthenticated: true,
                companyId: profile.company_id,
              });

              // Log login
              await supabase.from('login_logs').insert({
                user_id: data.user.id,
                company_id: profile.company_id,
                email,
                action: 'login',
                success: true,
              });
            }
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        const userId = get().user?.id;
        const companyId = get().companyId;

        if (userId) {
          await supabase.from('login_logs').insert({
            user_id: userId,
            company_id: companyId,
            action: 'logout',
            success: true,
          });
        }

        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          role: null,
          isAuthenticated: false,
          companyId: null,
        });
      },

      refreshUser: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            const role: UserRole = {
              role: profile.role,
              companyId: profile.company_id,
              permissions: getRolePermissions(profile.role),
            };

            set({
              user: profile as Profile,
              role,
              isAuthenticated: true,
              companyId: profile.company_id,
              isLoading: false,
            });
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      isSuperAdmin: () => get().role?.role === 'super_admin',
      isCompanyAdmin: () => ['company_admin', 'branch_manager', 'department_manager'].includes(get().role?.role || ''),
      isStaff: () => get().role?.role === 'staff',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        theme: state.theme,
        companyId: state.companyId,
      }),
    }
  )
);

function getRolePermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    super_admin: ['*'],
    company_admin: [
      'employees.read', 'employees.create', 'employees.update', 'employees.delete',
      'attendance.read', 'attendance.update', 'attendance.delete',
      'branches.read', 'branches.create', 'branches.update', 'branches.delete',
      'departments.read', 'departments.create', 'departments.update', 'departments.delete',
      'teams.read', 'teams.create', 'teams.update', 'teams.delete',
      'shifts.read', 'shifts.create', 'shifts.update', 'shifts.delete',
      'leaves.read', 'leaves.approve', 'leaves.reject',
      'reports.read', 'reports.create',
      'payroll.read', 'payroll.create', 'payroll.approve',
      'qr_codes.read', 'qr_codes.create', 'qr_codes.update', 'qr_codes.delete',
      'settings.read', 'settings.update',
      'holidays.read', 'holidays.create', 'holidays.update', 'holidays.delete',
    ],
    branch_manager: [
      'employees.read', 'attendance.read', 'attendance.update',
      'branches.read', 'departments.read', 'teams.read',
      'leaves.read', 'leaves.approve',
      'reports.read',
    ],
    department_manager: [
      'employees.read', 'attendance.read',
      'departments.read', 'teams.read',
      'leaves.read', 'leaves.approve',
    ],
    staff: [
      'attendance.read_own', 'attendance.clock_in', 'attendance.clock_out',
      'leaves.read_own', 'leaves.create_own',
      'profile.read_own', 'profile.update_own',
    ],
  };
  return permissions[role] || [];
}

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setSession(null);
    useAuthStore.getState().setRole(null);
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    useAuthStore.getState().setSession(session);
    (async () => {
      await useAuthStore.getState().refreshUser();
    })();
  }
});
