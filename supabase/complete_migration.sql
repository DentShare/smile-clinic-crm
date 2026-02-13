-- Migration 001: Add security columns and audit logging table
-- Date: 2026-02-13
-- Description: Adds idempotency keys, audit logging, and prepares tables for enhanced security

-- =====================================================
-- 1. Add idempotency_key to payments table
-- =====================================================
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE,
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_idempotency
ON payments(idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_created_at
ON payments(clinic_id, created_at DESC);

COMMENT ON COLUMN payments.idempotency_key IS 'Unique key to prevent duplicate payment submissions';
COMMENT ON COLUMN payments.ip_address IS 'IP address of the user who processed the payment';

-- =====================================================
-- 2. Create comprehensive audit_log table
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
    'PAYMENT_PROCESSED', 'BONUS_DEDUCTED', 'DEPOSIT_USED',
    'PATIENT_CREATED', 'APPOINTMENT_CREATED', 'TREATMENT_COMPLETED',
    'USER_INVITED', 'ROLE_CHANGED', 'CLINIC_SETTINGS_UPDATED'
  )),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient audit log queries
CREATE INDEX idx_audit_clinic_date ON audit_log(clinic_id, created_at DESC);
CREATE INDEX idx_audit_user_date ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);

COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all sensitive operations';

-- =====================================================
-- 3. Enable Row Level Security on audit_log
-- =====================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins can see all audit logs
CREATE POLICY audit_log_super_admin_policy ON audit_log
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Clinic users can only see their own clinic's audit logs
CREATE POLICY audit_log_clinic_policy ON audit_log
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- 4. Create fraud detection monitoring table
-- =====================================================
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'MULTIPLE_LARGE_PAYMENTS',
    'OFF_HOURS_ACTIVITY',
    'UNUSUAL_AMOUNT',
    'RAPID_SUBMISSIONS',
    'SUSPICIOUS_PATTERN',
    'INVALID_DATA_ATTEMPT'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  details JSONB NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_fraud_alerts_clinic ON fraud_alerts(clinic_id, created_at DESC);
CREATE INDEX idx_fraud_alerts_unresolved ON fraud_alerts(resolved, severity, created_at DESC);

ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Only super admins and clinic admins can see fraud alerts
CREATE POLICY fraud_alerts_access_policy ON fraud_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND (
      ur.role = 'super_admin' OR
      (ur.role = 'clinic_admin' AND p.clinic_id = fraud_alerts.clinic_id)
    )
  )
);

