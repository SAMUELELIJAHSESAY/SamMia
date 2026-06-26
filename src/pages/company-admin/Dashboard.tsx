import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useCompany, useEmployees, useBranches } from '../../hooks/useCompany';
import { useCompanyAttendance } from '../../hooks/useAttendance';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatTime, getInitials } from '../../lib/utils';
import {
  Users, Building2, Clock, Calendar, ArrowRight, UserCheck, UserX
} from 'lucide-react';

export function CompanyAdminDashboard() {
  const navigate = useNavigate();
  const { setCurrentPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const { data: company } = useCompany();
  const { data: employees } = useEmployees();
  const { data: branches } = useBranches();
  const { data: todayAttendance } = useCompanyAttendance();

  useEffect(() => {
    setCurrentPageTitle('Dashboard');
  }, [setCurrentPageTitle]);

  const totalEmployees = employees?.length || 0;
  const totalBranches = branches?.length || 0;
  const clockedInToday = todayAttendance?.filter((a: any) => a.clock_in_at && !a.clock_out_at).length || 0;
  const lateToday = todayAttendance?.filter((a: any) => a.is_late).length || 0;

  const recentActivity = todayAttendance?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {company?.name || 'Company Dashboard'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={() => navigate('/reports')}
        >
          View Reports
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees"
          value={totalEmployees}
          subtitle={`Across ${totalBranches} branches`}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Clocked In Today"
          value={clockedInToday}
          subtitle={`of ${totalEmployees} employees`}
          icon={<UserCheck className="w-5 h-5" />}
          color="green"
          trend={{ value: Math.round((clockedInToday / Math.max(totalEmployees, 1)) * 100), isPositive: true }}
        />
        <StatsCard
          title="Late Arrivals"
          value={lateToday}
          subtitle="Today"
          icon={<UserX className="w-5 h-5" />}
          color="red"
        />
        <StatsCard
          title="Pending Leaves"
          value="0"
          subtitle="Requires approval"
          icon={<Calendar className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Attendance */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live Attendance</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-sm text-gray-500">Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No attendance activity today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((record: any) => (
                    <div
                      key={record.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300">
                        {getInitials(record.employee?.full_name || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {record.employee?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {record.employee?.job_title || 'Staff'} • {record.branch?.name || 'Main Office'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={record.clock_out_at ? 'neutral' : 'success'}>
                          {record.clock_out_at ? 'Out' : 'In'}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(record.clock_in_at || record.clock_out_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<Users className="w-4 h-4" />}
                onClick={() => navigate('/employees')}
              >
                Manage Employees
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/qr-codes')}
              >
                Manage QR Codes
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<Building2 className="w-4 h-4" />}
                onClick={() => navigate('/branches')}
              >
                Manage Branches
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                leftIcon={<Calendar className="w-4 h-4" />}
                onClick={() => navigate('/leave')}
              >
                Approve Leave
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branch Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {branches?.slice(0, 3).map((branch) => (
                  <div key={branch.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{branch.name}</p>
                      {branch.city && (
                        <p className="text-xs text-gray-500">{branch.city}</p>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-gray-400">No branches yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
