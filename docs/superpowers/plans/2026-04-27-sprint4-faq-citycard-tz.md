# Sprint 4: FAQ Page, City Card, Timezone Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add FAQ screen with server-side AI answers, CountryCard widget on StatusPage, and timezone-aware bot reminders.

**Architecture:** Three independent features. FAQ is a new 4th navigation tab that calls the existing `ai-proxy` Supabase Edge Function — no user API key required. CountryCard is a pure UI component reading from the existing `COUNTRY_DATA` static map. Timezone support adds one DB column, detects the user's local timezone in `useUser.ts`, and switches the bot cron from a fixed UTC sweep to an hourly sweep filtered by each user's local hour.

**Tech Stack:** React + Vite + TypeScript + Tailwind CSS v4, `COUNTRY_DATA` from `src/lib/visaRules.ts`, Supabase Edge Function `ai-proxy` (Gemini 2.5-flash, server key), Telegraf.js bot + `node-cron`, Supabase PostgreSQL migration.

---

## File Map

**Task 1 — FAQ Page:**
- Modify: `frontend/src/types/index.ts` — add `'faq'` to `Screen` union
- Create: `frontend/src/pages/FAQPage.tsx` — full FAQ screen with preset questions + ai-proxy answers
- Modify: `frontend/src/components/BottomNav.tsx` — add 4th FAQ tab
- Modify: `frontend/src/App.tsx` — route `'faq'` to FAQPage, update `SCREEN_TITLES`, update `onFaq` in StatusPage render
- Modify: `frontend/src/pages/StatusPage.tsx` — change `onFaq` handler from `'next'` to `'faq'`

**Task 2 — CountryCard:**
- Create: `frontend/src/components/CountryCard.tsx` — card showing flag, name, cost, cities
- Modify: `frontend/src/pages/StatusPage.tsx` — render CountryCard after HeroCard

**Task 3 — Timezone-aware notifications:**
- Create: `supabase/migrations/008_users_timezone.sql` — add `timezone` text column to `users`
- Modify: `frontend/src/lib/supabase.ts` — add `updateUserTimezone(userId, tz)` helper
- Modify: `frontend/src/hooks/useUser.ts` — detect and persist timezone after user row created
- Modify: `bot/scheduler.ts` — hourly cron, filter entries by user's local hour = 10

---

## Task 1: FAQ Page

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/pages/FAQPage.tsx`
- Modify: `frontend/src/components/BottomNav.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/StatusPage.tsx`

- [ ] **Step 1: Add 'faq' to Screen type**

In `frontend/src/types/index.ts`, change:
```typescript
export type Screen = 'status' | 'schemes' | 'next'
```
to:
```typescript
export type Screen = 'status' | 'schemes' | 'next' | 'faq'
```

- [ ] **Step 2: Verify TypeScript still compiles after type change**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors mentioning `'faq'` not handled in switches — that's fine, we'll fix them next.

- [ ] **Step 3: Create FAQPage.tsx**

Create `frontend/src/pages/FAQPage.tsx` with this full content:

```typescript
import { useState } from 'react'
import { ChevronDown, Loader2, HelpCircle } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const FAQ_SYSTEM = `Ты — ассистент приложения Overstay для digital nomads в ЮВА (Юго-Восточная Азия).
Отвечай на русском, кратко и по делу (2-5 предложений).
Не давай юридических советов — направляй уточнять в консульстве.
Если вопрос не про визы или поездки — вежливо верни к теме.`

const QUESTIONS: string[] = [
  'Как сделать визаран из Таиланда?',
  'Что такое DTV в Таиланде и как его получить?',
  'Сколько дней дают по e-visa во Вьетнам и можно ли продлить?',
  'Можно ли жить в ЮВА годами без оформления долгосрочной визы?',
  'Что делать, если виза истекает через 3 дня?',
  'Какая страна ЮВА самая дешёвая для жизни?',
  'Как рассчитать, сколько дней я провёл в Таиланде за год?',
  'Нужна ли RU паспорту виза в Корею?',
]

