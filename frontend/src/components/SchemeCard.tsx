import { useState } from 'react'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { COUNTRY_FLAGS, type Scheme } from '@/types'
import SchemeCommentsThread from './SchemeCommentsThread'

interface Props {
  scheme: Scheme
  index: number
  userVote?: 'works' | 'broken' | null
  onVote: (schemeId: string, vote: 'works' | 'broken') => void
  onEdit?: (scheme: Scheme) => void
  onDelete?: (schemeId: string) => void
  userId?: string
  commentCount?: number
  currentCountry?: string
}

export default function SchemeCard({ scheme, index, userVote, onVote, onEdit, onDelete, userId, commentCount = 0, currentCountry }: Props) {
  const isAuthor = userId && scheme.author_id === userId
  const months = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК']
  const d = new Date(scheme.verified_at)
  const dateTag = `${months[d.getMonth()]} ${d.getFullYear()}`

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [liveCount, setLiveCount] = useState<number | null>(null)
  const displayCount = liveCount ?? commentCount

  return (
    <div
      className="border rounded overflow-hidden mb-2 transition-colors duration-150"
      style={{
        borderColor: 'var(--border)',
        animation: `cardIn 0.28s cubic-bezier(0.16,1,0.3,1) ${0.04 * (index + 1)}s both`,
      }}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[17px]" style={{ letterSpacing: 2 }}>
            {COUNTRY_FLAGS[scheme.from_country]}{scheme.duration_hours && scheme.duration_hours > 48 ? '✈️' : '→'}{COUNTRY_FLAGS[scheme.to_country]}
          </span>
          {currentCountry && scheme.from_country === currentCountry && (
            <span className="text-[13px]" title="Актуально для твоей страны">🔥</span>
          )}
          {scheme.border_crossing && (
            <span className="font-mono text-[10px] border rounded px-1.5 py-0.5" style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}>
              {scheme.border_crossing}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--text2)' }}>
          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--text3)' }} />
          {scheme.works_count}
        </div>
      </div>

      <div className="px-3.5 py-2.5">
        <p className="font-mono text-[11px] leading-[1.8] mb-2" style={{ color: 'var(--text2)' }}>
          {scheme.description}
        </p>

        {scheme.tip && (
          <div
            className="border-l-2 pl-2.5 py-1.5 rounded-r font-mono text-[10px] leading-[1.6] mb-2"
            style={{ borderColor: 'var(--border)', color: 'var(--text3)', background: 'var(--bg3)' }}
          >
            {scheme.tip}
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {scheme.cost_usd != null && <Tag>~${scheme.cost_usd}</Tag>}
          {scheme.duration_hours != null && <Tag>~{scheme.duration_hours > 48 ? `${Math.round(scheme.duration_hours / 24)} дн` : `${scheme.duration_hours}ч`}</Tag>}
          <Tag>{dateTag}</Tag>
        </div>

        <div className="flex gap-1.5 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <VoteBtn emoji="👍" count={scheme.works_count} active={userVote === 'works'} type="works" onClick={() => onVote(scheme.id, 'works')} />
          <VoteBtn emoji="👎" count={scheme.broken_count} active={userVote === 'broken'} type="broken" onClick={() => onVote(scheme.id, 'broken')} />
          <CommentsBtn
            count={displayCount}
            active={commentsOpen}
            onClick={() => setCommentsOpen(o => !o)}
          />
          {isAuthor && (
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => onEdit?.(scheme)}
                className="flex items-center justify-center w-7 h-7 rounded border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
              >
                <Pencil size={11} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => { if (window.confirm('Удалить схему?')) onDelete?.(scheme.id) }}
                className="flex items-center justify-center w-7 h-7 rounded border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--danger-text)' }}
              >
                <Trash2 size={11} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {commentsOpen && (
          <SchemeCommentsThread
            schemeId={scheme.id}
            userId={userId}
            onCountChange={setLiveCount}
          />
        )}
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] border rounded px-1.5 py-0.5" style={{ color: 'var(--text3)', borderColor: 'var(--border)' }}>
      {children}
    </span>
  )
}

function VoteBtn({ emoji, count, active, type, onClick }: { emoji: string; count: number; active: boolean; type: 'works' | 'broken'; onClick: () => void }) {
  const isNo = type === 'broken'
  return (
    <button
      onClick={onClick}
      className="flex-1 border rounded py-1.5 flex items-center justify-center gap-1 text-xs font-medium transition-all duration-150"
      style={{
        borderColor: active ? (isNo ? 'var(--alert-dot)' : 'var(--text3)') : 'var(--border)',
        color: active ? (isNo ? 'var(--alert-dot)' : 'var(--text2)') : 'var(--text3)',
        background: active ? (isNo ? 'var(--alert-bg)' : 'var(--bg3)') : 'transparent',
      }}
    >
      {emoji} <span>{count}</span>
    </button>
  )
}

function CommentsBtn({ count, active, onClick }: { count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 border rounded py-1.5 flex items-center justify-center gap-1 text-xs font-medium transition-all duration-150"
      style={{
        borderColor: active ? 'var(--text3)' : 'var(--border)',
        color: active ? 'var(--text2)' : 'var(--text3)',
        background: active ? 'var(--bg3)' : 'transparent',
      }}
      aria-expanded={active}
    >
      <MessageSquare size={12} strokeWidth={1.8} /> <span>{count}</span>
    </button>
  )
}
