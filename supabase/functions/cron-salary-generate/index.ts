import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Cron-triggered function: auto-generates salary reports
 * Schedule: 0 3 1 * * (1st of each month at 03:00 UTC+5)
 *
 * For all doctors with salary_settings.auto_generate = true,
 * calls bulk_generate_salary_reports for the previous month.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate previous month period
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodStart = prevMonth.toISOString().slice(0, 10); // YYYY-MM-DD
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .slice(0, 10);

    // Get all doctors with auto_generate = true, grouped by clinic
    const { data: settings, error: settingsError } = await supabase
      .from("salary_settings")
      .select("clinic_id, doctor_id")
      .eq("auto_generate", true);

    if (settingsError) {
      throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    }

    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No auto-generate doctors", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by clinic_id
    const clinicGroups = new Map<string, string[]>();
    for (const s of settings) {
      const existing = clinicGroups.get(s.clinic_id) || [];
      existing.push(s.doctor_id);
      clinicGroups.set(s.clinic_id, existing);
    }

    let totalGenerated = 0;
    const allErrors: Array<{ clinic_id: string; error: string }> = [];

    for (const [clinicId, doctorIds] of clinicGroups) {
      const { data, error } = await supabase.rpc("bulk_generate_salary_reports", {
        p_clinic_id: clinicId,
        p_doctor_ids: doctorIds,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) {
        allErrors.push({ clinic_id: clinicId, error: error.message });
        console.error(`Clinic ${clinicId} error:`, error);
      } else if (data) {
        totalGenerated += data.generated || 0;
        if (data.errors?.length > 0) {
          for (const e of data.errors) {
            allErrors.push({ clinic_id: clinicId, error: `Doctor ${e.doctor_id}: ${e.error}` });
          }
        }
      }
    }

    console.log(
      `Salary auto-generate: ${totalGenerated} reports, ${allErrors.length} errors, period ${periodStart} - ${periodEnd}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        generated: totalGenerated,
        errors: allErrors,
        period: { start: periodStart, end: periodEnd },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Cron salary error:", error);
    return new Response(
      JSON.stringify({ error: msg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
