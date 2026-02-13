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
