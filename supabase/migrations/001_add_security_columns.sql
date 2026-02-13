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
