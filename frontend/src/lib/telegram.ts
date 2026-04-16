import WebApp from '@twa-dev/sdk'

export function getTelegramUser() {
  return WebApp.initDataUnsafe?.user
}

export function getTelegramId(): number | null {
  return WebApp.initDataUnsafe?.user?.id ?? null
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  WebApp.HapticFeedback?.impactOccurred(type)
}
