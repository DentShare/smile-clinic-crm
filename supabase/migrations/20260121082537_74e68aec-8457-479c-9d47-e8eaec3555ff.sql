-- =============================================
-- ФАЗА 2: ТАБЛИЦЫ УРОВНЯ КЛИНИКИ
-- =============================================

-- 1. Пациенты
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    pinfl VARCHAR(14),
    address TEXT,
    source VARCHAR(50),
    notes TEXT,
    balance DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для поиска пациентов
CREATE INDEX idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX idx_patients_phone ON public.patients(phone);
CREATE INDEX idx_patients_full_name ON public.patients(full_name);

-- 2. Категории услуг
CREATE TABLE public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Услуги (прайс-лист)
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    duration_minutes INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_clinic_id ON public.services(clinic_id);

-- 4. Приёмы (Appointments)
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    complaints TEXT,
    diagnosis TEXT,
    doctor_notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);

-- 5. Состояние зубов
CREATE TABLE public.tooth_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    tooth_number INT NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
    status VARCHAR(30) DEFAULT 'healthy' CHECK (status IN ('healthy', 'caries', 'filled', 'crown', 'implant', 'missing', 'root_canal', 'bridge')),
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(patient_id, tooth_number)
);

CREATE INDEX idx_tooth_status_patient_id ON public.tooth_status(patient_id);

-- 6. Выполненные работы
CREATE TABLE public.performed_works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    tooth_number INT CHECK (tooth_number BETWEEN 11 AND 48 OR tooth_number IS NULL),
    quantity INT DEFAULT 1,
    price DECIMAL(12, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    doctor_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performed_works_appointment_id ON public.performed_works(appointment_id);

-- 7. Оплаты
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) CHECK (payment_method IN ('cash', 'uzcard', 'humo', 'visa', 'mastercard', 'click', 'payme', 'transfer')),
    is_fiscalized BOOLEAN DEFAULT FALSE,
    fiscal_receipt_number VARCHAR(100),
    notes TEXT,
    received_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_clinic_id ON public.payments(clinic_id);
CREATE INDEX idx_payments_patient_id ON public.payments(patient_id);

-- 8. Паспорта имплантов
CREATE TABLE public.implant_passports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    tooth_number INT NOT NULL CHECK (tooth_number BETWEEN 11 AND 48),
    serial_number VARCHAR(100) NOT NULL,
    batch_number VARCHAR(100),
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    diameter DECIMAL(4, 2),
    length DECIMAL(4, 2),
    installation_date DATE NOT NULL,
    torque_value INT,
    bone_type VARCHAR(10) CHECK (bone_type IN ('D1', 'D2', 'D3', 'D4')),
    doctor_id UUID REFERENCES public.profiles(id),
    qr_code_data TEXT,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_implant_passports_patient_id ON public.implant_passports(patient_id);
CREATE INDEX idx_implant_passports_serial ON public.implant_passports(serial_number);

-- 9. Склад (материалы)
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category VARCHAR(100),
    quantity DECIMAL(10, 2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'шт',
    min_quantity DECIMAL(10, 2) DEFAULT 0,
    price DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_clinic_id ON public.inventory(clinic_id);

-- 10. Расход материалов
CREATE TABLE public.material_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    performed_work_id UUID REFERENCES public.performed_works(id) ON DELETE SET NULL,
    implant_passport_id UUID REFERENCES public.implant_passports(id) ON DELETE SET NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Шаблоны документов
CREATE TABLE public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) CHECK (type IN ('contract', 'consent', 'treatment_plan', 'act', 'invoice')),
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Документы пациентов
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(30) CHECK (type IN ('contract', 'consent', 'treatment_plan', 'act', 'invoice')),
    content TEXT,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'archived')),
    signature_data TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_ip VARCHAR(45),
    signed_device TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_patient_id ON public.documents(patient_id);

-- =============================================
-- ТРИГГЕРЫ
-- =============================================

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tooth_status_updated_at
    BEFORE UPDATE ON public.tooth_status
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_implant_passports_updated_at
    BEFORE UPDATE ON public.implant_passports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES ДЛЯ КЛИНИКИ
-- =============================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooth_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performed_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implant_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Patients
CREATE POLICY "Users can view patients in their clinic"
    ON public.patients FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can insert patients in their clinic"
    ON public.patients FOR INSERT TO authenticated
    WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can update patients in their clinic"
    ON public.patients FOR UPDATE TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Clinic admins can delete patients"
    ON public.patients FOR DELETE TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

-- Service Categories
CREATE POLICY "Users can view service categories"
    ON public.service_categories FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Clinic admins can manage service categories"
    ON public.service_categories FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

-- Services
CREATE POLICY "Users can view services"
    ON public.services FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Clinic admins can manage services"
    ON public.services FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

-- Appointments
CREATE POLICY "Users can view appointments"
    ON public.appointments FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can insert appointments"
    ON public.appointments FOR INSERT TO authenticated
    WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can update appointments"
    ON public.appointments FOR UPDATE TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can delete appointments"
    ON public.appointments FOR DELETE TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- Tooth Status
CREATE POLICY "Users can view tooth status"
    ON public.tooth_status FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can manage tooth status"
    ON public.tooth_status FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'clinic_admin')));

-- Performed Works
CREATE POLICY "Users can view performed works"
    ON public.performed_works FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can manage performed works"
    ON public.performed_works FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'clinic_admin')));

-- Payments
CREATE POLICY "Users can view payments"
    ON public.payments FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can insert payments"
    ON public.payments FOR INSERT TO authenticated
    WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Clinic admins can manage payments"
    ON public.payments FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

-- Implant Passports
CREATE POLICY "Users can view implant passports"
    ON public.implant_passports FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can manage implant passports"
    ON public.implant_passports FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'clinic_admin')));

-- Inventory
CREATE POLICY "Users can view inventory"
    ON public.inventory FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Clinic admins can manage inventory"
    ON public.inventory FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

-- Material Usage
CREATE POLICY "Users can view material usage"
    ON public.material_usage FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Doctors can manage material usage"
    ON public.material_usage FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'clinic_admin')));

-- Document Templates
CREATE POLICY "Users can view document templates"
    ON public.document_templates FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Clinic admins can manage document templates"
    ON public.document_templates FOR ALL TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

-- Documents
CREATE POLICY "Users can view documents"
    ON public.documents FOR SELECT TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can insert documents"
    ON public.documents FOR INSERT TO authenticated
    WITH CHECK (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Users can update documents"
    ON public.documents FOR UPDATE TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));