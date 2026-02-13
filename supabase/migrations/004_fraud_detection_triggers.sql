-- Migration 004: Fraud Detection Triggers and Automated Monitoring
-- Date: 2026-02-13
-- Description: Automatic fraud detection and suspicious activity alerts

-- =====================================================
-- 1. Function: Detect multiple large payments
-- =====================================================
CREATE OR REPLACE FUNCTION detect_multiple_large_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INTEGER;
  v_recent_sum NUMERIC;
  v_large_threshold NUMERIC := 1000000; -- 1 million
BEGIN
  -- Only check for large payments
  IF NEW.amount >= v_large_threshold THEN
    -- Count large payments in last 10 minutes by same user
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_recent_count, v_recent_sum
    FROM payments
    WHERE processed_by = NEW.processed_by
    AND clinic_id = NEW.clinic_id
    AND amount >= v_large_threshold
    AND created_at > NOW() - INTERVAL '10 minutes';

    -- Alert if 3+ large payments in 10 minutes
    IF v_recent_count >= 3 THEN
      INSERT INTO fraud_alerts (
        clinic_id,
        user_id,
        alert_type,
        severity,
        details
      ) VALUES (
        NEW.clinic_id,
        NEW.processed_by,
        'MULTIPLE_LARGE_PAYMENTS',
        'HIGH',
        json_build_object(
          'count', v_recent_count,
          'total_amount', v_recent_sum + NEW.amount,
          'time_window', '10 minutes',
          'latest_payment_id', NEW.id,
          'latest_amount', NEW.amount
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_large_payments
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_multiple_large_payments();

-- =====================================================
-- 2. Function: Detect off-hours activity
-- =====================================================
CREATE OR REPLACE FUNCTION detect_off_hours_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_hour INTEGER;
  v_day_of_week INTEGER;
BEGIN
  v_hour := EXTRACT(HOUR FROM NEW.created_at);
  v_day_of_week := EXTRACT(DOW FROM NEW.created_at); -- 0=Sunday, 6=Saturday

  -- Alert if payment during night hours (22:00 - 06:00) or on Sunday
  IF v_hour >= 22 OR v_hour < 6 OR v_day_of_week = 0 THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'OFF_HOURS_ACTIVITY',
      'MEDIUM',
      json_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'hour', v_hour,
        'day_of_week', v_day_of_week,
        'timestamp', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_off_hours
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_off_hours_activity();

-- =====================================================
-- 3. Function: Detect unusual round numbers
-- =====================================================
CREATE OR REPLACE FUNCTION detect_suspicious_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for suspiciously round numbers over 100,000
  IF NEW.amount >= 100000 AND NEW.amount % 100000 = 0 THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'SUSPICIOUS_PATTERN',
      'LOW',
      json_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reason', 'Large round number payment',
        'note', 'May indicate money laundering or test transaction'
      )
    );
  END IF;

  -- Check for extremely precise amounts (many decimal places)
  IF NEW.amount::TEXT LIKE '%.________%' THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'SUSPICIOUS_PATTERN',
      'LOW',
      json_build_object(
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reason', 'Unusually precise amount',
        'note', 'May indicate programmatic manipulation'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_suspicious_amounts
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_suspicious_amounts();

-- =====================================================
-- 4. Function: Auto-log critical table changes
-- =====================================================
CREATE OR REPLACE FUNCTION auto_audit_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  END IF;

  INSERT INTO audit_log (
    user_id,
    clinic_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    COALESCE(NEW.clinic_id, OLD.clinic_id),
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_old_values,
    v_new_values
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_payments_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION auto_audit_payments();

CREATE TRIGGER audit_performed_works_trigger
AFTER INSERT OR UPDATE OR DELETE ON performed_works
FOR EACH ROW
EXECUTE FUNCTION auto_audit_payments();

-- =====================================================
-- 5. Function: Monitor rapid successive transactions
-- =====================================================
CREATE OR REPLACE FUNCTION detect_rapid_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  -- Count transactions by same user in last 30 seconds
  SELECT COUNT(*)
  INTO v_recent_count
  FROM payments
  WHERE processed_by = NEW.processed_by
  AND created_at > NOW() - INTERVAL '30 seconds';

  -- Alert if 5+ transactions in 30 seconds
  IF v_recent_count >= 5 THEN
    INSERT INTO fraud_alerts (
      clinic_id,
      user_id,
      alert_type,
      severity,
      details
    ) VALUES (
      NEW.clinic_id,
      NEW.processed_by,
      'RAPID_SUBMISSIONS',
      'HIGH',
      json_build_object(
        'count', v_recent_count,
        'time_window', '30 seconds',
        'latest_payment_id', NEW.id,
        'note', 'Possible bot or compromised account'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_rapid_transactions
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION detect_rapid_transactions();

-- =====================================================
-- 6. Function: Track patient data access for HIPAA compliance
-- =====================================================
CREATE OR REPLACE FUNCTION log_patient_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log whenever patient record is accessed (read/update)
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      user_id,
      clinic_id,
      action,
      table_name,
      record_id,
      metadata
    ) VALUES (
      auth.uid(),
      NEW.clinic_id,
      'UPDATE',
      'patients',
      NEW.id,
      json_build_object(
        'patient_name', NEW.full_name,
        'accessed_at', NOW(),
        'access_type', 'MODIFY'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_patient_modifications
AFTER UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION log_patient_access();

-- =====================================================
-- 7. Function: Prevent deletion of records with dependencies
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_payment_deletion_with_works()
RETURNS TRIGGER AS $$
DECLARE
  v_work_count INTEGER;
BEGIN
  -- Check if payment has associated performed works
  SELECT COUNT(*)
  INTO v_work_count
  FROM performed_works
  WHERE patient_id = OLD.patient_id
  AND clinic_id = OLD.clinic_id
  AND created_at BETWEEN OLD.created_at - INTERVAL '1 hour' AND OLD.created_at + INTERVAL '1 hour';

  IF v_work_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete payment: associated performed works exist'
      USING HINT = 'Delete related performed works first or contact administrator';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger is commented out by default as deletions should be rare
-- Uncomment if you want to enable this protection
-- CREATE TRIGGER prevent_payment_deletion
-- BEFORE DELETE ON payments
-- FOR EACH ROW
-- EXECUTE FUNCTION prevent_payment_deletion_with_works();

-- =====================================================
-- 8. Add helpful comments
-- =====================================================
COMMENT ON FUNCTION detect_multiple_large_payments IS 'Triggers alert when user processes 3+ large payments in 10 minutes';
COMMENT ON FUNCTION detect_off_hours_activity IS 'Alerts on payments during night hours or Sundays';
COMMENT ON FUNCTION detect_suspicious_amounts IS 'Identifies unusual payment patterns (round numbers, odd precision)';
COMMENT ON FUNCTION auto_audit_payments IS 'Automatically logs all changes to critical financial tables';
COMMENT ON FUNCTION detect_rapid_transactions IS 'Detects possible bot activity or compromised accounts';
COMMENT ON FUNCTION log_patient_access IS 'HIPAA compliance: tracks all patient record modifications';
