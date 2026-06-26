import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { companyId, dateFrom, dateTo } = body;

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing companyId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company settings
    const { data: settings } = await supabase
      .from("company_settings")
      .select("*")
      .eq("company_id", companyId)
      .single();

    const workStartTime = settings?.work_start_time || "09:00";
    const workEndTime = settings?.work_end_time || "17:00";

    // Get attendance records
    const { data: records } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("company_id", companyId)
      .gte("date", dateFrom || new Date().toISOString().split("T")[0])
      .lte("date", dateTo || new Date().toISOString().split("T")[0]);

    if (!records) {
      return new Response(
        JSON.stringify({ success: true, penalties: [], totalPenalty: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const penalties = records
      .map((record: any) => {
        let penalty = 0;
        const reason: string[] = [];

        // Check for late arrival
        if (record.clock_in_at) {
          const clockInTime = new Date(record.clock_in_at).toTimeString().slice(0, 5);
          if (clockInTime > workStartTime) {
            const lateMinutes = calculateMinuteDifference(workStartTime, clockInTime);
            penalty += lateMinutes * 10; // $10 per minute
            reason.push(`Late by ${lateMinutes} minutes`);
          }
        }

        // Check for early departure
        if (record.clock_out_at) {
          const clockOutTime = new Date(record.clock_out_at).toTimeString().slice(0, 5);
          if (clockOutTime < workEndTime) {
            const earlyMinutes = calculateMinuteDifference(clockOutTime, workEndTime);
            penalty += earlyMinutes * 10;
            reason.push(`Early departure by ${earlyMinutes} minutes`);
          }
        }

        // Check for no show
        if (!record.clock_in_at) {
          penalty += 1000; // $1000 for full day absence
          reason.push("No show");
        }

        return {
          employee_id: record.employee_id,
          date: record.date,
          penalty,
          reason: reason.join(", "),
        };
      })
      .filter((p: any) => p.penalty > 0);

    const totalPenalty = penalties.reduce((sum: number, p: any) => sum + p.penalty, 0);

    return new Response(
      JSON.stringify({
        success: true,
        penalties,
        totalPenalty,
        count: penalties.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateMinuteDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  const mins1 = h1 * 60 + m1;
  const mins2 = h2 * 60 + m2;
  return Math.abs(mins2 - mins1);
}
