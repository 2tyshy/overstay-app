import { useState, useCallback, useEffect, useMemo } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import StatusPage from '@/pages/StatusPage'
import SchemesPage from '@/pages/SchemesPage'
import NextPage from '@/pages/NextPage'
import AddEntrySheet from '@/components/AddEntrySheet'
import EntryDetailSheet from '@/components/EntryDetailSheet'
import ChatSheet from '@/components/ChatSheet'
import CameraSheet from '@/components/CameraSheet'
import Toast from '@/components/Toast'
import type { Screen, VisaEntry, PassportCountry } from '@/types'
import { computeMaxDays } from '@/lib/visaRules'
import { calcDeadline, calcDaysLeft, parseLocalDate, todayLocal, effectiveDeadline } from '@/lib/dates'
import type { OcrResult } from '@/lib/ocr'
import { useUser } from '@/hooks/useUser'
import { upsertVisaEntry, deleteVisaEntry } from '@/lib/supabase'

const SCREEN_TITLES: Record<Screen, string> = {
  status: 'Overstay',
  schemes: 'Схемы',
  next: 'Дальше',
}

// Seed uses realistic 2026 data. Entry visa_type strings are normalized
// to match the dropdown format in AddEntrySheet so display is consistent.
const SEED_ENTRIES: VisaEntry[] = [
  {
    id: '1', user_id: '1', country: 'VN', entry_date: '2026-03-15',
    visa_type: 'e-visa 90', max_days: 90, created_at: '',
    deadline: calcDeadline('2026-03-15', 90),
    days_left: calcDaysLeft(calcDeadline('2026-03-15', 90)),
  },
  {
    id: '2', user_id: '1', country: 'TH', entry_date: '2025-09-10',
    visa_type: 'dtv 180', max_days: 180, created_at: '',
    deadline: calcDeadline('2025-09-10', 180),
    days_left: 0,
  },
  {
    id: '3', user_id: '1', country: 'KH', entry_date: '2025-09-08',
    visa_type: 'visa on arrival 30', max_days: 2, created_at: '',
    deadline: calcDeadline('2025-09-08', 2),
    days_left: 0,
  },
]

const LS_ENTRIES = 'overstay_entries'
const LS_PASSPORT = 'overstay_passport'

function loadEntries(): VisaEntry[] {
  try {
    const raw = localStorage.getItem(LS_ENTRIES)
    if (raw) {
      const parsed: VisaEntry[] = JSON.parse(raw)
      if (!Array.isArray(parsed)) return SEED_ENTRIES
      return parsed.map(e => ({ ...e, days_left: calcDaysLeft(e.deadline) }))
    }
  } catch { /* ignore corrupt localStorage */ }
  return SEED_ENTRIES
}

function loadPassport(): PassportCountry {
  const v = localStorage.getItem(LS_PASSPORT)
  if (v === 'RU' || v === 'UA' || v === 'KZ') return v
  return 'RU'
}

// Generate UUID with fallback for older iOS WebView (crypto.randomUUID
// was added in iOS 15.4).
function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* fallthrough */ }
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

// Sort entries: active first (days_left > 0), by proximity to deadline,
// then expired ones by recency.
function sortEntries(entries: VisaEntry[]): VisaEntry[] {
  return [...entries].sort((a, b) => {
    const aActive = a.days_left > 0
    const bActive = b.days_left > 0
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    if (aActive && bActive) return a.days_left - b.days_left
    // both expired — most recent entry first
    return parseLocalDate(b.entry_date).getTime() - parseLocalDate(a.entry_date).getTime()
  })
}

