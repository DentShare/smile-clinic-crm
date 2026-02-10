
-- Drop the overly permissive insert policy and replace with a restrictive one
DROP POLICY IF EXISTS "Service role can insert system logs" ON public.system_logs;

-- Allow authenticated users to insert logs (edge functions use service role which bypasses RLS)
CREATE POLICY "Authenticated users can insert system logs"
ON public.system_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
