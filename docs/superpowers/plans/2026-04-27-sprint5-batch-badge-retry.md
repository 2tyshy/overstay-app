# Sprint 5: Batching, Relevance Badge, Bot Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three independent improvements — batch bot notifications per user, show 🔥 badge on scheme cards for the current country, and add exponential-backoff retry to Supabase calls in the bot.

**Architecture:**
- Task 1 (batching): purely in `bot/scheduler.ts` — group the flat `expiring` array by `telegram_id`, then emit one message per user instead of one per visa entry.
- Task 2 (badge): prop drilling from `App.tsx` → `SchemesPage.tsx` → `SchemeCard.tsx`; no new files, no state changes.
- Task 3 (retry): add a `withRetry<T>()` helper at the top of `bot/scheduler.ts`, wrap the two Supabase query sites.

**Tech Stack:** TypeScript, Telegraf.js, Supabase JS client, React + TypeScript

---

### Task 1: Batch bot notifications — one message per user per sweep

**Files:**
- Modify: `bot/messages.ts`
- Modify: `bot/scheduler.ts`

Current `runDeadlineSweep` emits one `sendMessage` per visa entry. A user with 3 expiring visas gets 3 DMs in rapid succession. This task groups entries by `telegram_id` first, then sends one combined message.

- [ ] **Step 1: Add `formatBatchReminderMessage` to `bot/messages.ts`**

  Open `bot/messages.ts`. After the closing brace of `formatReminderMessage`, add:

  ```typescript
  /**
   * Combines multiple expiring entries into one message for a single user.
   * Each entry block is separated by a divider line.
   */
  export function formatBatchReminderMessage(
    entries: Array<{ entry: any; daysLeft: number; schemes: any[] }>
  ): string {
    return entries
      .map(({ entry, daysLeft, schemes }) => formatReminderMessage(entry, daysLeft, schemes))
      .join('\n———\n\n')
  }
  ```

- [ ] **Step 2: Verify types compile**

  ```bash
  cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
  npx tsc --noEmit -p bot/tsconfig.json 2>&1 | head -20
  ```

  Expected: no errors (or only pre-existing errors unrelated to messages.ts).

- [ ] **Step 3: Rewrite `runDeadlineSweep` in `bot/scheduler.ts`**

  Replace the current `runDeadlineSweep` function (lines 62–97) with:

  ```typescript
  /** Cron sweep: DMs every user whose days_left is in [1, 14]. */
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

    // Filter by local hour first, then group by telegram_id so each user gets
    // one DM even when they have multiple expiring visas.
    type UserBucket = {
      tid: number
      passport: string
      items: Array<{ entry: any; daysLeft: number; schemes: any[] }>
    }
    const byUser = new Map<number, UserBucket>()

    for (const entry of expiring ?? []) {
      const tid: number | undefined = (entry as any).users?.telegram_id
      const passport: string | undefined = (entry as any).users?.passport_country
      const tz: string = (entry as any).users?.timezone ?? 'UTC'
      if (!tid || !passport) {
        console.warn('[scheduler] entry without user info, skipping', entry)
        continue
      }
      if (localHourFor(tz) !== 10) continue

      if (!byUser.has(tid)) byUser.set(tid, { tid, passport, items: [] })
      const schemes = await topSchemesFor(supabase, passport, entry.country)
      byUser.get(tid)!.items.push({ entry, daysLeft: entry.days_left, schemes })
    }

    console.log(`[scheduler] sending to ${byUser.size} users`)

    for (const { tid, items } of byUser.values()) {
      const msg = formatBatchReminderMessage(items)
      try {
        await bot.telegram.sendMessage(tid, msg, { parse_mode: 'HTML' })
        console.log(`[scheduler] sent batch (${items.length} entries) to ${tid}`)
      } catch (e) {
        console.error(`[scheduler] send to ${tid} failed:`, e)
      }
    }
  }
  ```

  Also add the import at the top of `bot/scheduler.ts` where other imports from `./messages` are:

  ```typescript
  import { formatBatchReminderMessage, formatReminderMessage, formatStatusMessage } from './messages'
  ```

  (replace the existing import line)

- [ ] **Step 4: Verify types compile**

  ```bash
  npx tsc --noEmit -p bot/tsconfig.json 2>&1 | head -20
  ```

  Expected: no new errors.

- [ ] **Step 5: Commit**

  ```bash
  git add bot/messages.ts bot/scheduler.ts
  git commit -m "feat(bot): batch per-user notifications — one DM per sweep instead of one per visa"
  ```

---

