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

    const { data, error } = await supabase
      .from('visa_entries_with_deadline')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })

    if (error) {
      console.error('[useVisaEntry] fetch failed:', error)
    }
    console.log('[useVisaEntry] fetched', data?.length ?? 0, 'entries for', userId)

    if (data && data.length > 0) {
      const active = data.find((e: VisaEntry) => e.days_left > 0) ?? data[0]
      setCurrent(active)
      setHistory(data.filter((e: VisaEntry) => e.id !== active.id))
    } else {
      setCurrent(null)
      setHistory([])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const addEntry = useCallback(async (entry: { country: string; visa_type: string; entry_date: string }) => {
    if (!isUuid(userId)) return  // dev fallback: can't persist to a row keyed by 'dev'

    const { data: rule, error: ruleErr } = await supabase
      .from('visa_rules')
      .select('max_days')
      .eq('country', entry.country)
      .eq('visa_type', entry.visa_type)
      .single()
    if (ruleErr) {
      // Not fatal — we fall back to max_days=30 below. But surface it so we
      // know when the rule row is missing (most common cause of "the deadline
      // looks wrong").
      console.warn('[useVisaEntry] visa_rules lookup failed:', ruleErr)
    }

    const payload = {
      user_id: userId,
      country: entry.country,
      visa_type: entry.visa_type,
      entry_date: entry.entry_date,
      max_days: rule?.max_days ?? 30,
    }
    console.log('[useVisaEntry] inserting visa_entry', payload)

    const { data: inserted, error: insErr } = await supabase
      .from('visa_entries')
      .insert(payload)
      .select()
      .single()

    if (insErr) {
      console.error('[useVisaEntry] insert failed:', insErr)
      throw insErr
    }
    console.log('[useVisaEntry] inserted ok', inserted)

    await fetchEntries()
  }, [userId, fetchEntries])

  return { current, history, loading, addEntry, refetch: fetchEntries }
}
