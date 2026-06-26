/*
# Migration 003: Create Attendance, QR Codes, and GPS System

## Summary
Creates the core attendance tracking system with QR code validation,
GPS verification, geofencing, and offline sync support.
This is the heart of the Clock In SaaS platform.

## New Tables
1. `attendance_records` - Core clock in/out records
2. `break_records` - Break start/end tracking
3. `qr_codes` - Dynamic QR codes for branches
4. `qr_code_logs` - QR code scan history and analytics
5. `gps_locations` - GPS coordinates for attendance
6. `geofence_zones` - Allowed location zones
7. `attendance_adjustments` - Manual corrections by admins
8. `attendance_notes` - Notes on attendance records
9. `offline_sync_queue` - Pending offline operations

## Security
- All tables RLS enabled with company-scoped policies
- Staff can only see their own attendance
- Admins can see all company attendance
- QR codes are validated server-side
*/

-- Attendance records (core table, optimized for millions of records)
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  -- Clock in
  clock_in_at timestamptz,
  clock_in_latitude numeric,
  clock_in_longitude numeric,
  clock_in_accuracy numeric,
  clock_in_address text,
  clock_in_device_id text,
  clock_in_qr_code_id uuid,
  clock_in_qr_scanned_at timestamptz,
  clock_in_method text DEFAULT 'qr' CHECK (clock_in_method IN ('qr', 'manual', 'auto', 'api')),
  clock_in_verified boolean DEFAULT false,
  clock_in_verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Clock out
  clock_out_at timestamptz,
  clock_out_latitude numeric,
  clock_out_longitude numeric,
  clock_out_accuracy numeric,
  clock_out_address text,
  clock_out_device_id text,
  clock_out_qr_code_id uuid,
  clock_out_qr_scanned_at timestamptz,
  clock_out_method text DEFAULT 'qr' CHECK (clock_out_method IN ('qr', 'manual', 'auto', 'api')),
  clock_out_verified boolean DEFAULT false,
  clock_out_verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Calculated fields
  scheduled_start time,
  scheduled_end time,
  total_working_minutes integer DEFAULT 0,
  total_break_minutes integer DEFAULT 0,
  net_working_minutes integer DEFAULT 0,
  overtime_minutes integer DEFAULT 0,
  late_minutes integer DEFAULT 0,
  early_departure_minutes integer DEFAULT 0,
  is_late boolean DEFAULT false,
  is_early_departure boolean DEFAULT false,
  is_missing_clock_out boolean DEFAULT false,
  is_overtime boolean DEFAULT false,
  is_night_shift boolean DEFAULT false,
  attendance_status text DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'late', 'early_departure', 'on_leave', 'holiday', 'weekend')),
  -- Metadata
  source text DEFAULT 'online' CHECK (source IN ('online', 'offline', 'api', 'import')),
  sync_status text DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  conflict_data jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Break records
CREATE TABLE IF NOT EXISTS break_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  break_start_at timestamptz NOT NULL,
  break_end_at timestamptz,
  break_type text DEFAULT 'lunch' CHECK (break_type IN ('lunch', 'short', 'rest', 'prayer', 'other')),
  duration_minutes integer,
  is_paid boolean DEFAULT false,
  latitude numeric,
  longitude numeric,
  device_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- QR Codes (dynamic, rotating)
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  secret text NOT NULL,
  type text DEFAULT 'permanent' CHECK (type IN ('permanent', 'temporary', 'one_time')),
  expires_at timestamptz,
  rotation_interval_seconds integer DEFAULT 45,
  last_rotated_at timestamptz DEFAULT now(),
  current_token text,
  max_uses integer,
  use_count integer DEFAULT 0,
  gps_required boolean DEFAULT true,
  geofence_required boolean DEFAULT false,
  allowed_latitude numeric,
  allowed_longitude numeric,
  allowed_radius_meters integer DEFAULT 100,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- QR Code logs
CREATE TABLE IF NOT EXISTS qr_code_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  qr_code_id uuid NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('scan', 'validate', 'reject', 'expire')),
  scanned_token text,
  validated_token text,
  latitude numeric,
  longitude numeric,
  accuracy numeric,
  device_id text,
  ip_address text,
  success boolean DEFAULT true,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- GPS locations
