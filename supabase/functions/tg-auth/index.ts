import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// JWT creation helper using Web Crypto API
async function createJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const message = `${headerB64}.${payloadB64}`;
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(secret);
  const messageBuffer = encoder.encode(message);

  // Sign with HMAC-SHA256
  const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, messageBuffer);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${message}.${signatureB64}`;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { initData } = await req.json() as { initData?: string };

    if (!initData || typeof initData !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid initData" }), { status: 400 });
    }

    // Parse URL-encoded initData
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");

    if (!userStr) {
      return new Response(JSON.stringify({ error: "Missing user in initData" }), { status: 400 });
    }

    let user: any;
    try {
      user = JSON.parse(userStr);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid user JSON" }), { status: 400 });
    }

    const telegramId = user?.id;
    if (!telegramId) {
      return new Response(JSON.stringify({ error: "Missing user.id in initData" }), { status: 400 });
    }

    // Get JWT secret from environment
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET");
    if (!jwtSecret) {
      return new Response(JSON.stringify({ error: "JWT_SECRET not configured" }), { status: 500 });
    }

    // Generate JWT token valid for 24 hours
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 86400; // 24 hours
    const payload = {
      sub: String(telegramId),
      iat: now,
      exp: now + expiresIn,
      aud: "authenticated",
      role: "authenticated",
    };

    const token = await createJWT(payload, jwtSecret);

    return new Response(JSON.stringify({ token, expiresIn }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[tg-auth] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
