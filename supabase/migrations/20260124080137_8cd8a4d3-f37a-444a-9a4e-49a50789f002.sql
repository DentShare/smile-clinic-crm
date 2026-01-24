-- =====================================================
-- PATIENT LEDGER SYSTEM - Financial Tracking Migration
-- =====================================================

-- 1. Add fiscal_check_url to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS fiscal_check_url TEXT;

-- 2. Add patient_id to performed_works (currently only has appointment_id)
ALTER TABLE public.performed_works 
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.patients(id);

-- 3. Add doctor_id to performed_works for tracking who performed the service
ALTER TABLE public.performed_works 
ADD COLUMN IF NOT EXISTS doctor_id UUID;

-- 4. Create enum for payment methods if not exists
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM (
        'cash', 
        'card_terminal', 
        'uzcard',
        'humo',
        'visa',
        'mastercard',
        'click', 
        'payme', 
        'uzum',
        'bank_transfer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Function to calculate patient balance from ledger
CREATE OR REPLACE FUNCTION public.calculate_patient_balance(p_patient_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_payments NUMERIC;
    total_charges NUMERIC;
BEGIN
    -- Sum all payments (credits)
    SELECT COALESCE(SUM(amount), 0)
    INTO total_payments
    FROM public.payments
    WHERE patient_id = p_patient_id;
    
    -- Sum all performed works (debits/charges)
    SELECT COALESCE(SUM(total), 0)
    INTO total_charges
    FROM public.performed_works
    WHERE patient_id = p_patient_id;
    
    -- Balance = Payments - Charges
    -- Positive = patient has credit/advance
    -- Negative = patient owes money
    RETURN total_payments - total_charges;
END;
$$;

-- 6. Function to get patient finance summary
CREATE OR REPLACE FUNCTION public.get_patient_finance_summary(p_patient_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    v_total_paid NUMERIC;
    v_total_charged NUMERIC;
    v_current_balance NUMERIC;
    v_planned_cost NUMERIC;
BEGIN
    -- Total payments received
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM public.payments
    WHERE patient_id = p_patient_id;
    
    -- Total performed work cost
    SELECT COALESCE(SUM(total), 0)
    INTO v_total_charged
    FROM public.performed_works
    WHERE patient_id = p_patient_id;
    
    -- Current balance (positive = credit, negative = debt)
    v_current_balance := v_total_paid - v_total_charged;
    
    -- Planned cost (from active treatment plans, not yet performed)
    SELECT COALESCE(SUM(tpi.total_price), 0)
    INTO v_planned_cost
    FROM public.treatment_plan_items tpi
    JOIN public.treatment_plan_stages tps ON tpi.stage_id = tps.id
    JOIN public.treatment_plans tp ON tps.treatment_plan_id = tp.id
    WHERE tp.patient_id = p_patient_id
      AND tp.status IN ('draft', 'active')
      AND tpi.is_completed = false;
    
    result := json_build_object(
        'patient_id', p_patient_id,
        'total_treatment_cost', v_total_charged,
        'total_paid', v_total_paid,
        'current_balance', v_current_balance,
        'current_debt', CASE WHEN v_current_balance < 0 THEN ABS(v_current_balance) ELSE 0 END,
        'advance', CASE WHEN v_current_balance > 0 THEN v_current_balance ELSE 0 END,
        'planned_cost', v_planned_cost
    );
    
    RETURN result;
END;
$$;

-- 7. Trigger function to update patient balance on performed_work insert/update/delete
CREATE OR REPLACE FUNCTION public.update_patient_balance_on_work()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_patient_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- Determine patient_id based on operation
    IF TG_OP = 'DELETE' THEN
        v_patient_id := OLD.patient_id;
    ELSE
        v_patient_id := NEW.patient_id;
        
        -- If patient_id is null, try to get it from appointment
        IF v_patient_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
            SELECT patient_id INTO v_patient_id
            FROM public.appointments
            WHERE id = NEW.appointment_id;
            
            -- Update the performed_work with patient_id
            NEW.patient_id := v_patient_id;
        END IF;
    END IF;
    
    -- Calculate and update patient balance
    IF v_patient_id IS NOT NULL THEN
        v_new_balance := public.calculate_patient_balance(v_patient_id);
        
        UPDATE public.patients
        SET balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_patient_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 8. Trigger function to update patient balance on payment insert/update/delete
CREATE OR REPLACE FUNCTION public.update_patient_balance_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_patient_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- Determine patient_id based on operation
    IF TG_OP = 'DELETE' THEN
        v_patient_id := OLD.patient_id;
    ELSE
        v_patient_id := NEW.patient_id;
    END IF;
    
    -- Calculate and update patient balance
    IF v_patient_id IS NOT NULL THEN
        v_new_balance := public.calculate_patient_balance(v_patient_id);
        
        UPDATE public.patients
        SET balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_patient_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- 9. Create triggers for automatic balance updates
DROP TRIGGER IF EXISTS trigger_update_balance_on_work ON public.performed_works;
CREATE TRIGGER trigger_update_balance_on_work
    AFTER INSERT OR UPDATE OR DELETE ON public.performed_works
    FOR EACH ROW
    EXECUTE FUNCTION public.update_patient_balance_on_work();

DROP TRIGGER IF EXISTS trigger_update_balance_on_payment ON public.payments;
CREATE TRIGGER trigger_update_balance_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_patient_balance_on_payment();

-- 10. Function to complete services from treatment plan (move to performed_works)
CREATE OR REPLACE FUNCTION public.complete_treatment_services(
    p_appointment_id UUID,
    p_item_ids UUID[],
    p_doctor_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item RECORD;
    v_patient_id UUID;
    v_clinic_id UUID;
    v_performed_work_id UUID;
    v_completed_count INTEGER := 0;
    v_total_amount NUMERIC := 0;
BEGIN
    -- Get patient and clinic from appointment
    SELECT patient_id, clinic_id
    INTO v_patient_id, v_clinic_id
    FROM public.appointments
    WHERE id = p_appointment_id;
    
    IF v_patient_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Appointment not found');
    END IF;
    
    -- Process each treatment plan item
    FOR v_item IN 
        SELECT tpi.*
        FROM public.treatment_plan_items tpi
        WHERE tpi.id = ANY(p_item_ids)
          AND tpi.is_completed = false
    LOOP
        -- Create performed work record
        INSERT INTO public.performed_works (
            clinic_id,
            appointment_id,
            patient_id,
            doctor_id,
            service_id,
            tooth_number,
            quantity,
            price,
            discount_percent,
            total,
            treatment_plan_item_id
        ) VALUES (
            v_clinic_id,
            p_appointment_id,
            v_patient_id,
            p_doctor_id,
            v_item.service_id,
            v_item.tooth_number,
            v_item.quantity,
            v_item.unit_price,
            v_item.discount_percent,
            v_item.total_price,
            v_item.id
        )
        RETURNING id INTO v_performed_work_id;
        
        -- Mark treatment plan item as completed
        UPDATE public.treatment_plan_items
        SET is_completed = true,
            completed_at = NOW(),
            appointment_id = p_appointment_id
        WHERE id = v_item.id;
        
        v_completed_count := v_completed_count + 1;
        v_total_amount := v_total_amount + v_item.total_price;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'completed_count', v_completed_count,
        'total_amount', v_total_amount,
        'new_balance', public.calculate_patient_balance(v_patient_id)
    );
END;
$$;

-- 11. Function to process payment
CREATE OR REPLACE FUNCTION public.process_patient_payment(
    p_clinic_id UUID,
    p_patient_id UUID,
    p_amount NUMERIC,
    p_method VARCHAR,
    p_appointment_id UUID DEFAULT NULL,
    p_fiscal_check_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_received_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Amount must be positive');
    END IF;
    
    -- Create payment record
    INSERT INTO public.payments (
        clinic_id,
        patient_id,
        appointment_id,
        amount,
        payment_method,
        fiscal_check_url,
        notes,
        received_by,
        is_fiscalized
    ) VALUES (
        p_clinic_id,
        p_patient_id,
        p_appointment_id,
        p_amount,
        p_method,
        p_fiscal_check_url,
        p_notes,
        p_received_by,
        p_fiscal_check_url IS NOT NULL
    )
    RETURNING id INTO v_payment_id;
    
    -- Get new balance (trigger already updated it)
    v_new_balance := public.calculate_patient_balance(p_patient_id);
    
    RETURN json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'amount', p_amount,
        'new_balance', v_new_balance
    );
END;
$$;

-- 12. Backfill patient_id in performed_works from appointments
UPDATE public.performed_works pw
SET patient_id = a.patient_id
FROM public.appointments a
WHERE pw.appointment_id = a.id
  AND pw.patient_id IS NULL;

-- 13. Recalculate all patient balances
UPDATE public.patients p
SET balance = (
    SELECT COALESCE(SUM(pay.amount), 0) - COALESCE(SUM(pw.total), 0)
    FROM (
        SELECT amount FROM public.payments WHERE patient_id = p.id
    ) pay
    FULL OUTER JOIN (
        SELECT total FROM public.performed_works WHERE patient_id = p.id
    ) pw ON false
);

-- More accurate balance recalculation
UPDATE public.patients p
SET balance = public.calculate_patient_balance(p.id);

-- 14. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_patient_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_patient_finance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_treatment_services(UUID, UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_patient_payment(UUID, UUID, NUMERIC, VARCHAR, UUID, TEXT, TEXT, UUID) TO authenticated;