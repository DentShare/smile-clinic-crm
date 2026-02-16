import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Public booking endpoint — no auth required.
 * POST: Create appointment from public booking page
 * GET: Fetch available slots for a clinic
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);

    // GET /public-booking?subdomain=xyz&date=2026-02-20 — get available slots
    if (req.method === "GET") {
      const subdomain = url.searchParams.get("subdomain");
      const date = url.searchParams.get("date");

      if (!subdomain) {
        return new Response(JSON.stringify({ error: "subdomain required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get clinic
      const { data: clinic, error: clinicErr } = await supabase
        .from("clinics")
        .select("id, name, phone, address, logo_url")
        .eq("subdomain", subdomain)
        .eq("is_active", true)
        .single();

      if (clinicErr || !clinic) {
        return new Response(JSON.stringify({ error: "Clinic not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get active services
      const { data: services } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes, category_id")
        .eq("clinic_id", clinic.id)
        .eq("is_active", true)
        .order("name");

      // Get doctors with their profiles
      const { data: doctors } = await supabase
        .from("profiles")
        .select("id, full_name, specialization, avatar_url")
        .eq("clinic_id", clinic.id)
        .eq("is_active", true);

      // Get doctor role assignments to filter only actual doctors
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("clinic_id", clinic.id)
        .eq("role", "doctor");

      const doctorIds = new Set((roles || []).map((r: any) => r.user_id));
      const activeDoctors = (doctors || []).filter((d: any) => doctorIds.has(d.id));

      // Get schedules
      const { data: schedules } = await supabase
        .from("doctor_schedules")
        .select("doctor_id, day_of_week, start_time, end_time, is_working")
        .eq("clinic_id", clinic.id);

      // Get existing appointments for the date (if provided)
      let bookedSlots: any[] = [];
      if (date) {
        const { data: appointments } = await supabase
          .from("appointments")
          .select("doctor_id, start_time, end_time")
          .eq("clinic_id", clinic.id)
          .in("status", ["scheduled", "confirmed", "in_progress"])
          .gte("start_time", `${date}T00:00:00`)
          .lte("start_time", `${date}T23:59:59`);

        bookedSlots = appointments || [];
      }

      return new Response(JSON.stringify({
        clinic: { id: clinic.id, name: clinic.name, phone: clinic.phone, address: clinic.address, logo_url: clinic.logo_url },
        services: services || [],
        doctors: activeDoctors,
        schedules: schedules || [],
        bookedSlots,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /public-booking — create booking
    if (req.method === "POST") {
      const {
        subdomain, patientName, patientPhone, serviceId,
        doctorId, startTime, endTime, complaints,
      } = await req.json();

      if (!subdomain || !patientName || !patientPhone || !startTime || !endTime) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get clinic
      const { data: clinic } = await supabase
        .from("clinics")
        .select("id, name")
        .eq("subdomain", subdomain)
        .eq("is_active", true)
        .single();

      if (!clinic) {
        return new Response(JSON.stringify({ error: "Clinic not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for time slot conflict
      const { data: conflicts } = await supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("doctor_id", doctorId || null)
        .in("status", ["scheduled", "confirmed"])
        .lt("start_time", endTime)
        .gt("end_time", startTime);

      if (conflicts && conflicts.length > 0) {
        return new Response(JSON.stringify({ error: "Выбранное время уже занято" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find or create patient
      const normalizedPhone = patientPhone.replace(/\D/g, "");

      let { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("phone", patientPhone)
        .maybeSingle();

      if (!patient) {
        // Also try normalized phone
        const { data: p2 } = await supabase
          .from("patients")
          .select("id")
          .eq("clinic_id", clinic.id)
          .like("phone", `%${normalizedPhone.slice(-9)}`)
          .maybeSingle();

        patient = p2;
      }

      if (!patient) {
        const { data: newPatient, error: patientErr } = await supabase
          .from("patients")
          .insert({
            clinic_id: clinic.id,
            full_name: patientName,
            phone: patientPhone,
            source: "online_booking",
          })
          .select("id")
          .single();

        if (patientErr) {
          return new Response(JSON.stringify({ error: "Failed to create patient" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        patient = newPatient;
      }

      // Create appointment
      const { data: appointment, error: appointmentErr } = await supabase
        .from("appointments")
        .insert({
          clinic_id: clinic.id,
          patient_id: patient.id,
          doctor_id: doctorId || null,
          service_id: serviceId || null,
          start_time: startTime,
          end_time: endTime,
          status: "scheduled",
          complaints: complaints || null,
        })
        .select("id")
        .single();

      if (appointmentErr) {
        console.error("Appointment creation error:", appointmentErr);
        return new Response(JSON.stringify({ error: "Failed to create appointment" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        appointmentId: appointment.id,
        clinicName: clinic.name,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Public booking error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
