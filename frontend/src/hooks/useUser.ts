import { useState, useEffect } from 'react'
import { getOrCreateUser, setTelegramContext } from '@/lib/supabase'
import { getTelegramId } from '@/lib/telegram'
import type { User } from '@/types'

export function useUser() {
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
      const u = await getOrCreateUser(telegramId, 'RU')
      setUser(u)
      setLoading(false)
    }
    init()
  }, [])

  return { user, loading }
}
