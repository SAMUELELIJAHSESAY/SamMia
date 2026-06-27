import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useTodayAttendance, useActiveBreak } from '../../hooks/useAttendance';
import { useCompany } from '../../hooks/useCompany';
import { ClockButton } from '../../components/attendance/ClockButton';
import { AttendanceHistory } from '../../components/attendance/AttendanceHistory';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatTime, formatDuration, getInitials } from '../../lib/utils';
import { Clock, Calendar, Timer, MapPin, Briefcase, Zap, CheckCircle2 } from 'lucide-react';

export function StaffDashboard() {
  const { user } = useAuthStore();
  const { setCurrentPageTitle } = useUIStore();
  const { data: todayAttendance } = useTodayAttendance();
  const { data: activeBreak } = useActiveBreak();
  const { data: company } = useCompany();

  useEffect(() => {
    setCurrentPageTitle('My Dashboard');
  }, [setCurrentPageTitle]);

  const isClockedIn = !!todayAttendance && !todayAttendance.clock_out_at;
  const isOnBreak = !!activeBreak && !activeBreak.break_end_at;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 lg:p-8 flex items-center justify-between relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 flex-1">
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Employee'}! 👋
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-primary-100 font-medium">
                {company?.name}
              </p>
              {user?.job_title && (
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white">
                  {user.job_title}
                </span>
              )}
            </div>
          </div>
          
          <div className="relative z-10 flex-shrink-0">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl lg:text-3xl font-bold text-white shadow-xl">
              {getInitials(user?.full_name || '')}
            </div>
          </div>
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-3">
        {isClockedIn && (
          <div className="flex items-center gap-2 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 px-4 py-2 rounded-full">
            <Zap className="w-4 h-4 text-success-600 dark:text-success-400" />
            <span className="text-sm font-medium text-success-700 dark:text-success-300">
              {isOnBreak ? '☕ On Break' : '⏱️ Currently Working'}
            </span>
          </div>
        )}
        {!isClockedIn && (
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Not Clocked In
            </span>
          </div>
        )}
        {user?.last_login_at && (
          <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-4 py-2 rounded-full">
            <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              Last login: Today
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <StatsCard
          title="Status"
          value={isClockedIn ? (isOnBreak ? 'On Break' : 'Working') : 'Offline'}
          icon={<Clock className="w-6 h-6" />}
          color={isClockedIn ? 'success' : 'primary'}
        />
        <StatsCard
          title="Today's Hours"
          value={todayAttendance?.net_working_minutes ? formatDuration(todayAttendance.net_working_minutes) : '0h 0m'}
          icon={<Timer className="w-6 h-6" />}
          color="primary"
        />
        <StatsCard
          title="This Month"
          value={todayAttendance ? '~20h' : '0h'}
          icon={<Calendar className="w-6 h-6" />}
          color="secondary"
        />
        <StatsCard
          title="Performance"
          value={isClockedIn ? '100%' : '—'}
          icon={<Briefcase className="w-6 h-6" />}
          color="accent"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Clock In/Out Card */}
        <div className="lg:col-span-1">
          <Card className="card-gradient h-full">
            <CardHeader className="border-b border-gray-100 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                Clock In / Out
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ClockButton
                currentAttendance={todayAttendance || null}
                currentBreak={activeBreak || null}
              />

              {todayAttendance?.clock_in_at && (
                <div className="mt-6 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Clocked in at</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">{formatTime(todayAttendance.clock_in_at)}</span>
                  </div>
                  {todayAttendance.clock_in_address && (
                    <div className="flex items-start gap-2 bg-primary-50 dark:bg-primary-900/10 p-3 rounded-lg">
                      <MapPin className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-primary-700 dark:text-primary-300">{todayAttendance.clock_in_address}</span>
                    </div>
                  )}
                </div>
              )}

              {activeBreak?.break_start_at && (
                <div className="mt-3 p-3 bg-gradient-to-r from-warning-100 to-warning-50 dark:from-warning-900/20 dark:to-warning-800/10 rounded-lg border border-warning-200 dark:border-warning-800/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-warning-600 dark:text-warning-400 flex-shrink-0" />
                    <span className="font-medium text-warning-700 dark:text-warning-300">
                      Break since {formatTime(activeBreak.break_start_at)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Attendance History */}
        <div className="lg:col-span-2">
          <AttendanceHistory />
        </div>
      </div>
    </div>
  );
}
