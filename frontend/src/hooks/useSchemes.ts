import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isUuid } from '@/lib/uuid'
import type { Scheme } from '@/types'

/**
 * Supabase errors are plain objects ({ message, code, details, hint }) — not
 * Error instances — so `String(e)` gives "[object Object]". Pick the most
 * informative field available and expose it, while logging the full object for
 * debugging.
 */
function formatSupabaseError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const err = e as { message?: string; details?: string; hint?: string; code?: string }
    // eslint-disable-next-line no-console
    console.error('[useSchemes] supabase error', e)
    return err.message || err.details || err.hint || err.code || JSON.stringify(e)
  }
  return String(e)
}

export interface UseSchemesState {
  schemes: Scheme[]
  votes: Record<string, 'works' | 'broken'>
  loading: boolean
  error: string | null
}

export interface NewSchemeInput {
  passport: string
  from_country: string
  to_country: string
  border_crossing?: string
  cost_usd?: number
  duration_hours?: number
  description: string
  tip?: string
}

/**
 * Schemes + votes, sourced from Supabase. This replaces the old localStorage
 * approach so schemes are shared across users and votes persist across devices.
 *
 * The voting path goes through the `apply_scheme_vote` RPC (SECURITY DEFINER)
 * so we get atomic counter updates without granting blanket UPDATE on schemes.
 */
export function useSchemes(passport: string, userId: string | undefined) {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [votes, setVotes] = useState<Record<string, 'works' | 'broken'>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: schemeData, error: schemeErr } = await supabase
        .from('schemes')
        .select('*')
        .eq('passport', passport)
        .order('works_count', { ascending: false })

      if (schemeErr) throw schemeErr
      setSchemes(schemeData ?? [])

      if (isUuid(userId)) {
        const { data: voteData, error: voteErr } = await supabase
          .from('scheme_votes')
          .select('scheme_id, vote')
          .eq('user_id', userId)

        if (voteErr) throw voteErr
        const map: Record<string, 'works' | 'broken'> = {}
        voteData?.forEach((v: { scheme_id: string; vote: 'works' | 'broken' }) => { map[v.scheme_id] = v.vote })
        setVotes(map)
      } else {
        // No real user (opened outside Telegram, dev fallback) — skip votes
        // query entirely. Schemes list still loads as read-only.
        setVotes({})
      }
    } catch (e) {
      setError(formatSupabaseError(e))
    } finally {
      setLoading(false)
    }
  }, [passport, userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /**
   * Toggle a vote. If the user already voted `voteType`, it's removed.
   * If they voted the opposite, we delete the old row and insert the new one
   * in two separate calls (upsert would otherwise not flip to an existing row
   * with the same PK for the other direction — but since scheme_votes PK is
   * (user_id, scheme_id), upsert with a new vote value does update it. We
   * still delete-then-insert for the toggle-off case for clarity.)
   *
   * Counters (works_count / broken_count on schemes) are maintained by an
   * AFTER trigger on scheme_votes (migration 003). No RPC to call or grant.
   * Client writes scheme_votes — trigger recalculates.
   */
  const vote = useCallback(async (schemeId: string, voteType: 'works' | 'broken') => {
    if (!isUuid(userId)) return  // dev fallback: no real user to attribute the vote to
    const existing = votes[schemeId]
    const toggling = existing === voteType
    const finalVote: 'works' | 'broken' | null = toggling ? null : voteType

    // Optimistic UI — updated again after refetch, so drift self-heals
    setVotes(prev => {
      const next = { ...prev }
      if (finalVote) next[schemeId] = finalVote
      else delete next[schemeId]
      return next
    })
    setSchemes(prev => prev.map(s => {
      if (s.id !== schemeId) return s
      let works = s.works_count
      let broken = s.broken_count
      if (existing === 'works') works = Math.max(0, works - 1)
      if (existing === 'broken') broken = Math.max(0, broken - 1)
      if (finalVote === 'works') works += 1
      if (finalVote === 'broken') broken += 1
      return { ...s, works_count: works, broken_count: broken }
    }))

    try {
      if (finalVote === null) {
        const { error: delErr } = await supabase.from('scheme_votes').delete()
          .eq('user_id', userId).eq('scheme_id', schemeId)
        if (delErr) throw delErr
      } else {
        const { error: upErr } = await supabase.from('scheme_votes')
          .upsert({ user_id: userId, scheme_id: schemeId, vote: finalVote })
        if (upErr) throw upErr
      }
      // Trigger has updated the counter — pull the fresh value for this scheme
      const { data: fresh } = await supabase
        .from('schemes')
        .select('works_count, broken_count')
        .eq('id', schemeId)
        .single()
      if (fresh) {
        setSchemes(prev => prev.map(s => s.id === schemeId
          ? { ...s, works_count: fresh.works_count, broken_count: fresh.broken_count }
          : s))
      }
    } catch (e) {
      // Rollback optimistic update on failure — refetch ground truth
      await fetchAll()
      throw e
    }
  }, [userId, votes, fetchAll])

  /**
   * Insert a new user-authored scheme. Returns the created row (with server id)
   * so UI can navigate / scroll to it.
   */
  const addScheme = useCallback(async (input: NewSchemeInput): Promise<Scheme | null> => {
    if (!isUuid(userId)) return null  // dev fallback: can't set author_id to 'dev'
    const { data, error: insertErr } = await supabase
      .from('schemes')
      .insert({
        author_id: userId,
        passport: input.passport,
        from_country: input.from_country,
        to_country: input.to_country,
        border_crossing: input.border_crossing || null,
        cost_usd: input.cost_usd ?? null,
        duration_hours: input.duration_hours ?? null,
        description: input.description,
        tip: input.tip || null,
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    if (data) setSchemes(prev => [data as Scheme, ...prev])
    return (data as Scheme) ?? null
  }, [userId])

  return { schemes, votes, loading, error, vote, addScheme, refetch: fetchAll }
}