CREATE TABLE IF NOT EXISTS gps_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_id uuid REFERENCES attendance_records(id) ON DELETE SET NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy numeric,
  altitude numeric,
  speed numeric,
  heading numeric,
  address text,
  source text DEFAULT 'gps' CHECK (source IN ('gps', 'network', 'manual', 'geocoded')),
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Geofence zones
CREATE TABLE IF NOT EXISTS geofence_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  radius_meters integer NOT NULL DEFAULT 100,
  shape text DEFAULT 'circle' CHECK (shape IN ('circle', 'polygon')),
  polygon_points jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Attendance adjustments (admin corrections)
CREATE TABLE IF NOT EXISTS attendance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  adjusted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  reason text NOT NULL,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Attendance notes
CREATE TABLE IF NOT EXISTS attendance_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note text NOT NULL,
  note_type text DEFAULT 'general' CHECK (note_type IN ('general', 'late_reason', 'early_reason', 'absence_reason', 'correction')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Offline sync queue
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'update')),
  payload jsonb NOT NULL,
  local_timestamp timestamptz NOT NULL,
  sync_attempts integer DEFAULT 0,
  last_sync_attempt timestamptz,
  sync_error text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'completed', 'failed', 'conflict')),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes (optimized for high-volume attendance)
CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON attendance_records(company_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(attendance_status);
CREATE INDEX IF NOT EXISTS idx_attendance_sync ON attendance_records(sync_status);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in ON attendance_records(clock_in_at);
CREATE INDEX IF NOT EXISTS idx_attendance_clock_out ON attendance_records(clock_out_at);
CREATE INDEX IF NOT EXISTS idx_attendance_missing_out ON attendance_records(clock_in_at) WHERE clock_out_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_break_attendance ON break_records(attendance_id);
CREATE INDEX IF NOT EXISTS idx_break_employee ON break_records(employee_id);

CREATE INDEX IF NOT EXISTS idx_qr_codes_company ON qr_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_branch ON qr_codes(branch_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);

CREATE INDEX IF NOT EXISTS idx_qr_logs_code ON qr_code_logs(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_logs_employee ON qr_code_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_qr_logs_created ON qr_code_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_gps_company ON gps_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_gps_employee ON gps_locations(employee_id);
CREATE INDEX IF NOT EXISTS idx_gps_attendance ON gps_locations(attendance_id);
CREATE INDEX IF NOT EXISTS idx_gps_recorded ON gps_locations(recorded_at);

CREATE INDEX IF NOT EXISTS idx_geofence_company ON geofence_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_geofence_branch ON geofence_zones(branch_id);

CREATE INDEX IF NOT EXISTS idx_adjustments_attendance ON attendance_adjustments(attendance_id);
CREATE INDEX IF NOT EXISTS idx_notes_attendance ON attendance_notes(attendance_id);

CREATE INDEX IF NOT EXISTS idx_offline_queue_company ON offline_sync_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_employee ON offline_sync_queue(employee_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_device ON offline_sync_queue(device_id);

-- RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- Attendance records policies
DROP POLICY IF EXISTS "attendance_select_super_admin" ON attendance_records;
CREATE POLICY "attendance_select_super_admin" ON attendance_records FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "attendance_select_own" ON attendance_records;
CREATE POLICY "attendance_select_own" ON attendance_records FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "attendance_select_company_admin" ON attendance_records;
CREATE POLICY "attendance_select_company_admin" ON attendance_records FOR SELECT
TO authenticated USING (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "attendance_select_manager" ON attendance_records;
CREATE POLICY "attendance_select_manager" ON attendance_records FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employee_managers
    WHERE manager_id = auth.uid() AND employee_id = attendance_records.employee_id
  )
);

DROP POLICY IF EXISTS "attendance_insert_own" ON attendance_records;
CREATE POLICY "attendance_insert_own" ON attendance_records FOR INSERT
TO authenticated WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "attendance_insert_company_admin" ON attendance_records;
CREATE POLICY "attendance_insert_company_admin" ON attendance_records FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "attendance_update_own" ON attendance_records;
CREATE POLICY "attendance_update_own" ON attendance_records FOR UPDATE
TO authenticated USING (employee_id = auth.uid()) WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "attendance_update_company_admin" ON attendance_records;
CREATE POLICY "attendance_update_company_admin" ON attendance_records FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Break records policies
DROP POLICY IF EXISTS "break_select_own" ON break_records;
CREATE POLICY "break_select_own" ON break_records FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "break_select_company_admin" ON break_records;
CREATE POLICY "break_select_company_admin" ON break_records FOR SELECT
TO authenticated USING (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "break_insert_own" ON break_records;
CREATE POLICY "break_insert_own" ON break_records FOR INSERT
TO authenticated WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "break_insert_company_admin" ON break_records;
CREATE POLICY "break_insert_company_admin" ON break_records FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

-- QR codes policies
DROP POLICY IF EXISTS "qr_codes_select_company" ON qr_codes;
CREATE POLICY "qr_codes_select_company" ON qr_codes FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "qr_codes_insert_company_admin" ON qr_codes;
CREATE POLICY "qr_codes_insert_company_admin" ON qr_codes FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "qr_codes_update_company_admin" ON qr_codes;
CREATE POLICY "qr_codes_update_company_admin" ON qr_codes FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "qr_codes_delete_company_admin" ON qr_codes;
CREATE POLICY "qr_codes_delete_company_admin" ON qr_codes FOR DELETE
TO authenticated USING (is_company_admin(company_id));

-- QR logs policies
DROP POLICY IF EXISTS "qr_logs_select_company" ON qr_code_logs;
CREATE POLICY "qr_logs_select_company" ON qr_code_logs FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "qr_logs_insert" ON qr_code_logs;
CREATE POLICY "qr_logs_insert" ON qr_code_logs FOR INSERT
TO authenticated WITH CHECK (true);

-- GPS locations policies
DROP POLICY IF EXISTS "gps_select_own" ON gps_locations;
CREATE POLICY "gps_select_own" ON gps_locations FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "gps_select_company_admin" ON gps_locations;
CREATE POLICY "gps_select_company_admin" ON gps_locations FOR SELECT
TO authenticated USING (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "gps_insert_own" ON gps_locations;
CREATE POLICY "gps_insert_own" ON gps_locations FOR INSERT
TO authenticated WITH CHECK (employee_id = auth.uid());

-- Geofence zones policies
DROP POLICY IF EXISTS "geofence_select_company" ON geofence_zones;
CREATE POLICY "geofence_select_company" ON geofence_zones FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "geofence_insert_company_admin" ON geofence_zones;
CREATE POLICY "geofence_insert_company_admin" ON geofence_zones FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "geofence_update_company_admin" ON geofence_zones;
CREATE POLICY "geofence_update_company_admin" ON geofence_zones FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Attendance adjustments policies
DROP POLICY IF EXISTS "adjustments_select_company" ON attendance_adjustments;
CREATE POLICY "adjustments_select_company" ON attendance_adjustments FOR SELECT
TO authenticated USING (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "adjustments_insert_company_admin" ON attendance_adjustments;
CREATE POLICY "adjustments_insert_company_admin" ON attendance_adjustments FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

-- Attendance notes policies
DROP POLICY IF EXISTS "notes_select_own" ON attendance_notes;
CREATE POLICY "notes_select_own" ON attendance_notes FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "notes_select_company_admin" ON attendance_notes;
CREATE POLICY "notes_select_company_admin" ON attendance_notes FOR SELECT
TO authenticated USING (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "notes_insert" ON attendance_notes;
CREATE POLICY "notes_insert" ON attendance_notes FOR INSERT
TO authenticated WITH CHECK (
  employee_id = auth.uid() OR is_company_admin(company_id)
);

-- Offline sync queue policies
DROP POLICY IF EXISTS "offline_queue_select_own" ON offline_sync_queue;
CREATE POLICY "offline_queue_select_own" ON offline_sync_queue FOR SELECT
TO authenticated USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "offline_queue_select_company_admin" ON offline_sync_queue;
CREATE POLICY "offline_queue_select_company_admin" ON offline_sync_queue FOR SELECT
TO authenticated USING (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "offline_queue_insert_own" ON offline_sync_queue;
CREATE POLICY "offline_queue_insert_own" ON offline_sync_queue FOR INSERT
TO authenticated WITH CHECK (employee_id = auth.uid());

-- Trigger for updated_at on attendance_records
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qr_codes_updated_at ON qr_codes;
CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON qr_codes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_geofence_updated_at ON geofence_zones;
CREATE TRIGGER update_geofence_updated_at BEFORE UPDATE ON geofence_zones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
