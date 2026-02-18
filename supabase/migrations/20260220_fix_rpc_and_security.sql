-- =====================================================
-- Migration: Fix RPC functions, security columns, and fraud triggers
-- Date: 2026-02-20
-- Description:
--   0. Drop old conflicting function overloads
--   1. Add missing security columns to payments table
--   2. Fix RPC functions (correct column names + log_audit_event signature)
--   3. Fix fraud detection triggers (correct column names + audit_logs table)
-- =====================================================

-- =====================================================
-- 0. Drop ALL existing overloads of functions we will recreate
--    This prevents "function name is not unique" errors
-- =====================================================
DO $$
DECLARE
  func_record RECORD;
  drop_stmt TEXT;
BEGIN
  -- Drop all overloads of process_patient_payment
  FOR func_record IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'process_patient_payment'
      AND n.nspname = 'public'
  LOOP
    drop_stmt := format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      func_record.nspname, func_record.proname, func_record.args);
    RAISE NOTICE 'Dropping: %', drop_stmt;
    EXECUTE drop_stmt;
  END LOOP;

  -- Drop all overloads of process_bonus_payment
  FOR func_record IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'process_bonus_payment'
      AND n.nspname = 'public'
  LOOP
    drop_stmt := format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      func_record.nspname, func_record.proname, func_record.args);
    RAISE NOTICE 'Dropping: %', drop_stmt;
    EXECUTE drop_stmt;
  END LOOP;

  -- Drop all overloads of process_deposit_payment
  FOR func_record IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'process_deposit_payment'
      AND n.nspname = 'public'
  LOOP
    drop_stmt := format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      func_record.nspname, func_record.proname, func_record.args);
    RAISE NOTICE 'Dropping: %', drop_stmt;
    EXECUTE drop_stmt;
  END LOOP;

  -- Drop all overloads of check_duplicate_payment
  FOR func_record IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_duplicate_payment'
      AND n.nspname = 'public'
  LOOP
    drop_stmt := format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      func_record.nspname, func_record.proname, func_record.args);
    RAISE NOTICE 'Dropping: %', drop_stmt;
    EXECUTE drop_stmt;
  END LOOP;

  RAISE NOTICE 'All old function overloads dropped successfully';
END $$;

-- =====================================================
-- 1. Add missing security columns to payments table
-- =====================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_idempotency
  ON public.payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.payments.idempotency_key IS 'Unique key to prevent duplicate payment submissions';
COMMENT ON COLUMN public.payments.ip_address IS 'IP address of the user who processed the payment';

