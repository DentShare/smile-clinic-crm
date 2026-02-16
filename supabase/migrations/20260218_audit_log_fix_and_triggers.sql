-- Phase 9: Audit Log — Fix broken triggers and add comprehensive auditing
-- The old triggers referenced 'audit_log' (singular) which was dropped.
-- Fix them to use 'audit_logs' (plural) which exists.

-- 1. Recreate auto_audit function to use audit_logs (plural)
CREATE OR REPLACE FUNCTION public.auto_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
  v_clinic_id UUID;
  v_record_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_clinic_id := NEW.clinic_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_clinic_id := NEW.clinic_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
    v_record_id := OLD.id;
    v_clinic_id := OLD.clinic_id;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    clinic_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    v_clinic_id,
    v_action,
    TG_TABLE_NAME,
    v_record_id,
    v_old_values,
    v_new_values
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old broken triggers
DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
DROP TRIGGER IF EXISTS audit_performed_works_trigger ON public.performed_works;
DROP TRIGGER IF EXISTS log_patient_modifications ON public.patients;

-- 3. Recreate triggers using the fixed function
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_changes();

CREATE TRIGGER audit_performed_works_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.performed_works
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_changes();

CREATE TRIGGER audit_patients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_changes();

CREATE TRIGGER audit_appointments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.auto_audit_changes();

-- 4. Update log_audit_event to also use audit_logs (fix if needed)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_clinic_id UUID,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    clinic_id, user_id, action, table_name,
    record_id, old_values, new_values
  ) VALUES (
    p_clinic_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    p_action, p_table_name,
    p_record_id, p_old_values, p_new_values
  )
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;
