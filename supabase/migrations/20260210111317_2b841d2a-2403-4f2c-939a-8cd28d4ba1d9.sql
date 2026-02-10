
-- =============================================
-- 1. РАСЧЁТ ЗП (Salary Calculation)
-- =============================================

-- Salary settings per doctor
CREATE TABLE public.salary_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  base_salary NUMERIC NOT NULL DEFAULT 0,
  default_commission_percent NUMERIC NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, doctor_id)
);

-- Category-specific commission rates
CREATE TABLE public.salary_category_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_setting_id UUID NOT NULL REFERENCES public.salary_settings(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.service_categories(id),
  commission_percent NUMERIC NOT NULL DEFAULT 30,
  UNIQUE (salary_setting_id, category_id)
);

-- Revenue threshold bonuses (e.g., if revenue > 10M, add 5%)
CREATE TABLE public.salary_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_setting_id UUID NOT NULL REFERENCES public.salary_settings(id) ON DELETE CASCADE,
  min_revenue NUMERIC NOT NULL DEFAULT 0,
  bonus_percent NUMERIC NOT NULL DEFAULT 0,
  bonus_fixed NUMERIC NOT NULL DEFAULT 0
);

-- Generated salary reports
CREATE TABLE public.salary_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  bonus_amount NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  total_salary NUMERIC NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  works_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'draft',
  notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_category_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage salary settings" ON public.salary_settings FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND has_role(auth.uid(), 'clinic_admin'));
CREATE POLICY "Doctors can view own salary settings" ON public.salary_settings FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage category rates" ON public.salary_category_rates FOR ALL
  USING (salary_setting_id IN (SELECT id FROM salary_settings WHERE clinic_id = get_user_clinic_id(auth.uid()) AND has_role(auth.uid(), 'clinic_admin')));

CREATE POLICY "Admins can manage salary thresholds" ON public.salary_thresholds FOR ALL
  USING (salary_setting_id IN (SELECT id FROM salary_settings WHERE clinic_id = get_user_clinic_id(auth.uid()) AND has_role(auth.uid(), 'clinic_admin')));

CREATE POLICY "Admins can manage salary reports" ON public.salary_reports FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND has_role(auth.uid(), 'clinic_admin'));
CREATE POLICY "Doctors can view own salary reports" ON public.salary_reports FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND doctor_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- =============================================
-- 2. ЛИСТЫ ОЖИДАНИЯ (Waiting List)
-- =============================================

CREATE TABLE public.waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  doctor_id UUID REFERENCES public.profiles(id),
  service_id UUID REFERENCES public.services(id),
  priority VARCHAR NOT NULL DEFAULT 'normal',
  preferred_date_from DATE,
  preferred_date_to DATE,
  preferred_time_from TIME,
  preferred_time_to TIME,
  notes TEXT,
  status VARCHAR NOT NULL DEFAULT 'waiting',
  appointment_id UUID REFERENCES public.appointments(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage waiting list" ON public.waiting_list FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (
    has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception') OR has_role(auth.uid(), 'doctor')
  ));
CREATE POLICY "Users can view waiting list" ON public.waiting_list FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

-- =============================================
-- 3. МАССОВЫЕ РАССЫЛКИ (Bulk Messaging)
-- =============================================

CREATE TABLE public.bulk_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  name VARCHAR NOT NULL,
  message_template TEXT NOT NULL,
  channel VARCHAR NOT NULL DEFAULT 'sms',
  filter_criteria JSONB DEFAULT '{}',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bulk_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.bulk_campaigns(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  status VARCHAR NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

ALTER TABLE public.bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON public.bulk_campaigns FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (
    has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')
  ));

CREATE POLICY "Admins can manage campaign recipients" ON public.bulk_campaign_recipients FOR ALL
  USING (campaign_id IN (SELECT id FROM bulk_campaigns WHERE clinic_id = get_user_clinic_id(auth.uid()) AND (
    has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')
  )));

-- =============================================
-- 4. ПРОГРАММА ЛОЯЛЬНОСТИ (Loyalty + Vouchers)
-- =============================================

-- Loyalty program settings per clinic
CREATE TABLE public.loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) UNIQUE,
  program_type VARCHAR NOT NULL DEFAULT 'discount',
  is_active BOOLEAN NOT NULL DEFAULT true,
  discount_tiers JSONB DEFAULT '[]',
  bonus_percent NUMERIC DEFAULT 5,
  bonus_conversion_rate NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient loyalty balance and tier
