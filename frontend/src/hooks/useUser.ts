import { useState, useEffect } from 'react'
import { getOrCreateUser, setTelegramContext } from '@/lib/supabase'
import { getTelegramId } from '@/lib/telegram'
import type { User, PassportCountry } from '@/types'

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
        setUser({ id: 'dev', telegram_id: 12345, passport_country: 'RU', created_at: '' })
        setLoading(false)
        return
      }
      await setTelegramContext(telegramId)
      const u = await getOrCreateUser(telegramId, passportCountry)
      setUser(u)
      setLoading(false)
    }
    init()
    // intentionally only re-run when telegramId changes (never) — passport
    // changes post-mount shouldn't re-upsert; update flows handle that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { user, loading }
}
