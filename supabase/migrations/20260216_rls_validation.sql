-- ============================================================
-- ФАЗА 1: Валидация RLS-политик безопасности
-- Dentelica CRM — Все таблицы должны иметь RLS
-- ============================================================

-- Проверяем что RLS включен на всех таблицах
DO $$
DECLARE
  tbl RECORD;
  missing_rls TEXT[] := '{}';
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = tbl.tablename
      AND n.nspname = 'public'
      AND c.relrowsecurity = true
    ) THEN
      missing_rls := missing_rls || tbl.tablename;
    END IF;
  END LOOP;

  IF array_length(missing_rls, 1) > 0 THEN
    RAISE WARNING 'Tables missing RLS: %', array_to_string(missing_rls, ', ');
  ELSE
    RAISE NOTICE 'All public tables have RLS enabled';
  END IF;
END $$;

-- Добавляем индексы для оптимизации RLS-запросов
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_start ON public.appointments(clinic_id, start_time);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON public.patients(clinic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_date ON public.payments(clinic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_performed_works_clinic ON public.performed_works(clinic_id);
CREATE INDEX IF NOT EXISTS idx_performed_works_doctor ON public.performed_works(doctor_id);
CREATE INDEX IF NOT EXISTS idx_services_clinic ON public.services(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventory_clinic ON public.inventory(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_clinic ON public.treatment_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_documents_clinic ON public.documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_salary_reports_clinic ON public.salary_reports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_salary_reports_doctor ON public.salary_reports(doctor_id);
