import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import SchemeFilters from '@/components/SchemeFilters'
import SchemeCard from '@/components/SchemeCard'
import BottomSheet from '@/components/BottomSheet'
import { COUNTRY_FLAGS, COUNTRY_NAMES, type PassportCountry } from '@/types'
import { COUNTRY_CODES } from '@/lib/visaRules'
import type { Scheme } from '@/types'

const BUILT_IN_SCHEMES: Scheme[] = [
  {
    id: '1', passport: 'RU', from_country: 'VN', to_country: 'LA', border_crossing: 'Nam Phao',
    cost_usd: 25, duration_hours: 10,
    description: 'Автобус из HCMC -> Vinh -> граница Nam Phao. Пешком через КПП, штамп Лаос, разворот. Новый VN штамп 90 дней.',
    tip: 'Бери $35 налик -- $20 виза Лаос + буфер на транспорт',
    verified_at: '2026-03-15', works_count: 47, broken_count: 3, created_at: '',
  },
  {
    id: '2', passport: 'RU', from_country: 'VN', to_country: 'KH', border_crossing: 'Moc Bai',
    cost_usd: 40, duration_hours: 5,
    description: 'Из HCMC автобус до Moc Bai -- 2 часа. Быстрый КПП в Камбоджу и назад. Самый короткий ран из Хошимина.',
    tip: 'Виза Камбоджа $30 на месте. Торгуйся за автобус',
    verified_at: '2026-02-20', works_count: 31, broken_count: 1, created_at: '',
  },
  {
    id: '3', passport: 'RU', from_country: 'VN', to_country: 'KR',
    cost_usd: 200, duration_hours: 168,
    description: 'Рейс в Сеул на неделю. В Thai консульстве e-Visa за 3 дня. Прилетаешь с готовой Thai визой.',
    tip: 'Совмести с путешествием, минус стресс + Thai виза готова',
    verified_at: '2026-01-10', works_count: 19, broken_count: 0, created_at: '',
  },
  {
    id: '4', passport: 'RU', from_country: 'TH', to_country: 'LA', border_crossing: 'Nong Khai',
    cost_usd: 60, duration_hours: 14,
    description: 'Автобус из Бангкока через Nong Khai до Вьентьяна. VOA Лаос $42 на границе, разворот same-day обратно в Таиланд.',
    tip: 'Бери наличку в батах -- на лаосской стороне обмен невыгодный',
    verified_at: '2026-03-28', works_count: 34, broken_count: 2, created_at: '',
  },
  {
    id: '5', passport: 'RU', from_country: 'TH', to_country: 'MY', border_crossing: 'Sadao/Danok',
    cost_usd: 15, duration_hours: 4,
    description: 'Из Hat Yai на минивэне до границы Sadao. Штамп Малайзии 30 дней. Можно развернуться сразу или остаться.',
    tip: 'Самый дешёвый бордер-ран из южного Таиланда',
    verified_at: '2026-04-02', works_count: 52, broken_count: 1, created_at: '',
  },
  {
    id: '6', passport: 'RU', from_country: 'TH', to_country: 'KH', border_crossing: 'Aranyaprathet/Poipet',
    cost_usd: 40, duration_hours: 6,
    description: 'Автобус из BKK до Poipet border. VOA Cambodia $30 на месте. Популярный маршрут, много транспорта.',
    tip: 'Не меняй деньги на границе -- курс грабительский. Бери доллары заранее',
    verified_at: '2026-03-20', works_count: 28, broken_count: 4, created_at: '',
  },
  // UA/KZ cross-listed — many schemes work regardless of passport
  {
    id: '7', passport: 'UA', from_country: 'TH', to_country: 'MY', border_crossing: 'Sadao/Danok',
    cost_usd: 15, duration_hours: 4,
    description: 'Тот же маршрут Hat Yai → Sadao. MY безвиз 30 дней для UA паспорта. Работает идентично.',
    tip: 'Ту же самую подсказку про наличку в батах',
    verified_at: '2026-04-05', works_count: 12, broken_count: 0, created_at: '',
  },
  {
    id: '8', passport: 'KZ', from_country: 'VN', to_country: 'KH', border_crossing: 'Moc Bai',
    cost_usd: 40, duration_hours: 5,
    description: 'Классика для KZ паспорта. Moc Bai → Bavet → разворот. VN штамп обновляется.',
    tip: 'VOA Камбоджа $30, мелкие купюры USD',
    verified_at: '2026-03-22', works_count: 8, broken_count: 1, created_at: '',
  },
]

const LS_VOTES = 'overstay_scheme_votes'
const LS_USER_SCHEMES = 'overstay_user_schemes'
const LS_VOTE_DELTAS = 'overstay_vote_deltas'

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch { /* ignore corrupt entry */ }
  return fallback
}

interface VoteDelta { works: number; broken: number }

function genSchemeId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* fallthrough */ }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

interface Props {
  passport: PassportCountry
}

