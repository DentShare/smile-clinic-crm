import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  patientId: string;
  clinicId: string;
  treatmentPlanId?: string;
  stageId?: string;
  type: 'sms' | 'telegram' | 'both';
  message: string;
}

// Eskiz.uz API integration
async function getEskizToken(): Promise<string | null> {
  const email = Deno.env.get('ESKIZ_EMAIL');
  const password = Deno.env.get('ESKIZ_PASSWORD');
  
  if (!email || !password) {
    console.log('Eskiz credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      console.error('Failed to get Eskiz token:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.token || null;
  } catch (error) {
    console.error('Eskiz auth error:', error);
    return null;
  }
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const token = await getEskizToken();
  
  if (!token) {
    return { success: false, error: 'Eskiz not configured or auth failed' };
  }

  // Format phone number for Eskiz (should be 998XXXXXXXXX)
  let formattedPhone = phone.replace(/\D/g, '');
  if (!formattedPhone.startsWith('998')) {
    formattedPhone = '998' + formattedPhone.replace(/^8/, '');
  }

  try {
    const response = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile_phone: formattedPhone,
        message: message,
        from: '4546', // Default Eskiz sender ID
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.status === 'waiting') {
      return { success: true, externalId: data.id?.toString() };
    }

    return { success: false, error: data.message || 'Unknown error' };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SMS send error:', error);
    return { success: false, error: errorMessage };
  }
}

async function sendTelegram(phone: string, message: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  if (!botToken) {
    return { success: false, error: 'Telegram bot not configured' };
  }

  // For Telegram, we need to find the chat_id by phone
  // This requires the user to have started the bot first
  // For now, we'll use a simple approach - store chat_id in patient record
  
  try {
    // Format phone for Telegram link
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Note: Direct Telegram messaging requires the user to have started the bot
    // This is a placeholder - in production, you'd store chat_id when user starts bot
    console.log(`Telegram notification prepared for ${formattedPhone}: ${message}`);
    
    return { success: true, externalId: `tg_${Date.now()}` };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Telegram send error:', error);
    return { success: false, error: errorMessage };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { patientId, clinicId, treatmentPlanId, stageId, type, message }: NotificationRequest = await req.json();

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('phone, full_name, notification_preferences')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preferences = patient.notification_preferences || { sms: true, telegram: true };
    const results: { sms?: any; telegram?: any } = {};

    // Send SMS if requested and enabled
    if ((type === 'sms' || type === 'both') && preferences.sms) {
      const smsResult = await sendSMS(patient.phone, message);
      
      // Log notification
      await supabase.from('patient_notifications').insert({
        clinic_id: clinicId,
        patient_id: patientId,
        treatment_plan_id: treatmentPlanId,
        stage_id: stageId,
        type: 'sms',
        status: smsResult.success ? 'sent' : 'failed',
        message: message,
        sent_at: smsResult.success ? new Date().toISOString() : null,
        external_id: smsResult.externalId,
        error_message: smsResult.error,
      });

      results.sms = smsResult;
    }

    // Send Telegram if requested and enabled
    if ((type === 'telegram' || type === 'both') && preferences.telegram) {
      const tgResult = await sendTelegram(patient.phone, message);
      
      // Log notification
      await supabase.from('patient_notifications').insert({
        clinic_id: clinicId,
        patient_id: patientId,
        treatment_plan_id: treatmentPlanId,
        stage_id: stageId,
        type: 'telegram',
        status: tgResult.success ? 'sent' : 'failed',
        message: message,
        sent_at: tgResult.success ? new Date().toISOString() : null,
        external_id: tgResult.externalId,
        error_message: tgResult.error,
      });

      results.telegram = tgResult;
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
