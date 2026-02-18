-- =====================================================
-- Phase 1.3: Warehouse Documents
-- =====================================================

CREATE TABLE IF NOT EXISTS public.warehouse_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  document_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receipt','writeoff','transfer','inventory_check')),
  status TEXT NOT NULL CHECK (status IN ('draft','confirmed','cancelled')) DEFAULT 'draft',
  supplier TEXT,
  notes TEXT,
  total_amount NUMERIC DEFAULT 0,
  created_by UUID REFERENCES public.profiles(user_id),
  confirmed_by UUID REFERENCES public.profiles(user_id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warehouse_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.warehouse_documents(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id),
  name TEXT,
  quantity NUMERIC NOT NULL,
  price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_docs_clinic ON public.warehouse_documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_docs_status ON public.warehouse_documents(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_warehouse_doc_items_doc ON public.warehouse_document_items(document_id);

-- RLS
ALTER TABLE public.warehouse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_document_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warehouse_docs_select" ON public.warehouse_documents FOR SELECT
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "warehouse_docs_insert" ON public.warehouse_documents FOR INSERT
  WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "warehouse_docs_update" ON public.warehouse_documents FOR UPDATE
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "warehouse_docs_delete" ON public.warehouse_documents FOR DELETE
  USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "warehouse_doc_items_select" ON public.warehouse_document_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.warehouse_documents d WHERE d.id = document_id AND d.clinic_id = public.get_user_clinic_id()));
CREATE POLICY "warehouse_doc_items_insert" ON public.warehouse_document_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.warehouse_documents d WHERE d.id = document_id AND d.clinic_id = public.get_user_clinic_id()));
CREATE POLICY "warehouse_doc_items_update" ON public.warehouse_document_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.warehouse_documents d WHERE d.id = document_id AND d.clinic_id = public.get_user_clinic_id()));
CREATE POLICY "warehouse_doc_items_delete" ON public.warehouse_document_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.warehouse_documents d WHERE d.id = document_id AND d.clinic_id = public.get_user_clinic_id()));

-- Grants
GRANT ALL ON public.warehouse_documents TO authenticated;
GRANT ALL ON public.warehouse_document_items TO authenticated;

NOTIFY pgrst, 'reload schema';
