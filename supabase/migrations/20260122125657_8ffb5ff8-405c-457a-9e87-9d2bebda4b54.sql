-- Drop the foreign key constraint on doctor_id to allow null UUID for clinic-wide schedules
ALTER TABLE public.doctor_schedules 
DROP CONSTRAINT IF EXISTS doctor_schedules_doctor_id_fkey;

-- Add a comment explaining the doctor_id usage
COMMENT ON COLUMN public.doctor_schedules.doctor_id IS 'UUID of the doctor (references profiles.user_id), or 00000000-0000-0000-0000-000000000000 for clinic-wide default schedule';