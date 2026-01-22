export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          clinic_id: string
          complaints: string | null
          created_at: string | null
          created_by: string | null
          diagnosis: string | null
          doctor_id: string | null
          doctor_notes: string | null
          end_time: string
          id: string
          patient_id: string
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          complaints?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          end_time: string
          id?: string
          patient_id: string
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          complaints?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis?: string | null
          doctor_id?: string | null
          doctor_notes?: string | null
          end_time?: string
          id?: string
          patient_id?: string
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          external_id: string | null
          id: string
          payment_method: string | null
          status: string | null
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscriptions: {
        Row: {
          clinic_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_schedules: {
        Row: {
          clinic_id: string
          created_at: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_working: boolean | null
          start_time: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_working?: boolean | null
          start_time: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_working?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          clinic_id: string
          content: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          content: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          clinic_id: string
          content: string | null
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          patient_id: string
          signature_data: string | null
          signed_at: string | null
          signed_device: string | null
          signed_ip: string | null
          status: string | null
          template_id: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          patient_id: string
          signature_data?: string | null
          signed_at?: string | null
          signed_device?: string | null
          signed_ip?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          patient_id?: string
          signature_data?: string | null
          signed_at?: string | null
          signed_device?: string | null
          signed_ip?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      implant_passports: {
        Row: {
          batch_number: string | null
          bone_type: string | null
          clinic_id: string
          created_at: string | null
          diameter: number | null
          doctor_id: string | null
          id: string
          installation_date: string
          length: number | null
          manufacturer: string
          model: string | null
          notes: string | null
          patient_id: string
          photo_url: string | null
          qr_code_data: string | null
          serial_number: string
          tooth_number: number
          torque_value: number | null
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          bone_type?: string | null
          clinic_id: string
          created_at?: string | null
          diameter?: number | null
          doctor_id?: string | null
          id?: string
          installation_date: string
          length?: number | null
          manufacturer: string
          model?: string | null
          notes?: string | null
          patient_id: string
          photo_url?: string | null
          qr_code_data?: string | null
          serial_number: string
          tooth_number: number
          torque_value?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          bone_type?: string | null
          clinic_id?: string
          created_at?: string | null
          diameter?: number | null
          doctor_id?: string | null
          id?: string
          installation_date?: string
          length?: number | null
          manufacturer?: string
          model?: string | null
          notes?: string | null
          patient_id?: string
          photo_url?: string | null
          qr_code_data?: string | null
          serial_number?: string
          tooth_number?: number
          torque_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "implant_passports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implant_passports_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "implant_passports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          min_quantity: number | null
          name: string
          price: number | null
          quantity: number | null
          sku: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name: string
          price?: number | null
          quantity?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string
          price?: number | null
          quantity?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      material_usage: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          implant_passport_id: string | null
          inventory_id: string
          notes: string | null
          performed_work_id: string | null
          quantity: number
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          implant_passport_id?: string | null
          inventory_id: string
          notes?: string | null
          performed_work_id?: string | null
          quantity: number
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          implant_passport_id?: string | null
          inventory_id?: string
          notes?: string | null
          performed_work_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_implant_passport_id_fkey"
            columns: ["implant_passport_id"]
            isOneToOne: false
            referencedRelation: "implant_passports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_usage_performed_work_id_fkey"
            columns: ["performed_work_id"]
            isOneToOne: false
            referencedRelation: "performed_works"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notifications: {
        Row: {
          clinic_id: string
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          message: string
          patient_id: string
          sent_at: string | null
          stage_id: string | null
          status: string | null
          treatment_plan_id: string | null
          type: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message: string
          patient_id: string
          sent_at?: string | null
          stage_id?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          type: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          message?: string
          patient_id?: string
          sent_at?: string | null
          stage_id?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notifications_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notifications_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          balance: number | null
          birth_date: string | null
          clinic_id: string
          created_at: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          notification_preferences: Json | null
          phone: string
          phone_secondary: string | null
          pinfl: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          birth_date?: string | null
          clinic_id: string
          created_at?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          notification_preferences?: Json | null
          phone: string
          phone_secondary?: string | null
          pinfl?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          birth_date?: string | null
          clinic_id?: string
          created_at?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          notification_preferences?: Json | null
          phone?: string
          phone_secondary?: string | null
          pinfl?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          clinic_id: string
          created_at: string | null
          fiscal_receipt_number: string | null
          id: string
          is_fiscalized: boolean | null
          notes: string | null
          patient_id: string
          payment_method: string | null
          received_by: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          clinic_id: string
          created_at?: string | null
          fiscal_receipt_number?: string | null
          id?: string
          is_fiscalized?: boolean | null
          notes?: string | null
          patient_id: string
          payment_method?: string | null
          received_by?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string | null
          fiscal_receipt_number?: string | null
          id?: string
          is_fiscalized?: boolean | null
          notes?: string | null
          patient_id?: string
          payment_method?: string | null
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performed_works: {
        Row: {
          appointment_id: string
          clinic_id: string
          created_at: string | null
          discount_percent: number | null
          doctor_comment: string | null
          id: string
          price: number
          quantity: number | null
          service_id: string | null
          tooth_number: number | null
          total: number
          treatment_plan_item_id: string | null
        }
        Insert: {
          appointment_id: string
          clinic_id: string
          created_at?: string | null
          discount_percent?: number | null
          doctor_comment?: string | null
          id?: string
          price: number
          quantity?: number | null
          service_id?: string | null
          tooth_number?: number | null
          total: number
          treatment_plan_item_id?: string | null
        }
        Update: {
          appointment_id?: string
          clinic_id?: string
          created_at?: string | null
          discount_percent?: number | null
          doctor_comment?: string | null
          id?: string
          price?: number
          quantity?: number | null
          service_id?: string | null
          tooth_number?: number | null
          total?: number
          treatment_plan_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performed_works_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performed_works_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performed_works_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performed_works_treatment_plan_item_id_fkey"
            columns: ["treatment_plan_item_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          clinic_id: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          specialization: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          clinic_id?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          clinic_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          specialization?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          clinic_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          clinic_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          clinic_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          clinic_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          clinic_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          clinic_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_doctors: number | null
          max_patients: number | null
          max_staff: number | null
          name: string
          name_ru: string
          price_monthly: number
          storage_gb: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_doctors?: number | null
          max_patients?: number | null
          max_staff?: number | null
          name: string
          name_ru: string
          price_monthly?: number
          storage_gb?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_doctors?: number | null
          max_patients?: number | null
          max_staff?: number | null
          name?: string
          name_ru?: string
          price_monthly?: number
          storage_gb?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tooth_status: {
        Row: {
          clinic_id: string
          id: string
          notes: string | null
          patient_id: string
          status: string | null
          tooth_number: number
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: string | null
          tooth_number: number
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string | null
          tooth_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooth_status_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_status_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_status_history: {
        Row: {
          changed_by: string | null
          clinic_id: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          patient_id: string
          tooth_number: number
        }
        Insert: {
          changed_by?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          patient_id: string
          tooth_number: number
        }
        Update: {
          changed_by?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          patient_id?: string
          tooth_number?: number
        }
        Relationships: []
      }
      treatment_plan_items: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          discount_percent: number | null
          id: string
          is_completed: boolean | null
          notes: string | null
          quantity: number
          service_id: string | null
          service_name: string
          stage_id: string
          tooth_number: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          discount_percent?: number | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          quantity?: number
          service_id?: string | null
          service_name: string
          stage_id: string
          tooth_number?: number | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          discount_percent?: number | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          quantity?: number
          service_id?: string | null
          service_name?: string
          stage_id?: string
          tooth_number?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_items_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_items_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_stages: {
        Row: {
          actual_price: number | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_price: number
          id: string
          stage_number: number
          status: string
          title: string
          treatment_plan_id: string
          updated_at: string
        }
        Insert: {
          actual_price?: number | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number
          id?: string
          stage_number?: number
          status?: string
          title: string
          treatment_plan_id: string
          updated_at?: string
        }
        Update: {
          actual_price?: number | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_price?: number
          id?: string
          stage_number?: number
          status?: string
          title?: string
          treatment_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_stages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_stages_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          locked_price: number | null
          patient_id: string
          status: string
          title: string
          total_price: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          locked_price?: number | null
          patient_id: string
          status?: string
          title: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          locked_price?: number | null
          patient_id?: string
          status?: string
          title?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_role: {
        Args: {
          _target_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      check_staff_limit: {
        Args: {
          _clinic_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      get_user_clinic_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "clinic_admin"
        | "doctor"
        | "reception"
        | "nurse"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "clinic_admin", "doctor", "reception", "nurse"],
    },
  },
} as const
