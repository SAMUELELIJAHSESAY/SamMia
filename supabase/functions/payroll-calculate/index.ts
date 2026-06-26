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
    const { payrollPeriodId } = body;

    if (!payrollPeriodId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing payrollPeriodId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payroll period details
    const { data: period, error: periodError } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("id", payrollPeriodId)
      .single();

    if (periodError || !period) {
      return new Response(
        JSON.stringify({ success: false, error: "Payroll period not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all employees for the company
    const { data: employees, error: employeesError } = await supabase
      .from("profiles")
      .select("id, full_name, salary_amount")
      .eq("company_id", period.company_id)
      .eq("status", "active");

    if (employeesError) throw employeesError;

    // Calculate payroll for each employee
    const payrollEntries = [];

    for (const employee of employees || []) {
      // Get attendance for the period
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employee.id)
        .gte("date", period.period_start)
        .lte("date", period.period_end);

      if (attendanceError) throw attendanceError;

      // Calculate working hours
      let totalWorkingMinutes = 0;
      let daysWorked = 0;

      (attendance || []).forEach((record: any) => {
        if (record.clock_in_at && record.clock_out_at) {
          totalWorkingMinutes += record.net_working_minutes || 0;
          daysWorked += 1;
        }
      });

      const totalWorkingHours = totalWorkingMinutes / 60;

      // Calculate salary
      const baseSalary = employee.salary_amount || 0;
      const hourlyRate = baseSalary / 160; // Assuming 160 hours per month
      const grossSalary = hourlyRate * totalWorkingHours;

      // Calculate deductions (taxes, etc) - simplified 20% tax
      const taxDeduction = grossSalary * 0.2;
      const netSalary = grossSalary - taxDeduction;

      // Create payroll entry
      const { error: insertError } = await supabase.from("payroll_entries").insert({
        payroll_period_id: payrollPeriodId,
        employee_id: employee.id,
        basic_salary: baseSalary,
        gross_salary: grossSalary,
        tax_deduction: taxDeduction,
        net_salary: netSalary,
        days_worked: daysWorked,
        total_working_hours: totalWorkingHours,
        status: "pending",
      });

      if (insertError) throw insertError;

      payrollEntries.push({
        employee_id: employee.id,
        net_salary: netSalary,
        status: "pending",
      });
    }

    // Update payroll period status
    const { error: updateError } = await supabase
      .from("payroll_periods")
      .update({
        status: "calculated",
        processed_at: new Date().toISOString(),
      })
      .eq("id", payrollPeriodId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payroll calculated for ${payrollEntries.length} employees`,
        entriesCount: payrollEntries.length,
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
