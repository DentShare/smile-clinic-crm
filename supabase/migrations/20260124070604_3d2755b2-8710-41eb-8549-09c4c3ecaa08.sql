-- Add Super Admin fields to clinics table
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS inn VARCHAR(20),
ADD COLUMN IF NOT EXISTS acquisition_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS acquisition_campaign VARCHAR(100),
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for acquisition analytics
CREATE INDEX IF NOT EXISTS idx_clinics_acquisition_source ON public.clinics(acquisition_source);

-- Add payment history tracking table for manual payments
CREATE TABLE IF NOT EXISTS public.billing_manual_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  days_added INTEGER NOT NULL,
  reason TEXT,
  adjusted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_manual_adjustments ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage manual adjustments
CREATE POLICY "Super admins can manage manual adjustments"
ON public.billing_manual_adjustments
FOR ALL
USING (is_super_admin(auth.uid()));

-- Add comments
COMMENT ON COLUMN public.clinics.owner_name IS 'Name of the clinic owner/decision maker';
COMMENT ON COLUMN public.clinics.inn IS 'Tax ID (INN) for B2B contracts in Uzbekistan';
COMMENT ON COLUMN public.clinics.acquisition_source IS 'Marketing source: instagram, referral, exhibition, etc.';
COMMENT ON COLUMN public.clinics.acquisition_campaign IS 'UTM campaign name for tracking';
COMMENT ON COLUMN public.clinics.admin_notes IS 'Internal notes from sales/support team';