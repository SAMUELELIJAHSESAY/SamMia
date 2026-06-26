/*
# Migration 004: Create Leave, Schedules, Reports, and Payroll

## Summary
Creates leave management, work schedules, reporting, and payroll calculation
systems. Includes holiday calendars, leave requests, schedule templates,
attendance reports, and payroll summaries.

## New Tables
1. `holidays` - Company holiday calendar
2. `leave_types` - Configurable leave categories
3. `leave_requests` - Employee leave applications
4. `leave_balances` - Accrued leave tracking
5. `work_schedules` - Employee schedule assignments
6. `schedule_templates` - Reusable schedule patterns
7. `attendance_reports` - Generated report metadata
8. `payroll_periods` - Payroll calculation periods
9. `payroll_entries` - Individual payroll records
10. `notifications` - In-app notification system
11. `support_tickets` - Customer support system

## Security
- RLS on all tables
- Company-scoped access
- Staff can only see own leave/payroll
- Admins can manage all company data
*/

-- Holidays
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  date date NOT NULL,
  type text DEFAULT 'public' CHECK (type IN ('public', 'company', 'religious', 'optional')),
  is_recurring boolean DEFAULT false,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Leave types
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  max_days_per_year integer DEFAULT 0,
  max_days_per_request integer DEFAULT 0,
  requires_approval boolean DEFAULT true,
  is_paid boolean DEFAULT true,
  carry_forward_enabled boolean DEFAULT false,
  carry_forward_max_days integer DEFAULT 0,
  color text DEFAULT '#3b82f6',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric NOT NULL,
  half_day boolean DEFAULT false,
  half_day_type text CHECK (half_day_type IN ('morning', 'afternoon')),
  reason text,
  attachment_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  allocated_days numeric DEFAULT 0,
  used_days numeric DEFAULT 0,
  pending_days numeric DEFAULT 0,
  remaining_days numeric GENERATED ALWAYS AS (allocated_days - used_days - pending_days) STORED,
  carry_forward_days numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Work schedules
CREATE TABLE IF NOT EXISTS work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  start_time time,
  end_time time,
  break_duration_minutes integer DEFAULT 60,
  is_working_day boolean DEFAULT true,
  is_holiday boolean DEFAULT false,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Schedule templates
CREATE TABLE IF NOT EXISTS schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  pattern jsonb NOT NULL DEFAULT '[]',
  applicable_days integer[] DEFAULT ARRAY[1,2,3,4,5],
  is_default boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Attendance reports
CREATE TABLE IF NOT EXISTS attendance_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom', 'employee', 'department', 'branch', 'overtime', 'late', 'absence', 'summary')),
  date_from date,
  date_to date,
  employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  filters jsonb,
  format text DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv', 'html')),
  file_url text,
  file_size integer,
  generated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at timestamptz,
  scheduled boolean DEFAULT false,
  schedule_frequency text CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', 'none')),
  last_sent_at timestamptz,
  recipients text[],
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'scheduled')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll periods
CREATE TABLE IF NOT EXISTS payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'approved', 'paid', 'closed')),
  total_employees integer DEFAULT 0,
  total_hours numeric DEFAULT 0,
  total_overtime_hours numeric DEFAULT 0,
  total_regular_pay numeric DEFAULT 0,
  total_overtime_pay numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  total_net_pay numeric DEFAULT 0,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll entries
CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Working hours
  scheduled_days integer DEFAULT 0,
  worked_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  late_days integer DEFAULT 0,
  total_working_hours numeric DEFAULT 0,
  total_break_hours numeric DEFAULT 0,
  net_working_hours numeric DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  late_hours numeric DEFAULT 0,
  -- Pay calculation
  hourly_rate numeric DEFAULT 0,
  regular_pay numeric DEFAULT 0,
  overtime_pay numeric DEFAULT 0,
  night_shift_pay numeric DEFAULT 0,
  holiday_pay numeric DEFAULT 0,
  late_deduction numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  other_allowances numeric DEFAULT 0,
  gross_pay numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  net_pay numeric DEFAULT 0,
  -- Metadata
  attendance_summary jsonb,
  notes text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'disputed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(payroll_period_id, employee_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'attendance', 'leave', 'payroll', 'system')),
  category text DEFAULT 'general',
  action_url text,
  action_text text,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  sent_via text[] DEFAULT ARRAY['in_app'],
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request', 'bug', 'account')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Support ticket replies
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_staff boolean DEFAULT false,
  message text NOT NULL,
  attachment_url text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_holidays_company ON holidays(company_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_leave_types_company ON leave_types(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_type ON leave_balances(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_employee ON work_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_date ON work_schedules(date);
CREATE INDEX IF NOT EXISTS idx_attendance_reports_company ON attendance_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_reports_status ON attendance_reports(status);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_company ON payroll_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period ON payroll_entries(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee ON payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Holidays policies
DROP POLICY IF EXISTS "holidays_select_company" ON holidays;
CREATE POLICY "holidays_select_company" ON holidays FOR SELECT
TO authenticated USING (
  is_super_admin() OR company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "holidays_insert_company_admin" ON holidays;
CREATE POLICY "holidays_insert_company_admin" ON holidays FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "holidays_update_company_admin" ON holidays;
CREATE POLICY "holidays_update_company_admin" ON holidays FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Leave types policies
DROP POLICY IF EXISTS "leave_types_select_company" ON leave_types;
CREATE POLICY "leave_types_select_company" ON leave_types FOR SELECT
TO authenticated USING (
  is_super_admin() OR company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "leave_types_insert_company_admin" ON leave_types;
CREATE POLICY "leave_types_insert_company_admin" ON leave_types FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "leave_types_update_company_admin" ON leave_types;
CREATE POLICY "leave_types_update_company_admin" ON leave_types FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Leave requests policies
DROP POLICY IF EXISTS "leave_requests_select_own" ON leave_requests;
CREATE POLICY "leave_requests_select_own" ON leave_requests FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "leave_requests_select_company_admin" ON leave_requests;
CREATE POLICY "leave_requests_select_company_admin" ON leave_requests FOR SELECT
TO authenticated USING (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "leave_requests_select_manager" ON leave_requests;
CREATE POLICY "leave_requests_select_manager" ON leave_requests FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employee_managers
    WHERE manager_id = auth.uid() AND employee_id = leave_requests.employee_id
  )
);

DROP POLICY IF EXISTS "leave_requests_insert_own" ON leave_requests;
CREATE POLICY "leave_requests_insert_own" ON leave_requests FOR INSERT
TO authenticated WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "leave_requests_update_own" ON leave_requests;
CREATE POLICY "leave_requests_update_own" ON leave_requests FOR UPDATE
TO authenticated USING (employee_id = auth.uid()) WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "leave_requests_update_company_admin" ON leave_requests;
CREATE POLICY "leave_requests_update_company_admin" ON leave_requests FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Leave balances policies
DROP POLICY IF EXISTS "leave_balances_select_own" ON leave_balances;
CREATE POLICY "leave_balances_select_own" ON leave_balances FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "leave_balances_select_company_admin" ON leave_balances;
CREATE POLICY "leave_balances_select_company_admin" ON leave_balances FOR SELECT
TO authenticated USING (is_company_admin(company_id));

DROP POLICY IF EXISTS "leave_balances_insert_company_admin" ON leave_balances;
CREATE POLICY "leave_balances_insert_company_admin" ON leave_balances FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

-- Work schedules policies
DROP POLICY IF EXISTS "work_schedules_select_own" ON work_schedules;
CREATE POLICY "work_schedules_select_own" ON work_schedules FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "work_schedules_select_company_admin" ON work_schedules;
CREATE POLICY "work_schedules_select_company_admin" ON work_schedules FOR SELECT
TO authenticated USING (is_company_admin(company_id));

DROP POLICY IF EXISTS "work_schedules_insert_company_admin" ON work_schedules;
CREATE POLICY "work_schedules_insert_company_admin" ON work_schedules FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "work_schedules_update_company_admin" ON work_schedules;
CREATE POLICY "work_schedules_update_company_admin" ON work_schedules FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Schedule templates policies
DROP POLICY IF EXISTS "schedule_templates_select_company" ON schedule_templates;
CREATE POLICY "schedule_templates_select_company" ON schedule_templates FOR SELECT
TO authenticated USING (company_id = get_current_company_id());

DROP POLICY IF EXISTS "schedule_templates_insert_company_admin" ON schedule_templates;
CREATE POLICY "schedule_templates_insert_company_admin" ON schedule_templates FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

-- Attendance reports policies
DROP POLICY IF EXISTS "attendance_reports_select_company_admin" ON attendance_reports;
CREATE POLICY "attendance_reports_select_company_admin" ON attendance_reports FOR SELECT
TO authenticated USING (is_company_admin(company_id));

DROP POLICY IF EXISTS "attendance_reports_insert_company_admin" ON attendance_reports;
CREATE POLICY "attendance_reports_insert_company_admin" ON attendance_reports FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

-- Payroll periods policies
DROP POLICY IF EXISTS "payroll_periods_select_company_admin" ON payroll_periods;
CREATE POLICY "payroll_periods_select_company_admin" ON payroll_periods FOR SELECT
TO authenticated USING (is_company_admin(company_id));

DROP POLICY IF EXISTS "payroll_periods_insert_company_admin" ON payroll_periods;
CREATE POLICY "payroll_periods_insert_company_admin" ON payroll_periods FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

-- Payroll entries policies
DROP POLICY IF EXISTS "payroll_entries_select_own" ON payroll_entries;
CREATE POLICY "payroll_entries_select_own" ON payroll_entries FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "payroll_entries_select_company_admin" ON payroll_entries;
CREATE POLICY "payroll_entries_select_company_admin" ON payroll_entries FOR SELECT
TO authenticated USING (is_company_admin(company_id));

-- Notifications policies
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Support tickets policies
DROP POLICY IF EXISTS "support_tickets_select_own" ON support_tickets;
CREATE POLICY "support_tickets_select_own" ON support_tickets FOR SELECT
TO authenticated USING (
  user_id = auth.uid() OR is_super_admin()
);

DROP POLICY IF EXISTS "support_tickets_select_super_admin" ON support_tickets;
CREATE POLICY "support_tickets_select_super_admin" ON support_tickets FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "support_tickets_insert" ON support_tickets;
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "support_tickets_update_super_admin" ON support_tickets;
CREATE POLICY "support_tickets_update_super_admin" ON support_tickets FOR UPDATE
TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Support ticket replies policies
DROP POLICY IF EXISTS "ticket_replies_select" ON support_ticket_replies;
CREATE POLICY "ticket_replies_select" ON support_ticket_replies FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_ticket_replies.ticket_id
    AND (t.user_id = auth.uid() OR is_super_admin())
  )
);

DROP POLICY IF EXISTS "ticket_replies_insert" ON support_ticket_replies;
CREATE POLICY "ticket_replies_insert" ON support_ticket_replies FOR INSERT
TO authenticated WITH CHECK (true);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_leave_types_updated_at ON leave_types;
CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_schedules_updated_at ON work_schedules;
CREATE TRIGGER update_work_schedules_updated_at BEFORE UPDATE ON work_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_templates_updated_at ON schedule_templates;
CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_reports_updated_at ON attendance_reports;
CREATE TRIGGER update_attendance_reports_updated_at BEFORE UPDATE ON attendance_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_periods_updated_at ON payroll_periods;
CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON payroll_periods
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_entries_updated_at ON payroll_entries;
CREATE TRIGGER update_payroll_entries_updated_at BEFORE UPDATE ON payroll_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
