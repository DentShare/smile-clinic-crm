-- Create tooth_status_history table for tracking changes
CREATE TABLE public.tooth_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    tooth_number INTEGER NOT NULL,
    old_status VARCHAR,
    new_status VARCHAR NOT NULL,
    notes TEXT,
    changed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tooth_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view tooth status history in their clinic"
ON public.tooth_status_history
FOR SELECT
USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can insert tooth status history"
ON public.tooth_status_history
FOR INSERT
WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()) AND (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'clinic_admin')));

-- Create index for faster queries
CREATE INDEX idx_tooth_status_history_patient ON public.tooth_status_history(patient_id);
CREATE INDEX idx_tooth_status_history_tooth ON public.tooth_status_history(patient_id, tooth_number);