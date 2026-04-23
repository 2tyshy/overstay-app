import { useState, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { getRingOffset, parseLocalDate, todayLocal } from '@/lib/dates'

interface Props {
  daysLeft: number
  maxDays: number
  entryDate?: string
}

function MiniCalendar({ entryDate, maxDays, onClose }: { entryDate: string; maxDays: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const entry = parseLocalDate(entryDate)
  entry.setHours(0, 0, 0, 0)
  const today = todayLocal()

  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const deadline = parseLocalDate(entryDate)
  deadline.setDate(deadline.getDate() + Math.max(0, maxDays - 1))
  deadline.setHours(0, 0, 0, 0)

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const offset = firstDay === 0 ? 6 : firstDay - 1 // Monday start

  type Cell = { day: number; used: boolean; isToday: boolean; isFuture: boolean; isDeadline: boolean; isEntry: boolean }
  const cells: Cell[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d)
    date.setHours(0, 0, 0, 0)
    const t = date.getTime()
    const isEntry = t === entry.getTime()
    const isDeadline = t === deadline.getTime()
    // A day counts as "used" if it's between entry and min(today, deadline) inclusive
    const upperBound = Math.min(today.getTime(), deadline.getTime())
    const used = t >= entry.getTime() && t <= upperBound
    const isToday = t === today.getTime()
    const isFuture = t > today.getTime() && t <= deadline.getTime()
    cells.push({ day: d, used, isToday, isFuture, isDeadline, isEntry })
  }

  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

  const prev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const next = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      // NB: stop propagation before calling onClose. The calendar is rendered
      // via createPortal to document.body, but React bubbles synthetic events
      // through the *React* tree, not the DOM tree — so without stopPropagation
      // the click bubbles back up to RingProgress's onClick, which TOGGLES the
      // calendar open again and masks the close. See the parent ring div below.
      onClick={(e) => { e.stopPropagation(); onClose() }}
      style={{ background: 'rgba(0,0,0,0.35)' }}
    >
      <div
        ref={ref}
        className="border rounded-lg p-3 shadow-lg w-full max-w-[280px]"
        style={{
          background: 'var(--bg2)',
          borderColor: 'var(--border)',
          animation: 'cardIn 0.2s ease-out both',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <button onClick={prev} className="font-mono text-[11px] px-2 py-1 active:scale-90 transition-transform" style={{ color: 'var(--text3)' }}>&lt;</button>
          <span className="font-mono text-[11px] font-medium" style={{ color: 'var(--text1)' }}>{months[viewMonth]} {viewYear}</span>
          <button onClick={next} className="font-mono text-[11px] px-2 py-1 active:scale-90 transition-transform" style={{ color: 'var(--text3)' }}>&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="font-mono text-[8px] text-center py-1" style={{ color: 'var(--text4)' }}>{d}</div>
          ))}
          {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
          {cells.map(c => {
            // Color rules:
            //   - deadline day:    RED (background + text)
            //   - today (non-deadline): neutral highlight
            //   - entry day:       bold, neutral
            //   - used (past stay):ORANGE bg + strike-through
            //   - future days within visa window: GREEN
            //   - everything else: muted gray
            let color = 'var(--text2)'
            let bg = 'transparent'
            let border = 'none'
            let fontWeight: number = 400
            if (c.isDeadline) {
              color = 'var(--danger-text)'
              bg = 'var(--danger-bg)'
              border = '1px solid var(--danger-border)'
              fontWeight = 700
            } else if (c.isEntry) {
              color = 'var(--text1)'
              fontWeight = 700
            } else if (c.isToday) {
              color = 'var(--text1)'
              bg = 'var(--bg3)'
              fontWeight = 600
            } else if (c.used) {
              color = 'var(--alert-text)'
              bg = 'var(--alert-bg)'
            } else if (c.isFuture) {
              color = 'var(--success-text)'
              bg = 'var(--success-bg)'
            } else {
              color = 'var(--text4)'
            }
            return (
              <div
                key={c.day}
                className="relative text-center py-1 rounded text-[11px] font-mono"
                style={{ color, background: bg, border, fontWeight }}
              >
                {c.day}
                {c.used && !c.isToday && !c.isEntry && !c.isDeadline && (
                  <span className="absolute inset-x-1 top-1/2 h-px pointer-events-none" style={{ background: 'var(--alert-dot)', opacity: 0.45 }} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-2 pt-2 border-t flex-wrap" style={{ borderColor: 'var(--border)' }}>
          <span className="flex items-center gap-1 font-mono text-[8px]" style={{ color: 'var(--alert-text)' }}>
            <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--alert-bg)', border: '1px solid var(--alert-border)' }} /> использовано
          </span>
          <span className="flex items-center gap-1 font-mono text-[8px]" style={{ color: 'var(--success-text)' }}>
            <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }} /> осталось
          </span>
          <span className="flex items-center gap-1 font-mono text-[8px]" style={{ color: 'var(--danger-text)' }}>
            <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }} /> дедлайн
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function RingProgress({ daysLeft, maxDays, entryDate }: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const circumference = 2 * Math.PI * 50
  const target = getRingOffset(daysLeft, maxDays)

  return (
    <div className="relative w-[110px] h-[110px] shrink-0 cursor-pointer" onClick={(e: ReactMouseEvent) => { e.stopPropagation(); if (entryDate) setCalendarOpen(p => !p) }}>
      <svg className="w-[110px] h-[110px] -rotate-90" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="50" fill="none" stroke="var(--ring-track)" strokeWidth={5} />
        <circle
          cx="55" cy="55" r="50" fill="none"
          stroke="var(--ring-color)" strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ '--ring-target': target, animation: 'ringDraw 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s forwards' } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[32px] font-bold leading-none"
          style={{ color: 'var(--text1)', letterSpacing: '-0.03em', animation: 'numIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
        >
          {daysLeft}
        </span>
        <span
          className="font-mono text-[9px] uppercase mt-0.5"
          style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
        >
          дней
        </span>
      </div>
      {calendarOpen && entryDate && (
        <MiniCalendar entryDate={entryDate} maxDays={maxDays} onClose={() => setCalendarOpen(false)} />
      )}
    </div>
  )
}
