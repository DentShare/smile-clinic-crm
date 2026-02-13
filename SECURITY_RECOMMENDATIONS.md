# Security Recommendations for Smile Clinic CRM

## Critical: Server-Side Financial Validation

### Current State
Currently, financial validation happens primarily on the client side, which can be bypassed by malicious users using browser DevTools or direct API calls.

### Required Supabase RPC Function Updates

The following PostgreSQL functions need enhanced validation:

#### 1. `process_patient_payment()`
**Location:** Supabase SQL Editor → Functions

Add these validations:
```sql
CREATE OR REPLACE FUNCTION process_patient_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_processed_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- VALIDATION 1: Verify clinic_id matches user's clinic
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND clinic_id = p_clinic_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: User does not belong to this clinic'
    );
  END IF;

  -- VALIDATION 2: Amount must be positive and reasonable
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount: must be positive'
    );
  END IF;

  IF p_amount > 100000000 THEN -- 100 million limit
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount: exceeds maximum allowed'
    );
  END IF;

  -- VALIDATION 3: Verify payment method is valid
  IF p_method NOT IN ('cash', 'uzcard', 'humo', 'visa', 'mastercard', 'click', 'payme', 'transfer') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid payment method'
    );
  END IF;

  -- VALIDATION 4: Verify patient belongs to clinic
  IF NOT EXISTS (
    SELECT 1 FROM patients
    WHERE id = p_patient_id
    AND clinic_id = p_clinic_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Patient not found in this clinic'
    );
  END IF;

  -- VALIDATION 5: Check for duplicate payments (idempotency)
  -- Add payment_reference column to payments table first
  -- Then check if same amount was paid within last 60 seconds
  IF EXISTS (
    SELECT 1 FROM payments
    WHERE patient_id = p_patient_id
    AND amount = p_amount
    AND method = p_method
    AND created_at > NOW() - INTERVAL '60 seconds'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Duplicate payment detected'
    );
  END IF;

  -- Insert payment within transaction
  BEGIN
    INSERT INTO payments (
      clinic_id,
      patient_id,
      amount,
      method,
      processed_by,
      notes,
      created_at
    ) VALUES (
      p_clinic_id,
      p_patient_id,
      p_amount,
      p_method,
      p_processed_by,
      p_notes,
      NOW()
    );

    RETURN json_build_object(
      'success', true
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. `process_bonus_payment()`
Add similar validations:
```sql
CREATE OR REPLACE FUNCTION process_bonus_payment(
  p_clinic_id UUID,
  p_patient_id UUID,
  p_amount NUMERIC,
  p_deducted_by UUID
) RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Verify clinic access
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND clinic_id = p_clinic_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized access'
    );
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount'
    );
  END IF;

  -- Check sufficient bonus balance
  SELECT bonus_balance INTO v_current_balance
  FROM patient_loyalty
  WHERE patient_id = p_patient_id
  AND clinic_id = p_clinic_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient bonus balance'
    );
  END IF;

  -- Deduct bonuses atomically
  UPDATE patient_loyalty
  SET bonus_balance = bonus_balance - p_amount
  WHERE patient_id = p_patient_id
  AND clinic_id = p_clinic_id
  AND bonus_balance >= p_amount; -- Double-check in UPDATE

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to deduct bonuses (concurrent update?)'
    );
  END IF;

  RETURN json_build_object(
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. `process_deposit_payment()`
Similar structure with deposit balance checks.

#### 4. `complete_treatment_services()`
Add validation for:
- Service belongs to clinic
- Doctor belongs to clinic
- Appointment belongs to clinic
- Services haven't already been completed
- Amounts are positive

### Row Level Security (RLS) Policies

Enable RLS on all financial tables:

```sql
-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE performed_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_loyalty ENABLE ROW LEVEL SECURITY;

-- Payments: Users can only see payments from their clinic
CREATE POLICY payments_select_policy ON payments
FOR SELECT
USING (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY payments_insert_policy ON payments
FOR INSERT
WITH CHECK (
  clinic_id IN (
    SELECT clinic_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Similar policies for other financial tables
```

### Additional Security Measures

1. **Audit Logging**
   - Log all financial operations to an `audit_log` table
   - Include: user_id, action, table_name, record_id, old_values, new_values, ip_address, timestamp

2. **Rate Limiting**
   - Implement rate limiting on payment processing
   - Max 10 payments per user per minute
   - Use PostgreSQL functions or Supabase Edge Functions

3. **Fraud Detection Triggers**
   - Alert on unusual patterns:
     - Multiple large payments in short time
     - Payments outside business hours
     - Round number payments (potential money laundering)
     - Negative or zero amounts

4. **Transaction Wrapping**
   - Wrap multi-step operations in database transactions
   - Use `BEGIN`, `COMMIT`, `ROLLBACK` properly
   - Implement savepoints for partial rollbacks

5. **Idempotency Keys**
   - Add `idempotency_key` column to payments table
   - Generate unique key on client: `crypto.randomUUID()`
   - Check for duplicate keys before processing

## Implementation Priority

1. **CRITICAL (Do Now)**
   - Add server-side amount validation
   - Add clinic_id verification in all RPC functions
   - Enable RLS on financial tables

2. **HIGH (This Week)**
   - Add idempotency keys
   - Implement audit logging
   - Add duplicate payment detection

3. **MEDIUM (This Month)**
   - Add fraud detection triggers
   - Implement rate limiting
   - Add business hours validation

## Testing Recommendations

Test these attack scenarios:
1. Modify payment amount in browser DevTools before submit
2. Send negative amounts via API
3. Send payments for patients in other clinics
4. Submit same payment twice rapidly
5. Send extremely large amounts
6. Use invalid payment methods

## Server-Side Admin Authorization

### Current Issue
Admin access is verified only on the client side in `AdminLogin.tsx`, which can be bypassed.

### Solution: Row Level Security Policies

Add RLS policies to enforce server-side authorization:

```sql
-- Enable RLS on all admin-accessible tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clinics: Super admins can see all, regular users only their clinic
CREATE POLICY clinics_select_policy ON clinics
FOR SELECT
USING (
  is_super_admin() OR
  id IN (SELECT clinic_id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY clinics_update_policy ON clinics
FOR UPDATE
USING (is_super_admin());

CREATE POLICY clinics_insert_policy ON clinics
FOR INSERT
WITH CHECK (is_super_admin());

-- Subscription Plans: Only super admins can modify
CREATE POLICY subscription_plans_select_policy ON subscription_plans
FOR SELECT
USING (true); -- Anyone can view plans

CREATE POLICY subscription_plans_modify_policy ON subscription_plans
FOR ALL
USING (is_super_admin());

-- Billing History: Only super admins can access
CREATE POLICY billing_history_policy ON billing_history
FOR ALL
USING (is_super_admin());
```

### Edge Function for Admin Routes (Optional but Recommended)

Create a Supabase Edge Function to validate admin access:

```typescript
// supabase/functions/verify-admin/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check super_admin role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle()

  if (roleError || !roleData) {
    return new Response(JSON.stringify({
      error: 'Access denied',
      isAdmin: false
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({
    isAdmin: true,
    userId: user.id
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Deploy and use:
```bash
supabase functions deploy verify-admin
```

Then call from frontend before admin operations:
```typescript
const verifyAdmin = async () => {
  const { data, error } = await supabase.functions.invoke('verify-admin')
  if (error || !data?.isAdmin) {
    throw new Error('Not authorized as admin')
  }
  return true
}
```

## Compliance Notes

For HIPAA/GDPR compliance:
- All financial operations must be logged
- User actions must be traceable
- PII must be encrypted at rest
- Access must be auditable
- Admin access must be verified server-side with RLS policies
