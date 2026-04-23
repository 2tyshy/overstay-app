import { Telegraf, Markup } from 'telegraf'
import dotenv from 'dotenv'
import { startScheduler, createUserChecker } from './scheduler'

dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN!)

bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name
  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nOverstay — трекер виз для номадов в ЮВА.\nОтслеживай дедлайны, находи схемы визаранов, спрашивай AI.\n\nКоманды:\n/check — проверить статус своих виз прямо сейчас`,
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть Overstay', process.env.FRONTEND_URL!)
    ])
  )
})

bot.command('status', async (ctx) => {
  await ctx.reply('Открой приложение для деталей',
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть', process.env.FRONTEND_URL!)
    ])
  )
})

// /check runs the same DB query the cron does, but scoped to the caller.
// This lets users poke the bot on demand ("сколько мне осталось?") instead of
// waiting for the 10:00 UTC sweep, and doubles as a health-check during
// development: if /check answers, the whole Bot→Supabase→Telegram API path is
// working end-to-end.
const checkUser = createUserChecker(bot)
bot.command('check', async (ctx) => {
  try {
    await checkUser(ctx.from.id)
  } catch (e) {
    console.error('[/check] failed:', e)
    await ctx.reply('Упс, что-то сломалось. Попробуй ещё раз через минуту.')
  }
})

startScheduler(bot)

bot.launch()
console.log('Overstay bot started')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
