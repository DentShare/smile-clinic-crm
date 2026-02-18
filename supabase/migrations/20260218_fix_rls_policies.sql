-- Fix missing RLS policies for inventory_items, dental_chart, loyalty_cards
-- Fix overly permissive USING(true) on audit_logs

-- ═══════════════════════════════════════════════════════════════
-- 1-3. Enable RLS on inventory, dental_chart, loyalty_cards (if they exist)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory') THEN
    ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "inventory_clinic_isolation" ON public.inventory;
    CREATE POLICY "inventory_clinic_isolation" ON public.inventory
      FOR ALL USING (clinic_id = get_user_clinic_id());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dental_chart') THEN
    ALTER TABLE public.dental_chart ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "dental_chart_clinic_isolation" ON public.dental_chart;
    CREATE POLICY "dental_chart_clinic_isolation" ON public.dental_chart
      FOR ALL USING (clinic_id = get_user_clinic_id());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loyalty_cards') THEN
    ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "loyalty_cards_clinic_isolation" ON public.loyalty_cards;
    CREATE POLICY "loyalty_cards_clinic_isolation" ON public.loyalty_cards
      FOR ALL USING (clinic_id = get_user_clinic_id());
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. audit_logs — Replace USING(true) with proper clinic isolation
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs' AND qual = 'true'
  ) THEN
    -- Drop the overly permissive policy
    DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
    DROP POLICY IF EXISTS "audit_log_select" ON public.audit_logs;
    DROP POLICY IF EXISTS "audit_logs_access" ON public.audit_logs;

    -- Create proper policy
    CREATE POLICY "audit_logs_clinic_isolation" ON public.audit_logs
      FOR ALL USING (
        clinic_id = get_user_clinic_id()
        OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. Ensure RLS on Phase 3 tables (discount_cards, prescriptions, etc.)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'discount_cards') THEN
    ALTER TABLE public.discount_cards ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "discount_cards_clinic_isolation" ON public.discount_cards;
    CREATE POLICY "discount_cards_clinic_isolation" ON public.discount_cards
      FOR ALL USING (clinic_id = get_user_clinic_id());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'prescriptions') THEN
    ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "prescriptions_clinic_isolation" ON public.prescriptions;
    CREATE POLICY "prescriptions_clinic_isolation" ON public.prescriptions
      FOR ALL USING (clinic_id = get_user_clinic_id());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'insurance_companies') THEN
    ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "insurance_companies_clinic_isolation" ON public.insurance_companies;
    CREATE POLICY "insurance_companies_clinic_isolation" ON public.insurance_companies
      FOR ALL USING (clinic_id = get_user_clinic_id());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'referral_rewards') THEN
    ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "referral_rewards_clinic_isolation" ON public.referral_rewards;
    CREATE POLICY "referral_rewards_clinic_isolation" ON public.referral_rewards
      FOR ALL USING (clinic_id = get_user_clinic_id());
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
