import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteServicesRequest {
  appointment_id: string;
  item_ids: string[];
  doctor_id: string;
}

interface ProcessPaymentRequest {
  patient_id: string;
  amount: number;
  method: string;
  appointment_id?: string;
  fiscal_check_url?: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's clinic
    const { data: profile } = await supabase
      .from('profiles')
      .select('clinic_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.clinic_id) {
      return new Response(
        JSON.stringify({ error: 'User not associated with a clinic' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    console.log(`[patient-finance] Action: ${action}, User: ${user.id}, Clinic: ${profile.clinic_id}`);

    // ==========================================
    // POST /patient-finance/complete-services
    // Move treatment plan items to performed works
    // ==========================================
    if (req.method === 'POST' && action === 'complete-services') {
      const body: CompleteServicesRequest = await req.json();
      
      if (!body.appointment_id || !body.item_ids?.length || !body.doctor_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: appointment_id, item_ids, doctor_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[complete-services] Completing ${body.item_ids.length} items for appointment ${body.appointment_id}`);

      // Call database function
      const { data, error } = await supabase.rpc('complete_treatment_services', {
        p_appointment_id: body.appointment_id,
        p_item_ids: body.item_ids,
        p_doctor_id: body.doctor_id
      });

      if (error) {
        console.error('[complete-services] Error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[complete-services] Result:', data);
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // POST /patient-finance/payment
    // Process a payment and update balance
    // ==========================================
    if (req.method === 'POST' && action === 'payment') {
      const body: ProcessPaymentRequest = await req.json();
      
      if (!body.patient_id || !body.amount || !body.method) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: patient_id, amount, method' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[payment] Processing payment of ${body.amount} for patient ${body.patient_id}`);

      // Call database function
      const { data, error } = await supabase.rpc('process_patient_payment', {
        p_clinic_id: profile.clinic_id,
        p_patient_id: body.patient_id,
        p_amount: body.amount,
        p_method: body.method,
        p_appointment_id: body.appointment_id || null,
        p_fiscal_check_url: body.fiscal_check_url || null,
        p_notes: body.notes || null,
        p_received_by: user.id
      });

      if (error) {
        console.error('[payment] Error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[payment] Result:', data);
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // GET /patient-finance/summary?patient_id=xxx
    // Get patient's financial summary
    // ==========================================
    if (req.method === 'GET' && action === 'summary') {
      const patientId = url.searchParams.get('patient_id');
      
      if (!patientId) {
        return new Response(
          JSON.stringify({ error: 'Missing patient_id parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[summary] Getting finance summary for patient ${patientId}`);

      // Call database function
      const { data, error } = await supabase.rpc('get_patient_finance_summary', {
        p_patient_id: patientId
      });

      if (error) {
        console.error('[summary] Error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[summary] Result:', data);
      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // GET /patient-finance/ledger?patient_id=xxx
    // Get detailed ledger (all transactions)
    // ==========================================
    if (req.method === 'GET' && action === 'ledger') {
      const patientId = url.searchParams.get('patient_id');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      
      if (!patientId) {
        return new Response(
          JSON.stringify({ error: 'Missing patient_id parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[ledger] Getting ledger for patient ${patientId}`);

      // Fetch payments (credits)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          fiscal_check_url,
          is_fiscalized,
          notes,
          created_at
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('[ledger] Payments error:', paymentsError);
        return new Response(
          JSON.stringify({ error: paymentsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch performed works (debits)
      const { data: works, error: worksError } = await supabase
        .from('performed_works')
        .select(`
          id,
          service_id,
          tooth_number,
          quantity,
          price,
          discount_percent,
          total,
          doctor_comment,
          created_at,
          services:service_id (name)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (worksError) {
        console.error('[ledger] Works error:', worksError);
        return new Response(
          JSON.stringify({ error: worksError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Combine and sort by date
      const ledger = [
        ...payments.map(p => ({
          id: p.id,
          type: 'credit' as const,
          description: `Оплата (${p.payment_method})`,
          amount: p.amount,
          date: p.created_at,
          is_fiscalized: p.is_fiscalized,
          fiscal_url: p.fiscal_check_url,
          notes: p.notes
        })),
        ...works.map(w => ({
          id: w.id,
          type: 'debit' as const,
          description: (w.services as any)?.name || 'Услуга',
          amount: -w.total,
          date: w.created_at,
          tooth_number: w.tooth_number,
          quantity: w.quantity,
          unit_price: w.price,
          discount: w.discount_percent
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      const ledgerWithBalance = [...ledger].reverse().map(item => {
        runningBalance += item.amount;
        return { ...item, balance_after: runningBalance };
      }).reverse();

      return new Response(
        JSON.stringify({
          ledger: ledgerWithBalance.slice(offset, offset + limit),
          total: ledgerWithBalance.length,
          current_balance: runningBalance
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found', path: url.pathname, action }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[patient-finance] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
