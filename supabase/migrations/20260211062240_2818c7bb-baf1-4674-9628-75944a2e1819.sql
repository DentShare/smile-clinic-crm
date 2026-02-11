
-- Update check_staff_limit to respect max_doctors_override
CREATE OR REPLACE FUNCTION public.check_staff_limit(_clinic_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _max_doctors integer;
  _max_staff integer;
  _current_doctors integer;
  _current_staff integer;
  _override integer;
BEGIN
  -- Get subscription limits
  SELECT sp.max_doctors, sp.max_staff, cs.max_doctors_override
  INTO _max_doctors, _max_staff, _override
  FROM clinic_subscriptions cs
  JOIN subscription_plans sp ON cs.plan_id = sp.id
  WHERE cs.clinic_id = _clinic_id AND cs.status IN ('active', 'trial');
  
  -- Use override if set
  IF _override IS NOT NULL THEN
    _max_doctors := _override;
  END IF;
  
  IF _max_doctors IS NULL THEN
    _max_doctors := 999;
  END IF;
  
  IF _max_staff IS NULL THEN
    _max_staff := 999;
  END IF;
  
  -- Count current staff
  SELECT 
    COUNT(*) FILTER (WHERE ur.role = 'doctor'),
    COUNT(*) FILTER (WHERE ur.role IN ('reception', 'nurse'))
  INTO _current_doctors, _current_staff
  FROM profiles p
  JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE p.clinic_id = _clinic_id AND p.is_active = true;
  
  IF _role = 'doctor' THEN
    RETURN _current_doctors < _max_doctors;
  ELSIF _role IN ('reception', 'nurse') THEN
    RETURN _current_staff < _max_staff;
  ELSE
    RETURN true;
  END IF;
END;
$function$;
