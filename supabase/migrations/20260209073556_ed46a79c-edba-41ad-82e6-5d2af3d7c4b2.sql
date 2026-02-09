-- Add service_id to appointments table to properly link scheduled services
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id);

-- Add comment for clarity
COMMENT ON COLUMN public.appointments.service_id IS 'The primary service scheduled for this appointment';