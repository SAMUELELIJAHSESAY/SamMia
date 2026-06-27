import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  QrCode,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  Shield,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Menu,
  X,
  Mail,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['super_admin', 'company_admin', 'branch_manager', 'department_manager', 'staff'] },
  { label: 'Employees', path: '/employees', icon: <Users className="w-5 h-5" />, roles: ['company_admin', 'branch_manager', 'department_manager'] },
  { label: 'Invite Employees', path: '/employees/invite', icon: <Users className="w-5 h-5" />, roles: ['company_admin'] },
  { label: 'Attendance', path: '/attendance', icon: <Calendar className="w-5 h-5" />, roles: ['company_admin', 'branch_manager', 'department_manager', 'staff'] },
  { label: 'QR Codes', path: '/qr-codes', icon: <QrCode className="w-5 h-5" />, roles: ['company_admin'] },
  { label: 'Locations', path: '/locations', icon: <MapPin className="w-5 h-5" />, roles: ['company_admin'] },
  { label: 'Leave', path: '/leave', icon: <Briefcase className="w-5 h-5" />, roles: ['company_admin', 'branch_manager', 'department_manager', 'staff'] },
  { label: 'Reports', path: '/reports', icon: <FileText className="w-5 h-5" />, roles: ['company_admin', 'branch_manager'] },
  { label: 'Payroll', path: '/payroll', icon: <DollarSign className="w-5 h-5" />, roles: ['company_admin'] },
  { label: 'Branches', path: '/branches', icon: <Building2 className="w-5 h-5" />, roles: ['company_admin'] },
  { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" />, roles: ['company_admin'] },
  // Super Admin Menu
  { label: 'Companies', path: '/super-admin/companies', icon: <Building2 className="w-5 h-5" />, roles: ['super_admin'] },
  { label: 'Users', path: '/super-admin/users', icon: <Users className="w-5 h-5" />, roles: ['super_admin'] },
  { label: 'Billing', path: '/super-admin/billing', icon: <DollarSign className="w-5 h-5" />, roles: ['super_admin'] },
  { label: 'Analytics', path: '/super-admin/analytics', icon: <FileText className="w-5 h-5" />, roles: ['super_admin'] },
  { label: 'Support', path: '/super-admin/support', icon: <Mail className="w-5 h-5" />, roles: ['super_admin'] },
  { label: 'Email Templates', path: '/super-admin/email-templates', icon: <Mail className="w-5 h-5" />, roles: ['super_admin'] },
  { label: 'Platform Settings', path: '/super-admin/settings', icon: <Settings className="w-5 h-5" />, roles: ['super_admin'] },
];

export function Sidebar() {
  const { user, role, logout } = useAuthStore();
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(role?.role || ''));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <Link to="/dashboard" className="flex items-center gap-2">
          {!collapsed && (
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              ClockIn
            </span>
          )}
          {collapsed && <QrCode className="w-6 h-6 text-blue-600" />}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {role?.role?.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={cn(
            'mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors',
            collapsed && 'justify-center w-full'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'w-64'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">ClockIn</span>
          <button onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 fixed left-0 top-0 z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function TopBar() {
  const { toggleMobileMenu, notificationCount } = useUIStore();
  const { user } = useAuthStore();
  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
          </div>
        </div>
      </div>
    </header>
  );
}
