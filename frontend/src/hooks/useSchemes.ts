import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Scheme, SchemeVote } from '@/types'

export function useSchemes(passport: string, userId: string | undefined) {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [votes, setVotes] = useState<Record<string, 'works' | 'broken'>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: schemeData } = await supabase
        .from('schemes')
        .select('*')
        .eq('passport', passport)
        .order('works_count', { ascending: false })

      if (schemeData) setSchemes(schemeData)

      if (userId) {
        const { data: voteData } = await supabase
          .from('scheme_votes')
          .select('scheme_id, vote')
          .eq('user_id', userId)

        if (voteData) {
          const map: Record<string, 'works' | 'broken'> = {}
          voteData.forEach((v: SchemeVote) => { map[v.scheme_id] = v.vote })
          setVotes(map)
        }
      }
      setLoading(false)
    }
    fetch()
  }, [passport, userId])

  const vote = useCallback(async (schemeId: string, voteType: 'works' | 'broken') => {
    if (!userId) return
    const existing = votes[schemeId]

    if (existing === voteType) {
      await supabase.from('scheme_votes').delete().eq('user_id', userId).eq('scheme_id', schemeId)
      setVotes(prev => { const n = { ...prev }; delete n[schemeId]; return n })
      const field = voteType === 'works' ? 'works_count' : 'broken_count'
      const scheme = schemes.find(s => s.id === schemeId)
      if (scheme) {
        await supabase.from('schemes').update({ [field]: Math.max(0, scheme[field] - 1) }).eq('id', schemeId)
        setSchemes(prev => prev.map(s => s.id === schemeId ? { ...s, [field]: Math.max(0, s[field] - 1) } : s))
      }
    } else {
      await supabase.from('scheme_votes').upsert({ user_id: userId, scheme_id: schemeId, vote: voteType })
      setVotes(prev => ({ ...prev, [schemeId]: voteType }))
      const scheme = schemes.find(s => s.id === schemeId)
      if (scheme) {
        const inc = voteType === 'works' ? 'works_count' : 'broken_count'
        const dec = voteType === 'works' ? 'broken_count' : 'works_count'
        const updates: Record<string, number> = { [inc]: scheme[inc] + 1 }
        if (existing) updates[dec] = Math.max(0, scheme[dec] - 1)
        await supabase.from('schemes').update(updates).eq('id', schemeId)
        setSchemes(prev => prev.map(s => s.id === schemeId ? { ...s, ...updates } : s))
      }
    }
  }, [userId, votes, schemes])

  return { schemes, votes, loading, vote }
}
