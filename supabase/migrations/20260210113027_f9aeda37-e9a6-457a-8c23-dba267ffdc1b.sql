
-- Function to update loyalty after a payment is made
CREATE OR REPLACE FUNCTION public.update_loyalty_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clinic_id UUID;
  v_program loyalty_programs%ROWTYPE;
  v_loyalty_record patient_loyalty%ROWTYPE;
  v_bonus_amount NUMERIC;
  v_new_total_spent NUMERIC;
  v_new_discount NUMERIC := 0;
  v_new_tier TEXT := NULL;
  v_tier RECORD;
BEGIN
  -- Only process positive payments (not refunds)
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  v_clinic_id := NEW.clinic_id;

  -- Check if loyalty program exists and is active
  SELECT * INTO v_program
  FROM loyalty_programs
  WHERE clinic_id = v_clinic_id AND is_active = true;

  IF v_program IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get or create patient_loyalty record
  SELECT * INTO v_loyalty_record
  FROM patient_loyalty
  WHERE patient_id = NEW.patient_id AND clinic_id = v_clinic_id;

  IF v_loyalty_record IS NULL THEN
    INSERT INTO patient_loyalty (clinic_id, patient_id, total_spent, bonus_balance)
    VALUES (v_clinic_id, NEW.patient_id, 0, 0)
    RETURNING * INTO v_loyalty_record;
  END IF;

  v_new_total_spent := v_loyalty_record.total_spent + NEW.amount;

  -- Calculate bonus accrual
  v_bonus_amount := 0;
  IF v_program.program_type IN ('bonus', 'both') AND v_program.bonus_percent > 0 THEN
    v_bonus_amount := ROUND(NEW.amount * v_program.bonus_percent / 100, 0);
  END IF;

  -- Calculate discount tier
  IF v_program.program_type IN ('discount', 'both') AND v_program.discount_tiers IS NOT NULL THEN
    FOR v_tier IN
      SELECT * FROM jsonb_to_recordset(v_program.discount_tiers::jsonb) AS x(min_spent numeric, discount_percent numeric)
      ORDER BY min_spent DESC
    LOOP
      IF v_new_total_spent >= v_tier.min_spent THEN
        v_new_discount := v_tier.discount_percent;
        EXIT;
      END IF;
    END LOOP;

    -- Determine tier name
    IF v_new_discount >= 10 THEN
      v_new_tier := 'Платинум';
    ELSIF v_new_discount >= 5 THEN
      v_new_tier := 'Золотой';
    ELSIF v_new_discount >= 3 THEN
      v_new_tier := 'Серебряный';
    ELSIF v_new_discount > 0 THEN
      v_new_tier := 'Бронзовый';
    END IF;
  END IF;

  -- Update patient_loyalty
  UPDATE patient_loyalty
  SET total_spent = v_new_total_spent,
      bonus_balance = bonus_balance + v_bonus_amount,
      current_discount_percent = v_new_discount,
      current_tier = v_new_tier,
      updated_at = now()
  WHERE id = v_loyalty_record.id;

  -- Log loyalty transaction for bonus accrual
  IF v_bonus_amount > 0 THEN
    INSERT INTO loyalty_transactions (clinic_id, patient_id, payment_id, type, amount, description)
    VALUES (v_clinic_id, NEW.patient_id, NEW.id, 'accrual', v_bonus_amount, 
            'Начисление ' || v_bonus_amount || ' бонусов за оплату ' || NEW.amount || ' сум');
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS trg_update_loyalty_on_payment ON payments;
CREATE TRIGGER trg_update_loyalty_on_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION update_loyalty_on_payment();

-- Function to process bonus payment (deduct from bonus balance)
CREATE OR REPLACE FUNCTION public.process_bonus_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_deducted_by UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loyalty patient_loyalty%ROWTYPE;
  v_actual_amount NUMERIC;
BEGIN
  SELECT * INTO v_loyalty
  FROM patient_loyalty
  WHERE patient_id = p_patient_id AND clinic_id = p_clinic_id;

  IF v_loyalty IS NULL OR v_loyalty.bonus_balance <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Нет бонусного баланса');
  END IF;

  v_actual_amount := LEAST(p_amount, v_loyalty.bonus_balance);

  -- Deduct bonus
  UPDATE patient_loyalty
  SET bonus_balance = bonus_balance - v_actual_amount, updated_at = now()
  WHERE id = v_loyalty.id;

  -- Log transaction
  INSERT INTO loyalty_transactions (clinic_id, patient_id, type, amount, description, created_by)
  VALUES (p_clinic_id, p_patient_id, 'redemption', -v_actual_amount, 
          'Списание ' || v_actual_amount || ' бонусов', p_deducted_by);

  -- Create a corresponding payment record so balance updates
  INSERT INTO payments (clinic_id, patient_id, amount, payment_method, notes, received_by)
  VALUES (p_clinic_id, p_patient_id, v_actual_amount, 'bonus', 'Оплата бонусами', p_deducted_by);

  RETURN json_build_object(
    'success', true,
    'amount_deducted', v_actual_amount,
    'remaining_bonus', v_loyalty.bonus_balance - v_actual_amount
  );
END;
$$;

-- Function to process deposit payment
CREATE OR REPLACE FUNCTION public.process_deposit_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_deducted_by UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deposit patient_deposits%ROWTYPE;
  v_actual_amount NUMERIC;
BEGIN
  SELECT * INTO v_deposit
  FROM patient_deposits
  WHERE patient_id = p_patient_id AND clinic_id = p_clinic_id;

  IF v_deposit IS NULL OR v_deposit.balance <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Нет средств на депозите');
  END IF;

  v_actual_amount := LEAST(p_amount, v_deposit.balance);

  -- Deduct deposit
  UPDATE patient_deposits
  SET balance = balance - v_actual_amount, updated_at = now()
  WHERE id = v_deposit.id;

  -- Log transaction
  INSERT INTO deposit_transactions (clinic_id, patient_id, type, amount, description, created_by)
  VALUES (p_clinic_id, p_patient_id, 'usage', -v_actual_amount, 
          'Списание с депозита: ' || v_actual_amount || ' сум', p_deducted_by);

  -- Create a corresponding payment record
  INSERT INTO payments (clinic_id, patient_id, amount, payment_method, notes, received_by)
  VALUES (p_clinic_id, p_patient_id, v_actual_amount, 'deposit', 'Оплата с депозита', p_deducted_by);

  RETURN json_build_object(
    'success', true,
    'amount_deducted', v_actual_amount,
    'remaining_deposit', v_deposit.balance - v_actual_amount
  );
END;
$$;
