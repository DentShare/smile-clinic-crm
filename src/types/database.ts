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

export type ImplantStage = 'placed' | 'healing' | 'abutment' | 'prosthetic' | 'completed' | 'failed';
export type SurgicalProtocol = 'one_stage' | 'two_stage' | 'immediate';
export type AbutmentType = 'stock' | 'custom' | 'angled' | 'multi_unit' | 'temporary';
export type ProstheticType = 'single_crown' | 'bridge' | 'overdenture' | 'bar' | 'temporary';
export type ProstheticMaterial = 'zirconia' | 'metal_ceramic' | 'emax' | 'composite' | 'acrylic' | 'metal';
export type FixationType = 'cement' | 'screw' | 'combined';
export type InitialStability = 'high' | 'medium' | 'low';

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
  // Surgical details
  surface_type?: string;
  platform_type?: string;
  surgical_protocol?: SurgicalProtocol;
  bone_graft_material?: string;
  membrane?: string;
  insertion_depth?: number;
  initial_stability?: InitialStability;
  // Healing
  healing_cap_date?: string;
  osseointegration_date?: string;
  isq_value?: number;
  // Abutment
  abutment_type?: AbutmentType;
  abutment_manufacturer?: string;
  abutment_model?: string;
  abutment_date?: string;
  // Prosthetic
  prosthetic_type?: ProstheticType;
  prosthetic_material?: ProstheticMaterial;
  fixation_type?: FixationType;
  prosthetic_date?: string;
  lab_name?: string;
  // Status
  stage?: ImplantStage;
  warranty_until?: string;
  next_checkup?: string;
  sticker_data?: string;
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

export type InventoryMovementType = 'in' | 'out' | 'adjustment' | 'auto_deduct' | 'return';

export interface ServiceMaterial {
  id: string;
  clinic_id: string;
  service_id: string;
  inventory_id: string;
  quantity_per_unit: number;
  is_required: boolean;
  created_at: string;
  inventory?: InventoryItem;
  service?: Service;
}

export interface InventoryMovement {
  id: string;
  clinic_id: string;
  inventory_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: string;
  performed_work_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  inventory?: InventoryItem;
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

// Warehouse Documents
export type WarehouseDocType = 'receipt' | 'writeoff' | 'transfer' | 'inventory_check';
export type WarehouseDocStatus = 'draft' | 'confirmed' | 'cancelled';

export interface WarehouseDocument {
  id: string;
  clinic_id: string;
  document_number: string;
  type: WarehouseDocType;
  status: WarehouseDocStatus;
  supplier?: string;
  notes?: string;
  total_amount: number;
  created_by?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  items?: WarehouseDocumentItem[];
  creator?: Profile;
}

export interface WarehouseDocumentItem {
  id: string;
  document_id: string;
  inventory_id?: string;
  name?: string;
  quantity: number;
  price: number;
  total: number;
  inventory?: InventoryItem;
}

// Cash Registers & Expenses
export type CashRegisterType = 'cash' | 'terminal' | 'online';
export type CashOperationType = 'income' | 'expense' | 'transfer' | 'adjustment';

export interface CashRegister {
  id: string;
  clinic_id: string;
  name: string;
  type: CashRegisterType;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  clinic_id: string;
  name: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  children?: ExpenseCategory[];
}

export interface Expense {
  id: string;
  clinic_id: string;
  category_id?: string;
  cash_register_id?: string;
  amount: number;
  description?: string;
  date: string;
  created_by?: string;
  created_at: string;
  category?: ExpenseCategory;
  cash_register?: CashRegister;
  creator?: Profile;
}

export interface CashRegisterOperation {
  id: string;
  cash_register_id: string;
  clinic_id: string;
  type: CashOperationType;
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  cash_register?: CashRegister;
  creator?: Profile;
}

// Patient Tags
export interface PatientTag {
  id: string;
  clinic_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Rooms
export interface Room {
  id: string;
  clinic_id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

// Staff Tasks
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface StaffTask {
  id: string;
  clinic_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  created_by?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  assignee?: Profile;
  creator?: Profile;
}

// Visit Templates
export interface VisitTemplate {
  id: string;
  clinic_id: string;
  name: string;
  duration_minutes: number;
  services: { service_id: string; quantity: number }[];
  default_diagnosis?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

// Patient Funnel
export type FunnelStage = 'new' | 'consultation' | 'treatment_plan' | 'in_treatment' | 'completed' | 'lost';

// Role Permissions
export interface RolePermission {
  id: string;
  clinic_id: string;
  role: string;
  permission: string;
  granted: boolean;
}

// Discount Cards
export interface DiscountCard {
  id: string;
  clinic_id: string;
  patient_id: string;
  card_number: string;
  discount_percent: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  patient?: Patient;
}

// Prescriptions
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id?: string;
  appointment_id?: string;
  medications: Medication[];
  notes?: string;
  created_at: string;
  doctor?: Profile;
}

// Insurance Companies
export interface InsuranceCompany {
  id: string;
  clinic_id: string;
  name: string;
  contract_number?: string;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
}

// Referral Rewards
export type RewardType = 'bonus' | 'discount' | 'service';

export interface ReferralReward {
  id: string;
  clinic_id: string;
  referrer_id: string;
  referred_id: string;
  reward_type: RewardType;
  reward_value: number;
  is_claimed: boolean;
  created_at: string;
  referrer?: Patient;
  referred?: Patient;
}
