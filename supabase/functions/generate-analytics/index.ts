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

    const today = new Date().toISOString().split("T")[0];

    // Get all companies
    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("status", "active");

    // Get all attendance records for today
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", today);

    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, company_id")
      .eq("status", "active");

    // Calculate metrics
    const totalCompanies = companies?.length || 0;
    const activeCompanies = totalCompanies; // All companies we fetched are active
    const totalEmployees = profiles?.length || 0;
    const totalAttendanceRecords = attendance?.length || 0;
    const totalClockIns = attendance?.filter((a: any) => a.clock_in_at).length || 0;
    const totalClockOuts = attendance?.filter((a: any) => a.clock_out_at).length || 0;
    const avgWorkingHours = attendance
      ? attendance.reduce((sum: number, a: any) => sum + (a.net_working_minutes || 0), 0) / attendance.length / 60
      : 0;

    // Upsert platform analytics
    const { error } = await supabase
      .from("platform_analytics")
      .upsert({
        date: today,
        total_companies: totalCompanies,
        active_companies: activeCompanies,
        total_employees: totalEmployees,
        total_attendance_records: totalAttendanceRecords,
        total_clock_ins: totalClockIns,
        total_clock_outs: totalClockOuts,
        avg_working_hours: parseFloat(avgWorkingHours.toFixed(2)),
        attendance_rate: totalEmployees > 0 ? ((totalClockIns / totalEmployees) * 100).toFixed(2) : 0,
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Analytics generated successfully",
        data: {
          date: today,
          totalCompanies,
          activeCompanies,
          totalEmployees,
          totalAttendanceRecords,
          totalClockIns,
          totalClockOuts,
        },
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
