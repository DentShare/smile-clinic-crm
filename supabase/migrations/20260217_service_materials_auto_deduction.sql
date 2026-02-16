-- Phase 3: Service Materials & Auto-Deduction
-- Creates service_materials linking table and trigger for automatic inventory deduction

-- 1. service_materials: links services to required materials
CREATE TABLE IF NOT EXISTS public.service_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(clinic_id, service_id, inventory_id)
);

CREATE INDEX idx_service_materials_service ON public.service_materials(service_id);
CREATE INDEX idx_service_materials_inventory ON public.service_materials(inventory_id);
CREATE INDEX idx_service_materials_clinic ON public.service_materials(clinic_id);

-- RLS
ALTER TABLE public.service_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view service materials"
    ON public.service_materials FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Admins can manage service materials"
    ON public.service_materials FOR ALL TO authenticated
    USING (
        clinic_id = public.get_user_clinic_id(auth.uid())
        AND public.has_role(auth.uid(), 'clinic_admin')
    );

-- 2. inventory_movements: full audit trail for all stock changes
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'auto_deduct', 'return')),
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_before DECIMAL(10, 2) NOT NULL,
    quantity_after DECIMAL(10, 2) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    performed_work_id UUID REFERENCES public.performed_works(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_clinic ON public.inventory_movements(clinic_id);
CREATE INDEX idx_inventory_movements_inventory ON public.inventory_movements(inventory_id);
CREATE INDEX idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created ON public.inventory_movements(created_at DESC);
CREATE INDEX idx_inventory_movements_performed_work ON public.inventory_movements(performed_work_id);

-- RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory movements"
    ON public.inventory_movements FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Staff can create inventory movements"
    ON public.inventory_movements FOR INSERT TO authenticated
    WITH CHECK (
        clinic_id = public.get_user_clinic_id(auth.uid())
        AND (
            public.has_role(auth.uid(), 'clinic_admin')
            OR public.has_role(auth.uid(), 'doctor')
            OR public.has_role(auth.uid(), 'reception')
        )
    );

-- 3. Trigger function: auto-deduct materials when performed_work is inserted
CREATE OR REPLACE FUNCTION public.auto_deduct_materials()
RETURNS TRIGGER AS $$
DECLARE
    mat RECORD;
    qty_to_deduct DECIMAL(10, 2);
    current_qty DECIMAL(10, 2);
    new_qty DECIMAL(10, 2);
BEGIN
    -- Only process if service_id is set
    IF NEW.service_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Loop through all materials linked to this service
    FOR mat IN
        SELECT sm.inventory_id, sm.quantity_per_unit, sm.is_required, i.quantity, i.name
        FROM public.service_materials sm
        JOIN public.inventory i ON i.id = sm.inventory_id
        WHERE sm.service_id = NEW.service_id
          AND sm.clinic_id = NEW.clinic_id
    LOOP
        qty_to_deduct := mat.quantity_per_unit * COALESCE(NEW.quantity, 1);
        current_qty := mat.quantity;
        new_qty := GREATEST(0, current_qty - qty_to_deduct);

        -- Update inventory quantity
        UPDATE public.inventory
        SET quantity = new_qty, updated_at = now()
        WHERE id = mat.inventory_id;

        -- Record movement
        INSERT INTO public.inventory_movements (
            clinic_id, inventory_id, movement_type,
            quantity, quantity_before, quantity_after,
            reference_type, reference_id, performed_work_id,
            notes
        ) VALUES (
            NEW.clinic_id, mat.inventory_id, 'auto_deduct',
            qty_to_deduct, current_qty, new_qty,
            'performed_work', NEW.id, NEW.id,
            'Автосписание: ' || mat.name || ' x' || qty_to_deduct
        );

        -- Also record in material_usage for backward compatibility
        INSERT INTO public.material_usage (
            clinic_id, inventory_id, performed_work_id, quantity, notes
        ) VALUES (
            NEW.clinic_id, mat.inventory_id, NEW.id, qty_to_deduct,
            'Автосписание при выполнении работы'
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on performed_works
DROP TRIGGER IF EXISTS trg_auto_deduct_materials ON public.performed_works;
CREATE TRIGGER trg_auto_deduct_materials
    AFTER INSERT ON public.performed_works
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_deduct_materials();
