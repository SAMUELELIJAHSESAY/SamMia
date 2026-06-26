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
    const { reportId } = body;

    if (!reportId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing reportId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from("attendance_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ success: false, error: "Report not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch attendance data
    let query = supabase
      .from("attendance_records")
      .select(
        `
        *,
        employee:employee_id(full_name, employee_id, job_title),
        branch:branch_id(name)
      `
      )
      .eq("company_id", report.company_id);

    if (report.date_from) query = query.gte("date", report.date_from);
    if (report.date_to) query = query.lte("date", report.date_to);
    if (report.employee_id) query = query.eq("employee_id", report.employee_id);
    if (report.branch_id) query = query.eq("branch_id", report.branch_id);

    const { data: attendance, error: attendanceError } = await query.order("date", { ascending: false });

    if (attendanceError) throw attendanceError;

    // Generate report data based on format
    let fileContent: string;
    const timestamp = new Date().toISOString();

    if (report.format === "csv") {
      // CSV format
      const headers = ["Date", "Employee", "Employee ID", "Clock In", "Clock Out", "Working Hours", "Status"];
      const rows = (attendance || []).map((rec: any) => [
        rec.date,
        rec.employee?.full_name || "N/A",
        rec.employee?.employee_id || "N/A",
        rec.clock_in_at ? new Date(rec.clock_in_at).toLocaleTimeString() : "N/A",
        rec.clock_out_at ? new Date(rec.clock_out_at).toLocaleTimeString() : "N/A",
        rec.net_working_minutes ? (rec.net_working_minutes / 60).toFixed(2) : "0",
        rec.attendance_status,
      ]);

      fileContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    } else if (report.format === "excel") {
      // Simple TSV for Excel compatibility
      const headers = ["Date", "Employee", "Employee ID", "Clock In", "Clock Out", "Working Hours", "Status"];
      const rows = (attendance || []).map((rec: any) => [
        rec.date,
        rec.employee?.full_name || "N/A",
        rec.employee?.employee_id || "N/A",
        rec.clock_in_at ? new Date(rec.clock_in_at).toLocaleTimeString() : "N/A",
        rec.clock_out_at ? new Date(rec.clock_out_at).toLocaleTimeString() : "N/A",
        rec.net_working_minutes ? (rec.net_working_minutes / 60).toFixed(2) : "0",
        rec.attendance_status,
      ]);

      fileContent = [headers, ...rows].map((row) => row.join("\t")).join("\n");
    } else {
      // PDF format (simplified HTML)
      fileContent = generatePDFHTML(report, attendance);
    }

    // Create file in storage
    const fileName = `reports/${report.company_id}/${reportId}-${timestamp.slice(0, 10)}.${report.format === "csv" ? "csv" : report.format === "excel" ? "xlsx" : "pdf"}`;

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, new TextEncoder().encode(fileContent), {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get signed URL
    const { data: urlData } = await supabase.storage.from("reports").createSignedUrl(fileName, 3600 * 24 * 7); // 7 days

    // Update report with file info
    const { error: updateError } = await supabase
      .from("attendance_reports")
      .update({
        file_url: urlData?.signedUrl,
        file_size: new TextEncoder().encode(fileContent).length,
        generated_at: timestamp,
        status: "completed",
      })
      .eq("id", reportId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Report generated successfully",
        fileUrl: urlData?.signedUrl,
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

function generatePDFHTML(report: any, attendance: any[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>${report.name}</h1>
      <p><strong>Period:</strong> ${report.date_from} to ${report.date_to}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Employee</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Hours</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${(attendance || [])
            .map(
              (rec: any) => `
            <tr>
              <td>${rec.date}</td>
              <td>${rec.employee?.full_name || "N/A"}</td>
              <td>${rec.clock_in_at ? new Date(rec.clock_in_at).toLocaleTimeString() : "N/A"}</td>
              <td>${rec.clock_out_at ? new Date(rec.clock_out_at).toLocaleTimeString() : "N/A"}</td>
              <td>${rec.net_working_minutes ? (rec.net_working_minutes / 60).toFixed(2) : "0"}</td>
              <td>${rec.attendance_status}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;
  return html;
}
