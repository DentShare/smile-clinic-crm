-- Create function to process patient refund
CREATE OR REPLACE FUNCTION public.process_patient_refund(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_payment_id uuid,
  p_amount numeric,
  p_reason text DEFAULT NULL,
  p_refund_method text DEFAULT 'cash',
  p_refunded_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_payment payments%ROWTYPE;
  v_refund_id uuid;
  v_new_balance numeric;
  v_max_refund numeric;
BEGIN
  -- Verify the payment exists and belongs to this patient/clinic
  SELECT * INTO v_original_payment
  FROM payments
  WHERE id = p_payment_id
    AND patient_id = p_patient_id
    AND clinic_id = p_clinic_id;

  IF v_original_payment IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Платёж не найден'
    );
  END IF;

  -- Check the payment amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Сумма возврата должна быть положительной'
    );
  END IF;

  -- Check max refund (original amount - already refunded)
  SELECT v_original_payment.amount - COALESCE(SUM(ABS(amount)), 0)
  INTO v_max_refund
  FROM payments
  WHERE notes LIKE 'Возврат для платежа ' || p_payment_id::text || '%'
    AND amount < 0;

  IF p_amount > v_max_refund THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Сумма возврата превышает доступную сумму: ' || v_max_refund::text
    );
  END IF;

  -- Create refund record (negative payment)
  INSERT INTO payments (
    clinic_id,
    patient_id,
    amount,
    payment_method,
    received_by,
    notes
  ) VALUES (
    p_clinic_id,
    p_patient_id,
    -p_amount,  -- Negative amount for refund
    p_refund_method,
    p_refunded_by,
    'Возврат для платежа ' || p_payment_id::text || COALESCE(': ' || p_reason, '')
  )
  RETURNING id INTO v_refund_id;

  -- Get new balance (trigger should have updated it)
  SELECT balance INTO v_new_balance
  FROM patients
  WHERE id = p_patient_id;

  RETURN json_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'amount', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;