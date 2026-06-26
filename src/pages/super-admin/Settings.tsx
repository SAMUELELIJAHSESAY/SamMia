import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { useState } from 'react';
import { formatDate } from '../../lib/utils';
import { Mail, Lock, Trash2 } from 'lucide-react';

export function PlatformSettingsPage() {
  const [emailSettingValue, setEmailSettingValue] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platformSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Configure system-wide settings</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="SMTP Host"
              placeholder="smtp.gmail.com"
              defaultValue="smtp.gmail.com"
            />
            <Input
              label="SMTP Port"
              type="number"
              placeholder="587"
              defaultValue="587"
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="noreply@example.com"
            />
            <Input
              label="Email Password"
              type="password"
              placeholder="••••••••"
            />
            <Button className="w-full">Save Email Settings</Button>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Keys
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <code className="text-xs text-gray-600 dark:text-gray-400 flex-1">sk_live_abc123xyz</code>
                  <Button variant="ghost" size="sm" leftIcon={<Trash2 className="w-4 h-4" />}>
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
            <Button className="w-full">Generate New API Key</Button>
          </CardContent>
        </Card>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="App Name"
              placeholder="ClockIn"
              defaultValue="ClockIn"
            />
            <Input
              label="Support Email"
              type="email"
              placeholder="support@clockin.com"
            />
            <Input
              label="Trial Period (Days)"
              type="number"
              placeholder="14"
              defaultValue="14"
            />
            <Input
              label="Max Upload Size (MB)"
              type="number"
              placeholder="10"
              defaultValue="10"
            />
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
