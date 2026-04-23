import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as TwaSdk from '@twa-dev/sdk'
import './index.css'
import App from './App'

// @twa-dev/sdk is a CJS package; the "shape" of its default export depends on
// the bundler's CJS-interop and on package.json "type". Normalise here so the
// app doesn't crash at boot if Vite hands us the namespace vs. the default.
const WebApp: any = (TwaSdk as any).default ?? TwaSdk

try { WebApp?.ready?.() } catch { /* outside Telegram */ }
try { WebApp?.expand?.() } catch { /* outside Telegram */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
