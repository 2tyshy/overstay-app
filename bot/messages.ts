export function formatReminderMessage(entry: any, daysLeft: number, schemes: any[]): string {
  const emoji = daysLeft <= 7 ? '🔴' : '🟡'
  const flag = getFlag(entry.country)

  let msg = `${emoji} <b>Осталось ${daysLeft} ${pluralDays(daysLeft)} в ${flag}</b>\n\n`
  msg += `Дедлайн: <b>${entry.deadline}</b>\n\n`

  if (schemes.length > 0) {
    msg += `🗺 <b>Топ схемы для визарана:</b>\n\n`
    schemes.forEach((s: any, i: number) => {
      const to = getFlag(s.to_country)
      const cost = s.cost_usd ? `~$${s.cost_usd}` : ''
      const time = s.duration_hours ? `~${s.duration_hours}ч` : ''
      msg += `${i + 1}. ${flag}→${to} ${s.border_crossing ?? ''} ${cost} ${time}\n`
      msg += `   ✅ ${s.works_count} подтверждений\n\n`
    })
  }

  return msg
}

function pluralDays(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня'
  return 'дней'
}

function getFlag(country: string): string {
  const flags: Record<string, string> = {
    VN: '🇻🇳', TH: '🇹🇭', KH: '🇰🇭', LA: '🇱🇦',
    MY: '🇲🇾', ID: '🇮🇩', PH: '🇵🇭', KR: '🇰🇷',
  }
  return flags[country] ?? country
}
