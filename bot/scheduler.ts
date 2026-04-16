import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { Telegraf } from 'telegraf'
import { formatReminderMessage } from './messages'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export function startScheduler(bot: Telegraf) {
  cron.schedule('0 10 * * *', async () => {
    console.log('Running visa deadline check...')

    const { data: expiring } = await supabase
      .from('visa_entries_with_deadline')
      .select('*, users(telegram_id, passport_country)')
      .gte('days_left', 1)
      .lte('days_left', 14)

    for (const entry of expiring ?? []) {
      const telegramId = (entry as any).users?.telegram_id
      if (!telegramId) continue

      const { data: schemes } = await supabase
        .from('schemes')
        .select('*')
        .eq('passport', (entry as any).users.passport_country)
        .eq('from_country', entry.country)
        .order('works_count', { ascending: false })
        .limit(3)

      const msg = formatReminderMessage(entry, entry.days_left, schemes ?? [])

      try {
        await bot.telegram.sendMessage(telegramId, msg, { parse_mode: 'HTML' })
      } catch (e) {
        console.error(`Failed to send to ${telegramId}:`, e)
      }
    }
  })
}
