import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { COUNTRY_FLAGS, COUNTRY_NAMES, getRiskLevel, type VisaEntry } from '@/types'
import { formatDateFull } from '@/lib/dates'
import { formatVisaType } from '@/lib/visaRules'

interface Props {
  entry: VisaEntry | null
  onClose: () => void
  onDelete: (id: string) => void
  onEdit: (entry: VisaEntry) => void
}

export default function EntryDetailSheet({ entry, onClose, onDelete, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!entry) return null

  const handleClose = () => {
    setConfirmDelete(false)
    onClose()
  }

  const isExpired = entry.days_left === 0
  const risk = isExpired ? 'expired' as const : getRiskLevel(entry.days_left, entry.max_days)
  const riskLabels = { safe: 'ОК', warn: 'СКОРО', danger: 'СРОЧНО', expired: 'ИСТЕКЛО' }
  const badgeColor = risk === 'safe' ? 'var(--text3)' : risk === 'expired' ? 'var(--danger-text)' : 'var(--alert-text)'
  const badgeBg = risk === 'safe' ? 'var(--bg3)' : risk === 'expired' ? 'var(--danger-bg)' : 'var(--alert-bg)'
  const badgeBorder = risk === 'safe' ? 'var(--border)' : risk === 'expired' ? 'var(--danger-border)' : 'var(--alert-border)'

  const usedDays = Math.max(0, entry.max_days - entry.days_left)

  const rows: [string, string][] = [
    ['Страна', `${COUNTRY_FLAGS[entry.country] ?? '🏳️'} ${COUNTRY_NAMES[entry.country] ?? entry.country}`],
    ['Тип визы', formatVisaType(entry.visa_type)],
    ['Въезд', formatDateFull(entry.entry_date)],
    ['Дедлайн', formatDateFull(entry.deadline)],
    ['Макс. дней', `${entry.max_days}`],
    ['Использовано', `${usedDays} / ${entry.max_days} дн`],
    ['Осталось', entry.days_left > 0 ? `${entry.days_left} дн` : 'Истекло'],
  ]

  return (
    <BottomSheet open={!!entry} onClose={handleClose} height="70vh">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl" aria-hidden="true">{COUNTRY_FLAGS[entry.country] ?? '🏳️'}</span>
        <div className="min-w-0">
          <div className="text-[17px] font-semibold truncate" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
            {COUNTRY_NAMES[entry.country] ?? entry.country}
          </div>
          <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)', letterSpacing: '0.04em' }}>
            {formatVisaType(entry.visa_type)} · {entry.max_days} дн
          </div>
        </div>
        <span
          className="ml-auto font-mono text-[9px] uppercase px-2 py-1 rounded border font-semibold shrink-0"
          style={{ background: badgeBg, color: badgeColor, borderColor: badgeBorder, letterSpacing: '0.1em' }}
        >
          {riskLabels[risk]}
        </span>
      </div>

      <div className="space-y-0">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between items-baseline gap-3 py-2 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className="font-mono text-[9px] uppercase shrink-0"
              style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}
            >
              {label}
            </span>
            <span
              className="text-[13px] font-medium text-right"
              style={{ color: 'var(--text1)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <button
          onClick={() => { onEdit(entry); handleClose() }}
          className="w-full py-3 rounded-lg font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98] mb-2"
          style={{ background: 'var(--bg3)', color: 'var(--text1)', border: '1px solid var(--border)' }}
        >
          Редактировать
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-lg font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98]"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
          >
            Удалить
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { onDelete(entry.id); handleClose() }}
              className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.98]"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}
            >
              Да, удалить
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-3 rounded-lg font-semibold text-sm border transition-all active:scale-[0.98]"
              style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
