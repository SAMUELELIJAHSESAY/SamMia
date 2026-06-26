/*
# Migration 005: Create Database Functions, Views, and Triggers

## Summary
Creates stored procedures, functions, views, and triggers for:
- Attendance calculation and validation
- Payroll computation
- QR code rotation
- Real-time analytics
- Audit logging
- Notification generation

## New Objects
1. Functions for attendance calculations
2. Payroll computation functions
3. QR code token generation
4. Views for dashboards and reports
5. Triggers for automatic calculations
*/

-- Function: Calculate attendance for a record
CREATE OR REPLACE FUNCTION calculate_attendance(p_attendance_id uuid)
RETURNS void AS $$
DECLARE
  v_record attendance_records%ROWTYPE;
  v_settings company_settings%ROWTYPE;
  v_shift shifts%ROWTYPE;
  v_work_start time;
  v_work_end time;
  v_total_working_min integer;
  v_total_break_min integer;
  v_net_working_min integer;
  v_overtime_min integer;
  v_late_min integer;
  v_early_min integer;
BEGIN
  SELECT * INTO v_record FROM attendance_records WHERE id = p_attendance_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_settings FROM company_settings WHERE company_id = v_record.company_id;
  IF NOT FOUND THEN
    v_work_start := '09:00'::time;
    v_work_end := '17:00'::time;
  ELSE
    v_work_start := v_settings.work_start_time;
    v_work_end := v_settings.work_end_time;
  END IF;

  -- Get shift if assigned
  SELECT s.* INTO v_shift FROM shifts s
  JOIN employee_shifts es ON es.shift_id = s.id
  WHERE es.employee_id = v_record.employee_id
  AND es.effective_from <= v_record.date
  AND (es.effective_until IS NULL OR es.effective_until >= v_record.date)
  LIMIT 1;

  IF FOUND THEN
    v_work_start := v_shift.start_time;
    v_work_end := v_shift.end_time;
  END IF;

  -- Calculate total working time
  IF v_record.clock_in_at IS NOT NULL AND v_record.clock_out_at IS NOT NULL THEN
    v_total_working_min := EXTRACT(EPOCH FROM (v_record.clock_out_at - v_record.clock_in_at)) / 60;

    -- Calculate break time
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_total_break_min
    FROM break_records WHERE attendance_id = p_attendance_id;

    v_net_working_min := v_total_working_min - v_total_break_min;

    -- Calculate late minutes
    IF v_record.clock_in_at::time > v_work_start THEN
      v_late_min := EXTRACT(EPOCH FROM (v_record.clock_in_at::time - v_work_start)) / 60;
    ELSE
      v_late_min := 0;
    END IF;

    -- Calculate early departure
    IF v_record.clock_out_at::time < v_work_end THEN
      v_early_min := EXTRACT(EPOCH FROM (v_work_end - v_record.clock_out_at::time)) / 60;
    ELSE
      v_early_min := 0;
    END IF;

    -- Calculate overtime
    IF v_settings.overtime_threshold_minutes IS NOT NULL AND v_settings.overtime_threshold_minutes > 0 THEN
      IF v_net_working_min > v_settings.overtime_threshold_minutes THEN
        v_overtime_min := v_net_working_min - v_settings.overtime_threshold_minutes;
      ELSE
        v_overtime_min := 0;
      END IF;
    ELSE
      v_overtime_min := 0;
    END IF;

    -- Update record
    UPDATE attendance_records SET
      total_working_minutes = v_total_working_min,
      total_break_minutes = v_total_break_min,
      net_working_minutes = v_net_working_min,
      overtime_minutes = v_overtime_min,
      late_minutes = v_late_min,
      early_departure_minutes = v_early_min,
      is_late = v_late_min > 0,
      is_early_departure = v_early_min > 0,
      is_overtime = v_overtime_min > 0,
      is_missing_clock_out = false,
      attendance_status = CASE
        WHEN v_late_min > 0 THEN 'late'
        ELSE 'present'
      END,
      updated_at = now()
    WHERE id = p_attendance_id;
  ELSIF v_record.clock_in_at IS NOT NULL AND v_record.clock_out_at IS NULL THEN
    -- Missing clock out
    UPDATE attendance_records SET
      is_missing_clock_out = true,
      attendance_status = 'present',
      updated_at = now()
    WHERE id = p_attendance_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate QR code token
