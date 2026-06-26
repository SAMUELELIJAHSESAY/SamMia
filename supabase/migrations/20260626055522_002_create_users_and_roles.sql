/*
# Migration 002: Create Users, Roles, and Employee Management

## Summary
Establishes the user and employee management system.
Uses Supabase auth.users as the primary identity store.
Creates profiles for all user types with role-based access.
Supports employee creation by company admins, department/team management,
and manager assignments.

## New Tables
1. `profiles` - Extended user profiles linked to auth.users
2. `departments` - Company departments
3. `teams` - Teams within departments
4. `branches` - Physical branch locations
5. `employee_departments` - Employee-department assignments
6. `employee_teams` - Employee-team assignments
7. `employee_managers` - Manager-employee relationships
8. `shifts` - Work shift definitions
9. `employee_shifts` - Employee shift assignments
10. `audit_logs` - Security audit trail
11. `login_logs` - Authentication tracking

## Security
- RLS on all tables
- Role-based access control
- Company-scoped data isolation
- Audit logging for all sensitive operations
*/

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'company_admin', 'branch_manager', 'department_manager', 'staff')),
  employee_id text,
  department_id uuid,
  team_id uuid,
  branch_id uuid,
  manager_id uuid,
  job_title text,
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  hire_date date,
  termination_date date,
  hourly_rate numeric DEFAULT 0,
  salary numeric DEFAULT 0,
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
  last_login_at timestamptz,
  last_login_ip text,
  email_verified boolean DEFAULT false,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  password_changed_at timestamptz,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  city text,
  country text,
  postal_code text,
  phone text,
  email text,
  latitude numeric,
  longitude numeric,
  geofence_radius_meters integer DEFAULT 100,
  timezone text DEFAULT 'UTC',
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  description text,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  lead_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employee-Department assignments
CREATE TABLE IF NOT EXISTS employee_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, department_id)
);

-- Employee-Team assignments
CREATE TABLE IF NOT EXISTS employee_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, team_id)
);

