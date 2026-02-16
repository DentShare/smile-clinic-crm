-- ============================================================================
-- Comprehensive Database Fixes Migration
-- Date: 2026-02-15
-- Description: Fixes critical issues found during audit:
--   A. Drop orphan table "New"
--   B. Create 79 missing indexes on FK columns
--   C. Remove duplicate indexes
--   D. Fix chat RLS policies (remove public access)
--   E. Add WITH CHECK on INSERT policies for clinic_id enforcement
--   F. Create accept_staff_invitation RPC
--   G. Drop duplicate audit table
-- ============================================================================

-- ============================================================================
-- A. DROP ORPHAN TABLE
-- ============================================================================
DROP TABLE IF EXISTS public."New";

-- ============================================================================
-- B. CREATE MISSING FK INDEXES (79 total)
-- All RLS policies check clinic_id = get_user_clinic_id(), so unindexed
-- clinic_id columns cause full table scans on every query.
-- ============================================================================

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);

-- billing_history
CREATE INDEX IF NOT EXISTS idx_billing_history_clinic_id ON billing_history(clinic_id);

-- billing_manual_adjustments
CREATE INDEX IF NOT EXISTS idx_billing_manual_adjustments_clinic_id ON billing_manual_adjustments(clinic_id);

-- bulk_campaign_recipients
CREATE INDEX IF NOT EXISTS idx_bulk_campaign_recipients_campaign_id ON bulk_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_campaign_recipients_patient_id ON bulk_campaign_recipients(patient_id);

-- bulk_campaigns
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_clinic_id ON bulk_campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_created_by ON bulk_campaigns(created_by);

-- chat_conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_assigned_to ON chat_conversations(assigned_to);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);

-- clinic_subscriptions
CREATE INDEX IF NOT EXISTS idx_clinic_subscriptions_plan_id ON clinic_subscriptions(plan_id);

-- deposit_transactions
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_appointment_id ON deposit_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_clinic_id ON deposit_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_created_by ON deposit_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_patient_id ON deposit_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_payment_id ON deposit_transactions(payment_id);

-- doctor_schedules
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_clinic_id ON doctor_schedules(clinic_id);

-- document_templates
CREATE INDEX IF NOT EXISTS idx_document_templates_clinic_id ON document_templates(clinic_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_clinic_id ON documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);

-- fraud_alerts
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved_by ON fraud_alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON fraud_alerts(user_id);

-- implant_passports
CREATE INDEX IF NOT EXISTS idx_implant_passports_clinic_id ON implant_passports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_implant_passports_doctor_id ON implant_passports(doctor_id);

-- inventory
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON inventory(warehouse_id);

-- loyalty_transactions
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_clinic_id ON loyalty_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_by ON loyalty_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_patient_id ON loyalty_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_payment_id ON loyalty_transactions(payment_id);

-- material_usage
CREATE INDEX IF NOT EXISTS idx_material_usage_clinic_id ON material_usage(clinic_id);
CREATE INDEX IF NOT EXISTS idx_material_usage_implant_passport_id ON material_usage(implant_passport_id);
CREATE INDEX IF NOT EXISTS idx_material_usage_inventory_id ON material_usage(inventory_id);
CREATE INDEX IF NOT EXISTS idx_material_usage_performed_work_id ON material_usage(performed_work_id);

-- patient_deposits
CREATE INDEX IF NOT EXISTS idx_patient_deposits_clinic_id ON patient_deposits(clinic_id);

-- patient_loyalty
CREATE INDEX IF NOT EXISTS idx_patient_loyalty_clinic_id ON patient_loyalty(clinic_id);

-- patient_notifications
CREATE INDEX IF NOT EXISTS idx_patient_notifications_patient_id ON patient_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_stage_id ON patient_notifications(stage_id);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_treatment_plan_id ON patient_notifications(treatment_plan_id);

