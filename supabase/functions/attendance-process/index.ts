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
    const { action, employeeId, companyId, branchId, qrCodeId, latitude, longitude, accuracy, address, deviceId, timestamp } = body;

    if (!action || !employeeId || !companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = timestamp ? new Date(timestamp) : new Date();
    const today = now.toISOString().split("T")[0];

    switch (action) {
      case "clock_in": {
        // Check if already clocked in
        const { data: existing } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("date", today)
          .not("clock_in_at", "is", null)
          .is("clock_out_at", null)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ success: false, error: "Already clocked in today" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create or update attendance record
        const { data: attendance, error } = await supabase
          .from("attendance_records")
          .upsert({
            company_id: companyId,
            employee_id: employeeId,
            branch_id: branchId,
            date: today,
            clock_in_at: now.toISOString(),
            clock_in_latitude: latitude ? parseFloat(latitude) : null,
            clock_in_longitude: longitude ? parseFloat(longitude) : null,
            clock_in_accuracy: accuracy ? parseFloat(accuracy) : null,
            clock_in_address: address,
            clock_in_device_id: deviceId,
            clock_in_qr_code_id: qrCodeId,
            clock_in_qr_scanned_at: now.toISOString(),
            clock_in_method: "qr",
            source: "online",
            sync_status: "synced",
          }, { onConflict: "company_id,employee_id,date" })
          .select()
          .single();

        if (error) throw error;

        // Log GPS
        if (latitude && longitude) {
          await supabase.from("gps_locations").insert({
            company_id: companyId,
            employee_id: employeeId,
            attendance_id: attendance.id,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy ? parseFloat(accuracy) : null,
            address,
            source: "gps",
            recorded_at: now.toISOString(),
          });
        }

        // Log login
        await supabase.from("login_logs").insert({
          company_id: companyId,
          user_id: employeeId,
          action: "login",
          ip_address: req.headers.get("x-forwarded-for") || "",
          device_fingerprint: deviceId,
          success: true,
        });

        return new Response(
          JSON.stringify({ success: true, attendanceId: attendance.id, clockInAt: now.toISOString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "clock_out": {
        // Find current attendance record
        const { data: current } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("date", today)
          .not("clock_in_at", "is", null)
          .is("clock_out_at", null)
          .maybeSingle();

        if (!current) {
          return new Response(
            JSON.stringify({ success: false, error: "No active clock in found" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: attendance, error } = await supabase
          .from("attendance_records")
          .update({
            clock_out_at: now.toISOString(),
            clock_out_latitude: latitude ? parseFloat(latitude) : null,
            clock_out_longitude: longitude ? parseFloat(longitude) : null,
            clock_out_accuracy: accuracy ? parseFloat(accuracy) : null,
            clock_out_address: address,
            clock_out_device_id: deviceId,
            clock_out_qr_code_id: qrCodeId,
            clock_out_qr_scanned_at: now.toISOString(),
            clock_out_method: "qr",
            updated_at: now.toISOString(),
          })
          .eq("id", current.id)
          .select()
          .single();

        if (error) throw error;

        // Trigger calculation via RPC
        await supabase.rpc("calculate_attendance", { p_attendance_id: current.id });

        // Log GPS
        if (latitude && longitude) {
          await supabase.from("gps_locations").insert({
            company_id: companyId,
            employee_id: employeeId,
            attendance_id: current.id,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy ? parseFloat(accuracy) : null,
            address,
            source: "gps",
            recorded_at: now.toISOString(),
          });
        }

        return new Response(
          JSON.stringify({ success: true, attendanceId: current.id, clockOutAt: now.toISOString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "break_start": {
        const { data: current } = await supabase
          .from("attendance_records")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("date", today)
          .not("clock_in_at", "is", null)
          .is("clock_out_at", null)
          .maybeSingle();

        if (!current) {
          return new Response(
            JSON.stringify({ success: false, error: "Must clock in before starting break" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: breakRecord, error } = await supabase
          .from("break_records")
          .insert({
            company_id: companyId,
            attendance_id: current.id,
            employee_id: employeeId,
            break_start_at: now.toISOString(),
            break_type: "lunch",
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            device_id: deviceId,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, breakId: breakRecord.id, breakStartAt: now.toISOString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "break_end": {
        const { data: activeBreak } = await supabase
          .from("break_records")
          .select("*")
          .eq("employee_id", employeeId)
          .is("break_end_at", null)
          .order("break_start_at", { ascending: false })
          .maybeSingle();

        if (!activeBreak) {
          return new Response(
            JSON.stringify({ success: false, error: "No active break found" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const durationMinutes = Math.round((now.getTime() - new Date(activeBreak.break_start_at).getTime()) / 60000);

        const { error } = await supabase
          .from("break_records")
          .update({
            break_end_at: now.toISOString(),
            duration_minutes: durationMinutes,
          })
          .eq("id", activeBreak.id);

        if (error) throw error;

        // Recalculate attendance
        await supabase.rpc("calculate_attendance", { p_attendance_id: activeBreak.attendance_id });

        return new Response(
          JSON.stringify({ success: true, breakId: activeBreak.id, breakEndAt: now.toISOString(), durationMinutes }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