// Sum of days actually spent on each trip (bounded by today).
function sumDaysSpent(entries: VisaEntry[]): number {
  const today = todayLocal().getTime()
  return entries.reduce((sum, e) => {
    const start = parseLocalDate(e.entry_date).getTime()
    const dead = parseLocalDate(e.deadline).getTime() + 86400000 // end of deadline day
    const end = Math.min(today, dead)
    if (end <= start) return sum
    return sum + Math.ceil((end - start) / 86400000)
  }, 0)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('status')
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [entries, setEntries] = useState<VisaEntry[]>(loadEntries)
  const [passport, setPassport] = useState<PassportCountry>(loadPassport)
  const [detailEntry, setDetailEntry] = useState<VisaEntry | null>(null)
  const [editEntry, setEditEntry] = useState<VisaEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [ocrPrefill, setOcrPrefill] = useState<OcrResult | null>(null)

  // Resolve/insert the Supabase user row so we have a real UUID to key
  // visa_entries off. The bot (service_role) reads from visa_entries, so
  // without this the cron + /check never see anything the user enters.
  const { user } = useUser(passport)
  const userId = user?.id

  const sorted = useMemo(() => sortEntries(entries), [entries])

  useEffect(() => { localStorage.setItem(LS_ENTRIES, JSON.stringify(entries)) }, [entries])
  useEffect(() => { localStorage.setItem(LS_PASSPORT, passport) }, [passport])

  // When the user switches passport, recompute max_days + deadline
  // for entries where the rules differ (e.g. Korea). We also re-apply the
  // visa_end cap so a shorter visa validity continues to bind.
  useEffect(() => {
    setEntries(prev => prev.map(entry => {
      const newRuleMax = computeMaxDays(entry.country, entry.visa_type, passport)
      if (newRuleMax === 0) return entry
      const eff = effectiveDeadline(entry.entry_date, newRuleMax, entry.visa_end)
      if (eff.maxDays === entry.max_days && eff.deadline === entry.deadline) return entry
      return { ...entry, max_days: eff.maxDays, deadline: eff.deadline, days_left: calcDaysLeft(eff.deadline) }
    }))
  }, [passport])

  // One-shot backfill: when the user row resolves, mirror every localStorage
  // entry that isn't already in Supabase. Needed because prior builds only
  // wrote to localStorage — the bot's cron + /check never saw anything.
  // Upsert is idempotent, so running this each session is cheap and catches
  // entries added on other devices too.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      let ok = 0
      let lastErr = ''
      for (const e of entries) {
        if (cancelled) return
        const r = await upsertVisaEntry(userId, e)
        if (r.ok) ok++
        else if (r.reason !== 'no-user' && r.reason !== 'bad-id') lastErr = r.reason
      }
      if (cancelled) return
      if (lastErr) showToast(`☁ синк: ${ok}/${entries.length}, err: ${lastErr}`)
      else if (ok > 0) showToast(`☁ синк: ${ok} виз → БД`)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    // Fire-and-forget mirror to Supabase. UI stays instant; server catches up.
    void deleteVisaEntry(userId, id).then(r => {
      if (!r.ok && r.reason !== 'no-user' && r.reason !== 'bad-id') {
        showToast('DB delete failed: ' + r.reason)
      }
    })
    showToast('Запись удалена')
  }, [showToast, userId])

  const handleSave = useCallback((data: { country: string; visa_type: string; entry_date: string; visa_start?: string; visa_end?: string }) => {
    const ruleMaxDays = computeMaxDays(data.country, data.visa_type, passport)
    if (ruleMaxDays === 0) {
      showToast('Виза недоступна для этого паспорта')
      return
    }
    // visa_end (visa validity expiry) can shorten the effective stay if it's
    // earlier than entry + ruleMaxDays. This makes the status ring + calendar
    // reflect the real binding constraint instead of the full category rule.
    const { deadline, maxDays } = effectiveDeadline(data.entry_date, ruleMaxDays, data.visa_end)
    const newEntry: VisaEntry = {
      id: editEntry?.id ?? genId(),
      user_id: userId ?? 'dev',
      country: data.country.toUpperCase(),
      entry_date: data.entry_date,
      visa_type: data.visa_type,
      max_days: maxDays,
      created_at: editEntry?.created_at ?? new Date().toISOString(),
      deadline,
      days_left: calcDaysLeft(deadline),
      visa_start: data.visa_start,
      visa_end: data.visa_end,
    }
    if (editEntry) {
      setEntries(prev => prev.map(e => e.id === editEntry.id ? newEntry : e))
      setEditEntry(null)
      showToast('Запись обновлена')
    } else {
      setEntries(prev => [newEntry, ...prev])
      showToast('Запись добавлена')
    }
    // Mirror to Supabase so the bot (and /check, and the daily cron) sees it.
    // Fire-and-forget: UI is already updated, network latency shouldn't block.
    void upsertVisaEntry(userId, newEntry).then(r => {
      if (!r.ok && r.reason !== 'no-user' && r.reason !== 'bad-id') {
        showToast('DB sync failed: ' + r.reason)
      }
    })
  }, [editEntry, passport, showToast, userId])

  // Copy a text snapshot of all entries to clipboard. We avoid the blob+download
  // approach because Telegram iOS WebView hijacks the navigation and leaves the
  // user stuck in a text viewer with no way back to the app.
  const handlePdfExport = useCallback(async () => {
    const current = sorted[0]
    const lines = [
      'OVERSTAY — Visa Status Export',
      `Passport: ${passport}`,
      `Date: ${new Date().toISOString().split('T')[0]}`,
      '',
      '--- Current ---',
      current
        ? `${current.country} | ${current.visa_type} | Entry: ${current.entry_date} | Deadline: ${current.deadline} | Days left: ${current.days_left}`
        : 'No active entry',
      '',
      '--- History ---',
      ...sorted.slice(1).map(e =>
        `${e.country} | ${e.visa_type} | Entry: ${e.entry_date} | Deadline: ${e.deadline}`
      ),
    ]
    const text = lines.join('\n')
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        showToast('Скопировано в буфер обмена')
        return
      }
    } catch { /* fall through to legacy path */ }
    // Legacy fallback for older WebViews without Clipboard API
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showToast('Скопировано в буфер обмена')
    } catch {
      showToast('Не удалось скопировать')
    }
  }, [sorted, passport, showToast])

  const handleRefresh = useCallback(() => {
    setEntries(prev => prev.map(e => ({ ...e, days_left: calcDaysLeft(e.deadline) })))
    showToast('Обновлено')
  }, [showToast])

  // OCR scan result → prefill Add sheet. Close camera, open add with data.
  const handleOcrApply = useCallback((r: OcrResult) => {
    setOcrPrefill(r)
    setEditEntry(null)
    setEntrySheetOpen(true)
    showToast('Данные заполнены — проверь и сохрани')
  }, [showToast])

  // From the Add sheet, user taps "scan" → close add, open camera
  const handleOpenCamera = useCallback(() => {
    setCameraOpen(true)
  }, [])

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Header
          title={SCREEN_TITLES[screen]}
          passport={passport}
          onPassportChange={setPassport}
          onChatOpen={() => setChatOpen(true)}
          onRefresh={handleRefresh}
        />

        <div className="flex-1 overflow-hidden">
          {screen === 'status' && (
            <StatusPage
              entries={sorted}
              onNavigate={setScreen}
              onStamp={() => setEntrySheetOpen(true)}
              onPdf={handlePdfExport}
              onEntryClick={setDetailEntry}
              totalDaysSpent={sumDaysSpent(entries)}
            />
          )}
          {screen === 'schemes' && <SchemesPage passport={passport} />}
          {screen === 'next' && <NextPage onNavigate={setScreen} entries={sorted} passport={passport} />}
        </div>

        <BottomNav active={screen} onChange={setScreen} />

        <AddEntrySheet
          open={entrySheetOpen}
          onClose={() => { setEntrySheetOpen(false); setEditEntry(null); setOcrPrefill(null) }}
          onSave={handleSave}
          initialData={editEntry}
          passport={passport}
          ocrPrefill={ocrPrefill}
          onScan={handleOpenCamera}
        />

        <EntryDetailSheet
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          onDelete={handleDelete}
          onEdit={(e) => {
            setEditEntry(e)
            setDetailEntry(null)
            setEntrySheetOpen(true)
          }}
        />

        <CameraSheet
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onApply={handleOcrApply}
          onNeedApiKey={() => { setCameraOpen(false); setChatOpen(true); showToast('Добавь API ключ Gemini') }}
        />

        <ChatSheet
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          passport={passport}
          entries={sorted}
        />

        {toast && <Toast message={toast} />}
      </div>
    </ThemeProvider>
  )
}
