
-- Table to link assistants (nurses) to doctors (many-to-many)
CREATE TABLE public.doctor_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assistant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, assistant_id)
);

-- Enable RLS
ALTER TABLE public.doctor_assistants ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage doctor_assistants"
ON public.doctor_assistants FOR ALL
USING (
  (clinic_id = get_user_clinic_id(auth.uid()))
  AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception'))
);

-- Users can view in their clinic
CREATE POLICY "Users can view doctor_assistants"
ON public.doctor_assistants FOR SELECT
USING (clinic_id = get_user_clinic_id(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_doctor_assistants_doctor ON public.doctor_assistants(doctor_id);
CREATE INDEX idx_doctor_assistants_assistant ON public.doctor_assistants(assistant_id);
CREATE INDEX idx_doctor_assistants_clinic ON public.doctor_assistants(clinic_id);
