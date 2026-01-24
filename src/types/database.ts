// Enums
export type AppRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'reception' | 'nurse';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export type ToothStatus = 'healthy' | 'caries' | 'filled' | 'crown' | 'implant' | 'missing' | 'root_canal' | 'bridge';

export type PaymentMethod = 'cash' | 'uzcard' | 'humo' | 'visa' | 'mastercard' | 'click' | 'payme' | 'transfer';

export type DocumentType = 'contract' | 'consent' | 'treatment_plan' | 'act' | 'invoice';

export type DocumentStatus = 'draft' | 'sent' | 'signed' | 'archived';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export type BoneType = 'D1' | 'D2' | 'D3' | 'D4';

// Interfaces
export interface Clinic {
  id: string;
  name: string;
  subdomain: string;
  is_active: boolean;
  settings: {
    language: string;
    currency: string;
    timezone: string;
  } | null;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_name?: string;
  inn?: string;
  acquisition_source?: string;
  acquisition_campaign?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  clinic_id?: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  specialization?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  phone: string;
  phone_secondary?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  pinfl?: string;
  address?: string;
  source?: string;
  notes?: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  clinic_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  clinic_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id?: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  complaints?: string;
  diagnosis?: string;
  doctor_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  doctor?: Profile;
}

export interface ToothStatusRecord {
  id: string;
  clinic_id: string;
  patient_id: string;
  tooth_number: number;
  status: ToothStatus;
  notes?: string;
  updated_at: string;
}

export interface PerformedWork {
  id: string;
  clinic_id: string;
  appointment_id: string;
  service_id?: string;
  tooth_number?: number;
  quantity: number;
  price: number;
  discount_percent: number;
  total: number;
  doctor_comment?: string;
  created_at: string;
  service?: Service;
  patient_id?: string;
  doctor_id?: string;
}

export interface Payment {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  is_fiscalized: boolean;
  fiscal_receipt_number?: string;
  fiscal_check_url?: string;
  notes?: string;
  received_by?: string;
  created_at: string;
}

export interface ImplantPassport {
  id: string;
  clinic_id: string;
  patient_id: string;
  tooth_number: number;
  serial_number: string;
  batch_number?: string;
  manufacturer: string;
  model?: string;
  diameter?: number;
  length?: number;
  installation_date: string;
  torque_value?: number;
  bone_type?: BoneType;
  doctor_id?: string;
  qr_code_data?: string;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  doctor?: Profile;
}

export interface InventoryItem {
  id: string;
  clinic_id: string;
  name: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  clinic_id: string;
  name: string;
  type: DocumentType;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  clinic_id: string;
  patient_id: string;
  template_id?: string;
  title: string;
  type: DocumentType;
  content?: string;
  file_url?: string;
  status: DocumentStatus;
  signature_data?: string;
  signed_at?: string;
  signed_ip?: string;
  signed_device?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  name_ru: string;
  price_monthly: number;
  max_doctors?: number;
  max_patients?: number;
  storage_gb: number;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicSubscription {
  id: string;
  clinic_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}
