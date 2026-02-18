-- =====================================================
-- Migration: Payment Allocations (link payments to performed works)
-- Date: 2026-02-21
-- Description:
--   1. Create payment_allocations table
--   2. RPC get_unpaid_performed_works
--   3. Update process_patient_payment with allocations support
-- =====================================================

-- =====================================================
-- 1. payment_allocations table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  performed_work_id UUID REFERENCES public.performed_works(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, performed_work_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment
  ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_work
  ON public.payment_allocations(performed_work_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_clinic
  ON public.payment_allocations(clinic_id);

ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_allocations_select_policy ON public.payment_allocations;
CREATE POLICY payment_allocations_select_policy ON public.payment_allocations
FOR SELECT TO authenticated
USING (clinic_id = public.get_user_clinic_id(auth.uid()));

DROP POLICY IF EXISTS payment_allocations_insert_policy ON public.payment_allocations;
CREATE POLICY payment_allocations_insert_policy ON public.payment_allocations
FOR INSERT TO authenticated
WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

GRANT SELECT, INSERT ON public.payment_allocations TO authenticated;

-- =====================================================
-- 2. RPC: get_unpaid_performed_works
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_unpaid_performed_works(p_patient_id UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      pw.id,
      pw.service_id,
      COALESCE(s.name, 'Услуга') as service_name,
      pw.tooth_number,
      pw.total as total_cost,
      pw.total - COALESCE(
        (SELECT SUM(pa.amount) FROM payment_allocations pa WHERE pa.performed_work_id = pw.id),
        0
      ) as remaining,
      pw.created_at,
      a.start_time as visit_date,
      pw.appointment_id
    FROM performed_works pw
    LEFT JOIN services s ON s.id = pw.service_id
    LEFT JOIN appointments a ON a.id = pw.appointment_id
    WHERE pw.patient_id = p_patient_id
    AND pw.total - COALESCE(
      (SELECT SUM(pa.amount) FROM payment_allocations pa WHERE pa.performed_work_id = pw.id),
      0
    ) > 0
    ORDER BY pw.created_at ASC
  ) t;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_unpaid_performed_works TO authenticated;

-- =====================================================
-- 3. RPC: allocate_payment_to_works
--    Separate function to create allocations after payment
-- =====================================================
CREATE OR REPLACE FUNCTION public.allocate_payment_to_works(
  p_clinic_id UUID,
  p_payment_id UUID,
  p_allocations JSONB
) RETURNS JSON AS $$
DECLARE
  alloc JSONB;
  v_work_id UUID;
  v_amount DECIMAL(12,2);
  v_remaining DECIMAL(12,2);
  v_total_allocated DECIMAL(12,2) := 0;
BEGIN
  -- Verify clinic access
  IF NOT verify_clinic_access(p_clinic_id) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Verify payment exists and belongs to clinic
  IF NOT EXISTS (
    SELECT 1 FROM payments WHERE id = p_payment_id AND clinic_id = p_clinic_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;

  -- Process each allocation
  FOR alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_work_id := (alloc->>'performed_work_id')::UUID;
    v_amount := (alloc->>'amount')::DECIMAL(12,2);

    -- Verify performed_work exists
    IF NOT EXISTS (
      SELECT 1 FROM performed_works WHERE id = v_work_id AND clinic_id = p_clinic_id
    ) THEN
      CONTINUE;
    END IF;

    -- Check remaining amount for this work
    SELECT pw.total - COALESCE(SUM(pa.amount), 0)
    INTO v_remaining
    FROM performed_works pw
    LEFT JOIN payment_allocations pa ON pa.performed_work_id = pw.id
    WHERE pw.id = v_work_id
    GROUP BY pw.total;

    -- Don't over-allocate
    IF v_amount > v_remaining THEN
      v_amount := v_remaining;
    END IF;

    IF v_amount > 0 THEN
      INSERT INTO payment_allocations (clinic_id, payment_id, performed_work_id, amount)
      VALUES (p_clinic_id, p_payment_id, v_work_id, v_amount)
      ON CONFLICT (payment_id, performed_work_id)
      DO UPDATE SET amount = payment_allocations.amount + EXCLUDED.amount;

      v_total_allocated := v_total_allocated + v_amount;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'total_allocated', v_total_allocated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.allocate_payment_to_works TO authenticated;

-- =====================================================
-- 4. RPC: get_work_payment_status
--    Returns payment status for performed works of a patient
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_work_payment_status(p_patient_id UUID)
RETURNS JSON AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      pw.id as performed_work_id,
      pw.total as total_cost,
      COALESCE(SUM(pa.amount), 0) as paid_amount,
      CASE
        WHEN COALESCE(SUM(pa.amount), 0) >= pw.total THEN 'paid'
        WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END as status
    FROM performed_works pw
    LEFT JOIN payment_allocations pa ON pa.performed_work_id = pw.id
    WHERE pw.patient_id = p_patient_id
    GROUP BY pw.id, pw.total
  ) t;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_work_payment_status TO authenticated;
