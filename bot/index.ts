import { Telegraf, Markup } from 'telegraf'
import dotenv from 'dotenv'
import { startScheduler } from './scheduler'

dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN!)

bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name
  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nOverstay — трекер виз для номадов в ЮВА.\nОтслеживай дедлайны, находи схемы визаранов, спрашивай AI.`,
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

startScheduler(bot)

bot.launch()
console.log('Overstay bot started')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
