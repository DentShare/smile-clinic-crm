-- Migration 003: Comprehensive Row Level Security Policies
-- Date: 2026-02-13
-- Description: Enforce multi-tenant data isolation and role-based access control

-- =====================================================
-- 1. Enable RLS on all critical tables
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performed_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Payments Table Policies
-- =====================================================
-- Users can view payments from their clinic
CREATE POLICY payments_select_policy ON payments
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Users can insert payments for their clinic
CREATE POLICY payments_insert_policy ON payments
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Only super admins can update/delete payments (for corrections)
CREATE POLICY payments_update_policy ON payments
FOR UPDATE
USING (is_super_admin());

CREATE POLICY payments_delete_policy ON payments
FOR DELETE
USING (is_super_admin());

-- =====================================================
-- 3. Performed Works Table Policies
-- =====================================================
CREATE POLICY performed_works_select_policy ON performed_works
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY performed_works_insert_policy ON performed_works
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY performed_works_update_policy ON performed_works
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 4. Patient Deposits Table Policies
-- =====================================================
CREATE POLICY patient_deposits_select_policy ON patient_deposits
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY patient_deposits_insert_policy ON patient_deposits
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY patient_deposits_update_policy ON patient_deposits
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 5. Patient Loyalty Table Policies
-- =====================================================
CREATE POLICY patient_loyalty_select_policy ON patient_loyalty
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY patient_loyalty_insert_policy ON patient_loyalty
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY patient_loyalty_update_policy ON patient_loyalty
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 6. Patients Table Policies
-- =====================================================
CREATE POLICY patients_select_policy ON patients
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY patients_insert_policy ON patients
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY patients_update_policy ON patients
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Only clinic admins can delete patients
CREATE POLICY patients_delete_policy ON patients
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND p.clinic_id = patients.clinic_id
    AND ur.role IN ('clinic_admin', 'super_admin')
  )
);

-- =====================================================
-- 7. Appointments Table Policies
-- =====================================================
CREATE POLICY appointments_select_policy ON appointments
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY appointments_insert_policy ON appointments
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY appointments_update_policy ON appointments
FOR UPDATE
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY appointments_delete_policy ON appointments
FOR DELETE
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 8. Clinics Table Policies
-- =====================================================
-- Super admins can see all clinics, regular users only their own
CREATE POLICY clinics_select_policy ON clinics
FOR SELECT
USING (
  is_super_admin() OR
  id IN (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
);

-- Only super admins can create clinics
CREATE POLICY clinics_insert_policy ON clinics
FOR INSERT
WITH CHECK (is_super_admin());

-- Super admins can update any clinic, clinic admins can update their own
CREATE POLICY clinics_update_policy ON clinics
FOR UPDATE
USING (
  is_super_admin() OR
  (
    id IN (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'clinic_admin'
    )
  )
);

-- Only super admins can delete clinics
CREATE POLICY clinics_delete_policy ON clinics
FOR DELETE
USING (is_super_admin());

-- =====================================================
-- 9. Clinic Subscriptions Table Policies
-- =====================================================
CREATE POLICY clinic_subscriptions_select_policy ON clinic_subscriptions
FOR SELECT
USING (
  is_super_admin() OR
  clinic_id IN (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY clinic_subscriptions_insert_policy ON clinic_subscriptions
FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY clinic_subscriptions_update_policy ON clinic_subscriptions
FOR UPDATE
USING (is_super_admin());

-- =====================================================
-- 10. Subscription Plans Table Policies
-- =====================================================
-- Everyone can view subscription plans
CREATE POLICY subscription_plans_select_policy ON subscription_plans
FOR SELECT
USING (true);

-- Only super admins can modify plans
CREATE POLICY subscription_plans_modify_policy ON subscription_plans
FOR ALL
USING (is_super_admin());

-- =====================================================
-- 11. Billing History Table Policies
-- =====================================================
-- Only super admins can access billing history
CREATE POLICY billing_history_policy ON billing_history
FOR ALL
USING (is_super_admin());

-- =====================================================
-- 12. Profiles Table Policies
-- =====================================================
-- Users can view profiles from their clinic
CREATE POLICY profiles_select_policy ON profiles
FOR SELECT
USING (
  is_super_admin() OR
  clinic_id IN (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
);

-- Users can view their own profile
CREATE POLICY profiles_select_own_policy ON profiles
FOR SELECT
USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY profiles_update_own_policy ON profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Clinic admins can insert profiles for their clinic
CREATE POLICY profiles_insert_policy ON profiles
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (
    clinic_id IN (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('clinic_admin', 'super_admin')
    )
  )
);

-- =====================================================
-- 13. User Roles Table Policies
-- =====================================================
-- Users can view roles in their clinic
CREATE POLICY user_roles_select_policy ON user_roles
FOR SELECT
USING (
  is_super_admin() OR
  user_id IN (
    SELECT p.user_id FROM profiles p
    WHERE p.clinic_id IN (
      SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Users can view their own roles
CREATE POLICY user_roles_select_own_policy ON user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Only admins can assign roles
CREATE POLICY user_roles_insert_policy ON user_roles
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'clinic_admin'
  )
);

-- Only admins can modify roles
CREATE POLICY user_roles_update_policy ON user_roles
FOR UPDATE
USING (
  is_super_admin() OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'clinic_admin'
  )
);

-- Only super admins can delete roles
CREATE POLICY user_roles_delete_policy ON user_roles
FOR DELETE
USING (is_super_admin());

-- =====================================================
-- 14. Add helpful comments
-- =====================================================
COMMENT ON POLICY payments_select_policy ON payments IS 'Users can only view payments from their clinic';
COMMENT ON POLICY clinics_select_policy ON clinics IS 'Super admins see all clinics, users see only their own';
COMMENT ON POLICY patients_delete_policy ON patients IS 'Only clinic/super admins can delete patients';
