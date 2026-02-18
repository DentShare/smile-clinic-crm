-- =====================================================
-- Migration: Fix bonus/deposit payments to update patient balance
-- Date: 2026-02-22
-- Description:
--   process_bonus_payment and process_deposit_payment only deducted
--   from patient_loyalty/patient_deposits but did NOT insert a record
--   into the payments table. Since patient balance = SUM(payments) -
--   SUM(performed_works), the balance never changed.
--   Fix: insert a payment record with method='bonus'/'deposit'.
-- =====================================================

-- =====================================================
-- 1. Fix process_bonus_payment
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
  v_payment_id UUID;
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

  -- Insert payment record so patient balance gets updated via trigger
  INSERT INTO payments (
    clinic_id, patient_id, amount, payment_method, notes, received_by
  ) VALUES (
    p_clinic_id, p_patient_id, p_amount, 'bonus',
    'Оплата бонусами', p_deducted_by
  ) RETURNING id INTO v_payment_id;

  -- Log bonus deduction
  PERFORM log_audit_event(
    p_clinic_id,
    'BONUS_DEDUCTED',
    'patient_loyalty',
    p_patient_id,
    json_build_object('old_balance', v_current_balance),
    json_build_object('new_balance', v_updated_balance, 'deducted', p_amount, 'payment_id', v_payment_id)
  );

  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'previous_balance', v_current_balance,
    'deducted_amount', p_amount,
    'new_balance', v_updated_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Fix process_deposit_payment
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
  v_payment_id UUID;
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

  -- Insert payment record so patient balance gets updated via trigger
  INSERT INTO payments (
    clinic_id, patient_id, amount, payment_method, notes, received_by
  ) VALUES (
    p_clinic_id, p_patient_id, p_amount, 'deposit',
    'Оплата с депозита', p_deducted_by
  ) RETURNING id INTO v_payment_id;

  -- Log deposit usage
  PERFORM log_audit_event(
    p_clinic_id,
    'DEPOSIT_USED',
    'patient_deposits',
    p_patient_id,
    json_build_object('old_balance', v_current_balance),
    json_build_object('new_balance', v_updated_balance, 'used', p_amount, 'payment_id', v_payment_id)
  );

  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'previous_balance', v_current_balance,
    'used_amount', p_amount,
    'new_balance', v_updated_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION process_bonus_payment TO authenticated;
GRANT EXECUTE ON FUNCTION process_deposit_payment TO authenticated;
