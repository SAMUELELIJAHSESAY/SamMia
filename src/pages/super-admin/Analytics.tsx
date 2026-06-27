import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Activity, TrendingUp, Clock } from 'lucide-react';

export function AnalyticsPage() {
  // Fetch analytics for last 30 days
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['platformAnalyticsHistory'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('platform_analytics')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const latestAnalytics = analytics[analytics.length - 1] || {};

  const summaryStats = [
    {
      title: 'Total Companies',
      value: latestAnalytics.total_companies || 0,
      icon: <Activity className="w-5 h-5" />,
      color: 'primary',
    },
    {
      title: 'Active Companies',
      value: latestAnalytics.active_companies || 0,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'success',
    },
    {
      title: 'Total Employees',
      value: latestAnalytics.total_employees || 0,
      icon: <Users className="w-5 h-5" />,
      color: 'secondary',
    },
    {
      title: 'Attendance Records',
      value: latestAnalytics.total_attendance_records || 0,
      icon: <Clock className="w-5 h-5" />,
      color: 'warning',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time metrics and insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat, idx) => (
          <StatsCard key={idx} {...stat} />
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Companies Growth (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total_companies" stroke="#3b82f6" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="active_companies" stroke="#10b981" strokeWidth={2} name="Active" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_clock_ins" fill="#3b82f6" name="Clock Ins" />
                  <Bar dataKey="total_clock_outs" fill="#10b981" name="Clock Outs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
