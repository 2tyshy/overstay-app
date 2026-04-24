import cron from 'node-cron'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Telegraf } from 'telegraf'
import { formatReminderMessage, formatStatusMessage } from './messages'

/**
 * Notification service for Overstay. Two entry points:
 *
 *   1. `startScheduler(bot)` — registers the daily cron that sweeps all users
 *      whose next visa deadline is 1..14 days away and DMs them a reminder.
 *   2. `createUserChecker(bot)` — returns a per-user checker bound to /check,
 *      which lets a user ping the bot on demand to see the current state of
 *      their visa entries, even if the deadline is far away. Handy for
 *      debugging the wire-up end-to-end without waiting for 10:00 UTC.
 *
 * Both paths share `topSchemesFor` + `messages.ts` formatters so the body of
 * a cron reminder and a /check reply stay visually consistent.
 *
 * We use the Supabase SERVICE role key here, which bypasses RLS — required
 * because the bot needs to read across all users, and there is no Supabase
 * auth session to key policies off. NEVER import this file from the frontend.
 */

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in bot env')
  }
  return createClient(url, key)
}

async function topSchemesFor(supabase: SupabaseClient, passport: string, fromCountry: string) {
  const { data, error } = await supabase
    .from('schemes')
    .select('*')
    .eq('passport', passport)
    .eq('from_country', fromCountry)
    .order('works_count', { ascending: false })
    .limit(3)
  if (error) {
    console.error('[schemes] lookup failed:', error)
    return []
  }
  return data ?? []
}

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

/**
 * Per-user manual status check. Replies to `telegramId` with all their
 * active visa entries (days_left >= 0), sorted by urgency. For entries
 * within 14 days, includes the top-3 relevant schemes; for farther entries
 * just shows the deadline without scheme spam.
 *
 * If the user has no row in `users` (e.g. they've never opened the app),
 * we reply with a hint rather than silently failing.
 */
export async function checkUserStatus(bot: Telegraf, supabase: SupabaseClient, telegramId: number) {
  console.log(`[check] start telegramId=${telegramId}`)
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, passport_country')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (userErr) {
    console.error('[check] user lookup failed:', userErr)
    await bot.telegram.sendMessage(telegramId, 'Упс, не смог прочитать базу. Напиши автору.')
    return
  }
  if (!user) {
    // Front-end registration via `useUser` is unreliable today: `set_config`
    // ('app.telegram_id', …) does not persist across Supabase HTTP requests
    // (PgBouncer transaction mode), so the subsequent INSERT into `users` is
    // blocked by the `users_own` RLS policy and fails silently. Rather than
    // leaving the user stuck, offer a quick self-registration here — the bot
    // runs under the service_role key, so it can INSERT regardless of RLS.
    await bot.telegram.sendMessage(
      telegramId,
      'Не вижу тебя в базе. Выбери свой паспорт — запишу и покажу статус:',
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🇷🇺 RU', callback_data: 'register:RU' },
            { text: '🇺🇦 UA', callback_data: 'register:UA' },
            { text: '🇰🇿 KZ', callback_data: 'register:KZ' },
          ]],
        },
      }
    )
    return
  }

  const { data: entries, error } = await supabase
    .from('visa_entries_with_deadline')
    .select('*')
    .eq('user_id', user.id)
    .gte('days_left', 0)
    .order('days_left', { ascending: true })

  if (error) {
    console.error('[check] entries query failed:', error)
    await bot.telegram.sendMessage(telegramId, 'Упс, не смог прочитать базу. Напиши автору.')
    return
  }

  if (!entries || entries.length === 0) {
    await bot.telegram.sendMessage(
      telegramId,
      'Активных виз нет. Открой приложение и добавь штамп въезда.'
    )
    return
  }

  const parts: string[] = []
  for (const e of entries) {
    const schemes = e.days_left <= 14
      ? await topSchemesFor(supabase, user.passport_country, e.country)
      : []
    parts.push(formatStatusMessage(e, e.days_left, schemes))
  }

  try {
    await bot.telegram.sendMessage(telegramId, parts.join('\n\n———\n\n'), { parse_mode: 'HTML' })
  } catch (e) {
    console.error(`[check] send to ${telegramId} failed:`, e)
  }
}

export function startScheduler(bot: Telegraf) {
  const supabase = getSupabase()
  // 10:00 UTC daily. Railway runs on UTC. If we want to shift to a specific
  // local time window for users, we'd need timezones per user — deferred.
  cron.schedule('0 10 * * *', () => {
    void runDeadlineSweep(bot, supabase)
  })
}

export type Passport = 'RU' | 'UA' | 'KZ'

/**
 * Upsert a `users` row for this telegram_id with the chosen passport.
 * Upsert (not plain insert) so a user tapping a different passport button
 * after a first mistake just updates the existing row.
 */
export async function registerUser(
  supabase: SupabaseClient,
  telegramId: number,
  passport: Passport
): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .upsert(
      { telegram_id: telegramId, passport_country: passport },
      { onConflict: 'telegram_id' }
    )
  if (error) {
    console.error('[register] upsert failed:', error)
    return false
  }
  console.log(`[register] ok telegramId=${telegramId} passport=${passport}`)
  return true
}

/**
 * Bundles all Supabase-backed bot actions behind one factory so index.ts
 * doesn't need its own Supabase client. `check` runs the per-user status
 * report; `register` upserts a users row after an inline-keyboard tap.
 */
export function createBotActions(bot: Telegraf) {
  const supabase = getSupabase()
  return {
    check: (telegramId: number) => checkUserStatus(bot, supabase, telegramId),
    register: (telegramId: number, passport: Passport) => registerUser(supabase, telegramId, passport),
  }
}
