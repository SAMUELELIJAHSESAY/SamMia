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
    const { companyId, dataType, format = "csv" } = body;

    if (!companyId || !dataType) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let csvContent = "";
    const timestamp = new Date().toISOString();

    if (dataType === "attendance") {
      const { data: records } = await supabase
        .from("attendance_records")
        .select("*, employee:employee_id(full_name, employee_id)")
        .eq("company_id", companyId);

      csvContent = "Date,Employee,Employee ID,Clock In,Clock Out,Working Hours,Status\n";
      (records || []).forEach((rec: any) => {
        csvContent += `${rec.date},${rec.employee?.full_name || "N/A"},${rec.employee?.employee_id || "N/A"},${rec.clock_in_at ? new Date(rec.clock_in_at).toLocaleTimeString() : "N/A"},${rec.clock_out_at ? new Date(rec.clock_out_at).toLocaleTimeString() : "N/A"},${rec.net_working_minutes ? (rec.net_working_minutes / 60).toFixed(2) : "0"},${rec.attendance_status}\n`;
      });
    } else if (dataType === "employees") {
      const { data: employees } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", companyId);

      csvContent = "Full Name,Email,Role,Status,Salary,Created\n";
      (employees || []).forEach((emp: any) => {
        csvContent += `${emp.full_name || "N/A"},${emp.email || "N/A"},${emp.role || "N/A"},${emp.status || "N/A"},${emp.salary_amount || "0"},${emp.created_at || "N/A"}\n`;
      });
    } else if (dataType === "payroll") {
      const { data: entries } = await supabase
        .from("payroll_entries")
        .select("*, period:payroll_period_id(period_start, period_end), employee:employee_id(full_name)")
        .eq("payroll_period_id", companyId);

      csvContent = "Employee,Period,Basic Salary,Gross Salary,Tax Deduction,Net Salary,Days Worked\n";
      (entries || []).forEach((entry: any) => {
        csvContent += `${entry.employee?.full_name || "N/A"},${entry.period?.period_start || "N/A"},${entry.basic_salary || "0"},${entry.gross_salary || "0"},${entry.tax_deduction || "0"},${entry.net_salary || "0"},${entry.days_worked || "0"}\n`;
      });
    }

    // Upload to storage
    const fileName = `exports/${companyId}/export-${dataType}-${timestamp}.${format}`;
    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(fileName, new TextEncoder().encode(csvContent), {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get signed URL (valid for 7 days)
    const { data: urlData } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, 3600 * 24 * 7);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Data exported successfully",
        fileUrl: urlData?.signedUrl,
        fileName,
        fileSize: new TextEncoder().encode(csvContent).length,
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
