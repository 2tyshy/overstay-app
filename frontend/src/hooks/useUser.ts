import { useState, useEffect } from 'react'
import { getOrCreateUser, setTelegramContext, updateUserTimezone, supabase } from '@/lib/supabase'
import { getTelegramId, getTelegramInitData } from '@/lib/telegram'
import type { User, PassportCountry } from '@/types'

const LS_AUTH_TOKEN = 'overstay_auth_token'

async function fetchTelegramJWT(): Promise<string | null> {
  const initData = getTelegramInitData()
  if (!initData) return null

  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tg-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ initData }),
    })
    if (!res.ok) return null
    const { token } = await res.json()
    return token ?? null
  } catch {
    return null
  }
}

/**
 * Resolve the current Supabase user. Inside Telegram we upsert by
 * `telegram_id`; outside we fall back to a synthetic `{id: 'dev'}`
 * which every downstream hook recognises via `isUuid` and skips.
 */
export function useUser(passportCountry: PassportCountry = 'RU') {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const telegramId = getTelegramId()
      if (!telegramId) {
        if (import.meta.env.DEV) {
          setUser({ id: 'dev', telegram_id: 0, passport_country: 'RU', created_at: '' })
        } else {
          setUser(null)
        }
        setLoading(false)
        return
      }

      const token = await fetchTelegramJWT()
      if (token) {
        try { localStorage.setItem(LS_AUTH_TOKEN, token) } catch { }
        try {
          await supabase.auth.setSession({ access_token: token, refresh_token: token })
        } catch {
          // Silently ignore — happens in dev if APP_JWT_SECRET != SUPABASE_JWT_SECRET
        }
      }

      await setTelegramContext(telegramId)
      const u = await getOrCreateUser(telegramId, passportCountry)
      setUser(u)
      setLoading(false)
      // Persist user's IANA timezone so the bot can send reminders at local 10:00.
      // Fire-and-forget: failure doesn't affect app UX.
      if (u?.id) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        void updateUserTimezone(u.id, tz)
      }
    }
    init()
    // intentionally only re-run when telegramId changes (never) — passport
    // changes post-mount shouldn't re-upsert; update flows handle that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, loading }
}