-- Employee-Managers
CREATE TABLE IF NOT EXISTS employee_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, manager_id)
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_duration_minutes integer DEFAULT 60,
  grace_period_minutes integer DEFAULT 15,
  overtime_threshold_minutes integer DEFAULT 0,
  is_night_shift boolean DEFAULT false,
  days_of_week integer[] DEFAULT ARRAY[1,2,3,4,5],
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employee-Shift assignments
CREATE TABLE IF NOT EXISTS employee_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, shift_id, effective_from)
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Login logs
CREATE TABLE IF NOT EXISTS login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  email text,
  action text NOT NULL CHECK (action IN ('login', 'logout', 'failed_login', 'password_reset', 'account_locked', 'session_expired')),
  ip_address text,
  user_agent text,
  device_fingerprint text,
  success boolean DEFAULT true,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch ON departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_teams_company ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_departments_employee ON employee_departments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_teams_employee ON employee_teams(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_managers_employee ON employee_managers(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee ON employee_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_company ON login_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created ON login_logs(created_at);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's company_id
CREATE OR REPLACE FUNCTION get_current_company_id()
RETURNS uuid AS $$
DECLARE
  v_company_id text;
BEGIN
  SELECT raw_app_meta_data->>'company_id' INTO v_company_id
  FROM auth.users WHERE id = auth.uid();
  RETURN v_company_id::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: is company admin for given company
CREATE OR REPLACE FUNCTION is_company_admin(p_company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND company_id = p_company_id
    AND role IN ('company_admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_super_admin" ON profiles;
CREATE POLICY "profiles_select_super_admin" ON profiles FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_company_admin" ON profiles;
CREATE POLICY "profiles_select_company_admin" ON profiles FOR SELECT
TO authenticated USING (
  is_company_admin(profiles.company_id)
);

DROP POLICY IF EXISTS "profiles_select_manager" ON profiles;
CREATE POLICY "profiles_select_manager" ON profiles FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employee_managers
    WHERE manager_id = auth.uid() AND employee_id = profiles.id
  )
);

DROP POLICY IF EXISTS "profiles_insert_super_admin" ON profiles;
CREATE POLICY "profiles_insert_super_admin" ON profiles FOR INSERT
TO authenticated WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "profiles_insert_company_admin" ON profiles;
CREATE POLICY "profiles_insert_company_admin" ON profiles FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_company_admin" ON profiles;
CREATE POLICY "profiles_update_company_admin" ON profiles FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- Branches policies
DROP POLICY IF EXISTS "branches_select_super_admin" ON branches;
CREATE POLICY "branches_select_super_admin" ON branches FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "branches_select_company" ON branches;
CREATE POLICY "branches_select_company" ON branches FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "branches_insert_company_admin" ON branches;
CREATE POLICY "branches_insert_company_admin" ON branches FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "branches_update_company_admin" ON branches;
CREATE POLICY "branches_update_company_admin" ON branches FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "branches_delete_company_admin" ON branches;
CREATE POLICY "branches_delete_company_admin" ON branches FOR DELETE
TO authenticated USING (is_company_admin(company_id));

-- Departments policies
DROP POLICY IF EXISTS "departments_select_company" ON departments;
CREATE POLICY "departments_select_company" ON departments FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "departments_insert_company_admin" ON departments;
CREATE POLICY "departments_insert_company_admin" ON departments FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "departments_update_company_admin" ON departments;
CREATE POLICY "departments_update_company_admin" ON departments FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "departments_delete_company_admin" ON departments;
CREATE POLICY "departments_delete_company_admin" ON departments FOR DELETE
TO authenticated USING (is_company_admin(company_id));

-- Teams policies
DROP POLICY IF EXISTS "teams_select_company" ON teams;
CREATE POLICY "teams_select_company" ON teams FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "teams_insert_company_admin" ON teams;
CREATE POLICY "teams_insert_company_admin" ON teams FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "teams_update_company_admin" ON teams;
CREATE POLICY "teams_update_company_admin" ON teams FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "teams_delete_company_admin" ON teams;
CREATE POLICY "teams_delete_company_admin" ON teams FOR DELETE
TO authenticated USING (is_company_admin(company_id));

-- Shifts policies
DROP POLICY IF EXISTS "shifts_select_company" ON shifts;
CREATE POLICY "shifts_select_company" ON shifts FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "shifts_insert_company_admin" ON shifts;
CREATE POLICY "shifts_insert_company_admin" ON shifts FOR INSERT
TO authenticated WITH CHECK (
  is_company_admin(company_id)
);

DROP POLICY IF EXISTS "shifts_update_company_admin" ON shifts;
CREATE POLICY "shifts_update_company_admin" ON shifts FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "shifts_delete_company_admin" ON shifts;
CREATE POLICY "shifts_delete_company_admin" ON shifts FOR DELETE
TO authenticated USING (is_company_admin(company_id));

-- Audit logs (super admin + own company)
DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_super_admin" ON audit_logs FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "audit_logs_select_company" ON audit_logs;
CREATE POLICY "audit_logs_select_company" ON audit_logs FOR SELECT
TO authenticated USING (
  company_id = get_current_company_id()
);

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
TO authenticated WITH CHECK (true);

-- Login logs
DROP POLICY IF EXISTS "login_logs_select_super_admin" ON login_logs;
CREATE POLICY "login_logs_select_super_admin" ON login_logs FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "login_logs_select_own" ON login_logs;
CREATE POLICY "login_logs_select_own" ON login_logs FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "login_logs_insert" ON login_logs;
CREATE POLICY "login_logs_insert" ON login_logs FOR INSERT
TO authenticated WITH CHECK (true);

-- Employee departments/teams/managers/shifts (company scoped)
DROP POLICY IF EXISTS "employee_departments_select_company" ON employee_departments;
CREATE POLICY "employee_departments_select_company" ON employee_departments FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_departments.employee_id
    AND p.company_id = get_current_company_id()
  )
);

DROP POLICY IF EXISTS "employee_teams_select_company" ON employee_teams;
CREATE POLICY "employee_teams_select_company" ON employee_teams FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_teams.employee_id
    AND p.company_id = get_current_company_id()
  )
);

DROP POLICY IF EXISTS "employee_managers_select_company" ON employee_managers;
CREATE POLICY "employee_managers_select_company" ON employee_managers FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_managers.employee_id
    AND p.company_id = get_current_company_id()
  )
);

DROP POLICY IF EXISTS "employee_shifts_select_company" ON employee_shifts;
CREATE POLICY "employee_shifts_select_company" ON employee_shifts FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_shifts.employee_id
    AND p.company_id = get_current_company_id()
  )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON branches;
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
