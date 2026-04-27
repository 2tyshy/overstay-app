import { Telegraf, Markup } from 'telegraf'
import dotenv from 'dotenv'
import { startScheduler, createBotActions } from './scheduler'

dotenv.config()

const { BOT_TOKEN, FRONTEND_URL } = process.env
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required')
if (!FRONTEND_URL) throw new Error('FRONTEND_URL is required')

const bot = new Telegraf(BOT_TOKEN)

bot.catch((err, ctx) => {
  console.error(`[bot] error in update ${ctx.updateType}:`, err)
})

bot.command('start', async (ctx) => {
  const firstName = ctx.from?.first_name ?? 'номад'
  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nOverstay — трекер виз для номадов в ЮВА.\nОтслеживай дедлайны, находи схемы визаранов, спрашивай AI.\n\nКоманды:\n/check — проверить статус своих виз прямо сейчас`,
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть Overstay', FRONTEND_URL)
    ])
  )
})

bot.command('status', async (ctx) => {
  await ctx.reply('Открой приложение для деталей',
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть', FRONTEND_URL)
    ])
  )
})

// All Supabase-backed actions share one client via this factory.
const actions = createBotActions(bot)

// /check runs the same DB query the cron does, but scoped to the caller.
// This lets users poke the bot on demand ("сколько мне осталось?") instead of
// waiting for the 10:00 UTC sweep, and doubles as a health-check during
// development: if /check answers, the whole Bot→Supabase→Telegram API path is
// working end-to-end.
bot.command('check', async (ctx) => {
  try {
    await actions.check(ctx.from.id)
  } catch (e) {
    console.error('[/check] failed:', e)
    await ctx.reply('Упс, что-то сломалось. Попробуй ещё раз через минуту.')
  }
})

// Inline-keyboard registration. `checkUserStatus` offers the three-passport
// picker when it can't find the caller in `users`; tapping a button fires
// `register:<RU|UA|KZ>`. We upsert the row via service-role (bypassing RLS —
// see scheduler.ts for the rationale) and then re-run /check so the user
// immediately sees their status (empty on first registration, prompting
// them to add a visa in the app).
bot.action(/^register:(RU|UA|KZ)$/, async (ctx) => {
  const passport = ctx.match[1] as 'RU' | 'UA' | 'KZ'
  const telegramId = ctx.from?.id
  if (!telegramId) {
    await ctx.answerCbQuery('Не удалось определить твой ID')
    return
  }
  await ctx.answerCbQuery(`Записал: ${passport}`)
  const ok = await actions.register(telegramId, passport)
  try {
    if (ok) {
      await ctx.editMessageText(
        `🗂 Паспорт <b>${passport}</b> сохранён. Открой приложение, добавь штамп въезда и возвращайся — /check покажет сколько осталось.`,
        { parse_mode: 'HTML' }
      )
      // Follow-up status — will usually say "Активных виз нет" on first reg.
      await actions.check(telegramId)
    } else {
      await ctx.editMessageText('Упс, не получилось сохранить. Попробуй ещё раз через минуту.')
    }
  } catch (e) {
    console.error('[register action] reply failed:', e)
  }
})

startScheduler(bot)

bot.launch().catch((err) => {
  console.error('[bot] launch failed:', err)
  process.exit(1)
})
console.log('Overstay bot started')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
