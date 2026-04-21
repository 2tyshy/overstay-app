// Gemini-Vision-powered OCR for passport stamps and visa stickers.
// Returns a structured, partially-filled VisaEntry hint that the Add sheet
// can pre-populate so the user only has to confirm.

import { visionExtract } from './gemini'
import { COUNTRY_DATA } from './visaRules'

export interface OcrResult {
  country?: string        // ISO-2 code, uppercase
  entry_date?: string     // YYYY-MM-DD
  visa_type?: string      // matched against COUNTRY_DATA[country].visa_options where possible
  max_days?: number       // if extractable
  raw?: string            // for debugging
  confidence?: 'low' | 'medium' | 'high'
  notes?: string          // e.g. "date unclear"
}

// Known country codes we support. Gemini is instructed to pick from this list.
const SUPPORTED = Object.keys(COUNTRY_DATA).join(', ')

function visaLabels(country: string): string[] {
  const data = COUNTRY_DATA[country]
  if (!data) return []
  return data.visa_options.map(o => o.label)
}

const PROMPT = `You are a passport/visa OCR assistant. The image shows either a passport entry stamp or a visa sticker/e-visa.

Extract the following fields and return ONLY valid JSON, no prose:
{
  "country": "ISO-2 code, uppercase, from this whitelist: ${SUPPORTED}. Use the country that ISSUED the stamp/visa. If unclear, omit.",
  "entry_date": "YYYY-MM-DD. The ENTRY date for stamps, or the VISA VALID FROM date for stickers. If not visible, omit.",
  "visa_type": "Short lowercase label, e.g. 'e-visa 90', 'dtv 180', 'visa on arrival 30', 'exemption 30'. If unclear, omit.",
  "max_days": "Integer — max duration in days as printed. Omit if absent.",
  "confidence": "low | medium | high — your confidence across all fields combined",
  "notes": "Optional: one short sentence if something is ambiguous or worth flagging"
}

Rules:
- Never invent fields you can't read. It's better to omit than guess.
- Thai stamps often show day/month in roman numerals — convert to Gregorian.
- Ignore month names in non-English languages; convert to numeric.
- If the image is NOT a passport stamp or visa, return {"confidence": "low", "notes": "not a visa document"}`

export interface OcrProgress {
  stage: 'reading' | 'analyzing' | 'parsing' | 'done'
  message: string
}

/**
 * Read an image file, base64-encode it, send to Gemini, parse the JSON response.
 * The `onProgress` callback is for UI feedback — Gemini non-streaming so we fake
 * progression ("reading file" → "analyzing" → "parsing").
 */
export async function extractFromImage(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  onProgress?.({ stage: 'reading', message: 'Читаю файл...' })
  const base64 = await fileToBase64(file)
  onProgress?.({ stage: 'analyzing', message: 'Анализирую штамп...' })

  const raw = await visionExtract(base64, file.type || 'image/jpeg', PROMPT)

  onProgress?.({ stage: 'parsing', message: 'Парсю результат...' })
  const parsed = safeParseJson(raw)

  const result: OcrResult = {
    raw,
    country: normalizeCountry(parsed?.country),
    entry_date: normalizeDate(parsed?.entry_date),
    visa_type: normalizeVisaType(parsed?.visa_type, parsed?.country),
    max_days: Number.isFinite(Number(parsed?.max_days)) ? Number(parsed?.max_days) : undefined,
    confidence: (['low', 'medium', 'high'] as const).includes(parsed?.confidence) ? parsed.confidence : 'medium',
    notes: typeof parsed?.notes === 'string' ? parsed.notes : undefined,
  }

  onProgress?.({ stage: 'done', message: 'Готово' })
  return result
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // data URLs are "data:<mime>;base64,<data>" — strip the prefix
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}

function safeParseJson(text: string): any {
  // Gemini sometimes wraps JSON in ```json fences despite responseMimeType.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to extract first {...} block
    const m = /\{[\s\S]*\}/.exec(cleaned)
    if (m) {
      try { return JSON.parse(m[0]) } catch { /* fallthrough */ }
    }
    return null
  }
}

function normalizeCountry(code: unknown): string | undefined {
  if (typeof code !== 'string') return undefined
  const upper = code.trim().toUpperCase()
  if (upper.length !== 2) return undefined
  return upper in COUNTRY_DATA ? upper : undefined
}

function normalizeDate(d: unknown): string | undefined {
  if (typeof d !== 'string') return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.trim())
  if (!m) return undefined
  const [, y, mo, day] = m
  const year = Number(y)
  const month = Number(mo)
  const dayN = Number(day)
  if (year < 2000 || year > 2100) return undefined
  if (month < 1 || month > 12) return undefined
  if (dayN < 1 || dayN > 31) return undefined
  return `${y}-${mo}-${day}`
}

// If Gemini returned a visa_type string, try to pick the closest match from
// the country's visa_options. Otherwise return the raw string.
function normalizeVisaType(raw: unknown, country: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined
  const lower = raw.trim().toLowerCase()
  if (typeof country === 'string' && country.toUpperCase() in COUNTRY_DATA) {
    const labels = visaLabels(country.toUpperCase())
    // Exact token match first, then substring
    const exact = labels.find(o => o.toLowerCase() === lower)
    if (exact) return exact
    const partial = labels.find(o => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(lower))
    if (partial) return partial
  }
  return lower
}
