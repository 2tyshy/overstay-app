// Minimal Gemini REST client — no SDK, CORS-friendly, works in browser.
// Used for both chat and vision OCR of passport stamps / visa stickers.

const LS_USER_KEY = 'overstay_gemini_key'
const MODEL = 'gemini-2.5-flash'
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Resolve API key with precedence:
 *   1. User-provided key in localStorage (lets power users bring their own)
 *   2. VITE_GEMINI_API_KEY from .env (baked in at build time for single-user deploy)
 *
 * Returns null if neither is set, so UI can prompt for one.
 */
export function getGeminiKey(): string | null {
  try {
    const userKey = localStorage.getItem(LS_USER_KEY)
    if (userKey && userKey.trim()) return userKey.trim()
  } catch { /* localStorage might be blocked */ }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim()
  return null
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
  const key = getGeminiKey()
  if (!key) {
    const err: GeminiError = Object.assign(new Error('no-api-key'), { code: 'NO_KEY' })
    throw err
  }
  const url = `${BASE}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
    generationConfig: { temperature: 0, maxOutputTokens: 800, responseMimeType: 'application/json' },
  }
  return call(body)
}
