import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export async function setTelegramContext(telegramId: number) {
  await supabase.rpc('set_config', {
    setting_name: 'app.telegram_id',
    setting_value: String(telegramId),
  })
}

export async function getOrCreateUser(telegramId: number, passportCountry: string) {
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) {
    const { data } = await supabase
      .from('users')
      .insert({ telegram_id: telegramId, passport_country: passportCountry })
      .select()
      .single()
    user = data
  }

  return user
}
