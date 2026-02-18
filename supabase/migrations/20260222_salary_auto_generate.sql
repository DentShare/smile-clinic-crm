-- =====================================================
-- Migration: Salary auto-generation & bulk calculation
-- Date: 2026-02-22
-- Description:
--   1. Add auto_generate flag to salary_settings
--   2. RPC generate_salary_report — server-side salary calculation
--   3. RPC bulk_generate_salary_reports — multi-doctor calculation
--   4. RPC get_missing_salary_months — detect uncalculated months
-- =====================================================

-- 1. Auto-generate flag
ALTER TABLE public.salary_settings
  ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN NOT NULL DEFAULT false;

-- 2. Single-doctor salary report generation (server-side)
CREATE OR REPLACE FUNCTION public.generate_salary_report(
  p_clinic_id UUID,
  p_doctor_id UUID,
  p_period_start DATE,
  p_period_end DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setting RECORD;
  v_total_revenue NUMERIC := 0;
  v_commission NUMERIC := 0;
  v_bonus NUMERIC := 0;
  v_works_count INTEGER := 0;
  v_total_salary NUMERIC;
  v_report_id UUID;
  v_work RECORD;
  v_rate NUMERIC;
  v_max_bonus NUMERIC := 0;
BEGIN
  -- Get salary settings for this doctor
  SELECT * INTO v_setting
  FROM public.salary_settings
  WHERE clinic_id = p_clinic_id AND doctor_id = p_doctor_id;

  IF v_setting IS NULL THEN
    RAISE EXCEPTION 'No salary settings for doctor %', p_doctor_id;
  END IF;

  -- Calculate revenue and commission from performed works
  -- performed_works links to appointments which has doctor_id
  FOR v_work IN
    SELECT pw.total, s.category_id
    FROM public.performed_works pw
    JOIN public.appointments a ON a.id = pw.appointment_id
    LEFT JOIN public.services s ON s.id = pw.service_id
    WHERE pw.clinic_id = p_clinic_id
      AND a.doctor_id = p_doctor_id
      AND pw.created_at >= p_period_start::timestamptz
      AND pw.created_at < (p_period_end + INTERVAL '1 day')::timestamptz
  LOOP
    v_total_revenue := v_total_revenue + COALESCE(v_work.total, 0);
    v_works_count := v_works_count + 1;

    -- Find category-specific rate or use default
    SELECT scr.commission_percent INTO v_rate
    FROM public.salary_category_rates scr
    WHERE scr.salary_setting_id = v_setting.id
      AND scr.category_id = v_work.category_id;

    IF v_rate IS NULL THEN
      v_rate := v_setting.default_commission_percent;
    END IF;

    v_commission := v_commission + (COALESCE(v_work.total, 0) * v_rate / 100);
  END LOOP;

  -- Calculate bonus from thresholds (take the highest applicable)
  SELECT COALESCE(MAX(v_total_revenue * st.bonus_percent / 100 + st.bonus_fixed), 0)
  INTO v_max_bonus
  FROM public.salary_thresholds st
  WHERE st.salary_setting_id = v_setting.id
    AND st.min_revenue <= v_total_revenue;

  v_bonus := v_max_bonus;
  v_total_salary := v_setting.base_salary + v_commission + v_bonus;

  -- Upsert: if draft report exists for same period+doctor, update it
  SELECT id INTO v_report_id
  FROM public.salary_reports
  WHERE clinic_id = p_clinic_id
    AND doctor_id = p_doctor_id
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND status = 'draft';

  IF v_report_id IS NOT NULL THEN
    UPDATE public.salary_reports SET
      base_salary = v_setting.base_salary,
      commission_amount = v_commission,
      bonus_amount = v_bonus,
      total_salary = v_total_salary,
      total_revenue = v_total_revenue,
      works_count = v_works_count,
      created_at = NOW()
    WHERE id = v_report_id;
  ELSE
    INSERT INTO public.salary_reports (
      clinic_id, doctor_id, period_start, period_end,
      base_salary, commission_amount, bonus_amount,
      total_salary, total_revenue, works_count
    ) VALUES (
      p_clinic_id, p_doctor_id, p_period_start, p_period_end,
      v_setting.base_salary, v_commission, v_bonus,
      v_total_salary, v_total_revenue, v_works_count
    ) RETURNING id INTO v_report_id;
  END IF;

  RETURN v_report_id;
END;
$$;

-- 3. Bulk salary report generation
CREATE OR REPLACE FUNCTION public.bulk_generate_salary_reports(
  p_clinic_id UUID,
  p_doctor_ids UUID[],
  p_period_start DATE,
  p_period_end DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doc_id UUID;
  v_report_id UUID;
  v_generated INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  FOREACH v_doc_id IN ARRAY p_doctor_ids LOOP
    BEGIN
      v_report_id := public.generate_salary_report(p_clinic_id, v_doc_id, p_period_start, p_period_end);
      v_generated := v_generated + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('doctor_id', v_doc_id, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('generated', v_generated, 'errors', v_errors);
END;
$$;

-- 4. Find doctors with salary_settings but no report for previous month
CREATE OR REPLACE FUNCTION public.get_missing_salary_months(p_clinic_id UUID)
RETURNS TABLE(doctor_id UUID, doctor_name TEXT, period_start DATE)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_prev_start DATE;
  v_prev_end DATE;
BEGIN
  v_prev_start := date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE;
  v_prev_end := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;

  RETURN QUERY
  SELECT ss.doctor_id, p.full_name::TEXT AS doctor_name, v_prev_start AS period_start
  FROM public.salary_settings ss
  JOIN public.profiles p ON p.id = ss.doctor_id
  WHERE ss.clinic_id = p_clinic_id
    AND NOT EXISTS (
      SELECT 1 FROM public.salary_reports sr
      WHERE sr.clinic_id = p_clinic_id
        AND sr.doctor_id = ss.doctor_id
        AND sr.period_start = v_prev_start
    );
END;
$$;

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.generate_salary_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_generate_salary_reports TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_missing_salary_months TO authenticated;
