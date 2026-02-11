
-- Add custom doctor limit override to clinic_subscriptions
ALTER TABLE public.clinic_subscriptions
ADD COLUMN IF NOT EXISTS max_doctors_override integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS billing_period_months integer DEFAULT NULL;
