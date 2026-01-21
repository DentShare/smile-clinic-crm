-- =============================================
-- ФАЗА 1: ЯДРО MULTI-TENANCY SAAS ПЛАТФОРМЫ
-- =============================================

-- 1. Enum для ролей
CREATE TYPE public.app_role AS ENUM ('super_admin', 'clinic_admin', 'doctor', 'reception', 'nurse');

-- 2. Таблица тарифных планов (уровень платформы)
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_ru VARCHAR(100) NOT NULL,
    price_monthly DECIMAL(12, 2) NOT NULL DEFAULT 0,
    max_doctors INT,
    max_patients INT,
    storage_gb INT DEFAULT 1,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица клиник (Tenants)
CREATE TABLE public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    subdomain VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{"language": "ru", "currency": "UZS", "timezone": "Asia/Tashkent"}',
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Подписки клиник
CREATE TABLE public.clinic_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(clinic_id)
);

-- 5. История платежей
CREATE TABLE public.billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'UZS',
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    external_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Профили пользователей
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    specialization VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Роли пользователей (отдельная таблица для безопасности)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 8. Графики работы врачей
CREATE TABLE public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, day_of_week)
);

-- =============================================
-- SECURITY DEFINER ФУНКЦИИ
-- =============================================

-- Функция проверки роли
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Функция получения clinic_id пользователя
CREATE OR REPLACE FUNCTION public.get_user_clinic_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT clinic_id
    FROM public.profiles
    WHERE user_id = _user_id
$$;

-- Функция проверки super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'super_admin')
$$;

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ТРИГГЕРЫ
-- =============================================

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at
    BEFORE UPDATE ON public.clinics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinic_subscriptions_updated_at
    BEFORE UPDATE ON public.clinic_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: все могут читать, только super_admin может изменять
CREATE POLICY "Anyone can view subscription plans"
    ON public.subscription_plans FOR SELECT
    USING (TRUE);

CREATE POLICY "Super admins can manage subscription plans"
    ON public.subscription_plans FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- Clinics: super_admin видит все, остальные только свою
CREATE POLICY "Super admins can view all clinics"
    ON public.clinics FOR SELECT
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own clinic"
    ON public.clinics FOR SELECT
    TO authenticated
    USING (id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Super admins can manage all clinics"
    ON public.clinics FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Clinic admins can update their clinic"
    ON public.clinics FOR UPDATE
    TO authenticated
    USING (id = public.get_user_clinic_id(auth.uid()) AND public.has_role(auth.uid(), 'clinic_admin'));

-- Clinic Subscriptions
CREATE POLICY "Super admins can manage all subscriptions"
    ON public.clinic_subscriptions FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Clinic admins can view their subscription"
    ON public.clinic_subscriptions FOR SELECT
    TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- Billing History
CREATE POLICY "Super admins can view all billing"
    ON public.billing_history FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Clinic admins can view their billing"
    ON public.billing_history FOR SELECT
    TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

-- Profiles: пользователи видят коллег своей клиники
CREATE POLICY "Users can view profiles in their clinic"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        clinic_id = public.get_user_clinic_id(auth.uid())
        OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- User Roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Clinic admins can manage roles in their clinic"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'clinic_admin')
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = user_roles.user_id
            AND p.clinic_id = public.get_user_clinic_id(auth.uid())
        )
    );

-- Doctor Schedules
CREATE POLICY "Users can view schedules in their clinic"
    ON public.doctor_schedules FOR SELECT
    TO authenticated
    USING (clinic_id = public.get_user_clinic_id(auth.uid()));

CREATE POLICY "Clinic admins can manage schedules"
    ON public.doctor_schedules FOR ALL
    TO authenticated
    USING (
        clinic_id = public.get_user_clinic_id(auth.uid())
        AND (public.has_role(auth.uid(), 'clinic_admin') OR public.has_role(auth.uid(), 'reception'))
    );

-- =============================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: ТАРИФНЫЕ ПЛАНЫ
-- =============================================

INSERT INTO public.subscription_plans (name, name_ru, price_monthly, max_doctors, max_patients, storage_gb, features) VALUES
('Starter', 'Стартовый', 500000, 2, 500, 1, '{"analytics": false, "documents": false, "implant_passport": false}'),
('Professional', 'Профессиональный', 1500000, 10, NULL, 10, '{"analytics": true, "documents": true, "implant_passport": true}'),
('Enterprise', 'Корпоративный', 3000000, NULL, NULL, 100, '{"analytics": true, "documents": true, "implant_passport": true, "api_access": true, "priority_support": true}');