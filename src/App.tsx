import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/auth/Login';
import { CompanySignup } from './pages/auth/CompanySignup';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { StaffDashboard } from './pages/staff/Dashboard';
import { CompanyAdminDashboard } from './pages/company-admin/Dashboard';
import { EmployeesPage } from './pages/company-admin/Employees';
import { QRCodesPage } from './pages/company-admin/QRCodes';
import { AttendancePage } from './pages/company-admin/Attendance';
import { BranchesPage } from './pages/company-admin/Branches';
import { SettingsPage } from './pages/company-admin/Settings';
import { LeavePage } from './pages/company-admin/Leave';
import { ReportsPage } from './pages/company-admin/Reports';
import { PayrollPage } from './pages/company-admin/Payroll';
import { LocationsPage } from './pages/company-admin/Locations';
import { EmployeeInvitesPage } from './pages/company-admin/EmployeeInvites';
import { SuperAdminDashboard } from './pages/super-admin/Dashboard';
import { CompaniesPage } from './pages/super-admin/Companies';
import { BillingPage } from './pages/super-admin/Billing';
import { AnalyticsPage } from './pages/super-admin/Analytics';
import { PlatformSettingsPage } from './pages/super-admin/Settings';
import { SupportTicketsPage } from './pages/super-admin/SupportTickets';
import { UserManagementPage } from './pages/super-admin/UserManagement';
import { EmailTemplatesPage } from './pages/super-admin/EmailTemplates';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { user, isLoading, refreshUser } = useAuthStore();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/signup" element={!user ? <CompanySignup /> : <Navigate to="/dashboard" replace />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/" element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}>
        {/* Staff & Company Admin Routes */}
        <Route path="dashboard" element={<RoleBasedDashboard />} />
        <Route path="employees" element={<RoleGuard allowedRoles={['company_admin', 'branch_manager', 'department_manager']}><EmployeesPage /></RoleGuard>} />
        <Route path="attendance" element={<RoleGuard allowedRoles={['company_admin', 'branch_manager', 'department_manager', 'staff']}><AttendancePage /></RoleGuard>} />
        <Route path="qr-codes" element={<RoleGuard allowedRoles={['company_admin']}><QRCodesPage /></RoleGuard>} />
        <Route path="branches" element={<RoleGuard allowedRoles={['company_admin']}><BranchesPage /></RoleGuard>} />
        <Route path="settings" element={<RoleGuard allowedRoles={['company_admin']}><SettingsPage /></RoleGuard>} />
        <Route path="leave" element={<RoleGuard allowedRoles={['company_admin', 'branch_manager', 'department_manager', 'staff']}><LeavePage /></RoleGuard>} />
        <Route path="reports" element={<RoleGuard allowedRoles={['company_admin', 'branch_manager']}><ReportsPage /></RoleGuard>} />
        <Route path="payroll" element={<RoleGuard allowedRoles={['company_admin']}><PayrollPage /></RoleGuard>} />
        <Route path="locations" element={<RoleGuard allowedRoles={['company_admin']}><LocationsPage /></RoleGuard>} />
        <Route path="employees/invite" element={<RoleGuard allowedRoles={['company_admin']}><EmployeeInvitesPage /></RoleGuard>} />

        {/* Super Admin Routes */}
        <Route path="super-admin" element={<RoleGuard allowedRoles={['super_admin']}><SuperAdminDashboard /></RoleGuard>} />
        <Route path="super-admin/companies" element={<RoleGuard allowedRoles={['super_admin']}><CompaniesPage /></RoleGuard>} />
        <Route path="super-admin/billing" element={<RoleGuard allowedRoles={['super_admin']}><BillingPage /></RoleGuard>} />
        <Route path="super-admin/analytics" element={<RoleGuard allowedRoles={['super_admin']}><AnalyticsPage /></RoleGuard>} />
        <Route path="super-admin/settings" element={<RoleGuard allowedRoles={['super_admin']}><PlatformSettingsPage /></RoleGuard>} />
        <Route path="super-admin/support" element={<RoleGuard allowedRoles={['super_admin']}><SupportTicketsPage /></RoleGuard>} />
        <Route path="super-admin/users" element={<RoleGuard allowedRoles={['super_admin']}><UserManagementPage /></RoleGuard>} />
        <Route path="super-admin/email-templates" element={<RoleGuard allowedRoles={['super_admin']}><EmailTemplatesPage /></RoleGuard>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function RoleBasedDashboard() {
  const { role } = useAuthStore();

  if (role?.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  if (['company_admin', 'branch_manager', 'department_manager'].includes(role?.role || '')) {
    return <CompanyAdminDashboard />;
  }

  return <StaffDashboard />;
}

function RoleGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { role } = useAuthStore();

  if (!allowedRoles.includes(role?.role || '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
