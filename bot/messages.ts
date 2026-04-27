/**
 * Message formatters for bot outputs.
 *
 * `formatReminderMessage` is the cron reminder: short, urgent, includes top
 * schemes because the user hasn't asked — we're interrupting them, so we pay
 * for the interruption with value.
 *
 * `formatStatusMessage` is the /check reply: the user initiated, so we're
 * more generous — shows the visa_type and entry_date in addition to the
 * deadline, and only surfaces schemes if the deadline is actually near.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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
      msg += `${i + 1}. ${flag}→${to} ${escapeHtml(s.border_crossing ?? '')} ${cost} ${time}\n`
      msg += `   ✅ ${s.works_count} подтверждений\n\n`
    })
  }

  return msg
}

export function formatStatusMessage(entry: any, daysLeft: number, schemes: any[]): string {
  const flag = getFlag(entry.country)
  // Green when the deadline is comfortably far, yellow within 14d, red within 7d.
  const emoji = daysLeft <= 7 ? '🔴' : daysLeft <= 14 ? '🟡' : '🟢'

  let msg = `${emoji} <b>${flag} ${escapeHtml(entry.country)} · ${daysLeft} ${pluralDays(daysLeft)}</b> до дедлайна\n`
  msg += `Въезд: <code>${escapeHtml(entry.entry_date)}</code> · Виза: <code>${escapeHtml(entry.visa_type)}</code>\n`
  msg += `Выехать до: <b>${escapeHtml(entry.deadline)}</b>`

  if (schemes.length > 0) {
    msg += `\n\n🗺 <b>Топ схемы:</b>\n`
    schemes.forEach((s: any, i: number) => {
      const to = getFlag(s.to_country)
      const cost = s.cost_usd ? `~$${s.cost_usd}` : ''
      const time = s.duration_hours ? `~${s.duration_hours}ч` : ''
      msg += `${i + 1}. ${flag}→${to} ${escapeHtml(s.border_crossing ?? '')} ${cost} ${time}\n`
      msg += `   ✅ ${s.works_count} · ❌ ${s.broken_count}\n`
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

export function formatBatchReminderMessage(
  entries: Array<{ entry: any; daysLeft: number; schemes: any[] }>
): string {
  return entries
    .map(({ entry, daysLeft, schemes }) => formatReminderMessage(entry, daysLeft, schemes))
    .join('\n———\n\n')
}
