-- Phase 12: Performance optimization — Additional indexes for common queries

-- Audit log queries (filtered by action + date range)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_action ON public.audit_logs(clinic_id, action, created_at DESC);

-- Patient search by name (case-insensitive pattern matching)
CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm ON public.patients USING gin (full_name gin_trgm_ops);

-- Appointment queries by date range (common calendar view)
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_start ON public.appointments(clinic_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_start ON public.appointments(doctor_id, start_time);

-- Payment analytics (revenue by period)
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_fiscal ON public.payments(is_fiscalized) WHERE is_fiscalized = false;

-- Inventory low-stock alerts
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(clinic_id, quantity, min_quantity)
  WHERE quantity <= min_quantity AND is_active = true;

-- Service materials lookups
CREATE INDEX IF NOT EXISTS idx_service_materials_lookup ON public.service_materials(clinic_id, service_id);

-- Salary reports lookup by doctor+period
CREATE INDEX IF NOT EXISTS idx_salary_reports_doctor_period ON public.salary_reports(doctor_id, period_start DESC);

-- Notifications history
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON public.notifications(patient_id, created_at DESC);

-- Documents by patient
CREATE INDEX IF NOT EXISTS idx_documents_patient ON public.documents(patient_id, created_at DESC);