CREATE TABLE public.patient_loyalty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  total_spent NUMERIC NOT NULL DEFAULT 0,
  bonus_balance NUMERIC NOT NULL DEFAULT 0,
  current_tier VARCHAR,
  current_discount_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, patient_id)
);

-- Loyalty transactions (accrual, redemption)
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  type VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_id UUID REFERENCES public.payments(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vouchers / Certificates
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  code VARCHAR NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'service',
  service_id UUID REFERENCES public.services(id),
  amount NUMERIC,
  patient_id UUID REFERENCES public.patients(id),
  issued_by UUID REFERENCES public.profiles(id),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  used_appointment_id UUID REFERENCES public.appointments(id),
  expires_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, code)
);

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loyalty programs" ON public.loyalty_programs FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND has_role(auth.uid(), 'clinic_admin'));
CREATE POLICY "Users can view loyalty programs" ON public.loyalty_programs FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage patient loyalty" ON public.patient_loyalty FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (
    has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')
  ));
CREATE POLICY "Users can view patient loyalty" ON public.patient_loyalty FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage loyalty transactions" ON public.loyalty_transactions FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (
    has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')
  ));
CREATE POLICY "Users can view loyalty transactions" ON public.loyalty_transactions FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage vouchers" ON public.vouchers FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (
    has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception') OR has_role(auth.uid(), 'doctor')
  ));
CREATE POLICY "Users can view vouchers" ON public.vouchers FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

-- =============================================
-- 5. АБОНЕМЕНТЫ (Packages + Deposits)
-- =============================================

-- Service package templates
CREATE TABLE public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  name VARCHAR NOT NULL,
  description TEXT,
  total_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  validity_days INTEGER DEFAULT 365,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items in a package template
CREATE TABLE public.service_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Patient purchased packages
CREATE TABLE public.patient_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  package_id UUID NOT NULL REFERENCES public.service_packages(id),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'active',
  notes TEXT
);

-- Usage tracking for packages
CREATE TABLE public.patient_package_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id UUID NOT NULL REFERENCES public.patient_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  appointment_id UUID REFERENCES public.appointments(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Patient deposits
CREATE TABLE public.patient_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, patient_id)
);

-- Deposit transactions
CREATE TABLE public.deposit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  type VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_id UUID REFERENCES public.payments(id),
  appointment_id UUID REFERENCES public.appointments(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_package_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service packages" ON public.service_packages FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')));
CREATE POLICY "Users can view service packages" ON public.service_packages FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Admins can manage package items" ON public.service_package_items FOR ALL
  USING (package_id IN (SELECT id FROM service_packages WHERE clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception'))));
CREATE POLICY "Users can view package items" ON public.service_package_items FOR SELECT
  USING (package_id IN (SELECT id FROM service_packages WHERE clinic_id = get_user_clinic_id(auth.uid())));

CREATE POLICY "Staff can manage patient packages" ON public.patient_packages FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')));
CREATE POLICY "Users can view patient packages" ON public.patient_packages FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage package usage" ON public.patient_package_usage FOR ALL
  USING (patient_package_id IN (SELECT id FROM patient_packages WHERE clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception') OR has_role(auth.uid(), 'doctor'))));

CREATE POLICY "Staff can manage patient deposits" ON public.patient_deposits FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')));
CREATE POLICY "Users can view patient deposits" ON public.patient_deposits FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage deposit transactions" ON public.deposit_transactions FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')));
CREATE POLICY "Users can view deposit transactions" ON public.deposit_transactions FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

-- =============================================
-- 6. МУЛЬТИ-СКЛАД (Multi-Warehouse)
-- =============================================

CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  name VARCHAR NOT NULL,
  address TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add warehouse_id to inventory
ALTER TABLE public.inventory ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);

-- Warehouse transfers
CREATE TABLE public.warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  quantity NUMERIC NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage warehouses" ON public.warehouses FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')));
CREATE POLICY "Users can view warehouses" ON public.warehouses FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can manage transfers" ON public.warehouse_transfers FOR ALL
  USING (clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception')));
CREATE POLICY "Users can view transfers" ON public.warehouse_transfers FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_salary_settings_updated_at BEFORE UPDATE ON public.salary_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_loyalty_updated_at BEFORE UPDATE ON public.patient_loyalty FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_packages_updated_at BEFORE UPDATE ON public.service_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_deposits_updated_at BEFORE UPDATE ON public.patient_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
