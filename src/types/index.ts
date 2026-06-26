export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  timezone: string;
  currency: string;
  language: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  plan_id: string;
  trial_ends_at: string | null;
  max_employees: number;
  max_branches: number;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  company_id: string;
  work_start_time: string;
  work_end_time: string;
  work_days: number[];
  grace_period_minutes: number;
  overtime_threshold_minutes: number;
  overtime_multiplier: number;
  break_duration_minutes: number;
  paid_break_minutes: number;
  geofencing_enabled: boolean;
  geofencing_radius_meters: number;
  gps_required: boolean;
  qr_rotation_seconds: number;
  qr_expiry_seconds: number;
  payroll_cycle: string;
  payroll_day: number;
  holiday_calendar_enabled: boolean;
  weekend_overtime_multiplier: number;
  night_shift_start: string;
  night_shift_end: string;
  night_shift_multiplier: number;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: 'super_admin' | 'company_admin' | 'branch_manager' | 'department_manager' | 'staff';
  employee_id: string | null;
  department_id: string | null;
  team_id: string | null;
  branch_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  employment_type: string;
  hire_date: string | null;
  hourly_rate: number;
  salary: number;
  timezone: string;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  timezone: string;
  manager_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  manager_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Team {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  lead_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Shift {
  id: string;
  company_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  grace_period_minutes: number;
  overtime_threshold_minutes: number;
  is_night_shift: boolean;
  days_of_week: number[];
  status: 'active' | 'inactive';
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  company_id: string;
  employee_id: string;
  branch_id: string | null;
  shift_id: string | null;
  date: string;
  clock_in_at: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_accuracy: number | null;
  clock_in_address: string | null;
  clock_in_device_id: string | null;
  clock_in_qr_code_id: string | null;
  clock_out_at: string | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_accuracy: number | null;
  clock_out_address: string | null;
  clock_out_device_id: string | null;
  clock_out_qr_code_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  total_working_minutes: number;
  total_break_minutes: number;
  net_working_minutes: number;
  overtime_minutes: number;
  late_minutes: number;
  early_departure_minutes: number;
  is_late: boolean;
  is_early_departure: boolean;
  is_missing_clock_out: boolean;
  is_overtime: boolean;
  attendance_status: string;
  source: string;
  sync_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BreakRecord {
  id: string;
  company_id: string;
  attendance_id: string;
  employee_id: string;
  break_start_at: string;
  break_end_at: string | null;
  break_type: string;
  duration_minutes: number | null;
  is_paid: boolean;
  created_at: string;
}

export interface QRCode {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  code: string;
  secret: string;
  type: 'permanent' | 'temporary' | 'one_time';
  expires_at: string | null;
  rotation_interval_seconds: number;
  last_rotated_at: string;
  current_token: string | null;
  max_uses: number | null;
  use_count: number;
  gps_required: boolean;
  geofence_required: boolean;
  allowed_latitude: number | null;
  allowed_longitude: number | null;
  allowed_radius_meters: number;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
}

export interface GeofenceZone {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export interface LeaveType {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  description: string | null;
  max_days_per_year: number;
  requires_approval: boolean;
  is_paid: boolean;
  color: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  company_id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  half_day: boolean;
  half_day_type: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface WorkSchedule {
  id: string;
  company_id: string;
  employee_id: string;
  date: string;
  shift_id: string | null;
  start_time: string | null;
  end_time: string | null;
  is_working_day: boolean;
  is_holiday: boolean;
  notes: string | null;
  created_at: string;
}

export interface PayrollPeriod {
  id: string;
  company_id: string;
  name: string;
  period_start: string;
  period_end: string;
  pay_date: string | null;
  status: 'draft' | 'processing' | 'approved' | 'paid' | 'closed';
  total_employees: number;
  total_hours: number;
  total_net_pay: number;
  created_at: string;
}

export interface PayrollEntry {
  id: string;
  company_id: string;
  payroll_period_id: string;
  employee_id: string;
  scheduled_days: number;
  worked_days: number;
  absent_days: number;
  late_days: number;
  total_working_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  regular_pay: number;
  overtime_pay: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  company_id: string | null;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AttendanceReport {
  id: string;
  company_id: string;
  name: string;
  report_type: string;
  date_from: string | null;
  date_to: string | null;
  format: string;
  file_url: string | null;
  status: string;
  created_at: string;
}

export interface Holiday {
  id: string;
  company_id: string;
  name: string;
  date: string;
  type: string;
  is_recurring: boolean;
  description: string | null;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  total_employees: number;
  total_branches: number;
  total_departments: number;
  today_attendance: number;
  today_clocked_in: number;
  pending_leaves: number;
  open_tickets: number;
}

export interface RealtimeAttendance {
  id: string;
  company_id: string;
  employee_id: string;
  branch_id: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  attendance_status: string;
  is_late: boolean;
  net_working_minutes: number;
  employee_name: string;
  avatar_url: string | null;
  job_title: string | null;
  branch_name: string | null;
  department_name: string | null;
}

export interface OfflineAction {
  id: string;
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  payload: Record<string, unknown>;
  localTimestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  error?: string;
}

export interface UserRole {
  role: 'super_admin' | 'company_admin' | 'branch_manager' | 'department_manager' | 'staff';
  companyId: string | null;
  permissions: string[];
}

export type Theme = 'light' | 'dark' | 'system';
