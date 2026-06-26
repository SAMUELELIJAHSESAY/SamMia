import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { user, session, role, isLoading, isAuthenticated, login, logout, refreshUser } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await refreshUser();
      setInitialized(true);
    };
    init();
  }, [refreshUser]);

  return {
    user,
    session,
    role,
    isLoading: isLoading || !initialized,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    isSuperAdmin: role?.role === 'super_admin',
    isCompanyAdmin: ['company_admin', 'branch_manager', 'department_manager'].includes(role?.role || ''),
    isStaff: role?.role === 'staff',
    companyId: user?.company_id,
  };
}

export function useRequireAuth(redirectPath = '/login') {
  const { isAuthenticated, isLoading } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        window.location.href = redirectPath;
      }
      setChecked(true);
    }
  }, [isAuthenticated, isLoading, redirectPath]);

  return { checked, isAuthenticated };
}

export function useRoleGuard(allowedRoles: string[]) {
  const { role, isLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading && role) {
      setAuthorized(allowedRoles.includes(role.role));
    }
  }, [role, isLoading, allowedRoles]);

  return { authorized, isLoading };
}
