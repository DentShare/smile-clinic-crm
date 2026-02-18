-- =====================================================
-- Migration: Extend implant_passports with treatment stages
-- Date: 2026-02-22
-- Description:
--   Add fields for tracking implant treatment stages:
--   surgical details, healing, abutment, prosthetic phase
-- =====================================================

-- Surgical stage details
ALTER TABLE public.implant_passports
  ADD COLUMN IF NOT EXISTS surface_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS platform_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS surgical_protocol VARCHAR(20) DEFAULT 'two_stage'
    CHECK (surgical_protocol IN ('one_stage', 'two_stage', 'immediate')),
  ADD COLUMN IF NOT EXISTS bone_graft_material VARCHAR(100),
  ADD COLUMN IF NOT EXISTS membrane VARCHAR(100),
  ADD COLUMN IF NOT EXISTS insertion_depth DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS initial_stability VARCHAR(20)
    CHECK (initial_stability IN ('high', 'medium', 'low'));

-- Healing stage
ALTER TABLE public.implant_passports
  ADD COLUMN IF NOT EXISTS healing_cap_date DATE,
  ADD COLUMN IF NOT EXISTS osseointegration_date DATE,
  ADD COLUMN IF NOT EXISTS isq_value INT CHECK (isq_value BETWEEN 0 AND 99);

-- Abutment stage
ALTER TABLE public.implant_passports
  ADD COLUMN IF NOT EXISTS abutment_type VARCHAR(30)
    CHECK (abutment_type IN ('stock', 'custom', 'angled', 'multi_unit', 'temporary')),
  ADD COLUMN IF NOT EXISTS abutment_manufacturer VARCHAR(100),
  ADD COLUMN IF NOT EXISTS abutment_model VARCHAR(100),
  ADD COLUMN IF NOT EXISTS abutment_date DATE;

-- Prosthetic stage
ALTER TABLE public.implant_passports
  ADD COLUMN IF NOT EXISTS prosthetic_type VARCHAR(30)
    CHECK (prosthetic_type IN ('single_crown', 'bridge', 'overdenture', 'bar', 'temporary')),
  ADD COLUMN IF NOT EXISTS prosthetic_material VARCHAR(50)
    CHECK (prosthetic_material IN ('zirconia', 'metal_ceramic', 'emax', 'composite', 'acrylic', 'metal')),
  ADD COLUMN IF NOT EXISTS fixation_type VARCHAR(20)
    CHECK (fixation_type IN ('cement', 'screw', 'combined')),
  ADD COLUMN IF NOT EXISTS prosthetic_date DATE,
  ADD COLUMN IF NOT EXISTS lab_name VARCHAR(100);

-- Status tracking
ALTER TABLE public.implant_passports
  ADD COLUMN IF NOT EXISTS stage VARCHAR(20) DEFAULT 'placed'
    CHECK (stage IN ('placed', 'healing', 'abutment', 'prosthetic', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS warranty_until DATE,
  ADD COLUMN IF NOT EXISTS next_checkup DATE;

-- Manufacturer sticker data (raw text from packaging label)
ALTER TABLE public.implant_passports
  ADD COLUMN IF NOT EXISTS sticker_data TEXT;
