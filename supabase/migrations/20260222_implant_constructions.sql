-- =====================================================
-- Migration: Implant prosthetic constructions
-- Date: 2026-02-22
-- Description:
--   Prosthetic constructions (bridge, crown, etc.) linked to implants.
--   One construction can span multiple implants.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.implant_constructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  construction_type VARCHAR(30) NOT NULL
    CHECK (construction_type IN ('single_crown', 'bridge', 'overdenture', 'bar', 'temporary')),
  material VARCHAR(50)
    CHECK (material IN ('zirconia', 'metal_ceramic', 'emax', 'composite', 'acrylic', 'metal')),
  fixation_type VARCHAR(20)
    CHECK (fixation_type IN ('cement', 'screw', 'combined')),
  prosthetic_date DATE,
  lab_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_implant_constructions_patient
  ON public.implant_constructions(patient_id);

ALTER TABLE public.implant_constructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY implant_constructions_select ON public.implant_constructions
FOR SELECT TO authenticated
USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY implant_constructions_insert ON public.implant_constructions
FOR INSERT TO authenticated
WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY implant_constructions_update ON public.implant_constructions
FOR UPDATE TO authenticated
USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY implant_constructions_delete ON public.implant_constructions
FOR DELETE TO authenticated
USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.implant_constructions TO authenticated;

-- Link implants to constructions
ALTER TABLE public.implant_passports
  ADD COLUMN IF NOT EXISTS construction_id UUID REFERENCES public.implant_constructions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_implant_passports_construction
  ON public.implant_passports(construction_id);
