import * as TwaSdk from '@twa-dev/sdk'

function getWebApp(): any {
  return (window as any)?.Telegram?.WebApp ?? (TwaSdk as any).default ?? TwaSdk
}

export function getTelegramUser() {
  return getWebApp()?.initDataUnsafe?.user
}

export function getTelegramId(): number | null {
  return getWebApp()?.initDataUnsafe?.user?.id ?? null
}

export function getTelegramInitData(): string | null {
  return getWebApp()?.initData ?? null
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  try { getWebApp()?.HapticFeedback?.impactOccurred?.(type) } catch { /* not in Telegram */ }
}
