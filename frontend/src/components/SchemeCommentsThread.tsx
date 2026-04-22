import { useState, useRef, useEffect } from 'react'
import { Trash2, Send } from 'lucide-react'
import { useSchemeComments } from '@/hooks/useSchemeComments'

interface Props {
  schemeId: string
  userId: string | undefined
  onCountChange?: (count: number) => void
}

/**
 * Thread of user comments on a single scheme. Mounted when the card is
 * expanded; subscribes to Supabase Realtime so messages from other users
 * stream in live.
 */
export default function SchemeCommentsThread({ schemeId, userId, onCountChange }: Props) {
  const { comments, loading, addComment, deleteComment, error } = useSchemeComments(schemeId, userId)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to newest comment when thread grows
  useEffect(() => {
    if (comments.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    onCountChange?.(comments.length)
  }, [comments.length, onCountChange])

  const handleSubmit = async () => {
    if (!draft.trim() || !userId) return
    setPosting(true)
    setPostError(null)
    try {
      await addComment(draft)
      setDraft('')
    } catch (e) {
      setPostError(e instanceof Error ? e.message : 'Не удалось отправить')
    } finally {
      setPosting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
      {loading && (
        <div className="font-mono text-[10px] py-2 text-center" style={{ color: 'var(--text3)' }}>
          загрузка…
        </div>
      )}

      {error && !loading && (
        <div
          className="font-mono text-[10px] py-2 px-2.5 mb-2 rounded border"
          style={{ color: 'var(--alert-text)', background: 'var(--alert-bg)', borderColor: 'var(--alert-border)' }}
        >
          Комменты не загрузились: {error}
        </div>
      )}

      {!loading && comments.length === 0 && !error && (
        <div className="font-mono text-[10px] py-2 text-center" style={{ color: 'var(--text4)' }}>
          Пока тихо. Расскажи первым, как прошло.
        </div>
      )}

      {comments.length > 0 && (
        <div className="space-y-1.5 mb-2 max-h-[220px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {comments.map(c => {
            const isMine = c.user_id === userId
            const d = new Date(c.created_at)
            const hh = String(d.getHours()).padStart(2, '0')
            const mm = String(d.getMinutes()).padStart(2, '0')
            const day = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
            return (
              <div
                key={c.id}
                className="px-2.5 py-2 rounded border text-[12px] leading-[1.45]"
                style={{
                  background: isMine ? 'var(--bg3)' : 'var(--bg2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text1)',
                }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--text3)', letterSpacing: '0.16em' }}>
                    {isMine ? 'ты' : `анон #${c.user_id.slice(0, 4)}`} · {day} {hh}:{mm}
                  </span>
                  {isMine && (
                    <button
                      onClick={() => deleteComment(c.id).catch(() => {/* ignore */})}
                      className="transition-opacity opacity-60 hover:opacity-100"
                      aria-label="Удалить"
                      style={{ color: 'var(--text3)' }}
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {c.content}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {postError && (
        <div className="font-mono text-[9px] mb-1.5" style={{ color: 'var(--alert-text)' }}>
          {postError}
        </div>
      )}

      {userId ? (
        <div
          className="flex gap-1.5 items-end rounded border p-1.5"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 1000))}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Поделись опытом… ⏎ отправить"
            className="flex-1 bg-transparent outline-none resize-none font-mono text-[12px] px-1.5 py-1"
            style={{ color: 'var(--text1)', minHeight: 28, maxHeight: 120 }}
            disabled={posting}
          />
          <button
            onClick={handleSubmit}
            disabled={!draft.trim() || posting}
            className="rounded px-2 py-1.5 transition-opacity disabled:opacity-30"
            style={{ background: 'var(--text1)', color: 'var(--bg)' }}
            aria-label="Отправить"
          >
            <Send size={13} strokeWidth={1.8} />
          </button>
        </div>
      ) : (
        <div className="font-mono text-[10px] py-1.5 text-center" style={{ color: 'var(--text3)' }}>
          Открой через Telegram, чтобы оставить комментарий
        </div>
      )}
    </div>
  )
}
