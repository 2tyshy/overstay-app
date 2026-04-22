import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { SchemeComment } from '@/types'

/**
 * Comments for a single scheme, with live updates via Supabase Realtime.
 * The channel is keyed by schemeId so switching schemes tears down cleanly.
 *
 * Usage:
 *   const { comments, loading, addComment, deleteComment } = useSchemeComments(schemeId, userId)
 *   // comments updates automatically when other users post/delete.
 */
export function useSchemeComments(schemeId: string | null, userId: string | undefined) {
  const [comments, setComments] = useState<SchemeComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the current channel so we can unsub on schemeId change / unmount.
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!schemeId) {
      setComments([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('scheme_comments')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchErr }) => {
        if (cancelled) return
        if (fetchErr) setError(fetchErr.message)
        else setComments((data as SchemeComment[]) ?? [])
        setLoading(false)
      })

    // Realtime subscription — inserts and deletes for this scheme only.
    const channel = supabase
      .channel(`scheme_comments:${schemeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scheme_comments', filter: `scheme_id=eq.${schemeId}` },
        (payload) => {
          const row = payload.new as SchemeComment
          setComments(prev => {
            // Avoid duplicate from optimistic insert
            if (prev.some(c => c.id === row.id)) return prev
            return [...prev, row]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'scheme_comments', filter: `scheme_id=eq.${schemeId}` },
        (payload) => {
          const row = payload.old as SchemeComment
          setComments(prev => prev.filter(c => c.id !== row.id))
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [schemeId])

  const addComment = useCallback(async (content: string): Promise<SchemeComment | null> => {
    if (!schemeId || !userId) return null
    const trimmed = content.trim()
    if (!trimmed) return null

    const { data, error: insertErr } = await supabase
      .from('scheme_comments')
      .insert({ scheme_id: schemeId, user_id: userId, content: trimmed })
      .select()
      .single()

    if (insertErr) throw insertErr
    if (data) {
      const row = data as SchemeComment
      setComments(prev => prev.some(c => c.id === row.id) ? prev : [...prev, row])
      return row
    }
    return null
  }, [schemeId, userId])

  const deleteComment = useCallback(async (commentId: string) => {
    if (!userId) return
    // Optimistic
    setComments(prev => prev.filter(c => c.id !== commentId))
    const { error: delErr } = await supabase
      .from('scheme_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)
    if (delErr) throw delErr
  }, [userId])

  return { comments, loading, error, addComment, deleteComment }
}

/**
 * Lightweight aggregate: number of comments per scheme. Used on the card
 * header to show "💬 3" without fetching full thread until expanded.
 * One bulk query per mount; refreshes on demand.
 */
export function useCommentCounts(schemeIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  const key = schemeIds.join(',')
  useEffect(() => {
    if (schemeIds.length === 0) { setCounts({}); return }
    let cancelled = false
    supabase
      .from('scheme_comments')
      .select('scheme_id')
      .in('scheme_id', schemeIds)
      .then(({ data }) => {
        if (cancelled || !data) return
        const map: Record<string, number> = {}
        ;(data as { scheme_id: string }[]).forEach(row => {
          map[row.scheme_id] = (map[row.scheme_id] ?? 0) + 1
        })
        setCounts(map)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return counts
}
