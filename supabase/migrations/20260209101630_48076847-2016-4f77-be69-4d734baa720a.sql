-- Fix overly permissive audit_logs INSERT policy
-- Replace WITH CHECK (true) with proper authentication check

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only authenticated users can insert audit logs for their own clinic
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert logs for their own clinic
  clinic_id = public.get_user_clinic_id(auth.uid())
  -- Or it's a super admin action
  OR public.is_super_admin(auth.uid())
  -- Or the user_id matches the authenticated user (system logs)
  OR user_id = auth.uid()
);