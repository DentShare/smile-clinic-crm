
-- Add country column to clinics table
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'UZ';

-- Create system_logs table for error tracking
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  level VARCHAR NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  details JSONB,
  source VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can access system logs
CREATE POLICY "Super admins can manage system logs"
ON public.system_logs
FOR ALL
USING (is_super_admin(auth.uid()));

-- Allow service role / edge functions to insert logs
CREATE POLICY "Service role can insert system logs"
ON public.system_logs
FOR INSERT
WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX idx_system_logs_level ON public.system_logs (level);
CREATE INDEX idx_system_logs_clinic_id ON public.system_logs (clinic_id);
