/*
# Migration 001: Create Companies and Tenant Infrastructure

## Summary
Establishes the multi-tenant foundation for the Clock In SaaS platform.
Every table in this system supports multi-tenancy via `company_id` foreign keys.
This migration creates the core tenant isolation layer, company management,
subscription tracking, and the super admin infrastructure.

## New Tables
1. `companies` - Master company/tenant records with subscription state
2. `company_settings` - Per-company configuration (branding, rules, policies)
3. `subscriptions` - Subscription plans and billing tracking
4. `invoices` - Billing invoice records
5. `platform_settings` - Global SaaS platform configuration
6. `platform_analytics` - Aggregated platform metrics

## Security
- RLS enabled on all tables
- Company-scoped policies for tenant isolation
- Super admin can access all companies
- Company admins can only access their own company data

## Indexes
- companies: slug (unique), status, plan_id, created_at
- subscriptions: company_id, status
- invoices: company_id, status, created_at
*/

-- Companies table (tenants)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#2563eb',
  secondary_color text DEFAULT '#1e40af',
  timezone text DEFAULT 'UTC',
  currency text DEFAULT 'USD',
  language text DEFAULT 'en',
  address text,
  city text,
  country text,
  postal_code text,
  phone text,
  email text,
  website text,
  tax_id text,
  industry text,
  size text DEFAULT 'small',
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
  plan_id text DEFAULT 'free',
  trial_ends_at timestamptz,
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz,
  max_employees integer DEFAULT 10,
  max_branches integer DEFAULT 1,
  storage_used_mb integer DEFAULT 0,
  storage_limit_mb integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company settings (rules, policies, branding)
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Attendance rules
  work_start_time time DEFAULT '09:00',
  work_end_time time DEFAULT '17:00',
  work_days integer[] DEFAULT ARRAY[1,2,3,4,5],
  grace_period_minutes integer DEFAULT 15,
  overtime_threshold_minutes integer DEFAULT 0,
  overtime_multiplier numeric DEFAULT 1.5,
  late_deduction_enabled boolean DEFAULT false,
  late_deduction_amount numeric DEFAULT 0,
  -- Break rules
  break_duration_minutes integer DEFAULT 60,
  paid_break_minutes integer DEFAULT 0,
  -- GPS settings
  geofencing_enabled boolean DEFAULT false,
  geofencing_radius_meters integer DEFAULT 100,
  gps_required boolean DEFAULT false,
  -- QR settings
  qr_rotation_seconds integer DEFAULT 45,
  qr_expiry_seconds integer DEFAULT 60,
  -- Payroll settings
  payroll_cycle text DEFAULT 'monthly' CHECK (payroll_cycle IN ('weekly', 'biweekly', 'monthly')),
  payroll_day integer DEFAULT 1,
  -- Holiday settings
  holiday_calendar_enabled boolean DEFAULT true,
  weekend_overtime_multiplier numeric DEFAULT 2.0,
  night_shift_start time DEFAULT '22:00',
  night_shift_end time DEFAULT '06:00',
  night_shift_multiplier numeric DEFAULT 1.25,
  -- Notifications
  email_notifications_enabled boolean DEFAULT true,
  push_notifications_enabled boolean DEFAULT true,
  sms_notifications_enabled boolean DEFAULT false,
  -- Branding
  custom_domain text,
  favicon_url text,
  login_background_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id text NOT NULL DEFAULT 'free',
  plan_name text NOT NULL,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  due_date timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  line_items jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Platform settings (super admin)
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Platform analytics
CREATE TABLE IF NOT EXISTS platform_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_companies integer DEFAULT 0,
  active_companies integer DEFAULT 0,
  trial_companies integer DEFAULT 0,
  total_employees integer DEFAULT 0,
  total_attendance_records integer DEFAULT 0,
  total_clock_ins integer DEFAULT 0,
  total_clock_outs integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  new_signups integer DEFAULT 0,
  churned_companies integer DEFAULT 0,
  avg_session_duration_minutes numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan_id);
