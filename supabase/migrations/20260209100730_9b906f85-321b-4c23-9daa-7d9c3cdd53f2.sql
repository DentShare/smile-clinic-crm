-- ============================================
-- PHASE 1 CONTINUATION: Complete RLS and Audit Infrastructure
-- ============================================

-- Drop conflicting policy and recreate
DROP POLICY IF EXISTS "Admins can manage service categories" ON public.service_categories;

-- Create new comprehensive policy for service_categories
CREATE POLICY "Admins can manage service categories v2"
ON public.service_categories FOR ALL
TO authenticated
USING (
  (clinic_id = public.get_user_clinic_id(auth.uid()) AND 
   (public.has_role(auth.uid(), 'clinic_admin') OR public.has_role(auth.uid(), 'reception')))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (clinic_id = public.get_user_clinic_id(auth.uid()) AND 
   (public.has_role(auth.uid(), 'clinic_admin') OR public.has_role(auth.uid(), 'reception')))
  OR public.is_super_admin(auth.uid())
);

-- ============================================
-- CREATE AUDIT_LOGS TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Clinic admins can view audit logs for their clinic" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only clinic admins and super admins can view audit logs
CREATE POLICY "Clinic admins can view audit logs for their clinic"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'))
  OR public.is_super_admin(auth.uid())
);

-- Only system can insert audit logs (via security definer function)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_id ON public.audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Create function to log audit events
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
    clinic_id,
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    p_clinic_id,
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_doctor ON public.appointments(clinic_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_created ON public.payments(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_patient_id ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_performed_works_patient ON public.performed_works(patient_id);
CREATE INDEX IF NOT EXISTS idx_performed_works_appointment ON public.performed_works(appointment_id);
CREATE INDEX IF NOT EXISTS idx_performed_works_created ON public.performed_works(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON public.treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_services_clinic_category ON public.services(clinic_id, category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_clinic ON public.inventory(clinic_id);