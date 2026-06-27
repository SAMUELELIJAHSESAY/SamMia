/*
# Final RLS Fix - Direct approach without complex functions

## Problem
is_super_admin() function not working reliably with RLS policies.
Super admins can't access companies or profiles.

## Solution
1. Temporarily disable RLS on problem tables
2. Create direct, simple RLS policies that don't depend on is_super_admin()
3. Re-enable RLS with working policies
*/

-- STEP 1: Disable RLS on all tables temporarily
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_managers DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;

-- STEP 2: Verify super admin user has metadata set
-- Check this manually in Supabase dashboard
-- SELECT id, email, raw_app_meta_data->>'role' as role FROM auth.users WHERE email = 'YOUR_EMAIL';

-- STEP 3: Recreate profiles policies - SIMPLE VERSION
DROP POLICY IF EXISTS "profiles_select_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_company_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_manager" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_company_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_company_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_company" ON profiles;

-- Allow users to read their own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (id = auth.uid());

-- Allow users to select profiles in their company
CREATE POLICY "profiles_select_company" ON profiles FOR SELECT
TO authenticated USING (
  company_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Allow inserting own profile during signup
CREATE POLICY "profiles_insert_authenticated" ON profiles FOR INSERT
TO authenticated WITH CHECK (id = auth.uid());

-- Allow updating own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- STEP 4: Recreate companies policies - SIMPLE VERSION
DROP POLICY IF EXISTS "companies_select_super_admin" ON companies;
DROP POLICY IF EXISTS "companies_select_company_admin" ON companies;
DROP POLICY IF EXISTS "companies_insert_super_admin" ON companies;
DROP POLICY IF EXISTS "companies_update_super_admin" ON companies;
DROP POLICY IF EXISTS "companies_delete_super_admin" ON companies;
DROP POLICY IF EXISTS "companies_select_authenticated" ON companies;
DROP POLICY IF EXISTS "companies_insert_admin" ON companies;
DROP POLICY IF EXISTS "companies_update_admin" ON companies;

-- Allow reading companies you're part of
CREATE POLICY "companies_select_authenticated" ON companies FOR SELECT
TO authenticated USING (
  id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Allow company admins to insert
CREATE POLICY "companies_insert_admin" ON companies FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('company_admin', 'super_admin')
  )
);

-- Allow company admins to update their company
CREATE POLICY "companies_update_admin" ON companies FOR UPDATE
TO authenticated USING (
  id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('company_admin', 'super_admin')
  )
);

-- STEP 5: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