CREATE INDEX IF NOT EXISTS idx_companies_created ON companies(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_analytics_date ON platform_analytics(date);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;

-- Super admin helper function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'role' = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Companies policies
DROP POLICY IF EXISTS "companies_select_super_admin" ON companies;
CREATE POLICY "companies_select_super_admin" ON companies FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "companies_select_company_admin" ON companies;
CREATE POLICY "companies_select_company_admin" ON companies FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'company_id' = companies.id::text
  )
);

DROP POLICY IF EXISTS "companies_insert_super_admin" ON companies;
CREATE POLICY "companies_insert_super_admin" ON companies FOR INSERT
TO authenticated WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "companies_update_super_admin" ON companies;
CREATE POLICY "companies_update_super_admin" ON companies FOR UPDATE
TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "companies_delete_super_admin" ON companies;
CREATE POLICY "companies_delete_super_admin" ON companies FOR DELETE
TO authenticated USING (is_super_admin());

-- Company settings policies (company-scoped)
DROP POLICY IF EXISTS "company_settings_select" ON company_settings;
CREATE POLICY "company_settings_select" ON company_settings FOR SELECT
TO authenticated USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'company_id' = company_settings.company_id::text
  )
);

DROP POLICY IF EXISTS "company_settings_insert" ON company_settings;
CREATE POLICY "company_settings_insert" ON company_settings FOR INSERT
TO authenticated WITH CHECK (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'company_id' = company_settings.company_id::text
  )
);

DROP POLICY IF EXISTS "company_settings_update" ON company_settings;
CREATE POLICY "company_settings_update" ON company_settings FOR UPDATE
TO authenticated USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'company_id' = company_settings.company_id::text
  )
) WITH CHECK (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'company_id' = company_settings.company_id::text
  )
);

-- Subscriptions policies
DROP POLICY IF EXISTS "subscriptions_select_super_admin" ON subscriptions;
CREATE POLICY "subscriptions_select_super_admin" ON subscriptions FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "subscriptions_select_company" ON subscriptions;
CREATE POLICY "subscriptions_select_company" ON subscriptions FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'company_id' = subscriptions.company_id::text
  )
);

DROP POLICY IF EXISTS "subscriptions_insert_super_admin" ON subscriptions;
CREATE POLICY "subscriptions_insert_super_admin" ON subscriptions FOR INSERT
TO authenticated WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "subscriptions_update_super_admin" ON subscriptions;
CREATE POLICY "subscriptions_update_super_admin" ON subscriptions FOR UPDATE
TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Invoices policies
DROP POLICY IF EXISTS "invoices_select_super_admin" ON invoices;
CREATE POLICY "invoices_select_super_admin" ON invoices FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "invoices_select_company" ON invoices;
CREATE POLICY "invoices_select_company" ON invoices FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'company_id' = invoices.company_id::text
  )
);

DROP POLICY IF EXISTS "invoices_insert_super_admin" ON invoices;
CREATE POLICY "invoices_insert_super_admin" ON invoices FOR INSERT
TO authenticated WITH CHECK (is_super_admin());

-- Platform settings (super admin only)
DROP POLICY IF EXISTS "platform_settings_select" ON platform_settings;
CREATE POLICY "platform_settings_select" ON platform_settings FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "platform_settings_update" ON platform_settings;
CREATE POLICY "platform_settings_update" ON platform_settings FOR UPDATE
TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Platform analytics (super admin only)
DROP POLICY IF EXISTS "platform_analytics_select" ON platform_analytics;
CREATE POLICY "platform_analytics_select" ON platform_analytics FOR SELECT
TO authenticated USING (is_super_admin());

DROP POLICY IF EXISTS "platform_analytics_insert" ON platform_analytics;
CREATE POLICY "platform_analytics_insert" ON platform_analytics FOR INSERT
TO authenticated WITH CHECK (is_super_admin());

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description)
VALUES 
  ('maintenance_mode', '{"enabled": false, "message": "System under maintenance"}', 'Platform maintenance mode'),
  ('default_plan', '{"id": "free", "name": "Free", "max_employees": 10, "max_branches": 1}', 'Default plan for new signups'),
  ('stripe_publishable_key', '{"value": ""}', 'Stripe publishable key'),
  ('email_from', '{"value": "noreply@clockin.app"}', 'Default sender email'),
  ('support_email', '{"value": "support@clockin.app"}', 'Support contact email')
ON CONFLICT (key) DO NOTHING;
