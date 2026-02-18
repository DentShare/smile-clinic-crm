-- =====================================================
-- Migration: Allocate advance (unallocated payments) to works
-- Date: 2026-02-22
-- Description:
--   When a patient has advance (overpayment), this function
--   finds payments with unallocated amounts and allocates
--   them to the specified performed works.
-- =====================================================

CREATE OR REPLACE FUNCTION public.allocate_advance_to_works(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_allocations JSONB
) RETURNS JSON AS $$
DECLARE
  alloc JSONB;
  v_work_id UUID;
  v_alloc_amount DECIMAL(12,2);
  v_work_remaining DECIMAL(12,2);
  v_total_allocated DECIMAL(12,2) := 0;
  v_payment RECORD;
  v_need DECIMAL(12,2);
  v_give DECIMAL(12,2);
BEGIN
  IF NOT verify_clinic_access(p_clinic_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- For each work allocation requested
  FOR alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_work_id := (alloc->>'performed_work_id')::UUID;
    v_alloc_amount := (alloc->>'amount')::DECIMAL(12,2);

    IF v_alloc_amount <= 0 THEN CONTINUE; END IF;

    -- Verify work belongs to patient and clinic
    IF NOT EXISTS (
      SELECT 1 FROM performed_works
      WHERE id = v_work_id AND clinic_id = p_clinic_id AND patient_id = p_patient_id
    ) THEN CONTINUE; END IF;

    -- Get remaining unpaid amount for this work
    SELECT pw.total - COALESCE(SUM(pa.amount), 0)
    INTO v_work_remaining
    FROM performed_works pw
    LEFT JOIN payment_allocations pa ON pa.performed_work_id = pw.id
    WHERE pw.id = v_work_id
    GROUP BY pw.total;

    IF v_work_remaining IS NULL OR v_work_remaining <= 0 THEN CONTINUE; END IF;
    IF v_alloc_amount > v_work_remaining THEN
      v_alloc_amount := v_work_remaining;
    END IF;

    v_need := v_alloc_amount;

    -- Find payments with unallocated amounts (FIFO order)
    FOR v_payment IN
      SELECT
        p.id as payment_id,
        p.amount - COALESCE(
          (SELECT SUM(pa2.amount) FROM payment_allocations pa2 WHERE pa2.payment_id = p.id),
          0
        ) as unallocated
      FROM payments p
      WHERE p.clinic_id = p_clinic_id
        AND p.patient_id = p_patient_id
        AND p.amount - COALESCE(
          (SELECT SUM(pa2.amount) FROM payment_allocations pa2 WHERE pa2.payment_id = p.id),
          0
        ) > 0
      ORDER BY p.created_at ASC
    LOOP
      IF v_need <= 0 THEN EXIT; END IF;

      v_give := LEAST(v_need, v_payment.unallocated);

      INSERT INTO payment_allocations (clinic_id, payment_id, performed_work_id, amount)
      VALUES (p_clinic_id, v_payment.payment_id, v_work_id, v_give)
      ON CONFLICT (payment_id, performed_work_id)
      DO UPDATE SET amount = payment_allocations.amount + EXCLUDED.amount;

      v_need := v_need - v_give;
      v_total_allocated := v_total_allocated + v_give;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'total_allocated', v_total_allocated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION allocate_advance_to_works TO authenticated;

NOTIFY pgrst, 'reload schema';
