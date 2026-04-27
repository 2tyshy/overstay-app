// Minimal Gemini REST client — no SDK, CORS-friendly, works in browser.
// Used for both chat and vision OCR of passport stamps / visa stickers.
//
// Key routing:
//   1. User-provided key in localStorage (power users, direct to Gemini)
//   2. Supabase ai-proxy Edge Function (default; key stays server-side)
// VITE_GEMINI_API_KEY is no longer used in production — key is in Edge Function secrets.

const LS_USER_KEY = 'overstay_gemini_key'
const MODEL = 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const PROXY_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`
  : null

/**
 * Returns user-provided key from localStorage, or null.
 * When null the proxy is used — no key required from the user.
 */
export function getGeminiKey(): string | null {
  try {
    const userKey = localStorage.getItem(LS_USER_KEY)
    if (userKey && userKey.trim()) return userKey.trim()
  } catch { /* localStorage might be blocked */ }
  return null
}

/** True when AI features are available (proxy configured or user key set). */
export function hasAiAccess(): boolean {
  return PROXY_URL !== null || getGeminiKey() !== null
}

export function setUserGeminiKey(key: string): void {
  try { localStorage.setItem(LS_USER_KEY, key.trim()) } catch { /* ignore */ }
}

export function clearUserGeminiKey(): void {
  try { localStorage.removeItem(LS_USER_KEY) } catch { /* ignore */ }
}

export interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiError extends Error {
  status?: number
  code?: string
}

async function call(body: object): Promise<string> {
  const userKey = getGeminiKey()
  let res: Response

  if (userKey) {
    // Power user: call Gemini directly with their own key
    const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(userKey)}`
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } else if (PROXY_URL) {
    // Default: route through server-side proxy (key stays in Edge Function)
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } else {
    const err: GeminiError = Object.assign(new Error('no-api-key'), { code: 'NO_KEY' })
    throw err
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    const err: GeminiError = Object.assign(
      new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`),
      { status: res.status, code: res.status === 401 ? 'BAD_KEY' : res.status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR' },
    )
    throw err
  }
  const json = await res.json()
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    // Check if blocked by safety / other reason
    const reason = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason
    throw new Error(`Gemini returned no text${reason ? ` (${reason})` : ''}`)
  }
  return text
}

/**
 * Chat completion with multi-turn history.
 * The system prompt is prepended as a pseudo-first user/model exchange because
 * Gemini v1beta doesn't have a dedicated system role in this endpoint.
 */
export async function chat(
  messages: GeminiMessage[],
  systemInstruction?: string,
): Promise<string> {
  const body: any = { contents: messages }
  if (systemInstruction) {
    body.systemInstruction = { role: 'user', parts: [{ text: systemInstruction }] }
  }
  body.generationConfig = { temperature: 0.6, maxOutputTokens: 800 }
  return call(body)
}

/**
 * Vision OCR: send an image and a structured-output prompt, get back JSON.
 * Returns the raw text — caller is responsible for JSON.parse with try/catch.
 *
 * thinkingBudget=0 disables Gemini 2.5 Flash's internal reasoning tokens. For
 * structured OCR we don't need thinking, and enabling it was eating into the
 * maxOutputTokens budget — causing truncated JSON like '{"country":"VN","entry_date":"20'
 * with no visible error. Disabling + generous output budget fixes that.
 */
export async function visionExtract(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  return call(body)
}