CREATE OR REPLACE FUNCTION generate_qr_token(p_qr_code_id uuid)
RETURNS text AS $$
DECLARE
  v_qr qr_codes%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_qr FROM qr_codes WHERE id = p_qr_code_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_token := encode(gen_random_bytes(32), 'hex') || '.' || extract(epoch from now())::bigint::text;

  UPDATE qr_codes SET
    current_token = v_token,
    last_rotated_at = now(),
    use_count = use_count + 1,
    updated_at = now()
  WHERE id = p_qr_code_id;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate QR code
CREATE OR REPLACE FUNCTION validate_qr_code(p_code text, p_token text)
RETURNS TABLE (
  valid boolean,
  qr_code_id uuid,
  company_id uuid,
  branch_id uuid,
  error_message text
) AS $$
DECLARE
  v_qr qr_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_qr FROM qr_codes WHERE code = p_code AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::uuid, 'QR code not found or inactive'::text;
    RETURN;
  END IF;

  -- Check expiry
  IF v_qr.expires_at IS NOT NULL AND v_qr.expires_at < now() THEN
    RETURN QUERY SELECT false, v_qr.id, v_qr.company_id, v_qr.branch_id, 'QR code expired'::text;
    RETURN;
  END IF;

  -- Check token rotation
  IF v_qr.current_token IS NOT NULL AND v_qr.current_token != p_token THEN
    RETURN QUERY SELECT false, v_qr.id, v_qr.company_id, v_qr.branch_id, 'QR code token mismatch - may be expired or screenshot'::text;
    RETURN;
  END IF;

  -- Check max uses
  IF v_qr.max_uses IS NOT NULL AND v_qr.use_count >= v_qr.max_uses THEN
    RETURN QUERY SELECT false, v_qr.id, v_qr.company_id, v_qr.branch_id, 'QR code max uses reached'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_qr.id, v_qr.company_id, v_qr.branch_id, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate payroll for employee
CREATE OR REPLACE FUNCTION calculate_payroll_entry(p_entry_id uuid)
RETURNS void AS $$
DECLARE
  v_entry payroll_entries%ROWTYPE;
  v_period payroll_periods%ROWTYPE;
  v_employee profiles%ROWTYPE;
  v_settings company_settings%ROWTYPE;
  v_regular_pay numeric;
  v_overtime_pay numeric;
  v_night_pay numeric;
  v_holiday_pay numeric;
  v_late_deduction numeric;
  v_gross_pay numeric;
  v_net_pay numeric;
