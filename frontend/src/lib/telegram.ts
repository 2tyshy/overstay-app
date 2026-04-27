import * as TwaSdk from '@twa-dev/sdk'

const WebApp: any = (TwaSdk as any).default ?? TwaSdk

export function getTelegramUser() {
  return WebApp?.initDataUnsafe?.user
}

export function getTelegramId(): number | null {
  return WebApp?.initDataUnsafe?.user?.id ?? null
}

export function getTelegramInitData(): string | null {
  return WebApp?.initData ?? null
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  try { WebApp?.HapticFeedback?.impactOccurred?.(type) } catch { /* not in Telegram */ }
}
