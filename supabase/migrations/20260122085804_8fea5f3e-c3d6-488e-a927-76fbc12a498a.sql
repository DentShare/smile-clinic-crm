-- Create staff invitations table
CREATE TABLE public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email varchar NOT NULL,
  role app_role NOT NULL,
  token varchar NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for token lookup
CREATE INDEX idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX idx_staff_invitations_email ON staff_invitations(email);

-- Enable RLS
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Clinic admins and reception can create invitations
CREATE POLICY "Staff can create invitations" ON staff_invitations
FOR INSERT WITH CHECK (
  clinic_id = get_user_clinic_id(auth.uid())
  AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception'))
  AND role != 'super_admin'
  -- Reception cannot invite clinic_admin
  AND (has_role(auth.uid(), 'clinic_admin') OR role NOT IN ('clinic_admin'))
);

-- Policy: Clinic admins and reception can view invitations
CREATE POLICY "Staff can view invitations" ON staff_invitations
FOR SELECT USING (
  clinic_id = get_user_clinic_id(auth.uid())
  AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception'))
);

-- Policy: Clinic admins and reception can delete invitations
CREATE POLICY "Staff can delete invitations" ON staff_invitations
FOR DELETE USING (
  clinic_id = get_user_clinic_id(auth.uid())
  AND (has_role(auth.uid(), 'clinic_admin') OR has_role(auth.uid(), 'reception'))
);

-- Public policy for accepting invitations (using token validation)
CREATE POLICY "Anyone can read invitation by token" ON staff_invitations
FOR SELECT USING (true);

-- Policy to update invitation when accepted
CREATE POLICY "Anyone can accept invitation" ON staff_invitations
FOR UPDATE USING (
  accepted_at IS NULL 
  AND expires_at > now()
);