-- =====================================================
-- Phase 1.1: Cash Registers & Expense Tracking
-- =====================================================

-- Expense categories (hierarchical)
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cash registers
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash','terminal','online')) DEFAULT 'cash',
  opening_balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cash register operations (audit log for cash movement)
CREATE TABLE IF NOT EXISTS public.cash_register_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer','adjustment')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_type TEXT, -- 'payment', 'expense', 'manual'
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_clinic ON public.expense_categories(clinic_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_clinic ON public.cash_registers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_expenses_clinic_date ON public.expenses(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_ops_register ON public.cash_register_operations(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_ops_clinic_date ON public.cash_register_operations(clinic_id, created_at);

-- Add cash_register_id to payments for linking
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES public.cash_registers(id);

-- RLS Policies
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_register_operations ENABLE ROW LEVEL SECURITY;

-- expense_categories policies
CREATE POLICY "expense_categories_select" ON public.expense_categories FOR SELECT
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "expense_categories_insert" ON public.expense_categories FOR INSERT
  WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "expense_categories_update" ON public.expense_categories FOR UPDATE
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "expense_categories_delete" ON public.expense_categories FOR DELETE
  USING (clinic_id = public.get_user_clinic_id());

-- cash_registers policies
CREATE POLICY "cash_registers_select" ON public.cash_registers FOR SELECT
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "cash_registers_insert" ON public.cash_registers FOR INSERT
  WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "cash_registers_update" ON public.cash_registers FOR UPDATE
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "cash_registers_delete" ON public.cash_registers FOR DELETE
  USING (clinic_id = public.get_user_clinic_id());

-- expenses policies
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT
  WITH CHECK (clinic_id = public.get_user_clinic_id());
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE
  USING (clinic_id = public.get_user_clinic_id());

-- cash_register_operations policies
CREATE POLICY "cash_register_ops_select" ON public.cash_register_operations FOR SELECT
  USING (clinic_id = public.get_user_clinic_id());
CREATE POLICY "cash_register_ops_insert" ON public.cash_register_operations FOR INSERT
  WITH CHECK (clinic_id = public.get_user_clinic_id());

-- Grant access
GRANT ALL ON public.expense_categories TO authenticated;
GRANT ALL ON public.cash_registers TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.cash_register_operations TO authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