async function askProxy(question: string): Promise<string> {
  const prompt = `${FAQ_SYSTEM}\n\nВопрос: ${question}`
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  })
  if (!res.ok) throw new Error(`ai-proxy ${res.status}`)
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Не удалось получить ответ.'
}

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string>>({})

  const handleToggle = async (i: number) => {
    if (open === i) { setOpen(null); return }
    setOpen(i)
    if (answers[i] !== undefined) return
    setLoading(i)
    setErrors(prev => { const n = { ...prev }; delete n[i]; return n })
    try {
      const text = await askProxy(QUESTIONS[i])
      setAnswers(prev => ({ ...prev, [i]: text }))
    } catch {
      setErrors(prev => ({ ...prev, [i]: 'Ошибка соединения. Проверь интернет и попробуй ещё раз.' }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 mt-4 mb-4"
        style={{ animation: 'cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <HelpCircle size={16} strokeWidth={1.5} style={{ color: 'var(--text3)' }} />
        <div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text1)' }}>
            FAQ
          </div>
          <div className="font-mono text-[9px]" style={{ color: 'var(--text4)', letterSpacing: '0.08em' }}>
            Частые вопросы · AI отвечает
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-2">
        {QUESTIONS.map((q, i) => {
          const isOpen = open === i
          const isLoading = loading === i
          const answer = answers[i]
          const error = errors[i]

          return (
            <div
              key={i}
              className="border rounded-[12px] overflow-hidden"
              style={{
                background: 'var(--bg2)',
                borderColor: isOpen ? 'var(--text4)' : 'var(--border)',
                animation: `cardIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both`,
                transition: 'border-color 0.15s',
              }}
            >
              <button
                onClick={() => handleToggle(i)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3 active:opacity-70 transition-opacity"
              >
                <span className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text1)' }}>
                  {q}
                </span>
                <ChevronDown
                  size={15}
                  strokeWidth={1.5}
                  style={{
                    color: 'var(--text3)',
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {isOpen && (
                <div
                  className="px-4 pb-4 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {isLoading && (
                    <div className="flex items-center gap-2 pt-3">
                      <Loader2 size={13} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--text3)' }} />
                      <span className="font-mono text-[10px]" style={{ color: 'var(--text3)' }}>
                        Думаю...
                      </span>
                    </div>
                  )}
                  {error && !isLoading && (
                    <div
                      className="mt-3 px-3 py-2 rounded-[8px] font-mono text-[10px]"
                      style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}
                    >
                      {error}
                    </div>
                  )}
                  {answer && !isLoading && (
                    <div
                      className="mt-3 text-[13px] leading-relaxed"
                      style={{ color: 'var(--text2)' }}
                    >
                      {answer}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add FAQ tab to BottomNav**

In `frontend/src/components/BottomNav.tsx`, change:
```typescript
import { LayoutGrid, ArrowLeftRight, CircleArrowRight } from 'lucide-react'
import type { Screen } from '@/types'

const tabs: Array<{ id: Screen; label: string; icon: typeof LayoutGrid }> = [
  { id: 'status', label: 'Статус', icon: LayoutGrid },
  { id: 'schemes', label: 'Схемы', icon: ArrowLeftRight },
  { id: 'next', label: 'Дальше', icon: CircleArrowRight },
]
```
to:
```typescript
import { LayoutGrid, ArrowLeftRight, CircleArrowRight, HelpCircle } from 'lucide-react'
import type { Screen } from '@/types'

const tabs: Array<{ id: Screen; label: string; icon: typeof LayoutGrid }> = [
  { id: 'status', label: 'Статус', icon: LayoutGrid },
  { id: 'schemes', label: 'Схемы', icon: ArrowLeftRight },
  { id: 'next', label: 'Дальше', icon: CircleArrowRight },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
]
```

- [ ] **Step 5: Update App.tsx to route FAQ screen**

In `frontend/src/App.tsx`, make these three changes:

**5a. Add import:**
```typescript
import FAQPage from '@/pages/FAQPage'
```
(Add after the other page imports: `import NextPage from '@/pages/NextPage'`)

**5b. Add 'faq' to SCREEN_TITLES:**
```typescript
const SCREEN_TITLES: Record<Screen, string> = {
  status: 'Overstay',
  schemes: 'Схемы',
  next: 'Дальше',
  faq: 'FAQ',
}
```

**5c. Add FAQPage render in the screen routing block.** Find the block:
```typescript
{screen === 'next' && <NextPage onNavigate={setScreen} entries={sorted} passport={passport} />}
```
Add after it:
```typescript
{screen === 'faq' && <FAQPage />}
```

- [ ] **Step 6: Update StatusPage — FAQ button navigates to 'faq'**

In `frontend/src/pages/StatusPage.tsx`, change:
```typescript
<ActionGrid onFaq={() => onNavigate('next')} onStamp={onStamp} onPdf={onPdf} />
```
to:
```typescript
<ActionGrid onFaq={() => onNavigate('faq')} onStamp={onStamp} onPdf={onPdf} />
```

- [ ] **Step 7: Build and verify no TypeScript errors**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app/frontend
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 8: Commit**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
git add frontend/src/types/index.ts frontend/src/pages/FAQPage.tsx frontend/src/components/BottomNav.tsx frontend/src/App.tsx frontend/src/pages/StatusPage.tsx
git commit -m "feat(frontend): FAQ page with ai-proxy answers + 4th nav tab"
```

---

## Task 2: CountryCard on StatusPage

**Files:**
- Create: `frontend/src/components/CountryCard.tsx`
- Modify: `frontend/src/pages/StatusPage.tsx`

- [ ] **Step 1: Create CountryCard.tsx**

Create `frontend/src/components/CountryCard.tsx`:

```typescript
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/types'
import { COUNTRY_DATA } from '@/lib/visaRules'

interface Props {
  countryCode: string
}

export default function CountryCard({ countryCode }: Props) {
  const data = COUNTRY_DATA[countryCode]
  if (!data) return null

  const flag = COUNTRY_FLAGS[countryCode] ?? '🏳️'
  const name = COUNTRY_NAMES[countryCode] ?? countryCode

  return (
    <div
      className="border rounded-[12px] mb-3 overflow-hidden"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both',
      }}
    >
      {/* Country header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="text-2xl" aria-hidden="true">{flag}</span>
        <div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text1)' }}>
            {name}
          </div>
          <div className="font-mono text-[9px] mt-px" style={{ color: 'var(--text3)', letterSpacing: '0.04em' }}>
            Текущая страна пребывания
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2">
        <div
          className="px-4 py-3 border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="font-mono text-[9px] uppercase mb-1" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
            Стоимость жизни
          </div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text1)' }}>
            {data.cost_of_living_usd}
          </div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--text3)' }}>
            в месяц
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="font-mono text-[9px] uppercase mb-1" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>
            Популярные города
          </div>
          <div className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text1)' }}>
            {data.cities}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add CountryCard to StatusPage**

In `frontend/src/pages/StatusPage.tsx`, add the import:
```typescript
import CountryCard from '@/components/CountryCard'
```

Then in the JSX, find this block:
```typescript
{current ? (
  <>
    <HeroCard entry={current} stats={stats} onClick={() => onEntryClick(current)} />
    <AlertStrip entry={current} />
  </>
) : (
  <EmptyState onAdd={onStamp} />
)}
```

Change it to:
```typescript
{current ? (
  <>
    <HeroCard entry={current} stats={stats} onClick={() => onEntryClick(current)} />
    <AlertStrip entry={current} />
    <CountryCard countryCode={current.country} />
  </>
) : (
  <EmptyState onAdd={onStamp} />
)}
```

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app/frontend
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
git add frontend/src/components/CountryCard.tsx frontend/src/pages/StatusPage.tsx
git commit -m "feat(frontend): CountryCard with cost of living + cities on StatusPage"
```

---

## Task 3: Timezone-aware Bot Notifications

**Files:**
- Create: `supabase/migrations/008_users_timezone.sql`
- Modify: `frontend/src/lib/supabase.ts`
- Modify: `frontend/src/hooks/useUser.ts`
- Modify: `bot/scheduler.ts`

- [ ] **Step 1: Create migration 008**

Create `supabase/migrations/008_users_timezone.sql`:

```sql
-- Migration 008: add timezone column to users for locale-aware notifications
-- Stores IANA timezone string (e.g. 'Asia/Bangkok', 'Europe/Moscow').
-- Defaults to 'UTC' so existing users still get reminders at 10:00 UTC.
-- The bot scheduler reads this to send reminders at 10:00 in the user's
-- local time instead of a fixed UTC sweep.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
```

- [ ] **Step 2: Apply migration to remote**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
supabase db push
```

Expected output: `Applying migration 008_users_timezone.sql...`

If it fails with "already exists" check with `supabase migration list` — if 008 is listed as "pending" just re-run `supabase db push`.

- [ ] **Step 3: Add updateUserTimezone to supabase.ts**

In `frontend/src/lib/supabase.ts`, add this function at the end of the file:

```typescript
export async function updateUserTimezone(userId: string, timezone: string): Promise<void> {
  if (!isUuid(userId)) return
  const { error } = await supabase
    .from('users')
    .update({ timezone })
    .eq('id', userId)
  if (error) {
    console.warn('[supabase] updateUserTimezone failed:', error.message)
  }
}
```

- [ ] **Step 4: Detect and save timezone in useUser.ts**

In `frontend/src/hooks/useUser.ts`:

**4a. Add import:**
```typescript
import { getOrCreateUser, setTelegramContext, updateUserTimezone } from '@/lib/supabase'
```

**4b. In the `init()` function, add timezone save after `getOrCreateUser()` call.** Change:
```typescript
await setTelegramContext(telegramId)
const u = await getOrCreateUser(telegramId, passportCountry)
setUser(u)
setLoading(false)
```
to:
```typescript
await setTelegramContext(telegramId)
const u = await getOrCreateUser(telegramId, passportCountry)
setUser(u)
setLoading(false)
// Persist user's IANA timezone so the bot can send reminders at local 10:00.
// Fire-and-forget: failure doesn't affect app UX.
if (u?.id) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  void updateUserTimezone(u.id, tz)
}
```

- [ ] **Step 5: Build frontend and verify no TypeScript errors**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app/frontend
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 6: Commit frontend timezone changes**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
git add supabase/migrations/008_users_timezone.sql frontend/src/lib/supabase.ts frontend/src/hooks/useUser.ts
git commit -m "feat(frontend): detect and persist user timezone for bot notifications"
```

- [ ] **Step 7: Update bot scheduler to hourly + timezone-aware**

In `bot/scheduler.ts`, replace the `startScheduler` function and the `runDeadlineSweep` function with the following. Find this in the file:

```typescript
/** Cron sweep: DMs every user whose days_left is in [1, 14]. */
export async function runDeadlineSweep(bot: Telegraf, supabase: SupabaseClient) {
  console.log('[scheduler] deadline sweep starting at', new Date().toISOString())

  const { data: expiring, error } = await supabase
    .from('visa_entries_with_deadline')
    .select('*, users(telegram_id, passport_country)')
    .gte('days_left', 1)
    .lte('days_left', 14)

  if (error) {
    console.error('[scheduler] supabase query failed:', error)
    return
  }

  console.log(`[scheduler] found ${expiring?.length ?? 0} entries in 1..14d window`)

  for (const entry of expiring ?? []) {
    const tid: number | undefined = (entry as any).users?.telegram_id
    const passport: string | undefined = (entry as any).users?.passport_country
    if (!tid || !passport) {
      console.warn('[scheduler] entry without user info, skipping', entry)
      continue
    }
    const schemes = await topSchemesFor(supabase, passport, entry.country)
    const msg = formatReminderMessage(entry, entry.days_left, schemes)
    try {
      await bot.telegram.sendMessage(tid, msg, { parse_mode: 'HTML' })
      console.log(`[scheduler] sent reminder to ${tid} (${entry.country}, ${entry.days_left}d)`)
    } catch (e) {
      console.error(`[scheduler] send to ${tid} failed:`, e)
    }
  }
}
```

Replace with:

```typescript
/** Returns the local hour (0-23) for a given IANA timezone at the current moment. */
function localHourFor(tz: string): number {
  try {
    return parseInt(
      new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: tz }).format(new Date()),
      10
    )
  } catch {
    // Unknown timezone string — fall back to UTC
    return new Date().getUTCHours()
  }
}

/**
 * Cron sweep: DMs every user whose days_left is in [1, 14] AND whose local
 * time is 10:xx. Runs every hour. Users with unknown/default timezone (UTC)
 * get their reminder at 10:00 UTC, matching the old behaviour.
 */
export async function runDeadlineSweep(bot: Telegraf, supabase: SupabaseClient) {
  console.log('[scheduler] deadline sweep starting at', new Date().toISOString())

  const { data: expiring, error } = await supabase
    .from('visa_entries_with_deadline')
    .select('*, users(telegram_id, passport_country, timezone)')
    .gte('days_left', 1)
    .lte('days_left', 14)

  if (error) {
    console.error('[scheduler] supabase query failed:', error)
    return
  }

  console.log(`[scheduler] found ${expiring?.length ?? 0} entries in 1..14d window`)

  for (const entry of expiring ?? []) {
    const tid: number | undefined = (entry as any).users?.telegram_id
    const passport: string | undefined = (entry as any).users?.passport_country
    const tz: string = (entry as any).users?.timezone ?? 'UTC'
    if (!tid || !passport) {
      console.warn('[scheduler] entry without user info, skipping', entry)
      continue
    }
    // Only send when it's 10:xx in the user's local timezone.
    if (localHourFor(tz) !== 10) continue
    const schemes = await topSchemesFor(supabase, passport, entry.country)
    const msg = formatReminderMessage(entry, entry.days_left, schemes)
    try {
      await bot.telegram.sendMessage(tid, msg, { parse_mode: 'HTML' })
      console.log(`[scheduler] sent reminder to ${tid} (${entry.country}, ${entry.days_left}d, tz=${tz})`)
    } catch (e) {
      console.error(`[scheduler] send to ${tid} failed:`, e)
    }
  }
}
```

Then replace `startScheduler`:

```typescript
export function startScheduler(bot: Telegraf) {
  const supabase = getSupabase()
  // Runs every hour. Inside runDeadlineSweep we filter by user's local hour = 10
  // so each user gets their reminder at 10:00 in their own timezone.
  cron.schedule('0 * * * *', () => {
    void runDeadlineSweep(bot, supabase)
  })
}
```

- [ ] **Step 8: Verify bot TypeScript compiles**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app/bot
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 9: Commit bot scheduler changes**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
git add bot/scheduler.ts
git commit -m "feat(bot): timezone-aware notifications — hourly sweep at user's local 10:00"
```

---

## Self-Review

**Spec coverage check:**
- FAQ страница with 6-8 preset questions + AI answers via ai-proxy ✅ (Task 1, 8 questions, ai-proxy call)
- New nav item for FAQ ✅ (Task 1 Step 4, 4th BottomNav tab)
- City Card: flag + country name + cost of living + top 3 cities ✅ (Task 2, CountryCard.tsx)
- Timezone-aware notifications ✅ (Task 3, hourly cron + localHourFor filter)
- FAQ ActionGrid button navigates to 'faq' ✅ (Task 1 Step 6)
- No user API key required for FAQ ✅ (ai-proxy uses server-side GEMINI_API_KEY)

**Placeholder scan:** No TBDs, all code blocks complete.

**Type consistency:** 
- `Screen` union extended with `'faq'` in Task 1 Step 1
- `countryCode: string` in CountryCard matches `current.country: string` from VisaEntry
- `updateUserTimezone(u.id, tz)` — `u.id` is `string`, matches `userId: string` param
- `users(telegram_id, passport_country, timezone)` in bot query — `timezone` column added in migration 008