-- Add metadata columns to related tables (if missing)
ALTER TABLE public.performed_works
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.patient_deposits
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.patient_loyalty
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure fraud_alerts table exists
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_clinic ON public.fraud_alerts(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_unresolved ON public.fraud_alerts(resolved, severity, created_at DESC);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policy for fraud_alerts (drop first to avoid conflicts)
DROP POLICY IF EXISTS fraud_alerts_access_policy ON public.fraud_alerts;
CREATE POLICY fraud_alerts_access_policy ON public.fraud_alerts
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

-- Allow system to insert fraud alerts
DROP POLICY IF EXISTS fraud_alerts_insert_policy ON public.fraud_alerts;
CREATE POLICY fraud_alerts_insert_policy ON public.fraud_alerts
FOR INSERT
WITH CHECK (true);

GRANT SELECT ON public.fraud_alerts TO authenticated;

-- =====================================================
-- 2. Create/update helper functions
-- =====================================================

-- is_super_admin (overload without args for convenience)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- verify_clinic_access
CREATE OR REPLACE FUNCTION public.verify_clinic_access(p_clinic_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND clinic_id = p_clinic_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- check_duplicate_payment (FIXED: uses payment_method, not method)
CREATE OR REPLACE FUNCTION public.check_duplicate_payment(
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
    AND payment_method = p_method
    AND created_at > NOW() - (p_seconds || ' seconds')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. FIXED process_patient_payment
--    - Uses payment_method (not method)
--    - Uses received_by (not processed_by)
--    - Uses log_audit_event(p_clinic_id, ...) signature
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_patient_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_processed_by UUID,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
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
      p_clinic_id,
      'PAYMENT_PROCESSED',
      'payments',
      NULL,
      NULL,
      json_build_object('error', 'Unauthorized clinic access', 'user_id', auth.uid())
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

  IF p_amount > 100000000 THEN
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

  -- VALIDATION 6: Check idempotency key
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

  -- Insert payment (FIXED column names: payment_method, received_by)
  BEGIN
    INSERT INTO payments (
      clinic_id,
      patient_id,
      amount,
      payment_method,
      received_by,
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

    -- Log successful payment (FIXED: log_audit_event with clinic_id first)
    PERFORM log_audit_event(
      p_clinic_id,
      'PAYMENT_PROCESSED',
      'payments',
      v_payment_id,
      NULL,
      json_build_object(
        'amount', p_amount,
        'method', p_method,
        'patient_name', v_patient_name,
        'patient_id', p_patient_id
      )
    );

    RETURN json_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'message', 'Payment processed successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    PERFORM log_audit_event(
      p_clinic_id,
      'PAYMENT_PROCESSED',
      'payments',
      NULL,
      NULL,
      json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE)
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
-- 4. FIXED process_bonus_payment
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_bonus_payment(
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

  -- Deduct bonuses atomically
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

  -- Log bonus deduction (FIXED: log_audit_event with clinic_id first)
  PERFORM log_audit_event(
    p_clinic_id,
    'BONUS_DEDUCTED',
    'patient_loyalty',
    p_patient_id,
    json_build_object('old_balance', v_current_balance),
    json_build_object('new_balance', v_updated_balance, 'deducted', p_amount)
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
-- 5. FIXED process_deposit_payment
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_deposit_payment(
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

  -- Log deposit usage (FIXED: log_audit_event with clinic_id first)
  PERFORM log_audit_event(
    p_clinic_id,
    'DEPOSIT_USED',
    'patient_deposits',
    p_patient_id,
    json_build_object('old_balance', v_current_balance),
    json_build_object('new_balance', v_updated_balance, 'used', p_amount)
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
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_clinic_access TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_payment TO authenticated;

-- =====================================================
-- 6. Fraud detection triggers (FIXED: received_by, audit_logs)
-- =====================================================

-- Drop old conflicting triggers first
DROP TRIGGER IF EXISTS trigger_detect_large_payments ON public.payments;
DROP TRIGGER IF EXISTS trigger_detect_off_hours ON public.payments;
DROP TRIGGER IF EXISTS trigger_detect_suspicious_amounts ON public.payments;
DROP TRIGGER IF EXISTS trigger_detect_rapid_transactions ON public.payments;

-- 6a. Detect multiple large payments (FIXED: received_by)
CREATE OR REPLACE FUNCTION public.detect_multiple_large_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INTEGER;
  v_recent_sum NUMERIC;
  v_large_threshold NUMERIC := 1000000;
BEGIN
  IF NEW.amount >= v_large_threshold THEN
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_recent_count, v_recent_sum
    FROM payments
    WHERE received_by = NEW.received_by
    AND clinic_id = NEW.clinic_id
    AND amount >= v_large_threshold
    AND created_at > NOW() - INTERVAL '10 minutes';

    IF v_recent_count >= 3 THEN
      INSERT INTO fraud_alerts (
        clinic_id, user_id, alert_type, severity, details
      ) VALUES (
        NEW.clinic_id,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_detect_large_payments
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_multiple_large_payments();

-- 6b. Detect off-hours activity
CREATE OR REPLACE FUNCTION public.detect_off_hours_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_hour INTEGER;
  v_day_of_week INTEGER;
BEGIN
  v_hour := EXTRACT(HOUR FROM NEW.created_at);
  v_day_of_week := EXTRACT(DOW FROM NEW.created_at);

  IF v_hour >= 22 OR v_hour < 6 OR v_day_of_week = 0 THEN
    INSERT INTO fraud_alerts (
      clinic_id, user_id, alert_type, severity, details
    ) VALUES (
      NEW.clinic_id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_detect_off_hours
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_off_hours_activity();

-- 6c. Detect suspicious amounts
CREATE OR REPLACE FUNCTION public.detect_suspicious_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.amount >= 100000 AND NEW.amount::BIGINT % 100000 = 0 THEN
    INSERT INTO fraud_alerts (
      clinic_id, user_id, alert_type, severity, details
    ) VALUES (
      NEW.clinic_id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'SUSPICIOUS_PATTERN',
      'LOW',
      json_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reason', 'Large round number payment'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_detect_suspicious_amounts
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_amounts();

-- 6d. Detect rapid transactions (FIXED: received_by)
CREATE OR REPLACE FUNCTION public.detect_rapid_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_recent_count
  FROM payments
  WHERE received_by = NEW.received_by
  AND created_at > NOW() - INTERVAL '30 seconds';

  IF v_recent_count >= 5 THEN
    INSERT INTO fraud_alerts (
      clinic_id, user_id, alert_type, severity, details
    ) VALUES (
      NEW.clinic_id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_detect_rapid_transactions
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_rapid_transactions();

-- =====================================================
-- 7. Prevent deletion of payments with dependencies
-- =====================================================
CREATE OR REPLACE FUNCTION public.prevent_payment_deletion_with_works()
RETURNS TRIGGER AS $$
DECLARE
  v_work_count INTEGER;
BEGIN
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

-- =====================================================
-- 8. Comments
-- =====================================================
COMMENT ON FUNCTION detect_multiple_large_payments IS 'Triggers alert when user processes 3+ large payments in 10 minutes';
COMMENT ON FUNCTION detect_off_hours_activity IS 'Alerts on payments during night hours or Sundays';
COMMENT ON FUNCTION detect_suspicious_amounts IS 'Identifies unusual payment patterns (round numbers)';
COMMENT ON FUNCTION detect_rapid_transactions IS 'Detects possible bot activity or compromised accounts';
