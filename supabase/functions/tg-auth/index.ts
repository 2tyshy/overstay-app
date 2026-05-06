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

async function hmacSha256Raw(keyRaw: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const authDate = params.get("auth_date");
  if (!hash || !authDate) return false;

  // Telegram recommends limiting the lifetime of initData.
  const authDateSec = Number(authDate);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDateSec) || nowSec - authDateSec > 24 * 60 * 60) return false;

  const pairs: string[] = [];
  for (const [k, v] of params.entries()) {
    if (k === "hash") continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = await hmacSha256Raw(new TextEncoder().encode("WebAppData"), botToken);
  const expected = toHex(await hmacSha256Raw(secretKey, dataCheckString));
  return timingSafeEqualHex(expected, hash);
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

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), { status: 500 });
    }

    const verified = await verifyTelegramInitData(initData, botToken);
    if (!verified) {
      return new Response(JSON.stringify({ error: "Invalid Telegram initData signature" }), { status: 401 });
    }

    // Parse URL-encoded initData (safe after signature verification)
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
    const jwtSecret = Deno.env.get("APP_JWT_SECRET");
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
