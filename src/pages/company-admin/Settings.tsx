import { useState } from 'react';
import { useCompanySettings, useUpdateCompanySettings } from '../../hooks/useCompany';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useUIStore } from '../../stores/uiStore';
import { Clock, MapPin, DollarSign, Bell, Palette } from 'lucide-react';

export function SettingsPage() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const showToast = useUIStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<'attendance' | 'gps' | 'payroll' | 'notifications'>('attendance');
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      showToast('Settings saved successfully', 'success');
      setFormData({});
    } catch (error: any) {
      showToast(error.message || 'Failed to save settings', 'error');
    }
  };

  const hasChanges = Object.keys(formData).length > 0;

  const tabs = [
    { id: 'attendance' as const, label: 'Attendance', icon: <Clock className="w-4 h-4" /> },
    { id: 'gps' as const, label: 'GPS & QR', icon: <MapPin className="w-4 h-4" /> },
    { id: 'payroll' as const, label: 'Payroll', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'notifications' as const, label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Settings</h1>
        {hasChanges && (
          <Button onClick={handleSave} isLoading={updateSettings.isPending}>
            Save Changes
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Working Hours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    defaultValue={settings?.work_start_time || '09:00'}
                    onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                  <input
                    type="time"
                    defaultValue={settings?.work_end_time || '17:00'}
                    onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <Input
                label="Grace Period (minutes)"
                type="number"
                defaultValue={settings?.grace_period_minutes || 15}
                onChange={(e) => setFormData({ ...formData, grace_period_minutes: Number(e.target.value) })}
              />
              <Input
                label="Break Duration (minutes)"
                type="number"
                defaultValue={settings?.break_duration_minutes || 60}
                onChange={(e) => setFormData({ ...formData, break_duration_minutes: Number(e.target.value) })}
              />
              <Input
                label="Paid Break (minutes)"
                type="number"
                defaultValue={settings?.paid_break_minutes || 0}
                onChange={(e) => setFormData({ ...formData, paid_break_minutes: Number(e.target.value) })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Overtime Rules</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Overtime Threshold (minutes)"
                type="number"
                defaultValue={settings?.overtime_threshold_minutes || 0}
                onChange={(e) => setFormData({ ...formData, overtime_threshold_minutes: Number(e.target.value) })}
              />
              <Input
                label="Overtime Multiplier"
                type="number"
                step="0.1"
                defaultValue={settings?.overtime_multiplier || 1.5}
                onChange={(e) => setFormData({ ...formData, overtime_multiplier: Number(e.target.value) })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={settings?.late_deduction_enabled || false}
                  onChange={(e) => setFormData({ ...formData, late_deduction_enabled: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable late deduction</span>
              </div>
              {settings?.late_deduction_enabled && (
                <Input
                  label="Late Deduction Amount"
                  type="number"
                  defaultValue={settings?.late_deduction_amount || 0}
                  onChange={(e) => setFormData({ ...formData, late_deduction_amount: Number(e.target.value) })}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'gps' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>GPS Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={settings?.gps_required || false}
                  onChange={(e) => setFormData({ ...formData, gps_required: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Require GPS for clock in/out</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={settings?.geofencing_enabled || false}
                  onChange={(e) => setFormData({ ...formData, geofencing_enabled: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable geofencing</span>
              </div>
              <Input
                label="Default Geofence Radius (meters)"
                type="number"
                defaultValue={settings?.geofencing_radius_meters || 100}
                onChange={(e) => setFormData({ ...formData, geofencing_radius_meters: Number(e.target.value) })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>QR Code Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="QR Rotation Interval (seconds)"
                type="number"
                defaultValue={settings?.qr_rotation_seconds || 45}
                onChange={(e) => setFormData({ ...formData, qr_rotation_seconds: Number(e.target.value) })}
              />
              <Input
                label="QR Expiry (seconds)"
                type="number"
                defaultValue={settings?.qr_expiry_seconds || 60}
                onChange={(e) => setFormData({ ...formData, qr_expiry_seconds: Number(e.target.value) })}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Payroll Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payroll Cycle</label>
                <select
                  defaultValue={settings?.payroll_cycle || 'monthly'}
                  onChange={(e) => setFormData({ ...formData, payroll_cycle: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <Input
                label="Payroll Day"
                type="number"
                min={1}
                max={31}
                defaultValue={settings?.payroll_day || 1}
                onChange={(e) => setFormData({ ...formData, payroll_day: Number(e.target.value) })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Holiday & Weekend</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked={settings?.holiday_calendar_enabled || true}
                  onChange={(e) => setFormData({ ...formData, holiday_calendar_enabled: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable holiday calendar</span>
              </div>
              <Input
                label="Weekend Overtime Multiplier"
                type="number"
                step="0.1"
                defaultValue={settings?.weekend_overtime_multiplier || 2.0}
                onChange={(e) => setFormData({ ...formData, weekend_overtime_multiplier: Number(e.target.value) })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Night Shift Start</label>
                  <input
                    type="time"
                    defaultValue={settings?.night_shift_start || '22:00'}
                    onChange={(e) => setFormData({ ...formData, night_shift_start: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Night Shift End</label>
                  <input
                    type="time"
                    defaultValue={settings?.night_shift_end || '06:00'}
                    onChange={(e) => setFormData({ ...formData, night_shift_end: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <Input
                label="Night Shift Multiplier"
                type="number"
                step="0.1"
                defaultValue={settings?.night_shift_multiplier || 1.25}
                onChange={(e) => setFormData({ ...formData, night_shift_multiplier: Number(e.target.value) })}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={settings?.email_notifications_enabled || true}
                onChange={(e) => setFormData({ ...formData, email_notifications_enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Email notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={settings?.push_notifications_enabled || true}
                onChange={(e) => setFormData({ ...formData, push_notifications_enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Push notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={settings?.sms_notifications_enabled || false}
                onChange={(e) => setFormData({ ...formData, sms_notifications_enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">SMS notifications</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
