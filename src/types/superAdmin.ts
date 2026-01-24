// Super Admin Dashboard Types

export type SubscriptionStatusType = 'trial' | 'active' | 'past_due' | 'cancelled' | 'blocked';

export type AcquisitionSource = 
  | 'instagram' 
  | 'facebook' 
  | 'telegram' 
  | 'referral' 
  | 'exhibition' 
  | 'google_ads' 
  | 'organic' 
  | 'other';

export interface ClinicTenant {
  id: string;
  name: string;
  subdomain: string;
  owner_name: string | null;
  owner_phone: string | null;
  phone: string | null;
  email: string | null;
  inn: string | null;
  is_active: boolean;
  acquisition_source: AcquisitionSource | null;
  acquisition_campaign: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Subscription data (joined)
  subscription?: {
    id: string;
    status: SubscriptionStatusType;
    plan_id: string;
    plan_name: string;
    plan_name_ru: string;
    price_monthly: number;
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;
}

export interface SuperAdminKPIs {
  mrr: number;
  mrrGrowth: number;
  activeClinics: number;
  trialExpiring: number;
  churnRate: number;
  totalClinics: number;
}

export interface AcquisitionData {
  source: string;
  signups: number;
  converted: number;
  conversionRate: number;
}

export interface ManualAdjustment {
  id: string;
  clinic_id: string;
  days_added: number;
  reason: string | null;
  adjusted_by: string | null;
  created_at: string;
}

export interface BillingHistoryItem {
  id: string;
  clinic_id: string;
  amount: number;
  status: string;
  description: string | null;
  payment_method: string | null;
  created_at: string;
}
