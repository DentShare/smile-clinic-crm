import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Fiscalize Payment via OFD (Soliq.uz or MyFin)
 * Creates fiscal receipt and updates payment record
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FiscalRequest {
  paymentId: string;
  clinicId: string;
}

interface FiscalReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  vat_percent: number;
}

// Soliq.uz OFD API integration
async function fiscalizeViaSoliq(
  clinicSettings: Record<string, any>,
  payment: any,
  items: FiscalReceiptItem[],
): Promise<{ success: boolean; receiptNumber?: string; checkUrl?: string; error?: string }> {
  const { ofd_inn, ofd_login, ofd_password, ofd_terminal_id } = clinicSettings;

  if (!ofd_inn || !ofd_login || !ofd_password) {
    return { success: false, error: "OFD credentials not configured" };
  }

  try {
    // Step 1: Authenticate with OFD
    const authRes = await fetch("https://ofd.soliq.uz/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: ofd_login, password: ofd_password }),
    });

    if (!authRes.ok) {
      return { success: false, error: "OFD auth failed" };
    }

    const authData = await authRes.json();
    const token = authData.token || authData.data?.token;

    if (!token) {
      return { success: false, error: "OFD token not received" };
    }

    // Step 2: Create fiscal receipt
    const receiptPayload = {
      terminal_id: ofd_terminal_id,
      inn: ofd_inn,
      receipt_type: 0, // 0 = sale
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: Math.round(item.price * 100), // in tiyin
        total: Math.round(item.total * 100),
        vat_percent: item.vat_percent,
        package_code: "",
        commission_info: { tin: ofd_inn },
      })),
      payments: [
        {
          type: payment.payment_method === "cash" ? 0 : 1, // 0=cash, 1=card
          amount: Math.round(Number(payment.amount) * 100),
        },
      ],
    };

    const receiptRes = await fetch("https://ofd.soliq.uz/api/receipt/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(receiptPayload),
    });

    const receiptData = await receiptRes.json();

    if (receiptRes.ok && receiptData.receipt_id) {
      const checkUrl = `https://ofd.soliq.uz/check/${receiptData.receipt_id}`;
      return {
        success: true,
        receiptNumber: receiptData.receipt_id,
        checkUrl,
      };
    }

    return {
      success: false,
      error: receiptData.message || receiptData.error || "OFD receipt creation failed",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "OFD API error";
    console.error("Soliq OFD error:", error);
    return { success: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { paymentId, clinicId }: FiscalRequest = await req.json();

    // Get payment
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("clinic_id", clinicId)
      .single();

    if (paymentErr || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.is_fiscalized) {
      return new Response(
        JSON.stringify({
          success: true,
          already: true,
          receiptNumber: payment.fiscal_receipt_number,
          checkUrl: payment.fiscal_check_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get clinic settings
    const { data: clinic } = await supabase
      .from("clinics")
      .select("settings, name, inn")
      .eq("id", clinicId)
      .single();

    const settings = clinic?.settings || {};

    // Get performed works for receipt items
    let items: FiscalReceiptItem[] = [];

    if (payment.appointment_id) {
      const { data: works } = await supabase
        .from("performed_works")
        .select("quantity, price, total, services!performed_works_service_id_fkey(name)")
        .eq("appointment_id", payment.appointment_id);

      items =
        (works || []).map((w: any) => ({
          name: w.services?.name || "Стоматологическая услуга",
          quantity: w.quantity || 1,
          price: Number(w.price),
          total: Number(w.total),
          vat_percent: 0, // Dental services usually 0% VAT in UZ
        }));
    }

    // Fallback: single-line item
    if (items.length === 0) {
      items = [
        {
          name: "Стоматологическая услуга",
          quantity: 1,
          price: Number(payment.amount),
          total: Number(payment.amount),
          vat_percent: 0,
        },
      ];
    }

    // Attempt fiscalization
    const result = await fiscalizeViaSoliq(settings, payment, items);

    if (result.success) {
      // Update payment record
      await supabase
        .from("payments")
        .update({
          is_fiscalized: true,
          fiscal_receipt_number: result.receiptNumber,
          fiscal_check_url: result.checkUrl,
        })
        .eq("id", paymentId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Fiscalize error:", error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
