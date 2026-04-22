import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import SchemeFilters from '@/components/SchemeFilters'
import SchemeCard from '@/components/SchemeCard'
import BottomSheet from '@/components/BottomSheet'
import { COUNTRY_FLAGS, COUNTRY_NAMES, type PassportCountry } from '@/types'
import { COUNTRY_CODES } from '@/lib/visaRules'
import type { Scheme } from '@/types'

// Seed schemes curated from real 2024-2026 community reports (Vinskiy forum,
// Reddit, Pikabu, Balifora, Ask.in.th, travelfish). Everything here references
// an actually-used route and reflects the latest known rules:
//   - RU: visa-free 45d to Vietnam (decree 07-Mar-2025), plus 90d e-visa.
//   - TH: 60d visa-exempt since Jul-2024 + DTV 180d multi-entry. Nov-2025
//     crackdown: max 2 visa-exempt entries per calendar year via land border,
//     same-day turnarounds are a red flag.
//   - TH-KH land borders are CLOSED since late Oct-2025 due to the border
//     dispute — flagged as broken with a high broken_count until reopened.
//   - ID: visa-ran to KL/SG still standard for Bali 30+30d VOA; biometric
//     on-arrival mandatory since Jun-2025.
const BUILT_IN_SCHEMES: Scheme[] = [
  // ——— RU passport ———
  {
    id: '1', passport: 'RU', from_country: 'VN', to_country: 'KH', border_crossing: 'Moc Bai / Bavet',
    cost_usd: 35, duration_hours: 8,
    description: 'Автобус 703 от автовокзала Park 23/9 (HCMC) до Moc Bai, VND 40 000 (~$1.6). Пешком через КПП, на той стороне — Камбоджа VOA $30-35. Возвращаешься обратно с новой VN e-visa (важно: порт въезда в заявке — "Moc Bai landport", иначе завернут).',
    tip: 'Стартуй до 9 утра: последний автобус обратно из Moc Bai около 16:00, весь круг займёт 3-5 часов.',
    verified_at: '2026-03-18', works_count: 58, broken_count: 4, created_at: '',
  },
  {
    id: '2', passport: 'RU', from_country: 'VN', to_country: 'LA', border_crossing: 'Cau Treo / Nam Phao',
    cost_usd: 55, duration_hours: 24,
    description: 'Ночной автобус Hanoi → Vinh → граница Cau Treo. Лаос VOA $30-40 (для РФ — $30 по последним отчётам), разворот в тот же день. Менее затоптанный маршрут, чем Moc Bai, зато дольше.',
    tip: 'Только наличные USD на лаосской стороне — мелкими купюрами. У российских карт на месте ничего не получится оплатить.',
    verified_at: '2026-02-10', works_count: 21, broken_count: 2, created_at: '',
  },
  {
    id: '3', passport: 'RU', from_country: 'VN', to_country: 'KZ',
    cost_usd: 350, duration_hours: 96,
    description: 'Полный ресет: рейс HCMC/Hanoi → Алматы или Астана, 3-4 дня, обратно с новой e-visa или по 45-дневному безвизу. Пригодится тем, кто зависает в VN дольше 135 дней (45 безвиз + 90 e-visa) и хочет чистый цикл.',
    tip: 'Удобно совместить с продлением российского загранпаспорта в консульстве — одной поездкой закрываешь и визу, и документы.',
    verified_at: '2026-01-25', works_count: 16, broken_count: 1, created_at: '',
  },
  {
    id: '15', passport: 'RU', from_country: 'VN', to_country: 'KH', border_crossing: 'Ha Tien / Prek Chak',
    cost_usd: 45, duration_hours: 6,
    description: 'Южный вариант для тех, кто на Phu Quoc или в Меккодельте. Паром Phu Quoc → Ha Tien (~1.5 ч, $15), дальше мото-такси до КПП (10 мин, 50 000 VND). Камбоджа VOA $30-35, обратно сразу. Тихо, без автобусных толп Moc Bai.',
    tip: 'Паром с Phu Quoc ходит по расписанию до 14:30 — последний обратно в 16:00. Если не успел, застрянешь в Ha Tien на ночь.',
    verified_at: '2026-02-28', works_count: 23, broken_count: 1, created_at: '',
  },
  {
    id: '16', passport: 'RU', from_country: 'VN', to_country: 'LA', border_crossing: 'Lao Bao / Dansavanh',
    cost_usd: 50, duration_hours: 14,
    description: 'Центральный Вьетнам: автобус Hue или Da Nang → Lao Bao (~5-6 ч, 300-400 000 VND). Переход пеший, Лаос VOA $30-42. На той стороне — Savannakhet. Удобно из центрального VN, короче, чем тащиться до Cau Treo или Moc Bai.',
    tip: 'В Lao Bao много «помощников» предлагают оформить визу за $80 — не ведись, всё делается самому в окошке за $30-40 + 2 фото.',
    verified_at: '2026-03-08', works_count: 19, broken_count: 2, created_at: '',
  },
  {
    id: '17', passport: 'RU', from_country: 'VN', to_country: 'TH',
    cost_usd: 160, duration_hours: 72,
    description: 'Weekend в Бангкоке: VietJet/AirAsia HCMC/Hanoi → BKK от $50 round trip, 2-3 ночи в Таиланде, обратно в VN с новой e-visa или 45-безвизом. Хороший вариант для тех, кто хочет совместить с шопингом/прокачкой DTV (подача в Royal Thai E-Visa онлайн, забирать в BKK не обязательно).',
    tip: 'После Nov-2025 в TH лимит 2 наземных безвизовых в год — прилёт на самолёте НЕ считается в этот лимит. Так что в BKK можно летать сколько хочешь.',
    verified_at: '2026-04-05', works_count: 38, broken_count: 2, created_at: '',
  },
  {
    id: '18', passport: 'RU', from_country: 'VN', to_country: 'MY',
    cost_usd: 140, duration_hours: 60,
    description: 'HCMC → Kuala Lumpur, AirAsia/Vietjet от $40-80 one-way. MY безвиз 30 дней для РФ. Ночь в KL Sentral ($15 хостел), обратно в VN. Дешевле чем BKK, цивильный аэропорт, хорошая точка для апгрейда на DTV (Royal Thai в KL работает).',
    tip: 'Рейсы из Hanoi дороже и реже — лучше через HCMC, оттуда AirAsia летает несколько раз в день.',
    verified_at: '2026-03-22', works_count: 27, broken_count: 1, created_at: '',
  },
  {
    id: '19', passport: 'RU', from_country: 'VN', to_country: 'VN', border_crossing: 'multi-entry e-visa',
    cost_usd: 50, duration_hours: 6,
    description: 'Не ран, а лайфхак: при оформлении 90-дневной e-visa выбирай MULTIPLE ENTRY ($50 вместо $25 single). В пределах 90 дней можно свободно летать в Таиланд/Малайзию/Камбоджу и возвращаться без новой визы. Clock не ресетится — 90 дней общие от первого въезда, но мобильность сильно лучше.',
    tip: 'Порт въезда в заявке указывай тот, через который вернёшься обратно. Если летишь через HCMC — "Tan Son Nhat international airport". Ошибёшься — завернут.',
    verified_at: '2026-04-02', works_count: 44, broken_count: 0, created_at: '',
  },
  {
    id: '20', passport: 'RU', from_country: 'VN', to_country: 'PH',
    cost_usd: 220, duration_hours: 96,
    description: 'HCMC → Manila или Cebu (Philippines AirAsia/Cebu Pacific ~$100-150 RT). PH безвиз 30 дней для РФ, 3-4 дня с пляжами и обратно в VN с новой e-visa. Малоизвестный маршрут — никаких очередей на границе, чистый рестарт.',
    tip: 'На въезде в PH спросят onward ticket — покажи обратный в VN. Без него не пустят, это жёсткое требование.',
    verified_at: '2026-03-14', works_count: 12, broken_count: 1, created_at: '',
  },
  {
    id: '4', passport: 'RU', from_country: 'TH', to_country: 'LA', border_crossing: 'Nong Khai / Thanaleng (Friendship Bridge 1)',
    cost_usd: 90, duration_hours: 48,
    description: 'Ночной поезд BKK → Nong Khai (~12 ч, 800-1200 THB). Шаттл через мост Дружбы, Лаос VOA $30-42. С Nov-2025 same-day разворот — красный флаг; переночуй 1-2 ночи во Вьентьяне. Подходит для DTV-holders и для ресета 60-дневного безвиза (но помни про лимит 2 наземных входа в год).',
    tip: 'Для DTV — лучше 2-3 ночи в Лаосе. Иммиграция на въезде смотрит на штампы: слишком частые краткие забеги без причины = отказ.',
    verified_at: '2026-03-28', works_count: 41, broken_count: 6, created_at: '',
  },
  {
    id: '5', passport: 'RU', from_country: 'TH', to_country: 'LA', border_crossing: 'Chong Mek / Vang Tao',
    cost_usd: 50, duration_hours: 10,
    description: 'Автобус Ubon Ratchathani → Chong Mek (~1 ч). Переход пеший, с тайской стороны до лаосской 5 минут. На Vang Tao оформляют VOA $30 на 15 дней (e-visa тут не принимают). Удобно, если ты в южном/восточном Исане.',
    tip: 'e-visa Лаоса на этот переход НЕ работает — только бумажный VOA. Готовь две фото 3x4 и $30 одной купюрой.',
    verified_at: '2026-02-22', works_count: 17, broken_count: 1, created_at: '',
  },
  {
    id: '6', passport: 'RU', from_country: 'TH', to_country: 'MY', border_crossing: 'Padang Besar (поезд)',
    cost_usd: 25, duration_hours: 6,
    description: 'Поезд Hat Yai → Padang Besar (~1 ч, 50 THB). Прямо на станции и тайский, и малайзийский иммиграционный контроль. MY безвиз 30 дней. Обратно — поездом или минивэном. Раньше был самым беспроблемным раном, но c Nov-2025 Таиланд ограничил до 2 наземных безвизовых въездов в год.',
    tip: 'После двух таких раундов за календарный год переходи на DTV или нормальную тур-визу — иначе на третий раз развернут на границе.',
    verified_at: '2026-04-01', works_count: 63, broken_count: 12, created_at: '',
  },
  {
    id: '7', passport: 'RU', from_country: 'TH', to_country: 'LA',
    cost_usd: 420, duration_hours: 120,
    description: 'Полёт BKK → Vientiane (~$80), 3-5 дней во Вьентьяне, подача DTV через Royal Thai Embassy в Лаосе. DTV = 180 дней мультивход, виза на 5 лет. Нужно: выписка на 500 000 THB (~$14-16k), proof of remote work/Muay Thai/cooking и т.п. Консульский сбор 10 000 THB.',
    tip: 'В Lao-консульстве подача самая гибкая из всех Royal Thai Embassies — многие именно сюда ездят из Бангкока. Заранее бронируй запись на сайте e-visa.',
    verified_at: '2026-03-10', works_count: 33, broken_count: 5, created_at: '',
  },
  {
    id: '8', passport: 'RU', from_country: 'TH', to_country: 'KH', border_crossing: 'Aranyaprathet / Poipet',
    cost_usd: 50, duration_hours: 8,
    description: '⚠️ СЕЙЧАС НЕ РАБОТАЕТ: все наземные границы TH-KH закрыты с конца октября 2025 из-за приграничного конфликта. В обычное время — автобус BKK → Poipet, Cambodia e-visa $36 или VOA $30-35. Следи за новостями: обещают открыть, когда уляжется.',
    tip: 'До открытия — только через самолёт до Пномпеня ($60-100) или через Лаос. Не веди туда сейчас.',
    verified_at: '2026-04-15', works_count: 8, broken_count: 47, created_at: '',
  },
  {
    id: '9', passport: 'RU', from_country: 'ID', to_country: 'MY',
    cost_usd: 180, duration_hours: 48,
    description: 'Классика балийцев: рейс DPS → KUL ($80-150 туда-обратно), 1-2 ночи в Куала-Лумпуре. Назад — новый e-VOA Индонезии на 30 дней ($35). В KL — хостел $15-30, еда копейки. Самый дешёвый ресет 30+30 не хватает.',
    tip: 'С июня 2025 биометрию сдают лично в иммиграционном офисе — первый раз в году придётся один раз съездить. Оплачивать e-VOA российской картой нельзя; используй карту KZ/GE или сервис-агента.',
    verified_at: '2026-03-30', works_count: 72, broken_count: 3, created_at: '',
  },
  {
    id: '10', passport: 'RU', from_country: 'ID', to_country: 'SG',
    cost_usd: 260, duration_hours: 48,
    description: 'Рейс DPS → SIN ($120-180 round trip). Сингапур дороже KL, зато виза не нужна (транзит до 96 ч). Удобно если параллельно нужна консульская задача: посольства РФ, нотариальные действия.',
    tip: 'Не хочешь платить за гостиницу в SG — бери рейс с пересадкой 20+ часов и используй транзитную зону с душевой в Changi.',
    verified_at: '2026-02-28', works_count: 29, broken_count: 2, created_at: '',
  },

  // ——— UA passport ———
  {
    id: '11', passport: 'UA', from_country: 'VN', to_country: 'KH', border_crossing: 'Moc Bai / Bavet',
    cost_usd: 40, duration_hours: 8,
    description: 'Для UA паспорта схема идентична российской: автобус 703 до Moc Bai, Камбоджа VOA $30-35, обратно по новой 90-дневной e-visa. 45-дневного безвиза у украинцев нет, только e-visa.',
    tip: 'Украинцы часто получают e-visa быстрее через агентов — официальная оплата долларами, с украинской карты оплатить не всегда выходит.',
    verified_at: '2026-03-05', works_count: 14, broken_count: 1, created_at: '',
  },
  {
    id: '12', passport: 'UA', from_country: 'TH', to_country: 'MY', border_crossing: 'Padang Besar (поезд)',
    cost_usd: 25, duration_hours: 6,
    description: 'Тот же Hat Yai → Padang Besar на поезде. MY безвиз 30 дней для UA паспорта работает штатно. Тайский лимит 2 наземных въезда в год с Nov-2025 действует на всех иностранцев, без исключений.',
    tip: 'Если уже выбрал лимит — лети через KUL или делай DTV из Куала-Лумпура (там тоже принимают заявки).',
    verified_at: '2026-04-03', works_count: 19, broken_count: 3, created_at: '',
  },

  // ——— KZ passport ———
  {
    id: '13', passport: 'KZ', from_country: 'VN', to_country: 'KH', border_crossing: 'Moc Bai / Bavet',
    cost_usd: 35, duration_hours: 8,
    description: 'Казахи во Вьетнаме на тех же условиях, что и украинцы: только e-visa 90 дней, без безвиза. Классический Moc Bai → Bavet, назад с новой e-visa. Оплатить e-visa казахской картой обычно получается — это плюс KZ.',
    tip: 'Если летишь через Алматы — подавай e-visa из Алматы, там интернет быстрее и форму проще заполнить без VPN.',
    verified_at: '2026-03-12', works_count: 11, broken_count: 1, created_at: '',
  },
  {
    id: '14', passport: 'KZ', from_country: 'TH', to_country: 'LA', border_crossing: 'Nong Khai / Thanaleng',
    cost_usd: 90, duration_hours: 48,
    description: 'Тот же BKK → Nong Khai маршрут. KZ безвиз в Таиланд — 30 дней (короче, чем у РФ). Ночной поезд + ночёвка в Vientiane, обратно на следующий день. Для Лаоса казахам нужен VOA $30.',
    tip: 'У казахов безвиз TH всего 30 дней (не 60), так что ритм раньше: планируй выезд на 28-29-й день, не тяни.',
    verified_at: '2026-02-18', works_count: 9, broken_count: 2, created_at: '',
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
