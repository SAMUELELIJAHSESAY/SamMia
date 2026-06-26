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
    const { leaveRequestId, action } = body;

    if (!leaveRequestId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get leave request
    const { data: leaveRequest, error: leaveError } = await supabase
      .from("leave_requests")
      .select("*, employee:employee_id(*, manager:manager_id(*))")
      .eq("id", leaveRequestId)
      .single();

    if (leaveError || !leaveRequest) {
      return new Response(
        JSON.stringify({ success: false, error: "Leave request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update leave request status
    const newStatus = action === "approve" ? "approved" : "rejected";
    const { error: updateError } = await supabase
      .from("leave_requests")
      .update({
        status: newStatus,
        approval_date: new Date().toISOString(),
      })
      .eq("id", leaveRequestId);

    if (updateError) throw updateError;

    // Create notification for employee
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: leaveRequest.employee_id,
      title: `Leave Request ${newStatus}`,
      message: `Your leave request for ${leaveRequest.start_date} to ${leaveRequest.end_date} has been ${newStatus}.`,
      type: newStatus === "approved" ? "approval" : "rejection",
      is_read: false,
    });

    if (notifError) {
      console.error("Notification creation error:", notifError);
    }

    // If approved, mark days as leave on calendar
    if (action === "approve") {
      const { error: scheduleError } = await supabase.from("schedules").update({ status: "leave" }).eq("leave_request_id", leaveRequestId);

      if (scheduleError) {
        console.error("Schedule update error:", scheduleError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Leave request ${newStatus}`,
        leaveStatus: newStatus,
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
