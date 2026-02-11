
-- Create a security definer function to handle clinic registration atomically
CREATE OR REPLACE FUNCTION public.register_clinic(
  _user_id uuid,
  _clinic_name text,
  _subdomain text,
  _phone text,
  _email text,
  _full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clinic_id uuid;
  _plan_id uuid;
  _trial_end timestamptz;
BEGIN
  -- Create clinic
  INSERT INTO public.clinics (name, subdomain, phone, email, owner_name)
  VALUES (_clinic_name, _subdomain, _phone, _email, _full_name)
  RETURNING id INTO _clinic_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, clinic_id, full_name, phone)
  VALUES (_user_id, _clinic_id, _full_name, _phone);

  -- Assign clinic_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'clinic_admin');

  -- Create trial subscription
  SELECT id INTO _plan_id FROM public.subscription_plans WHERE name = 'Starter' LIMIT 1;
  
  IF _plan_id IS NOT NULL THEN
    _trial_end := now() + interval '14 days';
    INSERT INTO public.clinic_subscriptions (clinic_id, plan_id, status, trial_ends_at, current_period_end)
    VALUES (_clinic_id, _plan_id, 'trial', _trial_end, _trial_end);
  END IF;

  RETURN _clinic_id;
END;
$$;
