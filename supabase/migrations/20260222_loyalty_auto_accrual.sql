-- =====================================================
-- Migration: Auto-accrue loyalty bonuses/discounts on payment
-- Date: 2026-02-22
-- Description:
--   Trigger on payments table that:
--   1. Updates patient_loyalty.total_spent
--   2. Accrues bonus points (bonus_percent % of payment)
--   3. Updates discount tier based on total_spent thresholds
--   Skips bonus/deposit deduction payments.
-- =====================================================

-- Fix: patient_loyalty needs composite unique on (clinic_id, patient_id) for ON CONFLICT
ALTER TABLE public.patient_loyalty DROP CONSTRAINT IF EXISTS patient_loyalty_patient_id_key;
ALTER TABLE public.patient_loyalty ADD CONSTRAINT patient_loyalty_clinic_patient_unique UNIQUE (clinic_id, patient_id);

CREATE OR REPLACE FUNCTION public.auto_accrue_loyalty()
RETURNS TRIGGER AS $$
DECLARE
  v_program RECORD;
  v_bonus_amount NUMERIC;
  v_total_spent NUMERIC;
  v_new_discount NUMERIC := 0;
BEGIN
  -- Only process real payments (not bonus/deposit deductions)
  IF NEW.payment_method IN ('bonus', 'deposit') THEN
    RETURN NEW;
  END IF;

  -- Get loyalty program for this clinic
  SELECT * INTO v_program
  FROM public.loyalty_programs
  WHERE clinic_id = NEW.clinic_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Upsert patient_loyalty record
  INSERT INTO public.patient_loyalty (clinic_id, patient_id, total_spent, bonus_balance, current_discount_percent)
  VALUES (NEW.clinic_id, NEW.patient_id, NEW.amount, 0, 0)
  ON CONFLICT (clinic_id, patient_id) DO UPDATE
  SET total_spent = patient_loyalty.total_spent + NEW.amount,
      updated_at = now();

  -- Get updated total_spent
  SELECT total_spent INTO v_total_spent
  FROM public.patient_loyalty
  WHERE clinic_id = NEW.clinic_id AND patient_id = NEW.patient_id;

  -- Accrue bonus points if program type includes bonus
  IF v_program.program_type IN ('bonus', 'both') AND v_program.bonus_percent > 0 THEN
    v_bonus_amount := ROUND(NEW.amount * v_program.bonus_percent / 100, 2);

    UPDATE public.patient_loyalty
    SET bonus_balance = bonus_balance + v_bonus_amount,
        updated_at = now()
    WHERE clinic_id = NEW.clinic_id AND patient_id = NEW.patient_id;

    -- Log bonus transaction
    INSERT INTO public.loyalty_transactions (clinic_id, patient_id, type, amount, description, payment_id)
    VALUES (NEW.clinic_id, NEW.patient_id, 'accrual', v_bonus_amount,
            'Кэшбэк ' || v_program.bonus_percent || '% от оплаты ' || NEW.amount, NEW.id);
  END IF;

  -- Update discount tier if program type includes discount
  IF v_program.program_type IN ('discount', 'both') AND v_program.discount_tiers IS NOT NULL THEN
    SELECT (tier->>'discount_percent')::numeric INTO v_new_discount
    FROM jsonb_array_elements(v_program.discount_tiers) AS tier
    WHERE (tier->>'min_spent')::numeric <= v_total_spent
    ORDER BY (tier->>'discount_percent')::numeric DESC
    LIMIT 1;

    IF v_new_discount IS NOT NULL THEN
      UPDATE public.patient_loyalty
      SET current_discount_percent = v_new_discount,
          updated_at = now()
      WHERE clinic_id = NEW.clinic_id AND patient_id = NEW.patient_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_accrue_loyalty ON public.payments;
CREATE TRIGGER trg_auto_accrue_loyalty
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accrue_loyalty();

NOTIFY pgrst, 'reload schema';