-- =====================================================
-- 5. Add metadata columns to key tables
-- =====================================================
ALTER TABLE performed_works
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE patient_deposits
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE patient_loyalty
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- 6. Create helper function to log audit events
-- =====================================================
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_clinic_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get clinic_id from current user's profile
  SELECT clinic_id INTO v_clinic_id
  FROM profiles
  WHERE user_id = auth.uid();

  -- Insert audit log entry
  INSERT INTO audit_log (
    user_id,
    clinic_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    auth.uid(),
    v_clinic_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_metadata
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_audit_event IS 'Helper function to easily log audit events from other functions';

-- =====================================================
-- 7. Grant necessary permissions
-- =====================================================
GRANT SELECT ON audit_log TO authenticated;
GRANT SELECT ON fraud_alerts TO authenticated;
-- Migration 002: Create secure RPC functions for payment processing
-- Date: 2026-02-13
-- Description: Server-side validation for all financial operations

-- =====================================================
-- 1. Helper function: Check if user is super admin
-- =====================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_super_admin IS 'Returns true if current user has super_admin role';

-- =====================================================
-- 2. Helper function: Verify user belongs to clinic
-- =====================================================
CREATE OR REPLACE FUNCTION verify_clinic_access(p_clinic_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND clinic_id = p_clinic_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. Helper function: Detect duplicate payment
-- =====================================================
CREATE OR REPLACE FUNCTION check_duplicate_payment(
  p_patient_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM payments
    WHERE patient_id = p_patient_id
    AND amount = p_amount
    AND method = p_method
    AND created_at > NOW() - (p_seconds || ' seconds')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 4. Main function: Process patient payment with validation
-- =====================================================
CREATE OR REPLACE FUNCTION process_patient_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_processed_by UUID,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_payment_id UUID;
  v_patient_name TEXT;
BEGIN
  -- VALIDATION 1: Check authentication
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Authentication required'
    );
  END IF;

  -- VALIDATION 2: Verify clinic access
  IF NOT verify_clinic_access(p_clinic_id) THEN
    PERFORM log_audit_event(
      'PAYMENT_PROCESSED',
      'payments',
      NULL,
      NULL,
      json_build_object('error', 'Unauthorized clinic access', 'clinic_id', p_clinic_id),
      json_build_object('severity', 'HIGH', 'ip_address', p_ip_address)
    );

    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: User does not belong to this clinic'
    );
  END IF;

  -- VALIDATION 3: Amount must be positive and reasonable
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount: must be positive'
    );
  END IF;

  IF p_amount > 100000000 THEN -- 100 million limit
    -- Log suspicious activity
    INSERT INTO fraud_alerts (
      clinic_id, user_id, alert_type, severity, details
    ) VALUES (
      p_clinic_id, auth.uid(), 'UNUSUAL_AMOUNT', 'HIGH',
      json_build_object(
        'amount', p_amount,
        'patient_id', p_patient_id,
        'attempted_at', NOW()
      )
    );

    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount: exceeds maximum allowed (100,000,000)'
    );
  END IF;

  -- VALIDATION 4: Verify payment method
  IF p_method NOT IN ('cash', 'uzcard', 'humo', 'visa', 'mastercard', 'click', 'payme', 'transfer') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid payment method'
    );
  END IF;

  -- VALIDATION 5: Verify patient belongs to clinic
  SELECT full_name INTO v_patient_name
  FROM patients
  WHERE id = p_patient_id AND clinic_id = p_clinic_id;

  IF v_patient_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Patient not found in this clinic'
    );
  END IF;

  -- VALIDATION 6: Check idempotency key if provided
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM payments WHERE idempotency_key = p_idempotency_key
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Duplicate payment: this transaction has already been processed'
      );
    END IF;
  END IF;

  -- VALIDATION 7: Check for rapid duplicate submissions
  IF check_duplicate_payment(p_patient_id, p_amount, p_method, 60) THEN
    INSERT INTO fraud_alerts (
      clinic_id, user_id, alert_type, severity, details
    ) VALUES (
      p_clinic_id, auth.uid(), 'RAPID_SUBMISSIONS', 'MEDIUM',
      json_build_object(
        'amount', p_amount,
        'method', p_method,
        'patient_id', p_patient_id
      )
    );

    RETURN json_build_object(
      'success', false,
      'error', 'Duplicate payment detected within last 60 seconds'
    );
  END IF;

  -- Insert payment
  BEGIN
    INSERT INTO payments (
      clinic_id,
      patient_id,
      amount,
      method,
      processed_by,
      notes,
      idempotency_key,
      ip_address,
      user_agent,
      created_at
    ) VALUES (
      p_clinic_id,
      p_patient_id,
      p_amount,
      p_method,
      p_processed_by,
      p_notes,
      p_idempotency_key,
      p_ip_address,
      p_user_agent,
      NOW()
    ) RETURNING id INTO v_payment_id;

    -- Log successful payment
    PERFORM log_audit_event(
      'PAYMENT_PROCESSED',
      'payments',
      v_payment_id,
      NULL,
      json_build_object(
        'amount', p_amount,
        'method', p_method,
        'patient_name', v_patient_name,
        'patient_id', p_patient_id
      ),
      json_build_object('ip_address', p_ip_address)
    );

    RETURN json_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'message', 'Payment processed successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log error
    PERFORM log_audit_event(
      'PAYMENT_PROCESSED',
      'payments',
      NULL,
      NULL,
      json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE),
      json_build_object('severity', 'HIGH')
    );

    RETURN json_build_object(
      'success', false,
      'error', 'Payment processing failed: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_patient_payment IS 'Securely process patient payment with comprehensive validation';

-- =====================================================
-- 5. Function: Process bonus payment with balance check
-- =====================================================
CREATE OR REPLACE FUNCTION process_bonus_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_deducted_by UUID
) RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
  v_patient_name TEXT;
  v_updated_balance NUMERIC;
BEGIN
  -- Verify clinic access
  IF NOT verify_clinic_access(p_clinic_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized access to clinic'
    );
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount: must be positive'
    );
  END IF;

  IF p_amount > 100000000 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Amount exceeds maximum allowed'
    );
  END IF;

  -- Get patient info and current bonus balance
  SELECT p.full_name, COALESCE(pl.bonus_balance, 0)
  INTO v_patient_name, v_current_balance
  FROM patients p
  LEFT JOIN patient_loyalty pl ON pl.patient_id = p.id AND pl.clinic_id = p.clinic_id
  WHERE p.id = p_patient_id AND p.clinic_id = p_clinic_id;

  IF v_patient_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Patient not found in this clinic'
    );
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient bonus balance',
      'current_balance', v_current_balance,
      'requested_amount', p_amount
    );
  END IF;

  -- Deduct bonuses atomically with optimistic locking
  UPDATE patient_loyalty
  SET
    bonus_balance = bonus_balance - p_amount,
    updated_at = NOW()
  WHERE patient_id = p_patient_id
  AND clinic_id = p_clinic_id
  AND bonus_balance >= p_amount
  RETURNING bonus_balance INTO v_updated_balance;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to deduct bonuses (concurrent update or insufficient balance)'
    );
  END IF;

  -- Log bonus deduction
  PERFORM log_audit_event(
    'BONUS_DEDUCTED',
    'patient_loyalty',
    p_patient_id,
    json_build_object('old_balance', v_current_balance),
    json_build_object('new_balance', v_updated_balance, 'deducted', p_amount),
    json_build_object('patient_name', v_patient_name)
  );

  RETURN json_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'deducted_amount', p_amount,
    'new_balance', v_updated_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Function: Process deposit payment
