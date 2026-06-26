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

    const timestamp = new Date().toISOString();

    // Backup critical tables
    const tables = [
      "companies",
      "profiles",
      "attendance_records",
      "leave_requests",
      "payroll_entries",
      "payroll_periods",
    ];

    const backup: Record<string, any> = {
      timestamp,
      version: "1.0",
      data: {},
    };

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*");

      if (error) {
        console.error(`Error backing up ${table}:`, error);
        continue;
      }

      backup.data[table] = data || [];
    }

    // Create backup JSON
    const backupJson = JSON.stringify(backup, null, 2);
    const fileName = `backups/database-backup-${timestamp.split("T")[0]}.json`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("backups")
      .upload(fileName, new TextEncoder().encode(backupJson), {
        cacheControl: "86400",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Store backup metadata
    const { error: metaError } = await supabase
      .from("backup_metadata")
      .insert({
        backup_name: fileName,
        backup_size: new TextEncoder().encode(backupJson).length,
        backup_type: "automated",
        tables_count: tables.length,
        record_count: Object.values(backup.data).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
        created_at: timestamp,
      });

    if (metaError) console.warn("Could not store backup metadata:", metaError);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database backup completed",
        backupName: fileName,
        backupSize: new TextEncoder().encode(backupJson).length,
        timestamp,
        tablesBackedUp: tables.length,
        totalRecords: Object.values(backup.data).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
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
