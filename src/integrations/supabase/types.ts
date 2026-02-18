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
          service_id: string | null
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
          service_id?: string | null
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
          service_id?: string | null
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
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          clinic_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          clinic_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          clinic_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
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
      billing_manual_adjustments: {
        Row: {
          adjusted_by: string | null
          clinic_id: string
          created_at: string | null
          days_added: number
          id: string
          reason: string | null
        }
        Insert: {
          adjusted_by?: string | null
          clinic_id: string
          created_at?: string | null
          days_added: number
          id?: string
          reason?: string | null
        }
        Update: {
          adjusted_by?: string | null
          clinic_id?: string
          created_at?: string | null
          days_added?: number
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_manual_adjustments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_campaign_recipients: {
        Row: {
          campaign_id: string
          error_message: string | null
          id: string
          patient_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          error_message?: string | null
          id?: string
          patient_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          error_message?: string | null
          id?: string
          patient_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "bulk_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_campaign_recipients_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_campaigns: {
        Row: {
          channel: string
          clinic_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_count: number
          filter_criteria: Json | null
          id: string
          message_template: string
          name: string
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          total_recipients: number
        }
        Insert: {
          channel?: string
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          filter_criteria?: Json | null
          id?: string
          message_template: string
          name: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
        }
        Update: {
          channel?: string
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          filter_criteria?: Json | null
          id?: string
          message_template?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          total_recipients?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaigns_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          clinic_id: string
          created_at: string
          external_chat_id: string | null
          id: string
          last_message_at: string | null
          status: string
          updated_at: string
          visitor_email: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          clinic_id: string
          created_at?: string
          external_chat_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          clinic_id?: string
          created_at?: string
          external_chat_id?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          channel?: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          channel?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscriptions: {
        Row: {
          billing_period_months: number | null
          clinic_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_doctors_override: number | null
          plan_id: string
          status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_period_months?: number | null
          clinic_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_doctors_override?: number | null
          plan_id: string
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_period_months?: number | null
          clinic_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_doctors_override?: number | null
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
          acquisition_campaign: string | null
          acquisition_source: string | null
          address: string | null
          admin_notes: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          inn: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_name: string | null
          phone: string | null
          settings: Json | null
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          acquisition_campaign?: string | null
          acquisition_source?: string | null
          address?: string | null
          admin_notes?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inn?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_name?: string | null
          phone?: string | null
          settings?: Json | null
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          acquisition_campaign?: string | null
          acquisition_source?: string | null
          address?: string | null
          admin_notes?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          inn?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_name?: string | null
          phone?: string | null
          settings?: Json | null
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      deposit_transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          patient_id: string
          payment_id: string | null
          type: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id: string
          payment_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id?: string
          payment_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_assistants: {
        Row: {
          assistant_id: string
          clinic_id: string
          created_at: string
          doctor_id: string
          id: string
        }
        Insert: {
          assistant_id: string
          clinic_id: string
          created_at?: string
          doctor_id: string
          id?: string
        }
        Update: {
          assistant_id?: string
          clinic_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_assistants_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_assistants_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_assistants_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          warehouse_id: string | null
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
          warehouse_id?: string | null
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
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          bonus_conversion_rate: number | null
          bonus_percent: number | null
          clinic_id: string
          created_at: string
          discount_tiers: Json | null
          id: string
          is_active: boolean
          program_type: string
          updated_at: string
        }
        Insert: {
          bonus_conversion_rate?: number | null
          bonus_percent?: number | null
          clinic_id: string
          created_at?: string
          discount_tiers?: Json | null
          id?: string
          is_active?: boolean
          program_type?: string
          updated_at?: string
        }
        Update: {
          bonus_conversion_rate?: number | null
          bonus_percent?: number | null
          clinic_id?: string
          created_at?: string
          discount_tiers?: Json | null
          id?: string
          is_active?: boolean
          program_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          patient_id: string
          payment_id: string | null
          type: string
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id: string
          payment_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id?: string
          payment_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
      patient_deposits: {
        Row: {
          balance: number
          clinic_id: string
          created_at: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          clinic_id: string
          created_at?: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_deposits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_deposits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_loyalty: {
        Row: {
          bonus_balance: number
          clinic_id: string
          created_at: string
          current_discount_percent: number | null
          current_tier: string | null
          id: string
          patient_id: string
          total_spent: number
          updated_at: string
        }
        Insert: {
          bonus_balance?: number
          clinic_id: string
          created_at?: string
          current_discount_percent?: number | null
          current_tier?: string | null
          id?: string
          patient_id: string
          total_spent?: number
          updated_at?: string
        }
        Update: {
          bonus_balance?: number
          clinic_id?: string
          created_at?: string
          current_discount_percent?: number | null
          current_tier?: string | null
          id?: string
          patient_id?: string
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_loyalty_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_loyalty_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      patient_package_usage: {
        Row: {
          appointment_id: string | null
          id: string
          patient_package_id: string
          quantity: number
          service_id: string
          used_at: string
        }
        Insert: {
          appointment_id?: string | null
          id?: string
          patient_package_id: string
          quantity?: number
          service_id: string
          used_at?: string
        }
        Update: {
          appointment_id?: string | null
          id?: string
          patient_package_id?: string
          quantity?: number
          service_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_usage_patient_package_id_fkey"
            columns: ["patient_package_id"]
            isOneToOne: false
            referencedRelation: "patient_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_packages: {
        Row: {
          amount_paid: number
          clinic_id: string
          expires_at: string | null
          id: string
          notes: string | null
          package_id: string
          patient_id: string
          purchased_at: string
          status: string
        }
        Insert: {
          amount_paid?: number
          clinic_id: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          package_id: string
          patient_id: string
          purchased_at?: string
          status?: string
        }
        Update: {
          amount_paid?: number
          clinic_id?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          package_id?: string
          patient_id?: string
          purchased_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_packages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      payment_allocations: {
        Row: {
          id: string
          clinic_id: string
          payment_id: string
          performed_work_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          payment_id: string
          performed_work_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          payment_id?: string
          performed_work_id?: string
          amount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_performed_work_id_fkey"
            columns: ["performed_work_id"]
            isOneToOne: false
            referencedRelation: "performed_works"
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
          fiscal_check_url: string | null
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
          fiscal_check_url?: string | null
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
          fiscal_check_url?: string | null
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
          doctor_id: string | null
          id: string
          patient_id: string | null
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
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
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
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
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
            foreignKeyName: "performed_works_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
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
      salary_category_rates: {
        Row: {
          category_id: string
          commission_percent: number
          id: string
          salary_setting_id: string
        }
        Insert: {
          category_id: string
          commission_percent?: number
          id?: string
          salary_setting_id: string
        }
        Update: {
          category_id?: string
          commission_percent?: number
          id?: string
          salary_setting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_category_rates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_category_rates_salary_setting_id_fkey"
            columns: ["salary_setting_id"]
            isOneToOne: false
            referencedRelation: "salary_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_salary: number
          bonus_amount: number
          clinic_id: string
          commission_amount: number
          created_at: string
          deductions: number
          doctor_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          status: string
          total_revenue: number
          total_salary: number
          works_count: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number
          bonus_amount?: number
          clinic_id: string
          commission_amount?: number
          created_at?: string
          deductions?: number
          doctor_id: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          status?: string
          total_revenue?: number
          total_salary?: number
          works_count?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number
          bonus_amount?: number
          clinic_id?: string
          commission_amount?: number
          created_at?: string
          deductions?: number
          doctor_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_revenue?: number
          total_salary?: number
          works_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_reports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_reports_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_settings: {
        Row: {
          base_salary: number
          clinic_id: string
          created_at: string
          default_commission_percent: number
          doctor_id: string
          id: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          clinic_id: string
          created_at?: string
          default_commission_percent?: number
          doctor_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          clinic_id?: string
          created_at?: string
          default_commission_percent?: number
          doctor_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_settings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_thresholds: {
        Row: {
          bonus_fixed: number
          bonus_percent: number
          id: string
          min_revenue: number
          salary_setting_id: string
        }
        Insert: {
          bonus_fixed?: number
          bonus_percent?: number
          id?: string
          min_revenue?: number
          salary_setting_id: string
        }
        Update: {
          bonus_fixed?: number
          bonus_percent?: number
          id?: string
          min_revenue?: number
          salary_setting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_thresholds_salary_setting_id_fkey"
            columns: ["salary_setting_id"]
            isOneToOne: false
            referencedRelation: "salary_settings"
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
      service_package_items: {
        Row: {
          id: string
          package_id: string
          quantity: number
          service_id: string
        }
        Insert: {
          id?: string
          package_id: string
          quantity?: number
          service_id: string
        }
        Update: {
          id?: string
          package_id?: string
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          discount_percent: number | null
          id: string
          is_active: boolean
          name: string
          total_price: number
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          name: string
          total_price: number
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean
          name?: string
          total_price?: number
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_clinic_id_fkey"
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
          specialization: string | null
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
          specialization?: string | null
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
          specialization?: string | null
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
      system_logs: {
        Row: {
          clinic_id: string | null
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          source: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          source?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
      vouchers: {
        Row: {
          amount: number | null
          clinic_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_used: boolean
          issued_by: string | null
          notes: string | null
          patient_id: string | null
          service_id: string | null
          type: string
          used_appointment_id: string | null
          used_at: string | null
        }
        Insert: {
          amount?: number | null
          clinic_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          issued_by?: string | null
          notes?: string | null
          patient_id?: string | null
          service_id?: string | null
          type?: string
          used_appointment_id?: string | null
          used_at?: string | null
        }
        Update: {
          amount?: number | null
          clinic_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          issued_by?: string | null
          notes?: string | null
          patient_id?: string | null
          service_id?: string | null
          type?: string
          used_appointment_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_used_appointment_id_fkey"
            columns: ["used_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          preferred_date_from: string | null
          preferred_date_to: string | null
          preferred_time_from: string | null
          preferred_time_to: string | null
          priority: string
          resolved_at: string | null
          service_id: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          preferred_date_from?: string | null
          preferred_date_to?: string | null
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          priority?: string
          resolved_at?: string | null
          service_id?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          preferred_date_from?: string | null
          preferred_date_to?: string | null
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          priority?: string
          resolved_at?: string | null
          service_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_transfers: {
        Row: {
          clinic_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          inventory_id: string
          notes: string | null
          quantity: number
          status: string
          to_warehouse_id: string
        }
        Insert: {
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          inventory_id: string
          notes?: string | null
          quantity: number
          status?: string
          to_warehouse_id: string
        }
        Update: {
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity?: number
          status?: string
          to_warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_transfers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
        }
        Insert: {
          address?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
        }
        Update: {
          address?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_patient_balance: {
        Args: { p_patient_id: string }
        Returns: number
      }
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
      complete_treatment_services: {
        Args: {
          p_appointment_id: string
          p_doctor_id: string
          p_item_ids: string[]
        }
        Returns: Json
      }
      get_patient_finance_summary: {
        Args: { p_patient_id: string }
        Returns: Json
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
      log_audit_event: {
        Args: {
          p_action: string
          p_clinic_id: string
          p_new_values?: Json
          p_old_values?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: string
      }
      process_bonus_payment: {
        Args: {
          p_amount: number
          p_clinic_id: string
          p_deducted_by?: string
          p_patient_id: string
        }
        Returns: Json
      }
      process_deposit_payment: {
        Args: {
          p_amount: number
          p_clinic_id: string
          p_deducted_by?: string
          p_patient_id: string
        }
        Returns: Json
      }
      process_patient_payment: {
        Args: {
          p_amount: number
          p_appointment_id?: string
          p_clinic_id: string
          p_fiscal_check_url?: string
          p_method: string
          p_notes?: string
          p_patient_id: string
          p_received_by?: string
        }
        Returns: Json
      }
      process_patient_refund: {
        Args: {
          p_amount: number
          p_clinic_id: string
          p_patient_id: string
          p_payment_id: string
          p_reason?: string
          p_refund_method?: string
          p_refunded_by?: string
        }
        Returns: Json
      }
      register_clinic: {
        Args: {
          _clinic_name: string
          _email: string
          _full_name: string
          _phone: string
          _subdomain: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "clinic_admin"
        | "doctor"
        | "reception"
        | "nurse"
      payment_method_enum:
        | "cash"
        | "card_terminal"
        | "uzcard"
        | "humo"
        | "visa"
        | "mastercard"
        | "click"
        | "payme"
        | "uzum"
        | "bank_transfer"
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
      payment_method_enum: [
        "cash",
        "card_terminal",
        "uzcard",
        "humo",
        "visa",
        "mastercard",
        "click",
        "payme",
        "uzum",
        "bank_transfer",
      ],
    },
  },
} as const
