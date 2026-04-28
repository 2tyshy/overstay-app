import { useState, useMemo } from 'react'
import { isUuid } from '@/lib/uuid'
import { Plus, RefreshCw, WifiOff } from 'lucide-react'
import SchemeFilters from '@/components/SchemeFilters'
import SchemeCard from '@/components/SchemeCard'
import BottomSheet from '@/components/BottomSheet'
import { COUNTRY_FLAGS, COUNTRY_NAMES, type PassportCountry } from '@/types'
import { COUNTRY_CODES } from '@/lib/visaRules'
import { useUser } from '@/hooks/useUser'
import { useSchemes } from '@/hooks/useSchemes'
import { useCommentCounts } from '@/hooks/useSchemeComments'

interface Props {
  passport: PassportCountry
  currentCountry?: string
}

export default function SchemesPage({ passport, currentCountry }: Props) {
  const { user } = useUser()
  const userId = user?.id
  const { schemes, votes, loading, error, vote, addScheme, updateScheme, deleteScheme, refetch } = useSchemes(passport, userId)

  const [filter, setFilter] = useState('Все')
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [debugMsg, setDebugMsg] = useState('')
  const [editScheme, setEditScheme] = useState<import('@/types').Scheme | null>(null)

  // Add/Edit Scheme form state
  const [fromCountry, setFromCountry] = useState('')
  const [toCountry, setToCountry] = useState('')
  const [borderCrossing, setBorderCrossing] = useState('')
  const [costUsd, setCostUsd] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [description, setDescription] = useState('')
  const [tip, setTip] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filteredSchemes = useMemo(() => schemes.filter(scheme => {
    if (filter === 'Все') return true
    if (filter === 'VN →') return scheme.from_country === 'VN'
    if (filter === 'TH →') return scheme.from_country === 'TH'
    if (filter === 'Граница') return scheme.duration_hours != null && scheme.duration_hours <= 48
    if (filter === 'Самолёт') return scheme.duration_hours != null && scheme.duration_hours > 48
    return true
  }), [schemes, filter])

  const schemeIds = useMemo(() => schemes.map(s => s.id), [schemes])
  const commentCounts = useCommentCounts(schemeIds)

  const resetForm = () => {
    setFromCountry(''); setToCountry(''); setBorderCrossing('')
    setCostUsd(''); setDurationHours(''); setDescription(''); setTip('')
    setFormError(''); setSubmitting(false); setEditScheme(null)
  }

  const handleAddScheme = async () => {
    if (!fromCountry || !toCountry || !description.trim()) {
      setFormError('Заполни страну отправления, страну прибытия и описание')
      return
    }
    if (fromCountry === toCountry && borderCrossing.trim() === '') {
      setFormError('Либо разные страны, либо укажи тип схемы (мультивиза и т.п.)')
      return
    }
    if (!userId) {
      setFormError('Открой через Telegram, чтобы добавить схему')
      return
    }
    setSubmitting(true)
    setFormError('')
    const input = {
      passport,
      from_country: fromCountry,
      to_country: toCountry,
      border_crossing: borderCrossing.trim() || undefined,
      cost_usd: costUsd ? parseInt(costUsd, 10) : undefined,
      duration_hours: durationHours ? parseInt(durationHours, 10) : undefined,
      description: description.trim(),
      tip: tip.trim() || undefined,
    }
    try {
      if (editScheme) {
        await updateScheme(editScheme.id, input)
      } else {
        await addScheme(input)
      }
      setAddSheetOpen(false)
      resetForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (scheme: import('@/types').Scheme) => {
    setEditScheme(scheme)
    setFromCountry(scheme.from_country)
    setToCountry(scheme.to_country)
    setBorderCrossing(scheme.border_crossing ?? '')
    setCostUsd(scheme.cost_usd != null ? String(scheme.cost_usd) : '')
    setDurationHours(scheme.duration_hours != null ? String(scheme.duration_hours) : '')
    setDescription(scheme.description)
    setTip(scheme.tip ?? '')
    setFormError('')
    setAddSheetOpen(true)
  }

  const handleDelete = async (schemeId: string) => {
    try {
      await deleteScheme(schemeId)
    } catch (e) {
      console.error('[delete scheme]', e)
    }
  }

  const inputStyle = { background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text1)' }

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <SchemeFilters onFilter={setFilter} />
      <div className="font-mono text-[9px] px-1 py-0.5 mb-1" style={{ color: 'var(--text3)' }}>
        uid: {userId ?? 'null'} | tg: {typeof window !== 'undefined' ? String((window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? 'none') : '?'}
      </div>
      {debugMsg && (
        <div className="mb-2 p-2 rounded border font-mono text-[10px]" style={{ background: 'var(--alert-bg)', borderColor: 'var(--alert-border)', color: 'var(--alert-text)' }}>
          {debugMsg}
        </div>
      )}

      <div
        className="font-mono text-[9px] uppercase mt-4 mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        {loading ? 'загрузка…' : `${filteredSchemes.length} схем · ${passport}`}
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {error && (
        <div
          className="border rounded-[10px] p-3 mb-2 flex items-start gap-2.5"
          style={{ background: 'var(--alert-bg)', borderColor: 'var(--alert-border)', color: 'var(--alert-text)' }}
        >
          <WifiOff size={14} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-[12px] font-medium mb-0.5">Не дозвонились до сервера</div>
            <div className="font-mono text-[10px] mb-2" style={{ color: 'var(--text3)' }}>
              {error}
            </div>
            <button
              onClick={refetch}
              className="inline-flex items-center gap-1.5 border rounded px-2 py-1 font-mono text-[10px]"
              style={{ borderColor: 'var(--alert-border)', color: 'var(--alert-text)' }}
            >
              <RefreshCw size={10} /> попробовать снова
            </button>
          </div>
        </div>
      )}

      {!loading && !error && filteredSchemes.length === 0 && (
        <div
          className="text-center py-8 px-4 border rounded-[10px] mb-2"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--text1)' }}>
            {schemes.length === 0 ? 'Схем пока нет' : 'Ничего не подходит под фильтр'}
          </div>
          <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>
            {schemes.length === 0 ? 'Будь первым — добавь свою' : 'Сбрось фильтр или добавь свою'}
          </div>
        </div>
      )}

      {filteredSchemes.map((scheme, i) => (
        <SchemeCard
          key={scheme.id}
          scheme={scheme}
          index={i}
          userVote={votes[scheme.id] ?? null}
          onVote={(id, v) => {
            if (!isUuid(userId)) {
              setDebugMsg('userId не UUID: ' + String(userId))
              return
            }
            vote(id, v).catch((e) => {
              const msg = (e as any)?.message || (e as any)?.code || JSON.stringify(e) || 'unknown'
              setDebugMsg('Vote error: ' + msg)
            })
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          userId={userId}
          commentCount={commentCounts[scheme.id] ?? 0}
          currentCountry={currentCountry}
        />
      ))}

      <button
        onClick={() => setAddSheetOpen(true)}
        className="w-full border border-dashed rounded flex items-center gap-3 p-3.5 mt-0.5 transition-all duration-150 active:scale-[0.99]"
        style={{ borderColor: 'var(--border)', color: 'var(--text1)' }}
      >
        <div
          className="w-8 h-8 border rounded flex items-center justify-center shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          <Plus size={15} strokeWidth={1.5} />
        </div>
        <div className="text-left">
          <span className="text-[13px] font-medium block">Добавить схему</span>
          <span className="font-mono text-[9px] mt-px block" style={{ color: 'var(--text3)' }}>Помоги другим · анонимно</span>
        </div>
      </button>

      <BottomSheet open={addSheetOpen} onClose={() => { setAddSheetOpen(false); resetForm() }}>
        <h2 className="text-[17px] font-semibold mb-5" style={{ color: 'var(--text1)' }}>
          {editScheme ? 'Редактировать схему' : 'Новая схема'}
        </h2>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Откуда</label>
            <select
              value={fromCountry} onChange={e => setFromCountry(e.target.value)}
              className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none"
              style={inputStyle}
            >
              <option value="">Выбери</option>
              {COUNTRY_CODES.map(c => <option key={c} value={c}>{COUNTRY_FLAGS[c]} {COUNTRY_NAMES[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Куда</label>
            <select
              value={toCountry} onChange={e => setToCountry(e.target.value)}
              className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none"
              style={inputStyle}
            >
              <option value="">Выбери</option>
              {COUNTRY_CODES.map(c => <option key={c} value={c}>{COUNTRY_FLAGS[c]} {COUNTRY_NAMES[c]}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-2">
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Погранпереход</label>
          <input value={borderCrossing} onChange={e => setBorderCrossing(e.target.value)} placeholder="Название КПП" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Стоимость $</label>
            <input type="number" inputMode="numeric" min="0" value={costUsd} onChange={e => setCostUsd(e.target.value)} placeholder="0" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Часов в пути</label>
            <input type="number" inputMode="numeric" min="0" value={durationHours} onChange={e => setDurationHours(e.target.value)} placeholder="0" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
          </div>
        </div>

        <div className="mb-2">
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Описание маршрута</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Как добраться, что на границе..." className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none resize-none" style={inputStyle} />
        </div>

        <div className="mb-3">
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Совет</label>
          <input value={tip} onChange={e => setTip(e.target.value)} placeholder="Лайфхак для других" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
        </div>

        {formError && (
          <div
            className="mb-3 p-2.5 rounded border font-mono text-[10px]"
            style={{ background: 'var(--alert-bg)', borderColor: 'var(--alert-border)', color: 'var(--alert-text)' }}
          >
            {formError}
          </div>
        )}

        <button
          onClick={handleAddScheme}
          disabled={submitting}
          className="w-full py-3.5 rounded font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          style={{ background: 'var(--text1)', color: 'var(--bg)' }}
        >
          {submitting ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </BottomSheet>
    </div>
  )
}
