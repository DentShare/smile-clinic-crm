-- Create treatment_plans table
CREATE TABLE public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  total_price NUMERIC NOT NULL DEFAULT 0,
  locked_price NUMERIC,
  status VARCHAR NOT NULL DEFAULT 'draft', -- draft, active, completed, cancelled
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatment_plan_stages table
CREATE TABLE public.treatment_plan_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL DEFAULT 1,
  title VARCHAR NOT NULL,
  description TEXT,
  estimated_price NUMERIC NOT NULL DEFAULT 0,
  actual_price NUMERIC,
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, skipped
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatment_plan_items table (services/procedures within each stage)
CREATE TABLE public.treatment_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.treatment_plan_stages(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  tooth_number INTEGER,
  service_name VARCHAR NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;

-- Policies for treatment_plans
CREATE POLICY "Users can view treatment plans in their clinic"
ON public.treatment_plans FOR SELECT
USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can manage treatment plans"
ON public.treatment_plans FOR ALL
USING (
  clinic_id = get_user_clinic_id(auth.uid()) AND 
  (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'clinic_admin'))
);

-- Policies for treatment_plan_stages
CREATE POLICY "Users can view treatment plan stages in their clinic"
ON public.treatment_plan_stages FOR SELECT
USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can manage treatment plan stages"
ON public.treatment_plan_stages FOR ALL
USING (
  clinic_id = get_user_clinic_id(auth.uid()) AND 
  (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'clinic_admin'))
);

-- Policies for treatment_plan_items
CREATE POLICY "Users can view treatment plan items in their clinic"
ON public.treatment_plan_items FOR SELECT
USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can manage treatment plan items"
ON public.treatment_plan_items FOR ALL
USING (
  clinic_id = get_user_clinic_id(auth.uid()) AND 
  (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'clinic_admin'))
);

-- Create indexes
CREATE INDEX idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_clinic ON public.treatment_plans(clinic_id);
CREATE INDEX idx_treatment_plan_stages_plan ON public.treatment_plan_stages(treatment_plan_id);
CREATE INDEX idx_treatment_plan_items_stage ON public.treatment_plan_items(stage_id);

-- Triggers for updated_at
CREATE TRIGGER update_treatment_plans_updated_at
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_plan_stages_updated_at
  BEFORE UPDATE ON public.treatment_plan_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();