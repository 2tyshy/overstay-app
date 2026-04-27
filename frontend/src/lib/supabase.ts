import { createClient } from '@supabase/supabase-js'
import { isUuid } from '@/lib/uuid'
import type { VisaEntry } from '@/types'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function setTelegramContext(telegramId: number) {
  await supabase.rpc('set_config', {
    setting_name: 'app.telegram_id',
    setting_value: String(telegramId),
  })
}

export async function getOrCreateUser(telegramId: number, passportCountry: string) {
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) {
    const { data } = await supabase
      .from('users')
      .insert({ telegram_id: telegramId, passport_country: passportCountry })
      .select()
      .single()
    user = data
  }

  return user
}

/**
 * Mirror a visa entry into Supabase so the bot (which reads from
 * `visa_entries` via service_role) can see what the user has on the
 * client. LocalStorage stays as the UI source of truth for instant
 * rendering and offline; this just keeps the server copy in sync.
 *
 * We reuse the client-side entry id directly. When `crypto.randomUUID`
 * is available (modern WebViews — all targets we care about) it returns
 * a valid UUID and the insert succeeds. On ancient WebViews the fallback
 * `genId` returns a non-UUID; we skip the Supabase write in that case
 * so the app doesn't crash. The entry still persists in localStorage.
 *
 * Silent no-op when `userId` is the dev sentinel (running outside
 * Telegram) — we have no real user row to key off.
 */
export type SyncResult = { ok: true } | { ok: false; reason: string }

function describeError(e: unknown): string {
  if (!e) return 'unknown'
  if (e instanceof Error) return e.message
  if (typeof e === 'object') {
    const err = e as { message?: string; details?: string; hint?: string; code?: string }
    return err.message || err.details || err.hint || err.code || JSON.stringify(e)
  }
  return String(e)
}

export async function upsertVisaEntry(userId: string | undefined, entry: VisaEntry): Promise<SyncResult> {
  if (!isUuid(userId)) return { ok: false, reason: 'no-user' }
  if (!isUuid(entry.id)) {
    console.warn('[supabase] skipping sync — entry id is not a UUID:', entry.id)
    return { ok: false, reason: 'bad-id' }
  }
  const { error } = await supabase
    .from('visa_entries')
    .upsert({
      id: entry.id,
      user_id: userId,
      country: entry.country,
      visa_type: entry.visa_type,
      entry_date: entry.entry_date,
      max_days: entry.max_days,
      visa_start: entry.visa_start ?? null,
      visa_end: entry.visa_end ?? null,
      notes: entry.notes ?? null,
    }, { onConflict: 'id' })
  if (error) {
    console.error('[supabase] upsert visa_entry failed:', error)
    return { ok: false, reason: describeError(error) }
  }
  console.log('[supabase] upserted visa_entry', entry.id)
  return { ok: true }
}

export async function deleteVisaEntry(userId: string | undefined, entryId: string): Promise<SyncResult> {
  if (!isUuid(userId)) return { ok: false, reason: 'no-user' }
  if (!isUuid(entryId)) return { ok: false, reason: 'bad-id' }
  const { error } = await supabase
    .from('visa_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
  if (error) {
    console.error('[supabase] delete visa_entry failed:', error)
    return { ok: false, reason: describeError(error) }
  }
  console.log('[supabase] deleted visa_entry', entryId)
  return { ok: true }
}