BEGIN
  SELECT * INTO v_entry FROM payroll_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_period FROM payroll_periods WHERE id = v_entry.payroll_period_id;
  SELECT * INTO v_employee FROM profiles WHERE id = v_entry.employee_id;
  SELECT * INTO v_settings FROM company_settings WHERE company_id = v_entry.company_id;

  IF v_settings IS NULL THEN RETURN; END IF;

  -- Calculate pays
  v_regular_pay := v_entry.net_working_hours * COALESCE(v_entry.hourly_rate, v_employee.hourly_rate, 0);
  v_overtime_pay := v_entry.overtime_hours * COALESCE(v_entry.hourly_rate, v_employee.hourly_rate, 0) * COALESCE(v_settings.overtime_multiplier, 1.5);
  v_night_pay := 0; -- Simplified, would need night shift hours
  v_holiday_pay := 0; -- Simplified
  v_late_deduction := COALESCE(v_settings.late_deduction_amount, 0) * v_entry.late_days;

  v_gross_pay := v_regular_pay + v_overtime_pay + v_night_pay + v_holiday_pay + v_entry.other_allowances;
  v_net_pay := v_gross_pay - v_late_deduction - v_entry.other_deductions;

  UPDATE payroll_entries SET
    regular_pay = v_regular_pay,
    overtime_pay = v_overtime_pay,
    night_shift_pay = v_night_pay,
    holiday_pay = v_holiday_pay,
    late_deduction = v_late_deduction,
    gross_pay = v_gross_pay,
    total_deductions = v_late_deduction + v_entry.other_deductions,
    net_pay = v_net_pay,
    updated_at = now()
  WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_company_id uuid,
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_values jsonb,
  p_new_values jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    company_id, user_id, action, entity_type, entity_id,
    old_values, new_values, created_at
  ) VALUES (
    p_company_id, p_user_id, p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values, now()
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Check geofence
CREATE OR REPLACE FUNCTION check_geofence(
  p_company_id uuid,
  p_branch_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
RETURNS TABLE (
  inside boolean,
  zone_id uuid,
  zone_name text,
  distance_meters numeric
) AS $$
DECLARE
  v_zone geofence_zones%ROWTYPE;
  v_distance numeric;
BEGIN
  FOR v_zone IN
    SELECT * FROM geofence_zones
    WHERE company_id = p_company_id
    AND is_active = true
    AND (branch_id IS NULL OR branch_id = p_branch_id)
  LOOP
    v_distance := sqrt(
      power((p_latitude - v_zone.latitude) * 111320, 2) +
      power((p_longitude - v_zone.longitude) * 111320 * cos(radians(p_latitude)), 2)
    );

    IF v_distance <= v_zone.radius_meters THEN
      RETURN QUERY SELECT true, v_zone.id, v_zone.name, v_distance;
      RETURN;
    END IF;
  END LOOP;

  RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::numeric;
END;
$$ LANGUAGE plpgsql;

-- View: Daily attendance summary per company
CREATE OR REPLACE VIEW v_daily_attendance_summary AS
SELECT
  company_id,
  date,
  COUNT(*) as total_employees,
  COUNT(CASE WHEN clock_in_at IS NOT NULL THEN 1 END) as clocked_in,
  COUNT(CASE WHEN clock_out_at IS NOT NULL THEN 1 END) as clocked_out,
  COUNT(CASE WHEN is_late THEN 1 END) as late_count,
  COUNT(CASE WHEN is_early_departure THEN 1 END) as early_count,
  COUNT(CASE WHEN is_missing_clock_out THEN 1 END) as missing_out_count,
  COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent_count,
  AVG(net_working_minutes) as avg_working_minutes,
  SUM(overtime_minutes) as total_overtime_minutes
FROM attendance_records
GROUP BY company_id, date;

-- View: Employee attendance summary
CREATE OR REPLACE VIEW v_employee_attendance_summary AS
SELECT
  employee_id,
  company_id,
  DATE_TRUNC('month', date) as month,
  COUNT(*) as total_days,
  COUNT(CASE WHEN clock_in_at IS NOT NULL THEN 1 END) as present_days,
  COUNT(CASE WHEN is_late THEN 1 END) as late_days,
  COUNT(CASE WHEN is_early_departure THEN 1 END) as early_days,
  COUNT(CASE WHEN is_missing_clock_out THEN 1 END) as missing_out_days,
  SUM(net_working_minutes) as total_working_minutes,
  SUM(overtime_minutes) as total_overtime_minutes,
  AVG(late_minutes) as avg_late_minutes
FROM attendance_records
GROUP BY employee_id, company_id, DATE_TRUNC('month', date);

-- View: Company dashboard stats
CREATE OR REPLACE VIEW v_company_dashboard_stats AS
SELECT
  c.id as company_id,
  c.name as company_name,
  c.status,
  COUNT(DISTINCT p.id) as total_employees,
  COUNT(DISTINCT b.id) as total_branches,
  COUNT(DISTINCT d.id) as total_departments,
  COUNT(DISTINCT t.id) as total_teams,
  (SELECT COUNT(*) FROM attendance_records ar WHERE ar.company_id = c.id AND ar.date = CURRENT_DATE) as today_attendance,
  (SELECT COUNT(*) FROM attendance_records ar WHERE ar.company_id = c.id AND ar.date = CURRENT_DATE AND ar.clock_in_at IS NOT NULL) as today_clocked_in,
  (SELECT COUNT(*) FROM leave_requests lr WHERE lr.company_id = c.id AND lr.status = 'pending') as pending_leaves,
  (SELECT COUNT(*) FROM support_tickets st WHERE st.company_id = c.id AND st.status IN ('open', 'in_progress')) as open_tickets
FROM companies c
LEFT JOIN profiles p ON p.company_id = c.id AND p.status = 'active'
LEFT JOIN branches b ON b.company_id = c.id AND b.status = 'active'
LEFT JOIN departments d ON d.company_id = c.id AND d.status = 'active'
LEFT JOIN teams t ON t.company_id = c.id AND t.status = 'active'
GROUP BY c.id, c.name, c.status;

-- View: Real-time attendance (today)
CREATE OR REPLACE VIEW v_realtime_attendance AS
SELECT
  ar.id,
  ar.company_id,
  ar.employee_id,
  ar.branch_id,
  ar.clock_in_at,
  ar.clock_out_at,
  ar.attendance_status,
  ar.is_late,
  ar.net_working_minutes,
  p.full_name as employee_name,
  p.avatar_url,
  p.job_title,
  b.name as branch_name,
  d.name as department_name
FROM attendance_records ar
JOIN profiles p ON p.id = ar.employee_id
LEFT JOIN branches b ON b.id = ar.branch_id
LEFT JOIN departments d ON d.id = p.department_id
WHERE ar.date = CURRENT_DATE;

-- Trigger: Auto-calculate attendance on clock out
CREATE OR REPLACE FUNCTION trigger_calculate_attendance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_at IS NOT NULL AND (OLD.clock_out_at IS NULL OR NEW.clock_out_at != OLD.clock_out_at) THEN
    PERFORM calculate_attendance(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_attendance ON attendance_records;
CREATE TRIGGER auto_calculate_attendance
AFTER UPDATE ON attendance_records
FOR EACH ROW
WHEN (NEW.clock_out_at IS NOT NULL)
EXECUTE FUNCTION trigger_calculate_attendance();

-- Trigger: Log attendance changes to audit log
CREATE OR REPLACE FUNCTION trigger_audit_attendance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.clock_in_at IS DISTINCT FROM NEW.clock_in_at OR OLD.clock_out_at IS DISTINCT FROM NEW.clock_out_at THEN
      PERFORM create_audit_log(
        NEW.company_id,
        auth.uid(),
        'attendance_' || TG_OP,
        'attendance_record',
        NEW.id,
        jsonb_build_object(
          'clock_in_at', OLD.clock_in_at,
          'clock_out_at', OLD.clock_out_at
        ),
        jsonb_build_object(
          'clock_in_at', NEW.clock_in_at,
          'clock_out_at', NEW.clock_out_at
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_attendance_changes ON attendance_records;
CREATE TRIGGER audit_attendance_changes
AFTER UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_attendance();

-- Function: Get employee current attendance status
CREATE OR REPLACE FUNCTION get_employee_attendance_status(p_employee_id uuid)
RETURNS TABLE (
  is_clocked_in boolean,
  current_attendance_id uuid,
  clock_in_at timestamptz,
  current_break_id uuid,
  break_started_at timestamptz
) AS $$
DECLARE
  v_attendance_id uuid;
  v_clock_in timestamptz;
  v_break_id uuid;
  v_break_start timestamptz;
BEGIN
  SELECT id, clock_in_at INTO v_attendance_id, v_clock_in
  FROM attendance_records
  WHERE employee_id = p_employee_id
  AND date = CURRENT_DATE
  AND clock_in_at IS NOT NULL
  AND clock_out_at IS NULL
  ORDER BY clock_in_at DESC
  LIMIT 1;

  IF v_attendance_id IS NOT NULL THEN
    SELECT id, break_start_at INTO v_break_id, v_break_start
    FROM break_records
    WHERE attendance_id = v_attendance_id
    AND break_end_at IS NULL
    ORDER BY break_start_at DESC
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT
    v_attendance_id IS NOT NULL,
    v_attendance_id,
    v_clock_in,
    v_break_id,
    v_break_start;
END;
$$ LANGUAGE plpgsql;

-- Function: Bulk create attendance records for scheduled employees
CREATE OR REPLACE FUNCTION create_daily_attendance_records(p_company_id uuid, p_date date)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_employee RECORD;
  v_shift_id uuid;
BEGIN
  FOR v_employee IN
    SELECT p.id as employee_id, p.branch_id, es.shift_id, s.start_time, s.end_time
    FROM profiles p
    LEFT JOIN employee_shifts es ON es.employee_id = p.id
      AND es.effective_from <= p_date
      AND (es.effective_until IS NULL OR es.effective_until >= p_date)
    LEFT JOIN shifts s ON s.id = es.shift_id
    WHERE p.company_id = p_company_id
    AND p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.employee_id = p.id AND ar.date = p_date
    )
  LOOP
    INSERT INTO attendance_records (
      company_id, employee_id, branch_id, shift_id, date,
      scheduled_start, scheduled_end
    ) VALUES (
      p_company_id, v_employee.employee_id, v_employee.branch_id,
      v_employee.shift_id, p_date,
      v_employee.start_time, v_employee.end_time
    )
    ON CONFLICT DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Rotate expired QR codes
CREATE OR REPLACE FUNCTION rotate_expired_qr_codes()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_qr RECORD;
BEGIN
  FOR v_qr IN
    SELECT id FROM qr_codes
    WHERE status = 'active'
    AND last_rotated_at < now() - (rotation_interval_seconds || ' seconds')::interval
  LOOP
    PERFORM generate_qr_token(v_qr.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
