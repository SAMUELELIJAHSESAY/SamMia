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
    const { userId, offlineActions } = body;

    if (!userId || !offlineActions || !Array.isArray(offlineActions)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let synced = 0;
    let conflicts = 0;
    const syncedActions = [];

    for (const action of offlineActions) {
      try {
        // Check for conflicts (if record already exists)
        const { data: existing } = await supabase
          .from("offline_sync_queue")
          .select("*")
          .eq("user_id", userId)
          .eq("action_type", action.actionType)
          .eq("timestamp", action.timestamp)
          .single();

        if (existing) {
          conflicts++;
          continue;
        }

        // Process the action based on type
        if (action.actionType === "clock_in") {
          const { error } = await supabase
            .from("attendance_records")
            .insert({
              employee_id: userId,
              company_id: action.companyId,
              date: action.date,
              clock_in_at: action.timestamp,
              gps_latitude: action.gps?.latitude,
              gps_longitude: action.gps?.longitude,
              qr_code_id: action.qrCodeId,
              attendance_status: "present",
            });

          if (!error) synced++;
        } else if (action.actionType === "clock_out") {
          const { error } = await supabase
            .from("attendance_records")
            .update({
              clock_out_at: action.timestamp,
              net_working_minutes: action.workingMinutes,
            })
            .eq("employee_id", userId)
            .eq("date", action.date);

          if (!error) synced++;
        } else if (action.actionType === "break_start") {
          const { error } = await supabase
            .from("break_records")
            .insert({
              attendance_id: action.attendanceId,
              break_start_at: action.timestamp,
            });

          if (!error) synced++;
        } else if (action.actionType === "break_end") {
          const { error } = await supabase
            .from("break_records")
            .update({
              break_end_at: action.timestamp,
            })
            .eq("id", action.breakId);

          if (!error) synced++;
        }

        syncedActions.push(action);
      } catch (err: any) {
        console.error("Sync error:", err);
        conflicts++;
      }
    }

    // Clear synced items from offline queue
    if (syncedActions.length > 0) {
      await supabase
        .from("offline_sync_queue")
        .delete()
        .in("id", syncedActions.map((a: any) => a.id));
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        conflicts,
        totalProcessed: offlineActions.length,
        message: `Synced ${synced} actions, ${conflicts} conflicts`,
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
