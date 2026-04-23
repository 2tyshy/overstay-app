import * as TwaSdk from '@twa-dev/sdk'

// See note in main.tsx — the SDK's default/namespace export shape depends on
// bundler CJS interop, so normalise here once.
const WebApp: any = (TwaSdk as any).default ?? TwaSdk

export function getTelegramUser() {
  return WebApp?.initDataUnsafe?.user
}

export function getTelegramId(): number | null {
  return WebApp?.initDataUnsafe?.user?.id ?? null
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  try { WebApp?.HapticFeedback?.impactOccurred?.(type) } catch { /* not in Telegram */ }
}