export default function SchemesPage({ passport }: Props) {
  const [filter, setFilter] = useState('Все')
  const [votes, setVotes] = useState<Record<string, 'works' | 'broken'>>(() => loadJSON(LS_VOTES, {}))
  const [voteDeltas, setVoteDeltas] = useState<Record<string, VoteDelta>>(() => loadJSON(LS_VOTE_DELTAS, {}))
  const [userSchemes, setUserSchemes] = useState<Scheme[]>(() => loadJSON(LS_USER_SCHEMES, []))
  const [addSheetOpen, setAddSheetOpen] = useState(false)

  // Add Scheme form state
  const [fromCountry, setFromCountry] = useState('')
  const [toCountry, setToCountry] = useState('')
  const [borderCrossing, setBorderCrossing] = useState('')
  const [costUsd, setCostUsd] = useState('')
  const [durationHours, setDurationHours] = useState('')
  const [description, setDescription] = useState('')
  const [tip, setTip] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => { localStorage.setItem(LS_VOTES, JSON.stringify(votes)) }, [votes])
  useEffect(() => { localStorage.setItem(LS_USER_SCHEMES, JSON.stringify(userSchemes)) }, [userSchemes])
  useEffect(() => { localStorage.setItem(LS_VOTE_DELTAS, JSON.stringify(voteDeltas)) }, [voteDeltas])

  const allSchemes = useMemo(() => {
    return [...BUILT_IN_SCHEMES, ...userSchemes]
      .filter(s => s.passport === passport)
      .map(s => {
        const delta = voteDeltas[s.id]
        if (!delta) return s
        return {
          ...s,
          works_count: Math.max(0, s.works_count + delta.works),
          broken_count: Math.max(0, s.broken_count + delta.broken),
        }
      })
      .sort((a, b) => b.works_count - a.works_count)
  }, [userSchemes, passport, voteDeltas])

  const filteredSchemes = useMemo(() => allSchemes.filter(scheme => {
    if (filter === 'Все') return true
    if (filter === 'VN →') return scheme.from_country === 'VN'
    if (filter === 'TH →') return scheme.from_country === 'TH'
    if (filter === 'Граница') return scheme.duration_hours != null && scheme.duration_hours <= 48
    if (filter === 'Самолёт') return scheme.duration_hours != null && scheme.duration_hours > 48
    return true
  }), [allSchemes, filter])

  const handleVote = useCallback((schemeId: string, vote: 'works' | 'broken') => {
    const existing = votes[schemeId]

    setVoteDeltas(prev => {
      const next = { ...prev }
      const current = next[schemeId] ?? { works: 0, broken: 0 }
      const updated = { ...current }
      // Reverse previous vote's effect
      if (existing === 'works') updated.works -= 1
      if (existing === 'broken') updated.broken -= 1
      // Apply new vote (or toggle off if same)
      if (existing !== vote) {
        if (vote === 'works') updated.works += 1
        else updated.broken += 1
      }
      if (updated.works === 0 && updated.broken === 0) {
        delete next[schemeId]
      } else {
        next[schemeId] = updated
      }
      return next
    })

    setVotes(prev => {
      if (prev[schemeId] === vote) {
        const next = { ...prev }
        delete next[schemeId]
        return next
      }
      return { ...prev, [schemeId]: vote }
    })
  }, [votes])

  const handleAddScheme = () => {
    if (!fromCountry || !toCountry || !description.trim()) {
      setFormError('Заполни страну отправления, страну прибытия и описание')
      return
    }
    if (fromCountry === toCountry) {
      setFormError('Страна отправления и прибытия совпадают')
      return
    }
    setFormError('')
    const newScheme: Scheme = {
      id: genSchemeId(),
      passport,
      from_country: fromCountry,
      to_country: toCountry,
      border_crossing: borderCrossing || undefined,
      cost_usd: costUsd ? parseInt(costUsd, 10) : undefined,
      duration_hours: durationHours ? parseInt(durationHours, 10) : undefined,
      description: description.trim(),
      tip: tip.trim() || undefined,
      verified_at: new Date().toISOString().split('T')[0],
      works_count: 0,
      broken_count: 0,
      created_at: new Date().toISOString(),
    }
    setUserSchemes(prev => [...prev, newScheme])
    setAddSheetOpen(false)
    setFromCountry(''); setToCountry(''); setBorderCrossing('')
    setCostUsd(''); setDurationHours(''); setDescription(''); setTip('')
  }

  const inputStyle = { background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text1)' }

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <SchemeFilters onFilter={setFilter} />

      <div
        className="font-mono text-[9px] uppercase mt-4 mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        {filteredSchemes.length} подтверждено · {passport}
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {filteredSchemes.length === 0 && (
        <div
          className="text-center py-8 px-4 border rounded-[10px] mb-2"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[13px] font-medium mb-1" style={{ color: 'var(--text1)' }}>
            Пока нет схем для этого фильтра
          </div>
          <div className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>
            Сбрось фильтр или добавь свою
          </div>
        </div>
      )}

      {filteredSchemes.map((scheme, i) => (
        <SchemeCard key={scheme.id} scheme={scheme} index={i} userVote={votes[scheme.id] ?? null} onVote={handleVote} />
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

      <BottomSheet open={addSheetOpen} onClose={() => { setAddSheetOpen(false); setFormError('') }}>
        <h2 className="text-[17px] font-semibold mb-5" style={{ color: 'var(--text1)' }}>
          Новая схема
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
          className="w-full py-3.5 rounded font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98]"
          style={{ background: 'var(--text1)', color: 'var(--bg)' }}
        >
          Сохранить
        </button>
      </BottomSheet>
    </div>
  )
}
