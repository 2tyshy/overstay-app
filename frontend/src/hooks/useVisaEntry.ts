import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isUuid } from '@/lib/uuid'
import type { VisaEntry } from '@/types'

export function useVisaEntry(userId: string | undefined) {
  const [current, setCurrent] = useState<VisaEntry | null>(null)
  const [history, setHistory] = useState<VisaEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    // Skip entirely when running outside Telegram (userId === 'dev'): querying
    // visa_entries with a non-UUID user_id would hit Postgres' UUID type check
    // and surface as an opaque error. Read-only browser preview shows empty state.
    if (!isUuid(userId)) { setLoading(false); return }
    setLoading(true)

    const { data } = await supabase
      .from('visa_entries_with_deadline')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })

    if (data && data.length > 0) {
      const active = data.find((e: VisaEntry) => e.days_left > 0) ?? data[0]
      setCurrent(active)
      setHistory(data.filter((e: VisaEntry) => e.id !== active.id))
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const addEntry = useCallback(async (entry: { country: string; visa_type: string; entry_date: string }) => {
    if (!isUuid(userId)) return  // dev fallback: can't persist to a row keyed by 'dev'
    const { data: rule } = await supabase
      .from('visa_rules')
      .select('max_days')
      .eq('country', entry.country)
      .eq('visa_type', entry.visa_type)
      .single()

    await supabase.from('visa_entries').insert({
      user_id: userId,
      country: entry.country,
      visa_type: entry.visa_type,
      entry_date: entry.entry_date,
      max_days: rule?.max_days ?? 30,
    })
    await fetchEntries()
  }, [userId, fetchEntries])

  return { current, history, loading, addEntry, refetch: fetchEntries }
}
