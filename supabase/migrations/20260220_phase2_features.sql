-- =====================================================
-- Phase 2: Competitive Parity Features
-- =====================================================

-- 2.1 Patient Tags
CREATE TABLE IF NOT EXISTS public.patient_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, name)
);

CREATE TABLE IF NOT EXISTS public.patient_tag_assignments (
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.patient_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (patient_id, tag_id)
);

ALTER TABLE public.patient_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_tags_select" ON public.patient_tags FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "patient_tags_insert" ON public.patient_tags FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "patient_tags_update" ON public.patient_tags FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "patient_tags_delete" ON public.patient_tags FOR DELETE USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "patient_tag_assign_select" ON public.patient_tag_assignments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.patient_tags t WHERE t.id = tag_id AND t.clinic_id = public.get_user_clinic_id()));
CREATE POLICY "patient_tag_assign_insert" ON public.patient_tag_assignments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.patient_tags t WHERE t.id = tag_id AND t.clinic_id = public.get_user_clinic_id()));
CREATE POLICY "patient_tag_assign_delete" ON public.patient_tag_assignments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.patient_tags t WHERE t.id = tag_id AND t.clinic_id = public.get_user_clinic_id()));

GRANT ALL ON public.patient_tags TO authenticated;
GRANT ALL ON public.patient_tag_assignments TO authenticated;

-- 2.2 Patient Funnel Stage
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'new';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS funnel_updated_at TIMESTAMPTZ;

-- 2.3 Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE USING (clinic_id = public.get_user_clinic_id());
GRANT ALL ON public.rooms TO authenticated;

-- 2.4 Staff Tasks
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(user_id),
  created_by UUID REFERENCES public.profiles(user_id),
  priority TEXT CHECK (priority IN ('low','normal','high','urgent')) DEFAULT 'normal',
  status TEXT CHECK (status IN ('pending','in_progress','completed','cancelled')) DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_tasks_select" ON public.staff_tasks FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "staff_tasks_insert" ON public.staff_tasks FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "staff_tasks_update" ON public.staff_tasks FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "staff_tasks_delete" ON public.staff_tasks FOR DELETE USING (clinic_id = public.get_user_clinic_id());
GRANT ALL ON public.staff_tasks TO authenticated;

CREATE INDEX IF NOT EXISTS idx_staff_tasks_clinic ON public.staff_tasks(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned ON public.staff_tasks(assigned_to);

-- 2.5 Visit Templates
CREATE TABLE IF NOT EXISTS public.visit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  services JSONB DEFAULT '[]',
  default_diagnosis TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.visit_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visit_templates_select" ON public.visit_templates FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "visit_templates_insert" ON public.visit_templates FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "visit_templates_update" ON public.visit_templates FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "visit_templates_delete" ON public.visit_templates FOR DELETE USING (clinic_id = public.get_user_clinic_id());
GRANT ALL ON public.visit_templates TO authenticated;

-- 2.8 Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted BOOLEAN DEFAULT true,
  UNIQUE(clinic_id, role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "role_permissions_insert" ON public.role_permissions FOR INSERT WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "role_permissions_update" ON public.role_permissions FOR UPDATE USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "role_permissions_delete" ON public.role_permissions FOR DELETE USING (clinic_id = public.get_user_clinic_id());
GRANT ALL ON public.role_permissions TO authenticated;

-- SMS reminder settings
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '{"enabled": true, "hours_before": [24, 2], "birthday_enabled": true}'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_tags_clinic ON public.patient_tags(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_tag_assign ON public.patient_tag_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_rooms_clinic ON public.rooms(clinic_id);

NOTIFY pgrst, 'reload schema';