-- =====================================================
CREATE OR REPLACE FUNCTION process_deposit_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_deducted_by UUID
) RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
  v_patient_name TEXT;
  v_updated_balance NUMERIC;
BEGIN
  -- Verify clinic access
  IF NOT verify_clinic_access(p_clinic_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized access'
    );
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount: must be positive'
    );
  END IF;

  -- Get patient info and current deposit balance
  SELECT p.full_name, COALESCE(pd.balance, 0)
  INTO v_patient_name, v_current_balance
  FROM patients p
  LEFT JOIN patient_deposits pd ON pd.patient_id = p.id AND pd.clinic_id = p.clinic_id
  WHERE p.id = p_patient_id AND p.clinic_id = p_clinic_id;

  IF v_patient_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Patient not found'
    );
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient deposit balance',
      'current_balance', v_current_balance,
      'requested_amount', p_amount
    );
  END IF;

  -- Deduct deposit atomically
  UPDATE patient_deposits
  SET
    balance = balance - p_amount,
    updated_at = NOW()
  WHERE patient_id = p_patient_id
  AND clinic_id = p_clinic_id
  AND balance >= p_amount
  RETURNING balance INTO v_updated_balance;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to deduct deposit'
    );
  END IF;

  -- Log deposit usage
  PERFORM log_audit_event(
    'DEPOSIT_USED',
    'patient_deposits',
    p_patient_id,
    json_build_object('old_balance', v_current_balance),
    json_build_object('new_balance', v_updated_balance, 'used', p_amount),
    json_build_object('patient_name', v_patient_name)
  );

  RETURN json_build_object(
    'success', true,
    'previous_balance', v_current_balance,
    'used_amount', p_amount,
    'new_balance', v_updated_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_patient_payment TO authenticated;
GRANT EXECUTE ON FUNCTION process_bonus_payment TO authenticated;
GRANT EXECUTE ON FUNCTION process_deposit_payment TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION verify_clinic_access TO authenticated;
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
-- Migration 004: Fraud Detection Triggers and Automated Monitoring
-- Date: 2026-02-13
-- Description: Automatic fraud detection and suspicious activity alerts

-- =====================================================
-- 1. Function: Detect multiple large payments
-- =====================================================
CREATE OR REPLACE FUNCTION detect_multiple_large_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INTEGER;
  v_recent_sum NUMERIC;
  v_large_threshold NUMERIC := 1000000; -- 1 million
BEGIN
  -- Only check for large payments
  IF NEW.amount >= v_large_threshold THEN
    -- Count large payments in last 10 minutes by same user
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_recent_count, v_recent_sum
    FROM payments
    WHERE processed_by = NEW.processed_by
    AND clinic_id = NEW.clinic_id
    AND amount >= v_large_threshold
    AND created_at > NOW() - INTERVAL '10 minutes';

    -- Alert if 3+ large payments in 10 minutes
    IF v_recent_count >= 3 THEN
      INSERT INTO fraud_alerts (
        clinic_id,
        user_id,
        alert_type,
        severity,
        details
      ) VALUES (
        NEW.clinic_id,
        NEW.processed_by,
        'MULTIPLE_LARGE_PAYMENTS',
        'HIGH',
        json_build_object(
          'count', v_recent_count,
          'total_amount', v_recent_sum + NEW.amount,
          'time_window', '10 minutes',
          'latest_payment_id', NEW.id,
          'latest_amount', NEW.amount
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_large_payments
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_multiple_large_payments();

-- =====================================================
-- 2. Function: Detect off-hours activity
-- =====================================================
CREATE OR REPLACE FUNCTION detect_off_hours_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_hour INTEGER;
  v_day_of_week INTEGER;
BEGIN
  v_hour := EXTRACT(HOUR FROM NEW.created_at);
  v_day_of_week := EXTRACT(DOW FROM NEW.created_at); -- 0=Sunday, 6=Saturday

  -- Alert if payment during night hours (22:00 - 06:00) or on Sunday
  IF v_hour >= 22 OR v_hour < 6 OR v_day_of_week = 0 THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'OFF_HOURS_ACTIVITY',
      'MEDIUM',
      json_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'hour', v_hour,
        'day_of_week', v_day_of_week,
        'timestamp', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_off_hours
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_off_hours_activity();

-- =====================================================
-- 3. Function: Detect unusual round numbers
-- =====================================================
CREATE OR REPLACE FUNCTION detect_suspicious_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for suspiciously round numbers over 100,000
  IF NEW.amount >= 100000 AND NEW.amount % 100000 = 0 THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'SUSPICIOUS_PATTERN',
      'LOW',
      json_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reason', 'Large round number payment',
        'note', 'May indicate money laundering or test transaction'
      )
    );
  END IF;

  -- Check for extremely precise amounts (many decimal places)
  IF NEW.amount::TEXT LIKE '%.________%' THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'SUSPICIOUS_PATTERN',
      'LOW',
      json_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reason', 'Unusually precise amount',
        'note', 'May indicate programmatic manipulation'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_suspicious_amounts
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_amounts();

-- =====================================================
-- 4. Function: Auto-log critical table changes
-- =====================================================
CREATE OR REPLACE FUNCTION auto_audit_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  END IF;

  INSERT INTO audit_log (
    user_id,
    clinic_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.clinic_id, OLD.clinic_id),
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_old_values,
    v_new_values
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_payments_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION auto_audit_payments();

CREATE TRIGGER audit_performed_works_trigger
AFTER INSERT OR UPDATE OR DELETE ON performed_works
FOR EACH ROW
EXECUTE FUNCTION auto_audit_payments();

-- =====================================================
-- 5. Function: Monitor rapid successive transactions
-- =====================================================
CREATE OR REPLACE FUNCTION detect_rapid_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  -- Count transactions by same user in last 30 seconds
  SELECT COUNT(*)
  INTO v_recent_count
  FROM payments
  WHERE processed_by = NEW.processed_by
  AND created_at > NOW() - INTERVAL '30 seconds';

  -- Alert if 5+ transactions in 30 seconds
  IF v_recent_count >= 5 THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'RAPID_SUBMISSIONS',
      'HIGH',
      json_build_object(
        'count', v_recent_count,
        'time_window', '30 seconds',
        'latest_payment_id', NEW.id,
        'note', 'Possible bot or compromised account'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_rapid_transactions
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_rapid_transactions();

-- =====================================================
-- 6. Function: Track patient data access for HIPAA compliance
-- =====================================================
CREATE OR REPLACE FUNCTION log_patient_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log whenever patient record is accessed (read/update)
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      user_id,
      clinic_id,
      action,
      table_name,
      record_id,
      metadata
    ) VALUES (
      auth.uid(),
      NEW.clinic_id,
      'UPDATE',
      'patients',
      NEW.id,
      json_build_object(
        'patient_name', NEW.full_name,
        'accessed_at', NOW(),
        'access_type', 'MODIFY'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_patient_modifications
AFTER UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION log_patient_access();

-- =====================================================
-- 7. Function: Prevent deletion of records with dependencies
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_payment_deletion_with_works()
RETURNS TRIGGER AS $$
DECLARE
  v_work_count INTEGER;
BEGIN
  -- Check if payment has associated performed works
  SELECT COUNT(*)
  INTO v_work_count
  FROM performed_works
  WHERE patient_id = OLD.patient_id
  AND clinic_id = OLD.clinic_id
  AND created_at BETWEEN OLD.created_at - INTERVAL '1 hour' AND OLD.created_at + INTERVAL '1 hour';

  IF v_work_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete payment: associated performed works exist'
      USING HINT = 'Delete related performed works first or contact administrator';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger is commented out by default as deletions should be rare
-- Uncomment if you want to enable this protection
-- CREATE TRIGGER prevent_payment_deletion
-- BEFORE DELETE ON payments
-- FOR EACH ROW
-- EXECUTE FUNCTION prevent_payment_deletion_with_works();

-- =====================================================
-- 8. Add helpful comments
-- =====================================================
COMMENT ON FUNCTION detect_multiple_large_payments IS 'Triggers alert when user processes 3+ large payments in 10 minutes';
COMMENT ON FUNCTION detect_off_hours_activity IS 'Alerts on payments during night hours or Sundays';
COMMENT ON FUNCTION detect_suspicious_amounts IS 'Identifies unusual payment patterns (round numbers, odd precision)';
COMMENT ON FUNCTION auto_audit_payments IS 'Automatically logs all changes to critical financial tables';
COMMENT ON FUNCTION detect_rapid_transactions IS 'Detects possible bot activity or compromised accounts';
COMMENT ON FUNCTION log_patient_access IS 'HIPAA compliance: tracks all patient record modifications';
