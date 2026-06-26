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
    const { code, token, employeeId, latitude, longitude, deviceId } = body;

    if (!code || !token) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing code or token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get QR code
    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("code", code)
      .eq("status", "active")
      .single();

    if (qrError || !qrCode) {
      return new Response(
        JSON.stringify({ valid: false, error: "QR code not found or inactive" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      await logQrScan(supabase, qrCode, employeeId, token, latitude, longitude, deviceId, false, "QR code expired");
      return new Response(
        JSON.stringify({ valid: false, error: "QR code expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check token rotation
    if (qrCode.current_token && qrCode.current_token !== token) {
      await logQrScan(supabase, qrCode, employeeId, token, latitude, longitude, deviceId, false, "Token mismatch - screenshot or expired");
      return new Response(
        JSON.stringify({ valid: false, error: "QR code token mismatch. Please scan the current QR code." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max uses
    if (qrCode.max_uses && qrCode.use_count >= qrCode.max_uses) {
      await logQrScan(supabase, qrCode, employeeId, token, latitude, longitude, deviceId, false, "Max uses reached");
      return new Response(
        JSON.stringify({ valid: false, error: "QR code maximum uses reached" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GPS validation
    let gpsValid = true;
    let gpsError = "";
    if (qrCode.gps_required && latitude && longitude) {
      if (qrCode.allowed_latitude && qrCode.allowed_longitude && qrCode.allowed_radius_meters) {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(qrCode.allowed_latitude),
          parseFloat(qrCode.allowed_longitude)
        );
        if (distance > qrCode.allowed_radius_meters) {
          gpsValid = false;
          gpsError = `Location too far from allowed area (${Math.round(distance)}m away, max ${qrCode.allowed_radius_meters}m)`;
        }
      }
    }

    // Geofence validation
    if (qrCode.geofence_required && latitude && longitude) {
      const { data: zones } = await supabase
        .from("geofence_zones")
        .select("*")
        .eq("company_id", qrCode.company_id)
        .eq("is_active", true);

      if (zones && zones.length > 0) {
        let insideAny = false;
        for (const zone of zones) {
          const dist = calculateDistance(
            parseFloat(latitude), parseFloat(longitude),
            parseFloat(zone.latitude), parseFloat(zone.longitude)
          );
          if (dist <= zone.radius_meters) {
            insideAny = true;
            break;
          }
        }
        if (!insideAny) {
          gpsValid = false;
          gpsError = gpsError || "Not within any allowed geofence zone";
        }
      }
    }

    if (!gpsValid) {
      await logQrScan(supabase, qrCode, employeeId, token, latitude, longitude, deviceId, false, gpsError);
      return new Response(
        JSON.stringify({ valid: false, error: gpsError }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful scan
    await logQrScan(supabase, qrCode, employeeId, token, latitude, longitude, deviceId, true, null);

    // Rotate token for next use
    const newToken = await rotateToken(supabase, qrCode.id);

    return new Response(
      JSON.stringify({
        valid: true,
        qrCodeId: qrCode.id,
        companyId: qrCode.company_id,
        branchId: qrCode.branch_id,
        newToken: newToken,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logQrScan(supabase: any, qrCode: any, employeeId: string | null, token: string, lat: any, lng: any, deviceId: any, success: boolean, error: string | null) {
  await supabase.from("qr_code_logs").insert({
    company_id: qrCode.company_id,
    qr_code_id: qrCode.id,
    employee_id: employeeId,
    action: success ? "validate" : "reject",
    scanned_token: token,
    validated_token: qrCode.current_token,
    latitude: lat ? parseFloat(lat) : null,
    longitude: lng ? parseFloat(lng) : null,
    device_id: deviceId,
    success,
    failure_reason: error,
  });
}

async function rotateToken(supabase: any, qrCodeId: string) {
  const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("") + "." + Math.floor(Date.now() / 1000);

  await supabase
    .from("qr_codes")
    .update({
      current_token: newToken,
      last_rotated_at: new Date().toISOString(),
      use_count: supabase.rpc("increment_use_count", { p_id: qrCodeId }),
    })
    .eq("id", qrCodeId);

  return newToken;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
