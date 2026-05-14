// Supabase Edge Function: ai-proxy
// Proxies Gemini API calls from the frontend so the API key never ships
// in the JS bundle. Accepts the same request body that the Gemini
// generateContent endpoint expects; adds the server-side key and forwards.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MODEL = 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const MAX_BODY_BYTES = 1_000_000
const UPSTREAM_TIMEOUT_MS = 25_000

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('AI_PROXY_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.size > 0 && ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'null'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function decodeBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  return atob(padded)
}

async function verifyJwt(token: string, secret: string): Promise<{ ok: true; payload: Record<string, unknown> } | { ok: false }> {
  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false }
  const [headerB64, payloadB64, signatureB64] = parts
  const message = `${headerB64}.${payloadB64}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
  const given = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(signatureB64.length / 4) * 4, '=')), (c) => c.charCodeAt(0))
  if (expected.length !== given.length) return { ok: false }
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i]
  if (diff !== 0) return { ok: false }

  const payload = JSON.parse(decodeBase64Url(payloadB64)) as Record<string, unknown>
  const exp = Number(payload.exp ?? 0)
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return { ok: false }
  return { ok: true, payload }
}

function isValidGeminiBody(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== 'object') return false
  const candidate = body as Record<string, unknown>
  if (!Array.isArray(candidate.contents) || candidate.contents.length === 0) return false
  if (candidate.generationConfig && typeof candidate.generationConfig !== 'object') return false
  return true
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const CORS = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  const jwtSecret = Deno.env.get('APP_JWT_SECRET')
  if (!jwtSecret) {
    return new Response(JSON.stringify({ error: 'APP_JWT_SECRET not configured' }), {
      status: 503,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing bearer token' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  const verified = await verifyJwt(token, jwtSecret)
  if (!verified.ok) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 503,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  if (!isValidGeminiBody(body)) {
    return new Response(JSON.stringify({ error: 'Invalid Gemini payload shape' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  const raw = JSON.stringify(body)
  if (raw.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request body too large' }), {
      status: 413,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS)
  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: raw,
      signal: ac.signal,
    })
  } catch {
    clearTimeout(timeout)
    return new Response(JSON.stringify({ error: 'Upstream request failed or timed out' }), {
      status: 504,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
  clearTimeout(timeout)

  const responseBody = await upstream.text()
  return new Response(responseBody, {
    status: upstream.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
