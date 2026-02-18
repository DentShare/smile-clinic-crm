-- Phase 3: Discount Cards, Prescriptions, Insurance, Referrals

-- 3.2 Discount Cards
CREATE TABLE IF NOT EXISTS discount_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  card_number TEXT NOT NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE discount_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discount_cards_clinic_isolation" ON discount_cards
  FOR ALL USING (clinic_id = public.get_user_clinic_id());

CREATE INDEX IF NOT EXISTS idx_discount_cards_clinic ON discount_cards(clinic_id);
CREATE INDEX IF NOT EXISTS idx_discount_cards_patient ON discount_cards(patient_id);

GRANT ALL ON discount_cards TO authenticated;

-- 3.3 Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(user_id),
  appointment_id UUID REFERENCES appointments(id),
  medications JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prescriptions_clinic_isolation" ON prescriptions
  FOR ALL USING (clinic_id = public.get_user_clinic_id());

CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic ON prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);

GRANT ALL ON prescriptions TO authenticated;

-- 3.4 Insurance Companies
CREATE TABLE IF NOT EXISTS insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contract_number TEXT,
  discount_percent NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_companies_clinic_isolation" ON insurance_companies
  FOR ALL USING (clinic_id = public.get_user_clinic_id());

CREATE INDEX IF NOT EXISTS idx_insurance_companies_clinic ON insurance_companies(clinic_id);

GRANT ALL ON insurance_companies TO authenticated;

-- Add insurance fields to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_id UUID REFERENCES insurance_companies(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_policy TEXT;

-- 3.5 Referral Program
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES patients(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS referral_source TEXT;

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES patients(id),
  referred_id UUID REFERENCES patients(id),
  reward_type TEXT CHECK (reward_type IN ('bonus','discount','service')),
  reward_value NUMERIC,
  is_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_rewards_clinic_isolation" ON referral_rewards
  FOR ALL USING (clinic_id = public.get_user_clinic_id());

CREATE INDEX IF NOT EXISTS idx_referral_rewards_clinic ON referral_rewards(clinic_id);

GRANT ALL ON referral_rewards TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
