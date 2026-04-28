import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import StatusPage from '@/pages/StatusPage'
import NextPage from '@/pages/NextPage'
import ChatPage from '@/pages/ChatPage'
import AddEntrySheet from '@/components/AddEntrySheet'
import EntryDetailSheet from '@/components/EntryDetailSheet'
import CameraSheet from '@/components/CameraSheet'
import Toast from '@/components/Toast'
import type { Screen, VisaEntry, PassportCountry } from '@/types'
import { computeMaxDays } from '@/lib/visaRules'
import { calcDeadline, calcDaysLeft, parseLocalDate, effectiveDeadline } from '@/lib/dates'
import type { OcrResult } from '@/lib/ocr'
import { isUuid } from '@/lib/uuid'
import { useUser } from '@/hooks/useUser'
import { upsertVisaEntry, deleteVisaEntry, fetchVisaEntries, updatePassportCountry } from '@/lib/supabase'
import type { VisaEntryRow } from '@/lib/supabase'

const SCREEN_TITLES: Record<Screen, string> = {
  status: 'Overstay',
  next: 'Куда',
  chat: 'Помощник',
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

function rowToEntry(row: VisaEntryRow): VisaEntry {
  const { deadline, maxDays } = effectiveDeadline(row.entry_date, row.max_days, row.visa_end ?? undefined)
  return {
    id: row.id,
    user_id: row.user_id,
    country: row.country,
    visa_type: row.visa_type,
    entry_date: row.entry_date,
    max_days: maxDays,
    visa_start: row.visa_start ?? undefined,
    visa_end: row.visa_end ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
    deadline,
    days_left: calcDaysLeft(deadline),
  }
}


export default function App() {
  const [screen, setScreen] = useState<Screen>('status')
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [chatPrefill, setChatPrefill] = useState<string | undefined>(undefined)
  const [entries, setEntries] = useState<VisaEntry[]>(loadEntries)
  const [passport, setPassport] = useState<PassportCountry>(loadPassport)
  const [detailEntry, setDetailEntry] = useState<VisaEntry | null>(null)
  const [editEntry, setEditEntry] = useState<VisaEntry | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const [ocrPrefill, setOcrPrefill] = useState<OcrResult | null>(null)

  // Resolve/insert the Supabase user row so we have a real UUID to key
  // visa_entries off. The bot (service_role) reads from visa_entries, so
  // without this the cron + /check never see anything the user enters.
  const { user } = useUser(passport)
  const userId = user?.id
  const passportSyncedRef = useRef(false)

  const sorted = useMemo(() => sortEntries(entries), [entries])

  useEffect(() => { localStorage.setItem(LS_ENTRIES, JSON.stringify(entries)) }, [entries])
  useEffect(() => { localStorage.setItem(LS_PASSPORT, passport) }, [passport])

  // Sync passport from DB on first user resolution — DB is source of truth
  // across devices. Only runs once; user-initiated changes go through
  // handlePassportChange which updates both local state and Supabase.
  useEffect(() => {
    if (!user || passportSyncedRef.current) return
    const dbPassport = user.passport_country as PassportCountry
    if (dbPassport === 'RU' || dbPassport === 'UA' || dbPassport === 'KZ') {
      passportSyncedRef.current = true
      setPassport(dbPassport)
    }
  }, [user])

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

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message: msg, type })
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const handlePassportChange = useCallback((p: PassportCountry) => {
    setPassport(p)
    if (userId) void updatePassportCountry(userId, p)
  }, [userId])

  // Pull latest entries from DB and update state + localStorage.
  // Used on mount (once userId resolves) and whenever the app regains focus.
  const syncFromDb = useCallback(async (uid: string, localEntries: VisaEntry[]) => {
    const dbRows = await fetchVisaEntries(uid)
    if (dbRows && dbRows.length > 0) {
      const dbEntries = dbRows.map(rowToEntry)
      setEntries(dbEntries)
      localStorage.setItem(LS_ENTRIES, JSON.stringify(dbEntries))
    } else {
      // DB empty — backfill real entries (skip non-UUID seed demo entries)
      const realEntries = localEntries.filter(e => isUuid(e.id))
      if (realEntries.length === 0) {
        setEntries([])
        localStorage.removeItem(LS_ENTRIES)
        return
      }
      let ok = 0, lastErr = ''
      for (const e of realEntries) {
        const r = await upsertVisaEntry(uid, e)
        if (r.ok) ok++
        else if (r.reason !== 'no-user' && r.reason !== 'bad-id') lastErr = r.reason
      }
      if (lastErr) showToast(`☁ синк: ${ok}/${realEntries.length}, err: ${lastErr}`)
      else if (ok > 0) showToast(`☁ синк: ${ok} виз → БД`)
    }
  }, [showToast])

  // Initial sync when userId resolves.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const snapshot = entries  // capture current local entries for backfill
    syncFromDb(userId, snapshot).catch(e => {
      if (!cancelled) showToast(`☁ ошибка синка: ${e instanceof Error ? e.message : String(e)}`, 'error')
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Re-sync when app regains visibility — picks up deletes/edits from other devices.
  useEffect(() => {
    if (!userId) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchVisaEntries(userId).then(rows => {
          if (rows && rows.length > 0) {
            const dbEntries = rows.map(rowToEntry)
            setEntries(dbEntries)
            localStorage.setItem(LS_ENTRIES, JSON.stringify(dbEntries))
          }
        }).catch(console.error)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId])

  const handleDelete = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    // Fire-and-forget mirror to Supabase. UI stays instant; server catches up.
    void deleteVisaEntry(userId, id).then(r => {
      if (!r.ok && r.reason !== 'no-user' && r.reason !== 'bad-id') {
        showToast('DB delete failed: ' + r.reason, 'error')
      }
    })
    showToast('Запись удалена', 'success')
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
      showToast('Запись обновлена', 'success')
    } else {
      setEntries(prev => [newEntry, ...prev])
      showToast('Запись добавлена', 'success')
    }
    // Mirror to Supabase so the bot (and /check, and the daily cron) sees it.
    // Fire-and-forget: UI is already updated, network latency shouldn't block.
    void upsertVisaEntry(userId, newEntry).then(r => {
      if (!r.ok && r.reason !== 'no-user' && r.reason !== 'bad-id') {
        showToast('DB sync failed: ' + r.reason, 'error')
      }
    })
  }, [editEntry, passport, showToast, userId])

  const handleCityClick = useCallback((city: string, country: string) => {
    setChatPrefill(`Расскажи про жизнь в ${city}, ${country}: стоимость жилья, интернет, инфраструктура для номадов`)
    setScreen('chat')
  }, [])

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
          onPassportChange={handlePassportChange}
          onRefresh={handleRefresh}
        />

        <div className="flex-1 overflow-hidden">
          {screen === 'status' && (
            <StatusPage
              entries={sorted}
              onStamp={() => setEntrySheetOpen(true)}
              onEntryClick={setDetailEntry}
              onCityClick={handleCityClick}
            />
          )}
          {screen === 'next' && <NextPage entries={sorted} passport={passport} />}
          {screen === 'chat' && <ChatPage passport={passport} entries={sorted} prefill={chatPrefill} />}
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
          onNeedApiKey={() => { setCameraOpen(false); setScreen('chat'); showToast('Добавь API ключ Gemini') }}
        />

        {toast && <Toast message={toast.message} type={toast.type} />}
      </div>
    </ThemeProvider>
  )
}
