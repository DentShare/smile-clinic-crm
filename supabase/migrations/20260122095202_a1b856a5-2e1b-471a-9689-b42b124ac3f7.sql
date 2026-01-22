-- Fix RLS policies according to RBAC matrix

-- 1. INVENTORY: Add doctor to view-only (currently only clinic_admin + reception can manage, all can view - OK)
-- But according to RBAC, doctors should have read-only, nurses should have read-only
-- Current policy already allows all clinic users to view - OK

-- 2. SERVICES: According to RBAC, reception should also be able to manage services
DROP POLICY IF EXISTS "Clinic admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" 
ON public.services 
FOR ALL 
TO authenticated
USING (
  clinic_id = get_user_clinic_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'clinic_admin') 
    OR has_role(auth.uid(), 'reception')
  )
);

-- 3. SERVICE_CATEGORIES: Same - reception should be able to manage
DROP POLICY IF EXISTS "Clinic admins can manage service categories" ON public.service_categories;
CREATE POLICY "Admins can manage service categories" 
ON public.service_categories 
FOR ALL 
TO authenticated
USING (
  clinic_id = get_user_clinic_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'clinic_admin') 
    OR has_role(auth.uid(), 'reception')
  )
);

-- 4. PROFILES: Admins should be able to update other profiles in their clinic
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid() 
  OR (
    clinic_id = get_user_clinic_id(auth.uid()) 
    AND (
      has_role(auth.uid(), 'clinic_admin') 
      OR has_role(auth.uid(), 'reception')
    )
  )
);

-- 5. Add policy for viewing own profile (for users without clinic_id yet - new registrations)
DROP POLICY IF EXISTS "Users can view profiles in their clinic" ON public.profiles;
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
  OR clinic_id = get_user_clinic_id(auth.uid()) 
  OR is_super_admin(auth.uid())
);

-- 6. ANALYTICS: doctors should be able to view analytics (currently no policy)
-- This is handled through payments table - doctors can view payments (OK)

-- 7. DOCUMENT_TEMPLATES: reception should also be able to manage templates
DROP POLICY IF EXISTS "Clinic admins can manage document templates" ON public.document_templates;
CREATE POLICY "Admins can manage document templates" 
ON public.document_templates 
FOR ALL 
TO authenticated
USING (
  clinic_id = get_user_clinic_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'clinic_admin') 
    OR has_role(auth.uid(), 'reception')
  )
);