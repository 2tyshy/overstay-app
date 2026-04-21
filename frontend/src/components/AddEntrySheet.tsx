import { useState, useEffect, useRef, useMemo } from 'react'
import { Camera } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { COUNTRY_FLAGS, COUNTRY_NAMES, type VisaEntry, type PassportCountry } from '@/types'
import { COUNTRY_DATA, COUNTRY_CODES, computeMaxDays } from '@/lib/visaRules'
import type { OcrResult } from '@/lib/ocr'

interface SearchSelectProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}

function SearchSelect({ value, onChange, options, placeholder, disabled }: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.value.toLowerCase().includes(query.toLowerCase())
  )

  const displayLabel = options.find(o => o.value === value)?.label ?? value

  return (
    <div ref={ref} className="relative">
      <input
        value={open ? query : displayLabel}
        onChange={e => { setQuery(e.target.value); if (!open) setOpen(true) }}
        onFocus={() => { if (!disabled) { setOpen(true); setQuery('') } }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none transition-colors focus:border-[var(--text3)] disabled:opacity-50"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text1)' }}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 border rounded-lg overflow-hidden z-50 max-h-[180px] overflow-y-auto"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          {filtered.map(o => (
            <button
              key={o.value}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-2 font-mono text-[12px] transition-colors"
              style={{
                color: o.value === value ? 'var(--text1)' : 'var(--text2)',
                background: o.value === value ? 'var(--bg3)' : 'transparent',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: { country: string; visa_type: string; entry_date: string; visa_start?: string; visa_end?: string }) => void
  initialData?: VisaEntry | null
  passport: PassportCountry
  ocrPrefill?: OcrResult | null
  onScan?: () => void
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function AddEntrySheet({ open, onClose, onSave, initialData, passport, ocrPrefill, onScan }: Props) {
  const [country, setCountry] = useState('')
  const [visaType, setVisaType] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [visaStart, setVisaStart] = useState('')
  const [visaEnd, setVisaEnd] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setCountry(initialData.country)
      setVisaType(initialData.visa_type)
      setEntryDate(initialData.entry_date)
      setVisaStart(initialData.visa_start ?? '')
      setVisaEnd(initialData.visa_end ?? '')
      setError('')
    } else if (open) {
      setCountry(''); setVisaType(''); setEntryDate(''); setVisaStart(''); setVisaEnd(''); setError('')
    }
  }, [initialData, open])

  // OCR prefill: fills whatever Gemini managed to extract. Ignores empty
  // fields so the user's existing input isn't wiped if they retry.
  useEffect(() => {
    if (!ocrPrefill || !open) return
    if (ocrPrefill.country) setCountry(ocrPrefill.country)
    if (ocrPrefill.visa_type) setVisaType(ocrPrefill.visa_type)
    if (ocrPrefill.entry_date) setEntryDate(ocrPrefill.entry_date)
    setError('')
  }, [ocrPrefill, open])

  // Preview computed max_days to give user feedback before saving
  const previewMaxDays = useMemo(() => {
    if (!country || !visaType) return null
    const n = computeMaxDays(country, visaType, passport)
    return n > 0 ? n : null
  }, [country, visaType, passport])

  const handleSave = () => {
    if (!country) return setError('Укажи страну')
    if (!visaType) return setError('Укажи тип визы')
    if (!entryDate) return setError('Укажи дату въезда')

    // Prevent far-future dates (entry must be within 30 days ahead or past)
    const today = todayStr()
    if (entryDate > today) {
      const entryTs = new Date(entryDate).getTime()
      const todayTs = new Date(today).getTime()
      const diffDays = (entryTs - todayTs) / 86400000
      if (diffDays > 30) return setError('Дата въезда слишком в будущем')
    }

    const maxDays = computeMaxDays(country, visaType, passport)
    if (maxDays === 0) {
      return setError(`Виза «${visaType}» недоступна для паспорта ${passport}`)
    }

    setError('')
    const data: { country: string; visa_type: string; entry_date: string; visa_start?: string; visa_end?: string } = {
      country, visa_type: visaType, entry_date: entryDate,
    }
    if (visaStart) data.visa_start = visaStart
    if (visaEnd) data.visa_end = visaEnd
    onSave(data)
    setCountry(''); setVisaType(''); setEntryDate(''); setVisaStart(''); setVisaEnd('')
    onClose()
  }

  const countryOptions = COUNTRY_CODES.map(c => ({
    value: c,
    label: `${COUNTRY_FLAGS[c]} ${COUNTRY_NAMES[c] ?? c}`,
  }))

  const visaOptions = country
    ? (COUNTRY_DATA[country]?.visa_options ?? []).map(v => ({ value: v.label, label: v.label }))
    : []

  const isEvisa = /e[-\s]?visa/i.test(visaType)

  const inputStyle = {
    background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text1)',
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-[17px] font-semibold mb-3" style={{ color: 'var(--text1)' }}>
        {initialData ? 'Редактировать въезд' : 'Добавить въезд'}
      </h2>

      {!initialData && onScan && (
        <button
          type="button"
          onClick={onScan}
          className="w-full flex items-center gap-3 px-3.5 py-3 border rounded-[10px] mb-3 transition-all active:scale-[0.98]"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--alert-bg)', color: 'var(--alert-text)', border: '1px solid var(--alert-border)' }}
          >
            <Camera size={15} strokeWidth={1.5} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-[13px] font-medium" style={{ color: 'var(--text1)' }}>
              Сканировать штамп
            </div>
            <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
              Gemini Vision заполнит поля автоматически
            </div>
          </div>
          <span
            className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded shrink-0"
            style={{ background: 'var(--alert-dot)', color: 'var(--bg)', letterSpacing: '0.1em' }}
          >
            AI
          </span>
        </button>
      )}

      <div className="flex items-center gap-2.5 font-mono text-[9px] uppercase my-3" style={{ color: 'var(--text3)', letterSpacing: '0.26em' }}>
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        {ocrPrefill ? 'Проверь данные' : 'Заполни вручную'}
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Страна</label>
          <SearchSelect value={country} onChange={v => { setCountry(v); setVisaType(''); setError('') }} options={countryOptions} placeholder="Выбери" />
        </div>
        <div>
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Тип визы</label>
          <SearchSelect
            value={visaType}
            onChange={v => { setVisaType(v); setError('') }}
            options={visaOptions}
            placeholder={country ? 'Выбери' : 'Сначала страну'}
            disabled={!country}
          />
        </div>
      </div>
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label className="font-mono text-[9px] uppercase block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Дата въезда</label>
          <button
            type="button"
            onClick={() => setEntryDate(todayStr())}
            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors active:scale-95"
            style={{ color: 'var(--text2)', background: 'var(--bg3)' }}
          >
            сегодня
          </button>
        </div>
        <input
          type="date"
          value={entryDate}
          max={todayStr()}
          onChange={e => { setEntryDate(e.target.value); setError('') }}
          className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none focus:border-[var(--text3)] transition-colors"
          style={inputStyle}
        />
      </div>

      {isEvisa && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Виза от</label>
            <input type="date" value={visaStart} onChange={e => setVisaStart(e.target.value)} className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Виза до</label>
            <input type="date" value={visaEnd} onChange={e => setVisaEnd(e.target.value)} className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
          </div>
        </div>
      )}

      {previewMaxDays !== null && (
        <div
          className="mb-3 px-3 py-2 rounded border font-mono text-[10px] flex items-center justify-between"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)' }}
        >
          <span style={{ letterSpacing: '0.12em' }}>МАКСИМУМ ПО ВИЗЕ</span>
          <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{previewMaxDays} дней</span>
        </div>
      )}

      {error && (
        <div
          className="mb-3 px-3 py-2 rounded border font-mono text-[10px]"
          style={{ background: 'var(--alert-bg)', borderColor: 'var(--alert-border)', color: 'var(--alert-text)' }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded font-semibold text-sm tracking-wide mt-1 transition-all duration-150 active:scale-[0.98]"
        style={{ background: 'var(--text1)', color: 'var(--bg)' }}
      >
        {initialData ? 'Обновить' : 'Сохранить'}
      </button>
    </BottomSheet>
  )
}