### Task 2: Scheme relevance badge 🔥 for current country

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/SchemesPage.tsx`
- Modify: `frontend/src/components/SchemeCard.tsx`

When the user's current (most urgent) visa entry is for country X, schemes with `from_country === X` get a 🔥 badge — they're immediately actionable.

- [ ] **Step 1: Add `currentCountry` prop to `SchemesPage`**

  Open `frontend/src/pages/SchemesPage.tsx`. Change the `Props` interface (lines 12–14):

  ```typescript
  interface Props {
    passport: PassportCountry
    currentCountry?: string
  }
  ```

  Change the function signature (line 16):

  ```typescript
  export default function SchemesPage({ passport, currentCountry }: Props) {
  ```

  In the `filteredSchemes.map(...)` call (around line 165), pass the prop to `SchemeCard`:

  ```tsx
  <SchemeCard
    key={scheme.id}
    scheme={scheme}
    index={i}
    userVote={votes[scheme.id] ?? null}
    onVote={(id, v) => { vote(id, v).catch(() => { /* ignore — hook refetches */ }) }}
    onEdit={handleEdit}
    onDelete={handleDelete}
    userId={userId}
    commentCount={commentCounts[scheme.id] ?? 0}
    currentCountry={currentCountry}
  />
  ```

- [ ] **Step 2: Add `currentCountry` prop to `SchemeCard` and render badge**

  Open `frontend/src/components/SchemeCard.tsx`. Change the `Props` interface (lines 6–15):

  ```typescript
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
  ```

  Change the function signature (line 17):

  ```typescript
  export default function SchemeCard({ scheme, index, userVote, onVote, onEdit, onDelete, userId, commentCount = 0, currentCountry }: Props) {
  ```

  In the card header `div` (the `flex items-center justify-between` row, around line 35), add the 🔥 badge next to the route flags:

  ```tsx
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
  ```

- [ ] **Step 3: Wire `currentCountry` from `App.tsx` to `SchemesPage`**

  Open `frontend/src/App.tsx`. Find the `{screen === 'schemes' && <SchemesPage passport={passport} />}` line (around line 308). Replace it with:

  ```tsx
  {screen === 'schemes' && <SchemesPage passport={passport} currentCountry={sorted[0]?.country} />}
  ```

  `sorted[0]` is the most urgent active visa entry (already computed via `useMemo`). Its `.country` is the ISO code (e.g. `'TH'`). When the user has no entries, `sorted[0]` is `undefined` and `currentCountry` is `undefined`, so no badge is shown — correct.

- [ ] **Step 4: TypeScript check**

  ```bash
  cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app/frontend
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: no new errors.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/App.tsx frontend/src/pages/SchemesPage.tsx frontend/src/components/SchemeCard.tsx
  git commit -m "feat(frontend): 🔥 badge on scheme cards matching current visa country"
  ```

---

### Task 3: Offline-first bot — exponential backoff retry on Supabase errors

**Files:**
- Modify: `bot/scheduler.ts`

Two Supabase query sites in the bot can fail transiently (Supabase cold start, network blip). We add a `withRetry<T>()` helper and wrap both sites.

- [ ] **Step 1: Add `withRetry` helper to `bot/scheduler.ts`**

  After the `getSupabase()` function (around line 31), add:

  ```typescript
  /**
   * Retries `fn` up to `retries` times with exponential backoff.
   * Throws the last error if all attempts fail.
   */
  async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 2000): Promise<T> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (e) {
        lastErr = e
        if (attempt < retries) {
          const delay = baseDelayMs * Math.pow(2, attempt)
          console.warn(`[retry] attempt ${attempt + 1} failed, retrying in ${delay}ms:`, e)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }
    throw lastErr
  }
  ```

- [ ] **Step 2: Wrap the Supabase query in `runDeadlineSweep`**

  In `runDeadlineSweep`, the query currently starts with `const { data: expiring, error } = await supabase...`. Replace the query block with:

  ```typescript
  let expiring: any[] | null = null
  let error: any = null
  try {
    const result = await withRetry(() =>
      supabase
        .from('visa_entries_with_deadline')
        .select('*, users(telegram_id, passport_country, timezone)')
        .gte('days_left', 1)
        .lte('days_left', 14)
    )
    expiring = result.data
    error = result.error
  } catch (retryErr) {
    console.error('[scheduler] supabase query failed after retries:', retryErr)
    return
  }

  if (error) {
    console.error('[scheduler] supabase query failed:', error)
    return
  }
  ```

- [ ] **Step 3: Wrap the Supabase query in `checkUserStatus`**

  In `checkUserStatus`, wrap the user lookup:

  ```typescript
  let user: any = null
  let userErr: any = null
  try {
    const result = await withRetry(() =>
      supabase
        .from('users')
        .select('id, passport_country')
        .eq('telegram_id', telegramId)
        .maybeSingle()
    )
    user = result.data
    userErr = result.error
  } catch (retryErr) {
    console.error('[check] user lookup failed after retries:', retryErr)
    await bot.telegram.sendMessage(telegramId, 'Упс, не смог прочитать базу. Напиши автору.')
    return
  }

  if (userErr) {
    console.error('[check] user lookup failed:', userErr)
    await bot.telegram.sendMessage(telegramId, 'Упс, не смог прочитать базу. Напиши автору.')
    return
  }
  ```

  Then wrap the entries query inside `checkUserStatus` similarly:

  ```typescript
  let entries: any[] | null = null
  let entriesError: any = null
  try {
    const result = await withRetry(() =>
      supabase
        .from('visa_entries_with_deadline')
        .select('*')
        .eq('user_id', user.id)
        .gte('days_left', 0)
        .order('days_left', { ascending: true })
    )
    entries = result.data
    entriesError = result.error
  } catch (retryErr) {
    console.error('[check] entries query failed after retries:', retryErr)
    await bot.telegram.sendMessage(telegramId, 'Упс, не смог прочитать базу. Напиши автору.')
    return
  }

  if (entriesError) {
    console.error('[check] entries query failed:', entriesError)
    await bot.telegram.sendMessage(telegramId, 'Упс, не смог прочитать базу. Напиши автору.')
    return
  }
  ```

- [ ] **Step 4: TypeScript check**

  ```bash
  cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
  npx tsc --noEmit -p bot/tsconfig.json 2>&1 | head -20
  ```

  Expected: no new errors.

- [ ] **Step 5: Commit**

  ```bash
  git add bot/scheduler.ts
  git commit -m "feat(bot): exponential-backoff retry on Supabase queries (offline-first)"
  ```

---

## After All Tasks

```bash
git push origin main
```

Verify on Railway that the bot redeploys cleanly (check logs for `[scheduler] deadline sweep starting at`).
