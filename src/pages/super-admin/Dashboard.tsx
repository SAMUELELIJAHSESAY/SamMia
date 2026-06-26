import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import {
  Building2, Users, DollarSign, TrendingUp, Shield,
  Activity, Globe, Server
} from 'lucide-react';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { setCurrentPageTitle } = useUIStore();
  const { user } = useAuthStore();

  useEffect(() => {
    setCurrentPageTitle('Super Admin Dashboard');
  }, [setCurrentPageTitle]);

  // Fetch all companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['allCompanies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['platformAnalytics'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('platform_analytics')
        .select('*')
        .eq('date', today)
        .single();
      if (error) return null;
      return data;
    },
  });

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c: any) => c.status === 'active').length;
  const trialCompanies = companies.filter((c: any) => c.status === 'trial').length;
  const totalEmployees = analytics?.total_employees || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome, {user?.full_name || 'Super Admin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            System Online
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Companies"
          value={totalCompanies}
          icon={<Building2 className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Active Companies"
          value={activeCompanies}
          icon={<Shield className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Total Employees"
          value={totalEmployees}
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          title="Trial Companies"
          value={trialCompanies}
          icon={<TrendingUp className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Companies</CardTitle>
            <Button size="sm" leftIcon={<Building2 className="w-4 h-4" />} onClick={() => navigate('/super-admin/company-management')}>
              Manage Companies
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Employees</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {companies.length > 0 ? companies.map((company: any) => (
                    <tr key={company.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{company.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">{company.plan_id}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            company.status === 'active' ? 'success' :
                            company.status === 'trial' ? 'warning' :
                            company.status === 'suspended' ? 'error' : 'neutral'
                          }
                          size="sm"
                        >
                          {company.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{company.max_employees}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(company.created_at)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/super-admin/companies/${company.id}`)}>View</Button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-center text-gray-500">
                        No companies found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Database</span>
                <Badge variant="success" size="sm">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Edge Functions</span>
                <Badge variant="success" size="sm">Running</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Auth Service</span>
                <Badge variant="success" size="sm">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Storage</span>
                <Badge variant="success" size="sm">OK</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">This Month</span>
                <span className="font-medium">$12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Last Month</span>
                <span className="font-medium">$11,200</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">YTD</span>
                <span className="font-medium">$78,300</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>+11.2% vs last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Platform Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Signups</span>
                <span className="font-medium">156</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Active Users</span>
                <span className="font-medium">2,340</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Attendance Records</span>
                <span className="font-medium">1.2M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Avg. Session</span>
                <span className="font-medium">8m 32s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
