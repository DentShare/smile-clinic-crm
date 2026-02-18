-- =====================================================
-- Fix payment schema issues causing runtime errors
-- =====================================================

-- Fix 1: Update payments.payment_method CHECK constraint
-- to include 'bonus' and 'deposit' methods
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method::text = ANY (ARRAY[
    'cash','uzcard','humo','visa','mastercard','click','payme','transfer','bonus','deposit'
  ]::text[]));

-- Fix 2: Add missing columns to patient_loyalty table
-- (referenced by update_loyalty_on_payment trigger)
ALTER TABLE public.patient_loyalty
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_discount_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_tier TEXT;

-- Fix 3: Add max_staff column to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_staff INTEGER DEFAULT 10;

-- Fix 4: Rename deposit_balance to balance in patient_deposits
-- (both frontend and process_deposit_payment RPC expect 'balance')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patient_deposits' AND column_name = 'deposit_balance'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patient_deposits' AND column_name = 'balance'
  ) THEN
    ALTER TABLE public.patient_deposits RENAME COLUMN deposit_balance TO balance;
  END IF;
END $$;

-- Fix 5: Update loyalty trigger to skip bonus/deposit payments
-- (bonus/deposit should not accrue loyalty points)
CREATE OR REPLACE FUNCTION public.update_loyalty_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_clinic_id UUID; v_program loyalty_programs%ROWTYPE;
  v_loyalty_record patient_loyalty%ROWTYPE;
  v_bonus_amount NUMERIC; v_new_total_spent NUMERIC;
  v_new_discount NUMERIC := 0; v_new_tier TEXT := NULL; v_tier RECORD;
BEGIN
  -- Skip non-positive amounts and bonus/deposit payments (they shouldn't accrue loyalty)
  IF NEW.amount <= 0 THEN RETURN NEW; END IF;
  IF NEW.payment_method IN ('bonus', 'deposit') THEN RETURN NEW; END IF;

  v_clinic_id := NEW.clinic_id;

  SELECT * INTO v_program FROM loyalty_programs WHERE clinic_id = v_clinic_id AND is_active = true;
  IF v_program IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_loyalty_record FROM patient_loyalty WHERE patient_id = NEW.patient_id AND clinic_id = v_clinic_id;
  IF v_loyalty_record IS NULL THEN
    INSERT INTO patient_loyalty (clinic_id, patient_id, total_spent, bonus_balance)
    VALUES (v_clinic_id, NEW.patient_id, 0, 0) RETURNING * INTO v_loyalty_record;
  END IF;

  v_new_total_spent := v_loyalty_record.total_spent + NEW.amount;
  v_bonus_amount := 0;

  IF v_program.program_type IN ('bonus', 'both') AND v_program.bonus_percent > 0 THEN
    v_bonus_amount := ROUND(NEW.amount * v_program.bonus_percent / 100, 0);
  END IF;

  IF v_program.program_type IN ('discount', 'both') AND v_program.discount_tiers IS NOT NULL THEN
    FOR v_tier IN SELECT * FROM jsonb_to_recordset(v_program.discount_tiers::jsonb) AS x(min_spent numeric, discount_percent numeric) ORDER BY min_spent DESC
    LOOP
      IF v_new_total_spent >= v_tier.min_spent THEN v_new_discount := v_tier.discount_percent; EXIT; END IF;
    END LOOP;
    IF v_new_discount >= 10 THEN v_new_tier := 'Платинум';
    ELSIF v_new_discount >= 5 THEN v_new_tier := 'Золотой';
    ELSIF v_new_discount >= 3 THEN v_new_tier := 'Серебряный';
    ELSIF v_new_discount > 0 THEN v_new_tier := 'Бронзовый';
    END IF;
  END IF;

  UPDATE patient_loyalty SET total_spent = v_new_total_spent,
    bonus_balance = bonus_balance + v_bonus_amount,
    current_discount_percent = v_new_discount, current_tier = v_new_tier, updated_at = now()
  WHERE id = v_loyalty_record.id;

  IF v_bonus_amount > 0 THEN
    INSERT INTO loyalty_transactions (clinic_id, patient_id, payment_id, type, amount, description)
    VALUES (v_clinic_id, NEW.patient_id, NEW.id, 'accrual', v_bonus_amount,
      'Начисление ' || v_bonus_amount || ' бонусов за оплату ' || NEW.amount || ' сум');
  END IF;

  RETURN NEW;
END;
$func$;

-- =====================================================
-- Fix 6: Fix log_audit_event function
-- The existing function references wrong table name (audit_log vs audit_logs)
-- and RPC functions call it with p_clinic_id as first param
-- =====================================================
DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, jsonb, jsonb, jsonb);

-- Overload WITH p_clinic_id (called by RPC functions)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_clinic_id UUID,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_values JSON,
  p_new_values JSON
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_logs (clinic_id, user_id, action, table_name, record_id, old_values, new_values)
  VALUES (p_clinic_id, auth.uid(), p_action, p_table_name, p_record_id, p_old_values::jsonb, p_new_values::jsonb)
  RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'log_audit_event failed: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Original JSONB version (without clinic_id, auto-detects from profile)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_values JSONB,
  p_new_values JSONB,
  p_metadata JSONB
) RETURNS UUID AS $$
DECLARE
  v_clinic_id UUID;
  v_audit_id UUID;
BEGIN
  SELECT clinic_id INTO v_clinic_id FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.audit_logs (clinic_id, user_id, action, table_name, record_id, old_values, new_values)
  VALUES (v_clinic_id, auth.uid(), p_action, p_table_name, p_record_id, p_old_values, COALESCE(p_new_values, p_metadata))
  RETURNING id INTO v_audit_id;
  RETURN v_audit_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'log_audit_event failed: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_audit_event(UUID, TEXT, TEXT, UUID, JSON, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, UUID, JSONB, JSONB, JSONB) TO authenticated;
