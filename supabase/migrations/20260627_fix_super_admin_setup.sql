/*
# Migration: Complete Fix for Super Admin RLS Issues

## Purpose
Comprehensive fix for super admin authentication and RLS policies.
Ensures data integrity and fixes circular RLS dependencies.

## Changes
1. Disable RLS temporarily to clean up data
2. Fix is_super_admin() to check auth metadata safely
3. Ensure all profiles have complete required data
4. Set auth metadata for all super admins
5. Recreate RLS policies with better logic
6. Re-enable RLS
*/

-- STEP 1: Disable RLS on profiles temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Fix is_super_admin() function - check auth metadata
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT raw_app_meta_data->>'role' = 'super_admin' 
     FROM auth.users 
     WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Ensure all super admin profiles exist and are complete
INSERT INTO profiles (id, email, role, status, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'super_admin',
  'active',
  COALESCE(au.raw_user_meta_data->>'full_name', 'Super Admin'),
  now(),
  now()
FROM auth.users au
WHERE au.raw_app_meta_data->>'role' = 'super_admin'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = 'super_admin',
  status = 'active',
  updated_at = now();

-- STEP 4: Fix any incomplete profile records
UPDATE profiles
SET 
  email = COALESCE(email, (SELECT email FROM auth.users WHERE id = profiles.id)),
  role = CASE WHEN role IS NULL OR role = '' THEN 'super_admin' ELSE role END,
  status = CASE WHEN status IS NULL OR status = '' THEN 'active' ELSE status END,
  updated_at = now()
WHERE id IN (SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'super_admin');

-- STEP 5: Set auth metadata for all super admin users
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'::jsonb
)
WHERE id IN (SELECT id FROM profiles WHERE role = 'super_admin')
AND (raw_app_meta_data->>'role' IS NULL OR raw_app_meta_data->>'role' != 'super_admin');

-- STEP 6: Recreate RLS policies with safer logic
-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_company_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_manager" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_company_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_company_admin" ON profiles;

-- Create new, simpler policies
-- Allow users to select their own profile (always safe)
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (id = auth.uid());

-- Allow super admins to select all profiles
CREATE POLICY "profiles_select_super_admin" ON profiles FOR SELECT
TO authenticated USING (is_super_admin());

-- Allow company admins to select profiles in their company
CREATE POLICY "profiles_select_company_admin" ON profiles FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('company_admin', 'super_admin')
    AND admin_profile.company_id = profiles.company_id
  )
);

-- Allow super admins to insert
CREATE POLICY "profiles_insert_super_admin" ON profiles FOR INSERT
TO authenticated WITH CHECK (is_super_admin());

-- Allow company admins to insert in their company
CREATE POLICY "profiles_insert_company_admin" ON profiles FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role IN ('company_admin', 'super_admin')
    AND admin_profile.company_id = profiles.company_id
  )
);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Allow super admins to update
CREATE POLICY "profiles_update_super_admin" ON profiles FOR UPDATE
TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- STEP 7: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 8: Test - verify super admin can be queried
-- SELECT COUNT(*) as super_admin_count FROM profiles WHERE role = 'super_admin';
-- SELECT * FROM auth.users WHERE raw_app_meta_data->>'role' = 'super_admin';
