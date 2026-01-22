-- Add treatment_plan_item_id to performed_works for linking
ALTER TABLE public.performed_works 
ADD COLUMN IF NOT EXISTS treatment_plan_item_id uuid REFERENCES public.treatment_plan_items(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_performed_works_treatment_plan_item 
ON public.performed_works(treatment_plan_item_id);

-- Add notification preferences to patients
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"sms": true, "telegram": true}'::jsonb;

-- Create notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.patient_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_plan_id uuid REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.treatment_plan_stages(id) ON DELETE SET NULL,
  type varchar NOT NULL, -- 'sms', 'telegram'
  status varchar DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  message text NOT NULL,
  sent_at timestamptz,
  error_message text,
  external_id varchar, -- ID from Eskiz or Telegram
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view notifications in their clinic"
ON public.patient_notifications FOR SELECT
USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can insert notifications"
ON public.patient_notifications FOR INSERT
WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()) AND (
  has_role(auth.uid(), 'clinic_admin') OR 
  has_role(auth.uid(), 'doctor') OR 
  has_role(auth.uid(), 'reception')
));

CREATE POLICY "Staff can update notifications"
ON public.patient_notifications FOR UPDATE
USING (clinic_id = get_user_clinic_id(auth.uid()));

-- Function to auto-update treatment plan item when performed work is linked
CREATE OR REPLACE FUNCTION public.update_treatment_item_on_work_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When a performed work is linked to a treatment plan item, mark the item as completed
  IF NEW.treatment_plan_item_id IS NOT NULL THEN
    UPDATE public.treatment_plan_items
    SET is_completed = true,
        completed_at = now(),
        appointment_id = NEW.appointment_id
    WHERE id = NEW.treatment_plan_item_id
      AND is_completed = false;
    
    -- Update stage status if all items are completed
    UPDATE public.treatment_plan_stages
    SET status = 'completed',
        completed_at = now(),
        actual_price = (
          SELECT COALESCE(SUM(total_price), 0)
          FROM public.treatment_plan_items
          WHERE stage_id = (SELECT stage_id FROM public.treatment_plan_items WHERE id = NEW.treatment_plan_item_id)
            AND is_completed = true
        )
    WHERE id = (SELECT stage_id FROM public.treatment_plan_items WHERE id = NEW.treatment_plan_item_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.treatment_plan_items
        WHERE stage_id = treatment_plan_stages.id
          AND is_completed = false
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_treatment_item_on_work ON public.performed_works;
CREATE TRIGGER trigger_update_treatment_item_on_work
AFTER INSERT OR UPDATE OF treatment_plan_item_id ON public.performed_works
FOR EACH ROW
EXECUTE FUNCTION public.update_treatment_item_on_work_completion();