-- patient_package_usage
CREATE INDEX IF NOT EXISTS idx_patient_package_usage_appointment_id ON patient_package_usage(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_package_usage_patient_package_id ON patient_package_usage(patient_package_id);
CREATE INDEX IF NOT EXISTS idx_patient_package_usage_service_id ON patient_package_usage(service_id);

-- patient_packages
CREATE INDEX IF NOT EXISTS idx_patient_packages_clinic_id ON patient_packages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_packages_package_id ON patient_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_patient_packages_patient_id ON patient_packages(patient_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_by ON payments(received_by);

-- performed_works
CREATE INDEX IF NOT EXISTS idx_performed_works_clinic_id ON performed_works(clinic_id);
CREATE INDEX IF NOT EXISTS idx_performed_works_service_id ON performed_works(service_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON profiles(clinic_id);

-- salary_reports
CREATE INDEX IF NOT EXISTS idx_salary_reports_approved_by ON salary_reports(approved_by);
CREATE INDEX IF NOT EXISTS idx_salary_reports_clinic_id ON salary_reports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_salary_reports_doctor_id ON salary_reports(doctor_id);

-- salary_thresholds
CREATE INDEX IF NOT EXISTS idx_salary_thresholds_salary_setting_id ON salary_thresholds(salary_setting_id);

-- service_categories
CREATE INDEX IF NOT EXISTS idx_service_categories_clinic_id ON service_categories(clinic_id);

-- service_package_items
CREATE INDEX IF NOT EXISTS idx_service_package_items_package_id ON service_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_service_package_items_service_id ON service_package_items(service_id);

-- service_packages
CREATE INDEX IF NOT EXISTS idx_service_packages_clinic_id ON service_packages(clinic_id);

-- staff_invitations
CREATE INDEX IF NOT EXISTS idx_staff_invitations_clinic_id ON staff_invitations(clinic_id);

-- tooth_status
CREATE INDEX IF NOT EXISTS idx_tooth_status_clinic_id ON tooth_status(clinic_id);

-- treatment_plan_items
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_appointment_id ON treatment_plan_items(appointment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_clinic_id ON treatment_plan_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_service_id ON treatment_plan_items(service_id);

-- treatment_plan_stages
CREATE INDEX IF NOT EXISTS idx_treatment_plan_stages_clinic_id ON treatment_plan_stages(clinic_id);

-- vouchers
CREATE INDEX IF NOT EXISTS idx_vouchers_issued_by ON vouchers(issued_by);
CREATE INDEX IF NOT EXISTS idx_vouchers_patient_id ON vouchers(patient_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_service_id ON vouchers(service_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_used_appointment_id ON vouchers(used_appointment_id);

-- waiting_list
CREATE INDEX IF NOT EXISTS idx_waiting_list_appointment_id ON waiting_list(appointment_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_clinic_id ON waiting_list(clinic_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_created_by ON waiting_list(created_by);
CREATE INDEX IF NOT EXISTS idx_waiting_list_doctor_id ON waiting_list(doctor_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_patient_id ON waiting_list(patient_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_service_id ON waiting_list(service_id);

-- warehouse_transfers
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_clinic_id ON warehouse_transfers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_created_by ON warehouse_transfers(created_by);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_from_warehouse_id ON warehouse_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_inventory_id ON warehouse_transfers(inventory_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_to_warehouse_id ON warehouse_transfers(to_warehouse_id);

-- warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_clinic_id ON warehouses(clinic_id);

-- ============================================================================
-- C. REMOVE DUPLICATE INDEXES
-- ============================================================================
DROP INDEX IF EXISTS idx_inventory_clinic;
DROP INDEX IF EXISTS idx_payments_created_at;
DROP INDEX IF EXISTS idx_performed_works_appointment;

-- ============================================================================
-- D. FIX CHAT RLS POLICIES (CRITICAL: remove public access)
-- ============================================================================
DROP POLICY IF EXISTS "chat_conversations_select" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_update" ON chat_conversations;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;

CREATE POLICY "chat_conversations_select" ON chat_conversations FOR SELECT
  USING (clinic_id = get_user_clinic_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "chat_conversations_insert" ON chat_conversations FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "chat_conversations_update" ON chat_conversations FOR UPDATE
  USING (clinic_id = get_user_clinic_id(auth.uid()));

CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE clinic_id = get_user_clinic_id(auth.uid())
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE clinic_id = get_user_clinic_id(auth.uid())
    )
  );

-- ============================================================================
-- E. ADD WITH CHECK ON INSERT POLICIES FOR CLINIC_ID ENFORCEMENT
-- ============================================================================

-- appointments
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()));

-- patients
DROP POLICY IF EXISTS "patients_insert" ON patients;
CREATE POLICY "patients_insert" ON patients FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()));

-- payments
DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()));

-- documents
DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()));

-- tooth_status_history
DROP POLICY IF EXISTS "tooth_status_history_insert" ON tooth_status_history;
CREATE POLICY "tooth_status_history_insert" ON tooth_status_history FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()));

-- patient_notifications
DROP POLICY IF EXISTS "patient_notifications_insert" ON patient_notifications;
CREATE POLICY "patient_notifications_insert" ON patient_notifications FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id(auth.uid()));

-- ============================================================================
-- F. CREATE ACCEPT_STAFF_INVITATION RPC (atomic transaction)
-- ============================================================================
CREATE OR REPLACE FUNCTION accept_staff_invitation(
  p_token TEXT,
  p_full_name TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate invitation
  SELECT * INTO v_invitation
  FROM staff_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW()
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Create profile
  INSERT INTO profiles (user_id, clinic_id, full_name, specialization, is_active)
  VALUES (v_user_id, v_invitation.clinic_id, p_full_name, v_invitation.specialization, true);

  -- Assign role
  INSERT INTO user_roles (user_id, role) VALUES (v_user_id, v_invitation.role);

  -- Mark invitation accepted
  UPDATE staff_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN json_build_object('success', true, 'clinic_id', v_invitation.clinic_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- G. DROP DUPLICATE AUDIT TABLE (keep audit_logs used by app)
-- ============================================================================
DROP TABLE IF EXISTS public.audit_log;
