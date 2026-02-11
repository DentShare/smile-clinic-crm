import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) throw new Error("Unauthorized");

    const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSA) throw new Error("Forbidden: super_admin only");

    const body = await req.json();
    const { email, password, full_name, phone, clinic_name, subdomain, country, plan_index, period_months, doctor_count } = body;

    // 1. Create user via admin API (no session change)
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr) throw createErr;

    // 2. Use register_clinic RPC for atomic setup
    const { data: clinicId, error: regErr } = await supabase.rpc("register_clinic", {
      _user_id: newUser.user.id,
      _clinic_name: clinic_name,
      _subdomain: subdomain,
      _phone: phone,
      _email: email,
      _full_name: full_name,
    });
    if (regErr) throw regErr;

    // 3. Update clinic country
    if (country) {
      await supabase.from("clinics").update({ country }).eq("id", clinicId);
    }

    // 4. Upgrade subscription if not default starter
    const { data: subPlans } = await supabase
      .from("subscription_plans")
      .select("id, name")
      .eq("is_active", true)
      .order("price_monthly");

    if (subPlans && subPlans.length > 0 && plan_index !== undefined) {
      const actualPlanIndex = Math.min(plan_index, subPlans.length - 1);
      const planId = subPlans[actualPlanIndex].id;

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + (period_months || 3));

      await supabase
        .from("clinic_subscriptions")
        .update({
          plan_id: planId,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_ends_at: null,
          max_doctors_override: doctor_count || null,
          billing_period_months: period_months || 3,
        })
        .eq("clinic_id", clinicId);
    }

    return new Response(JSON.stringify({ success: true, clinic_id: clinicId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
