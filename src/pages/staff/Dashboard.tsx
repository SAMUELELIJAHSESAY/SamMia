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
import { Clock, Calendar, Timer, MapPin, User, Briefcase } from 'lucide-react';

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
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Employee'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {company?.name} • {user?.job_title || 'Staff'}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-lg font-medium text-blue-700 dark:text-blue-300">
          {getInitials(user?.full_name || '')}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Status"
          value={isClockedIn ? (isOnBreak ? 'On Break' : 'Working') : 'Not Clocked In'}
          icon={<Clock className="w-5 h-5" />}
          color={isClockedIn ? 'green' : 'blue'}
        />
        <StatsCard
          title="Today's Hours"
          value={todayAttendance?.net_working_minutes ? formatDuration(todayAttendance.net_working_minutes) : '0h 0m'}
          icon={<Timer className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="This Month"
          value="0h" // Would need monthly aggregation
          icon={<Calendar className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          title="Late Count"
          value="0"
          icon={<Briefcase className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Clock In/Out Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Clock In / Out</CardTitle>
            </CardHeader>
            <CardContent>
              <ClockButton
                currentAttendance={todayAttendance || null}
                currentBreak={activeBreak || null}
              />

              {todayAttendance?.clock_in_at && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Clocked in at</span>
                    <span className="font-medium">{formatTime(todayAttendance.clock_in_at)}</span>
                  </div>
                  {todayAttendance.clock_in_address && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs truncate">{todayAttendance.clock_in_address}</span>
                    </div>
                  )}
                </div>
              )}

              {activeBreak?.break_start_at && (
                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                    <Timer className="w-4 h-4" />
                    <span>Break started at {formatTime(activeBreak.break_start_at)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <AttendanceHistory />
        </div>
      </div>
    </div>
  );
}
