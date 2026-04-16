# Overstay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Telegram Mini App for digital nomads that tracks visa deadlines, provides a community visa-run database, and includes an AI assistant — all in a light/dark themed UI.

**Architecture:** React SPA with 3 tab screens + AI chat bottom sheet. Supabase for data (PostgreSQL + RLS). Separate Telegraf.js bot process for notifications. Claude API for stamp recognition and AI assistant. Theme state in React context with CSS variables.

**Tech Stack:** React 18 + Vite + TypeScript + Tailwind CSS 3, Supabase JS, @twa-dev/sdk, Telegraf.js, Anthropic Claude API, Lucide React, Geist fonts, date-fns

**Design spec:** `docs/superpowers/specs/2026-04-16-overstay-design.md`

---

## File Structure

```
overstay/
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── .env.example
│   ├── vercel.json
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── index.css
│       ├── App.tsx
│       ├── types/index.ts
│       ├── lib/
│       │   ├── supabase.ts
│       │   ├── claude.ts
│       │   ├── telegram.ts
│       │   └── dates.ts
│       ├── hooks/
│       │   ├── useUser.ts
│       │   ├── useVisaEntry.ts
│       │   ├── useSchemes.ts
│       │   └── useChat.ts
│       ├── context/
│       │   └── ThemeContext.tsx
│       ├── components/
│       │   ├── BottomNav.tsx
│       │   ├── Header.tsx
│       │   ├── ThemeToggle.tsx
│       │   ├── RingProgress.tsx
│       │   ├── SegmentedBar.tsx
│       │   ├── HeroCard.tsx
│       │   ├── AlertStrip.tsx
│       │   ├── ActionGrid.tsx
│       │   ├── HistoryItem.tsx
│       │   ├── SchemeCard.tsx
│       │   ├── SchemeFilters.tsx
│       │   ├── DestRow.tsx
│       │   ├── StatusBanner.tsx
│       │   ├── BottomSheet.tsx
│       │   ├── AddEntrySheet.tsx
│       │   ├── AddSchemeSheet.tsx
│       │   ├── PhotoUpload.tsx
│       │   └── chat/
│       │       ├── ChatSheet.tsx
│       │       ├── ChatMessage.tsx
│       │       ├── ChatInput.tsx
│       │       ├── ChatFAQ.tsx
│       │       └── FollowUpChips.tsx
│       └── pages/
│           ├── StatusPage.tsx
│           ├── SchemesPage.tsx
│           └── NextPage.tsx
├── bot/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts
│   ├── scheduler.ts
│   ├── messages.ts
│   └── .env.example
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
└── README.md
```

---

## Task 1: Project Scaffolding & Config

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.ts`, `frontend/postcss.config.js`, `frontend/tsconfig.json`, `frontend/index.html`, `frontend/.env.example`, `frontend/vercel.json`

- [ ] **Step 1: Initialize frontend project**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
mkdir -p frontend/src frontend/public
cd frontend
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom @supabase/supabase-js @twa-dev/sdk lucide-react date-fns
npm install -D typescript @types/react @types/react-dom @types/node vite @vitejs/plugin-react tailwindcss postcss autoprefixer
```

- [ ] **Step 3: Install Geist font**

```bash
npm install geist
```

- [ ] **Step 4: Create vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { host: true },
})
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
    },
  },
} satisfies Config
```

- [ ] **Step 7: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 8: Create index.html**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Overstay</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 9: Create .env.example**

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=
VITE_BOT_USERNAME=
```

- [ ] **Step 10: Create vercel.json**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" },
        { "key": "Content-Security-Policy", "value": "frame-ancestors *" }
      ]
    }
  ]
}
```

- [ ] **Step 11: Add scripts to package.json**

Update `frontend/package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 12: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend project with Vite + React + Tailwind"
```

---

## Task 2: Supabase Schema & Seed Data

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  passport_country TEXT NOT NULL CHECK (passport_country IN ('RU','UA','KZ')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visa entries
CREATE TABLE visa_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  entry_date DATE NOT NULL,
  visa_type TEXT NOT NULL,
  max_days INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT entry_date_not_future CHECK (entry_date <= CURRENT_DATE)
);

-- Computed deadline view
CREATE VIEW visa_entries_with_deadline AS
SELECT
  *,
  entry_date + max_days AS deadline,
  (entry_date + max_days) - CURRENT_DATE AS days_left
FROM visa_entries;

-- Visa run schemes
CREATE TABLE schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  passport TEXT NOT NULL,
  from_country TEXT NOT NULL,
  to_country TEXT NOT NULL,
  border_crossing TEXT,
  cost_usd INTEGER,
  duration_hours INTEGER,
  description TEXT NOT NULL,
  tip TEXT,
  verified_at DATE NOT NULL DEFAULT CURRENT_DATE,
  works_count INTEGER DEFAULT 0,
  broken_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes (one per user per scheme)
CREATE TABLE scheme_votes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('works','broken')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, scheme_id)
);

-- Visa rules reference
CREATE TABLE visa_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport TEXT NOT NULL,
  country TEXT NOT NULL,
  visa_type TEXT NOT NULL,
  max_days INTEGER NOT NULL,
  cost_of_living_usd INTEGER,
  cities TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(passport, country, visa_type)
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  context_screen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: visa rules
INSERT INTO visa_rules (passport, country, visa_type, max_days, cost_of_living_usd, cities, notes) VALUES
('RU','VN','evisa_90', 90, 700, 'HCMC · Hanoi · Da Nang', 'E-visa онлайн за $25'),
('RU','TH','visa_exempt_30', 30, 800, 'BKK · CNX · Phuket', 'Безвиз на 30 дней'),
('RU','TH','dtv_180', 180, 800, 'BKK · CNX', 'DTV виза, нужен $15k на счету'),
('RU','KH','visa_on_arrival_30', 30, 600, 'PP · SR', '$30 на границе'),
('RU','LA','visa_on_arrival_30', 30, 500, 'VTE · LP', '$20-35 на границе'),
('RU','MY','visa_exempt_30', 30, 800, 'KL · Penang', 'Безвиз 30 дней'),
('RU','ID','visa_on_arrival_60', 60, 700, 'Bali · Jakarta', 'VOA + продление = 60 дней'),
('RU','PH','visa_exempt_30', 30, 650, 'Cebu · Manila', 'Можно продлить до 59 дней'),
('UA','VN','evisa_90', 90, 700, 'HCMC · Hanoi', 'E-visa онлайн'),
('UA','TH','visa_exempt_30', 30, 800, 'BKK · CNX', 'Безвиз 30 дней'),
('UA','MY','visa_exempt_30', 30, 800, 'KL · Penang', 'Безвиз 30 дней'),
('KZ','VN','evisa_90', 90, 700, 'HCMC · Hanoi', 'E-visa онлайн'),
('KZ','TH','visa_exempt_30', 30, 800, 'BKK · CNX', 'Безвиз 30 дней'),
('KZ','MY','visa_exempt_30', 30, 800, 'KL · Penang', 'Безвиз 30 дней');

-- Seed: starter schemes
INSERT INTO schemes (passport, from_country, to_country, border_crossing, cost_usd, duration_hours, description, tip, verified_at, works_count) VALUES
('RU','VN','LA','Nam Phao / Cau Treo', 25, 10,
 'Автобус из HCMC → Vinh → граница Nam Phao. Пешком через КПП, штамп Лаос, разворот. Новый VN штамп 90 дней. Весь день туда-обратно.',
 'Бери $35 налик — $20 виза Лаос + буфер на транспорт на месте',
 '2026-03-15', 47),
('RU','VN','KH','Moc Bai / Bavet', 40, 5,
 'Из HCMC автобус до Moc Bai — 2 часа. Быстрый КПП в Камбоджу и назад. Самый короткий ран из Хошимина, можно уложиться в полдня.',
 'Виза Камбоджа $30 на месте. Некоторые автобусы берут $5 доп — торгуйся',
 '2026-02-20', 31),
('RU','VN','KR', NULL, 200, 168,
 'Рейс в Сеул на неделю. В Thai консульстве e-Visa за 3 дня. Прилетаешь обратно с готовой Thai визой или сразу в Бангкок. Корея 90 дней безвиз для RU.',
 'Совмести с путешествием — минус стресс, плюс Thai виза готова',
 '2026-01-10', 19);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own" ON users FOR ALL USING (
  telegram_id = (current_setting('app.telegram_id', true))::BIGINT
);
CREATE POLICY "entries_own" ON visa_entries FOR ALL USING (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);
CREATE POLICY "schemes_read" ON schemes FOR SELECT USING (true);
CREATE POLICY "schemes_write" ON schemes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_own" ON scheme_votes FOR ALL USING (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);
CREATE POLICY "chat_own" ON chat_messages FOR ALL USING (
  user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id', true))::BIGINT)
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema with seed data and RLS policies"
```

---

## Task 3: Types, Lib, and Theme Context

**Files:**
- Create: `frontend/src/types/index.ts`, `frontend/src/lib/supabase.ts`, `frontend/src/lib/dates.ts`, `frontend/src/lib/telegram.ts`, `frontend/src/lib/claude.ts`, `frontend/src/context/ThemeContext.tsx`

- [ ] **Step 1: Create types/index.ts**

```ts
export type PassportCountry = 'RU' | 'UA' | 'KZ'

export interface User {
  id: string
  telegram_id: number
  passport_country: PassportCountry
  created_at: string
}

export interface VisaEntry {
  id: string
  user_id: string
  country: string
  entry_date: string
  visa_type: string
  max_days: number
  notes?: string
  created_at: string
  deadline: string
  days_left: number
}

export interface Scheme {
  id: string
  passport: PassportCountry
  from_country: string
  to_country: string
  border_crossing?: string
  cost_usd?: number
  duration_hours?: number
  description: string
  tip?: string
  verified_at: string
  works_count: number
  broken_count: number
  created_at: string
}

export interface SchemeVote {
  user_id: string
  scheme_id: string
  vote: 'works' | 'broken'
}

export interface VisaRule {
  passport: PassportCountry
  country: string
  visa_type: string
  max_days: number
  cost_of_living_usd?: number
  cities?: string
  notes?: string
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  context_screen?: string
  created_at: string
}

export type RiskLevel = 'safe' | 'warn' | 'danger'

export function getRiskLevel(daysLeft: number, maxDays: number): RiskLevel {
  const pct = daysLeft / maxDays
  if (pct > 0.25) return 'safe'
  if (pct > 0.1) return 'warn'
  return 'danger'
}

export type Screen = 'status' | 'schemes' | 'next'

export const COUNTRY_FLAGS: Record<string, string> = {
  VN: '🇻🇳', TH: '🇹🇭', KH: '🇰🇭', LA: '🇱🇦',
  MY: '🇲🇾', ID: '🇮🇩', PH: '🇵🇭', KR: '🇰🇷',
  RU: '🇷🇺', UA: '🇺🇦', KZ: '🇰🇿',
}

export const COUNTRY_NAMES: Record<string, string> = {
  VN: 'Вьетнам', TH: 'Таиланд', KH: 'Камбоджа', LA: 'Лаос',
  MY: 'Малайзия', ID: 'Индонезия', PH: 'Филиппины', KR: 'Корея',
}
```

- [ ] **Step 2: Create lib/supabase.ts**

```ts
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
```

- [ ] **Step 3: Create lib/dates.ts**

```ts
import { differenceInDays, addDays, format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export function getDaysLeft(entryDate: string, maxDays: number): number {
  const deadline = addDays(parseISO(entryDate), maxDays)
  return differenceInDays(deadline, new Date())
}

export function getDeadline(entryDate: string, maxDays: number): string {
  return format(addDays(parseISO(entryDate), maxDays), 'd MMM yyyy', { locale: ru })
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM', { locale: ru })
}

export function formatDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy', { locale: ru })
}

export function getSegments(daysLeft: number, maxDays: number, total = 22) {
  const daysUsed = maxDays - daysLeft
  const used = Math.round((daysUsed / maxDays) * total)
  return Array.from({ length: total }, (_, i) => {
    if (i >= used) return 'empty'
    if (i >= used - 3 && i < used) return 'warn'
    return 'used'
  })
}

export function getRingOffset(daysLeft: number, maxDays: number): number {
  const circumference = 2 * Math.PI * 50 // r=50
  const remaining = daysLeft / maxDays
  return circumference * remaining
}

export function pluralDays(n: number): string {
  const abs = Math.abs(n)
  if (abs % 10 === 1 && abs % 100 !== 11) return 'день'
  if ([2, 3, 4].includes(abs % 10) && ![12, 13, 14].includes(abs % 100)) return 'дня'
  return 'дней'
}
```

- [ ] **Step 4: Create lib/telegram.ts**

```ts
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
```

- [ ] **Step 5: Create lib/claude.ts**

```ts
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

interface StampResult {
  country: string | null
  entry_date: string | null
  visa_type: string | null
}

export async function recognizeStamp(imageBase64: string): Promise<StampResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
          },
          {
            type: 'text',
            text: `Посмотри на фото штампа/визы в паспорте. Извлеки ТОЛЬКО:
1. country — ISO код (VN, TH, KH, LA, MY, ID, PH, KR)
2. entry_date — YYYY-MM-DD
3. visa_type — тип (evisa_90, visa_exempt_30, dtv_180, visa_on_arrival_30, etc.)

Ответь ТОЛЬКО JSON: {"country":"VN","entry_date":"2026-03-15","visa_type":"evisa_90"}
Если не определить — null.`,
          },
        ],
      }],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text ?? '{}'
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return { country: null, entry_date: null, visa_type: null }
  }
}

export async function chatWithAssistant(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  })

  const data = await response.json()
  return data.content?.[0]?.text ?? 'Не удалось получить ответ.'
}
```

- [ ] **Step 6: Create context/ThemeContext.tsx**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('overstay-theme') as Theme) ?? 'light'
  })

  useEffect(() => {
    localStorage.setItem('overstay-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

- [ ] **Step 7: Create main.tsx and index.css**

`frontend/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WebApp from '@twa-dev/sdk'
import 'geist/dist/geist-sans.css'
import 'geist/dist/geist-mono.css'
import './index.css'
import App from './App'

WebApp.ready()
WebApp.expand()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  -webkit-tap-highlight-color: transparent;
}

:root {
  --bg: #faf9f7; --bg2: #ffffff; --bg3: #f5f3f0;
  --border: #e8e6e3; --border2: #eeece9;
  --text1: #1a1a1a; --text2: #555; --text3: #999; --text4: #bbb;
  --alert-bg: #fef7ed; --alert-border: #f5deb8;
  --alert-text: #9a7b4f; --alert-dot: #e8a85c;
  --ring-color: #e8a85c; --ring-track: #eeece9;
}

[data-theme="dark"] {
  --bg: #141416; --bg2: #1a1a1e; --bg3: #1e1e22;
  --border: #28282e; --border2: #222228;
  --text1: #e8e8ea; --text2: #aaa; --text3: #555; --text4: #444;
  --alert-bg: rgba(200,150,69,0.06); --alert-border: rgba(200,150,69,0.15);
  --alert-text: #c89545; --alert-dot: #c89545;
  --ring-color: #c89545; --ring-track: #28282e;
}

html, body, #root {
  height: 100%;
  background: var(--bg);
  color: var(--text1);
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior: none;
  transition: background 0.4s, color 0.4s;
}

input, button, select, textarea {
  -webkit-appearance: none;
  appearance: none;
}

::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }

/* Animations */
@keyframes ringDraw {
  from { stroke-dashoffset: 314; }
  to { stroke-dashoffset: var(--ring-target); }
}

@keyframes numIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

@keyframes lineIn {
  from { width: 0; opacity: 0; }
  to { width: 18px; opacity: 1; }
}
```

- [ ] **Step 8: Create stub App.tsx**

```tsx
import { useState } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import type { Screen } from '@/types'

export default function App() {
  const [screen, setScreen] = useState<Screen>('status')

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text3)' }}>
            <p className="font-mono text-sm">Overstay — {screen}</p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd frontend && npm run dev
```

Expected: Vite dev server starts, page shows "Overstay — status".

- [ ] **Step 10: Commit**

```bash
git add frontend/src/
git commit -m "feat: add types, lib modules, theme context, and base app shell"
```

---

## Task 4: Shared Components (BottomNav, Header, ThemeToggle, BottomSheet)

**Files:**
- Create: `frontend/src/components/BottomNav.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/components/ThemeToggle.tsx`, `frontend/src/components/BottomSheet.tsx`

- [ ] **Step 1: Create BottomNav.tsx**

```tsx
import { LayoutGrid, ArrowLeftRight, CircleArrowRight } from 'lucide-react'
import type { Screen } from '@/types'

const tabs: Array<{ id: Screen; label: string; icon: typeof LayoutGrid }> = [
  { id: 'status', label: 'Статус', icon: LayoutGrid },
  { id: 'schemes', label: 'Схемы', icon: ArrowLeftRight },
  { id: 'next', label: 'Дальше', icon: CircleArrowRight },
]

interface Props {
  active: Screen
  onChange: (screen: Screen) => void
}

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      className="flex pb-8 pt-2 px-1 border-t"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      {tabs.map(tab => {
        const isActive = active === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-1.5 relative"
            style={{ color: isActive ? 'var(--text1)' : 'var(--text3)' }}
          >
            <Icon size={19} strokeWidth={1.5} />
            <span
              className="font-mono text-[9px] uppercase"
              style={{ letterSpacing: '0.12em' }}
            >
              {tab.label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 h-0.5 rounded-full"
                style={{
                  width: 18,
                  background: 'var(--text1)',
                  animation: 'lineIn 0.3s ease both',
                }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Create Header.tsx**

```tsx
import { MessageCircle } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { COUNTRY_FLAGS, type PassportCountry } from '@/types'

interface Props {
  title: string
  passport: PassportCountry
  onChatOpen: () => void
}

export default function Header({ title, passport, onChatOpen }: Props) {
  return (
    <div className="flex items-center justify-between px-[22px] pt-3.5 pb-0 shrink-0">
      <span
        className="font-light text-[11px] uppercase"
        style={{ letterSpacing: '0.35em', color: 'var(--text3)' }}
      >
        {title}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onChatOpen}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text3)' }}
        >
          <MessageCircle size={18} strokeWidth={1.5} />
        </button>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] border cursor-pointer transition-colors"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
        >
          <span className="text-[13px]">{COUNTRY_FLAGS[passport]}</span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--text2)', letterSpacing: '0.1em' }}>
            {passport} · Pass
          </span>
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ThemeToggle.tsx**

```tsx
import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="w-[44px] h-[24px] rounded-full border flex items-center p-0.5 transition-all duration-300"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] transition-transform duration-300"
        style={{
          background: 'var(--text1)',
          color: 'var(--bg)',
          transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)',
        }}
      >
        {theme === 'light' ? '☀' : '☽'}
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Create BottomSheet.tsx**

```tsx
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  height?: string
}

export default function BottomSheet({ open, onClose, children, height = '85vh' }: Props) {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div
      ref={bgRef}
      onClick={e => { if (e.target === bgRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-end transition-opacity duration-200"
      style={{
        background: 'rgba(0,0,0,0.7)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
      }}
    >
      <div
        className="w-full border-t overflow-y-auto transition-transform duration-[360ms]"
        style={{
          background: 'var(--bg2)',
          borderColor: 'var(--border)',
          maxHeight: height,
          borderRadius: '16px 16px 0 0',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <div className="flex justify-center pt-3 pb-5">
          <div className="w-7 h-[3px] rounded-full" style={{ background: 'var(--border)' }} />
        </div>
        <div className="px-[22px] pb-10">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add BottomNav, Header, ThemeToggle, BottomSheet components"
```

---

## Task 5: StatusPage Components (RingProgress, SegmentedBar, HeroCard, AlertStrip, ActionGrid, HistoryItem)

**Files:**
- Create: `frontend/src/components/RingProgress.tsx`, `frontend/src/components/SegmentedBar.tsx`, `frontend/src/components/HeroCard.tsx`, `frontend/src/components/AlertStrip.tsx`, `frontend/src/components/ActionGrid.tsx`, `frontend/src/components/HistoryItem.tsx`, `frontend/src/pages/StatusPage.tsx`

- [ ] **Step 1: Create RingProgress.tsx**

```tsx
import { getRingOffset } from '@/lib/dates'

interface Props {
  daysLeft: number
  maxDays: number
}

export default function RingProgress({ daysLeft, maxDays }: Props) {
  const circumference = 2 * Math.PI * 50
  const target = getRingOffset(daysLeft, maxDays)

  return (
    <div className="relative w-[110px] h-[110px] shrink-0">
      <svg className="w-[110px] h-[110px] -rotate-90" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="50" fill="none" stroke="var(--ring-track)" strokeWidth={5} />
        <circle
          cx="55" cy="55" r="50" fill="none"
          stroke="var(--ring-color)" strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ '--ring-target': target, animation: 'ringDraw 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s forwards' } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[32px] font-bold leading-none"
          style={{ color: 'var(--text1)', letterSpacing: '-0.03em', animation: 'numIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}
        >
          {daysLeft}
        </span>
        <span
          className="font-mono text-[9px] uppercase mt-0.5"
          style={{ color: 'var(--text3)', letterSpacing: '0.12em' }}
        >
          дней
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create SegmentedBar.tsx**

```tsx
import { getSegments } from '@/lib/dates'

interface Props {
  daysLeft: number
  maxDays: number
}

export default function SegmentedBar({ daysLeft, maxDays }: Props) {
  const segments = getSegments(daysLeft, maxDays)
  const pct = Math.round(((maxDays - daysLeft) / maxDays) * 100)

  return (
    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex justify-between mb-1.5">
        <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.1em' }}>
          Прогресс
        </span>
        <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.1em' }}>
          {pct}%
        </span>
      </div>
      <div className="flex gap-0.5">
        {segments.map((type, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-sm transition-colors duration-300"
            style={{
              background: type === 'warn' ? 'var(--alert-dot)' : type === 'used' ? 'var(--text3)' : 'var(--border2)',
              animation: `cardIn 0.3s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.03}s both`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create HeroCard.tsx**

```tsx
import { COUNTRY_FLAGS, COUNTRY_NAMES, getRiskLevel, type VisaEntry } from '@/types'
import { formatDateFull } from '@/lib/dates'
import RingProgress from './RingProgress'
import SegmentedBar from './SegmentedBar'

interface Props {
  entry: VisaEntry
  stats: { countries: number; totalDays: number; runs: number }
}

export default function HeroCard({ entry, stats }: Props) {
  const risk = getRiskLevel(entry.days_left, entry.max_days)
  const riskLabels = { safe: 'SAFE', warn: 'WARN', danger: 'DANGER' }

  return (
    <div
      className="mx-0 my-3.5 border rounded-[14px] overflow-hidden"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)', animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{COUNTRY_FLAGS[entry.country]}</span>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
              {COUNTRY_NAMES[entry.country] ?? entry.country}
            </div>
            <div className="font-mono text-[10px] mt-px" style={{ color: 'var(--text3)', letterSpacing: '0.04em' }}>
              {entry.visa_type.replace(/_/g, ' ')} · {entry.max_days} дней
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-semibold uppercase"
          style={{
            color: risk === 'safe' ? 'var(--text3)' : 'var(--alert-text)',
            borderColor: risk === 'safe' ? 'var(--border)' : 'var(--alert-border)',
            letterSpacing: '0.1em',
          }}
        >
          {risk !== 'safe' && (
            <span
              className="w-[5px] h-[5px] rounded-full"
              style={{ background: 'var(--alert-dot)', animation: 'pulse 2s ease-in-out infinite' }}
            />
          )}
          {riskLabels[risk]}
        </div>
      </div>

      {/* Ring section */}
      <div className="flex items-center gap-5 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <RingProgress daysLeft={entry.days_left} maxDays={entry.max_days} />
        <div className="flex-1 space-y-1.5">
          {[
            ['Въезд', formatDateFull(entry.entry_date)],
            ['Дедлайн', formatDateFull(entry.deadline)],
            ['Использовано', `${entry.max_days - entry.days_left} / ${entry.max_days} дн.`],
            ['Тип', entry.visa_type.replace(/_/g, ' ')],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--text4)', letterSpacing: '0.08em' }}>{label}</span>
              <span className="text-[13px] font-medium" style={{ color: 'var(--text2)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segmented bar */}
      <SegmentedBar daysLeft={entry.days_left} maxDays={entry.max_days} />

      {/* Stats */}
      <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          [String(stats.countries).padStart(2, '0'), 'Стран'],
          [String(stats.totalDays), 'Дней'],
          [String(stats.runs).padStart(2, '0'), 'Ранов'],
        ].map(([val, label], i) => (
          <div key={label} className={i % 2 === 0 ? undefined : undefined}>
            {i > 0 && i % 2 === 1 ? null : (
              <div
                className="text-center py-2.5"
                style={{ animation: `fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${0.4 + i * 0.05}s both` }}
              >
                <span className="text-[18px] font-semibold tabular-nums block" style={{ color: 'var(--text1)' }}>{val}</span>
                <span className="font-mono text-[8px] uppercase mt-0.5 block" style={{ color: 'var(--text4)', letterSpacing: '0.1em' }}>{label}</span>
              </div>
            )}
          </div>
        )).flatMap((el, i) => i > 0 && i < 4 ? [<div key={`div-${i}`} style={{ background: 'var(--border)' }} />, el] : [el])}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-[1fr_1px_1fr]">
        <div className="px-4 py-2.5">
          <div className="font-mono text-[9px] uppercase mb-0.5" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>Въезд</div>
          <div className="text-[14px] font-medium" style={{ color: 'var(--text2)' }}>{formatDateFull(entry.entry_date)}</div>
        </div>
        <div style={{ background: 'var(--border)' }} />
        <div className="px-4 py-2.5 text-right">
          <div className="font-mono text-[9px] uppercase mb-0.5" style={{ color: 'var(--text4)', letterSpacing: '0.12em' }}>Дедлайн</div>
          <div className="text-[14px] font-medium" style={{ color: 'var(--text2)' }}>{formatDateFull(entry.deadline)}</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create AlertStrip.tsx**

```tsx
import { AlertTriangle } from 'lucide-react'

interface Props {
  daysLeft: number
  schemesCount: number
  countries: string[]
}

export default function AlertStrip({ daysLeft, schemesCount, countries }: Props) {
  if (daysLeft > 14) return null

  return (
    <div
      className="flex gap-2.5 items-start p-2.5 rounded-[10px] border border-l-2 mb-3"
      style={{
        background: 'var(--alert-bg)',
        borderColor: 'var(--alert-border)',
        borderLeftColor: 'var(--alert-dot)',
        animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.15s both',
      }}
    >
      <div className="mt-0.5 shrink-0" style={{ color: 'var(--alert-dot)', animation: 'pulse 2s ease-in-out infinite' }}>
        <AlertTriangle size={14} strokeWidth={1.5} />
      </div>
      <div>
        <div className="text-xs font-semibold mb-px" style={{ color: 'var(--alert-text)' }}>Планируй ран</div>
        <div className="font-mono text-[10px]" style={{ color: 'var(--alert-text)', opacity: 0.55 }}>
          {schemesCount} схем доступно · {countries.join(', ')}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create ActionGrid.tsx**

```tsx
import { List, Camera, FileText } from 'lucide-react'

interface Props {
  onSchemes: () => void
  onStamp: () => void
  onPdf: () => void
}

export default function ActionGrid({ onSchemes, onStamp, onPdf }: Props) {
  const actions = [
    { icon: List, label: 'Схемы', sub: 'визаранов', onClick: onSchemes, primary: true },
    { icon: Camera, label: 'Штамп', sub: 'фото → AI', onClick: onStamp, primary: false },
    { icon: FileText, label: 'PDF', sub: 'экспорт', onClick: onPdf, primary: false },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 mb-3" style={{ animation: 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.25s both' }}>
      {actions.map(a => {
        const Icon = a.icon
        return (
          <button
            key={a.label}
            onClick={a.onClick}
            className="border rounded-[10px] p-3 text-left transition-all duration-150 hover:-translate-y-px active:scale-[0.97]"
            style={{
              background: 'var(--bg2)',
              borderColor: 'var(--border)',
            }}
            onMouseEnter={e => {
              if (a.primary) {
                e.currentTarget.style.borderColor = 'var(--alert-dot)'
                e.currentTarget.style.background = 'var(--alert-bg)'
              } else {
                e.currentTarget.style.borderColor = 'var(--text3)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--bg2)'
            }}
          >
            <Icon size={16} strokeWidth={1.5} className="mb-1.5" style={{ color: 'var(--text3)' }} />
            <span className="text-[10px] font-semibold block" style={{ color: 'var(--text1)' }}>{a.label}</span>
            <span className="font-mono text-[8px] block mt-px" style={{ color: 'var(--text3)' }}>{a.sub}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Create HistoryItem.tsx**

```tsx
import { COUNTRY_FLAGS, COUNTRY_NAMES, type VisaEntry } from '@/types'

interface Props {
  entry: VisaEntry
  index: number
}

export default function HistoryItem({ entry, index }: Props) {
  const isRun = entry.max_days <= 3
  const badge = isRun ? 'РАН' : `${entry.max_days} ДН`

  return (
    <div
      className="flex items-center gap-3 border rounded-[10px] p-2.5 mb-1.5 opacity-50 cursor-pointer transition-all duration-200 hover:opacity-[0.75]"
      style={{
        background: 'var(--bg2)',
        borderColor: 'var(--border)',
        animation: `cardIn 0.4s cubic-bezier(0.16,1,0.3,1) ${index * 0.05}s both`,
      }}
    >
      <span className="text-lg shrink-0">{COUNTRY_FLAGS[entry.country]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium" style={{ color: 'var(--text1)' }}>
          {COUNTRY_NAMES[entry.country] ?? entry.country}
        </div>
        <div className="font-mono text-[9px] mt-px" style={{ color: 'var(--text3)' }}>
          {entry.visa_type.replace(/_/g, ' ')} · {entry.entry_date}
        </div>
      </div>
      <span
        className="font-mono text-[9px] border rounded px-1.5 py-0.5 shrink-0"
        style={{ color: 'var(--text3)', borderColor: 'var(--border)', letterSpacing: '0.04em' }}
      >
        {badge}
      </span>
    </div>
  )
}
```

- [ ] **Step 7: Create StatusPage.tsx**

```tsx
import { COUNTRY_FLAGS, type VisaEntry } from '@/types'
import HeroCard from '@/components/HeroCard'
import AlertStrip from '@/components/AlertStrip'
import ActionGrid from '@/components/ActionGrid'
import HistoryItem from '@/components/HistoryItem'
import type { Screen } from '@/types'

interface Props {
  onNavigate: (screen: Screen) => void
  onStamp: () => void
}

// Mock data for development — will be replaced with Supabase hooks
const MOCK_ENTRY: VisaEntry = {
  id: '1', user_id: '1', country: 'VN', entry_date: '2026-03-15',
  visa_type: 'evisa_90', max_days: 90, created_at: '',
  deadline: '2026-06-13', days_left: 14,
}

const MOCK_HISTORY: VisaEntry[] = [
  { id: '2', user_id: '1', country: 'TH', entry_date: '2025-09-10', visa_type: 'dtv_180', max_days: 180, created_at: '', deadline: '2026-03-08', days_left: 0 },
  { id: '3', user_id: '1', country: 'KH', entry_date: '2025-09-08', visa_type: 'visa_on_arrival_30', max_days: 2, created_at: '', deadline: '2025-09-10', days_left: 0 },
]

export default function StatusPage({ onNavigate, onStamp }: Props) {
  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <HeroCard
        entry={MOCK_ENTRY}
        stats={{ countries: 7, totalDays: 312, runs: 4 }}
      />

      <AlertStrip daysLeft={14} schemesCount={3} countries={['RU → LA', 'KH', 'TH']} />

      <ActionGrid
        onSchemes={() => onNavigate('schemes')}
        onStamp={onStamp}
        onPdf={() => {/* TODO: PDF export */}}
      />

      <div
        className="font-mono text-[9px] uppercase mt-4 mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        История
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {MOCK_HISTORY.map((entry, i) => (
        <HistoryItem key={entry.id} entry={entry} index={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/
git commit -m "feat: add StatusPage with HeroCard, RingProgress, alerts, and history"
```

---

## Task 6: SchemesPage

**Files:**
- Create: `frontend/src/components/SchemeCard.tsx`, `frontend/src/components/SchemeFilters.tsx`, `frontend/src/pages/SchemesPage.tsx`

- [ ] **Step 1: Create SchemeFilters.tsx**

```tsx
import { useState } from 'react'

const FILTERS = ['Все', 'VN →', 'TH →', 'Граница', 'Самолёт']

interface Props {
  onFilter: (filter: string) => void
}

export default function SchemeFilters({ onFilter }: Props) {
  const [active, setActive] = useState('Все')

  return (
    <div className="flex gap-1.5 overflow-x-auto pt-3 -mx-[18px] px-[18px]" style={{ scrollbarWidth: 'none' }}>
      {FILTERS.map(f => (
        <button
          key={f}
          onClick={() => { setActive(f); onFilter(f) }}
          className="shrink-0 border rounded px-3 py-1 font-mono text-[10px] transition-all duration-150"
          style={{
            borderColor: active === f ? 'var(--text3)' : 'var(--border)',
            color: active === f ? 'var(--text2)' : 'var(--text3)',
            background: active === f ? 'var(--bg3)' : 'transparent',
          }}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create SchemeCard.tsx**

```tsx
import { COUNTRY_FLAGS, type Scheme } from '@/types'

interface Props {
  scheme: Scheme
  index: number
  userVote?: 'works' | 'broken' | null
  onVote: (schemeId: string, vote: 'works' | 'broken') => void
}

export default function SchemeCard({ scheme, index, userVote, onVote }: Props) {
  const months = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК']
  const d = new Date(scheme.verified_at)
  const dateTag = `${months[d.getMonth()]} ${d.getFullYear()}`

  return (
    <div
      className="border rounded overflow-hidden mb-2 transition-colors duration-150"
      style={{
        borderColor: 'var(--border)',
        animation: `cardIn 0.28s cubic-bezier(0.16,1,0.3,1) ${0.04 * (index + 1)}s both`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[17px]" style={{ letterSpacing: 2 }}>
            {COUNTRY_FLAGS[scheme.from_country]}{scheme.duration_hours && scheme.duration_hours > 48 ? '✈️' : '→'}{COUNTRY_FLAGS[scheme.to_country]}
          </span>
          {scheme.border_crossing && (
            <span className="font-mono text-[10px] border rounded px-1.5 py-0.5" style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}>
              {scheme.border_crossing}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--text2)' }}>
          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--text3)' }} />
          {scheme.works_count}
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 py-2.5">
        <p className="font-mono text-[11px] leading-[1.8] mb-2" style={{ color: 'var(--text2)' }}>
          {scheme.description}
        </p>

        {scheme.tip && (
          <div
            className="border-l-2 pl-2.5 py-1.5 rounded-r font-mono text-[10px] leading-[1.6] mb-2"
            style={{ borderColor: 'var(--border)', color: 'var(--text3)', background: 'var(--bg3)' }}
          >
            {scheme.tip}
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {scheme.cost_usd && <Tag>~${scheme.cost_usd}</Tag>}
          {scheme.duration_hours && <Tag>~{scheme.duration_hours > 48 ? `${Math.round(scheme.duration_hours / 24)} дн` : `${scheme.duration_hours}ч`}</Tag>}
          <Tag>{dateTag}</Tag>
        </div>

        <div className="flex gap-1.5 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <VoteBtn
            emoji="👍"
            count={scheme.works_count}
            active={userVote === 'works'}
            type="works"
            onClick={() => onVote(scheme.id, 'works')}
          />
          <VoteBtn
            emoji="👎"
            count={scheme.broken_count}
            active={userVote === 'broken'}
            type="broken"
            onClick={() => onVote(scheme.id, 'broken')}
          />
        </div>
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] border rounded px-1.5 py-0.5" style={{ color: 'var(--text3)', borderColor: 'var(--border)' }}>
      {children}
    </span>
  )
}

function VoteBtn({ emoji, count, active, type, onClick }: { emoji: string; count: number; active: boolean; type: 'works' | 'broken'; onClick: () => void }) {
  const isNo = type === 'broken'
  return (
    <button
      onClick={onClick}
      className="flex-1 border rounded py-1.5 flex items-center justify-center gap-1 text-xs font-medium transition-all duration-150"
      style={{
        borderColor: active ? (isNo ? 'var(--alert-dot)' : 'var(--text3)') : 'var(--border)',
        color: active ? (isNo ? 'var(--alert-dot)' : 'var(--text2)') : 'var(--text3)',
        background: active ? (isNo ? 'var(--alert-bg)' : 'var(--bg3)') : 'transparent',
      }}
    >
      {emoji} <span>{count}</span>
    </button>
  )
}
```

- [ ] **Step 3: Create SchemesPage.tsx**

```tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import SchemeFilters from '@/components/SchemeFilters'
import SchemeCard from '@/components/SchemeCard'
import type { Scheme } from '@/types'

const MOCK_SCHEMES: Scheme[] = [
  { id: '1', passport: 'RU', from_country: 'VN', to_country: 'LA', border_crossing: 'Nam Phao', cost_usd: 25, duration_hours: 10, description: 'Автобус из HCMC → Vinh → граница Nam Phao. Пешком через КПП, штамп Лаос, разворот. Новый VN штамп 90 дней.', tip: 'Бери $35 налик — $20 виза Лаос + буфер на транспорт', verified_at: '2026-03-15', works_count: 47, broken_count: 3, created_at: '' },
  { id: '2', passport: 'RU', from_country: 'VN', to_country: 'KH', border_crossing: 'Moc Bai', cost_usd: 40, duration_hours: 5, description: 'Из HCMC автобус до Moc Bai — 2 часа. Быстрый КПП в Камбоджу и назад. Самый короткий ран из Хошимина.', tip: 'Виза Камбоджа $30 на месте. Торгуйся за автобус', verified_at: '2026-02-20', works_count: 31, broken_count: 1, created_at: '' },
  { id: '3', passport: 'RU', from_country: 'VN', to_country: 'KR', cost_usd: 200, duration_hours: 168, description: 'Рейс в Сеул на неделю. В Thai консульстве e-Visa за 3 дня. Прилетаешь с готовой Thai визой.', tip: 'Корея 90 дней безвиз для RU. Совмести с путешествием', verified_at: '2026-01-10', works_count: 19, broken_count: 0, created_at: '' },
]

export default function SchemesPage() {
  const [filter, setFilter] = useState('Все')
  const [votes, setVotes] = useState<Record<string, 'works' | 'broken'>>({})

  const handleVote = (schemeId: string, vote: 'works' | 'broken') => {
    setVotes(prev => {
      if (prev[schemeId] === vote) {
        const next = { ...prev }
        delete next[schemeId]
        return next
      }
      return { ...prev, [schemeId]: vote }
    })
  }

  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <SchemeFilters onFilter={setFilter} />

      <div
        className="font-mono text-[9px] uppercase mt-4 mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        {MOCK_SCHEMES.length} подтверждено · RU
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {MOCK_SCHEMES.map((scheme, i) => (
        <SchemeCard key={scheme.id} scheme={scheme} index={i} userVote={votes[scheme.id] ?? null} onVote={handleVote} />
      ))}

      <button
        className="w-full border border-dashed rounded flex items-center gap-3 p-3.5 mt-0.5 transition-all duration-150"
        style={{ borderColor: 'var(--border)', color: 'var(--text1)' }}
      >
        <div
          className="w-8 h-8 border rounded flex items-center justify-center shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          <Plus size={15} strokeWidth={1.5} />
        </div>
        <div>
          <span className="text-[13px] font-medium block">Добавить схему</span>
          <span className="font-mono text-[9px] mt-px block" style={{ color: 'var(--text3)' }}>Помоги другим · анонимно</span>
        </div>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add SchemesPage with SchemeCard, filters, and voting"
```

---

## Task 7: NextPage

**Files:**
- Create: `frontend/src/components/DestRow.tsx`, `frontend/src/components/StatusBanner.tsx`, `frontend/src/pages/NextPage.tsx`

- [ ] **Step 1: Create StatusBanner.tsx**

```tsx
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '@/types'

interface Props { daysLeft: number; country: string }

export default function StatusBanner({ daysLeft, country }: Props) {
  return (
    <div className="border rounded my-3.5 px-4 py-4 relative overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, var(--border), var(--text3) 40%, var(--border))' }} />
      <div className="font-mono text-[9px] uppercase mb-1.5" style={{ color: 'var(--text4)', letterSpacing: '0.26em' }}>Текущий статус</div>
      <span className="text-[42px] font-bold leading-none block mb-0.5" style={{ color: 'var(--text1)', letterSpacing: '-0.03em' }}>{daysLeft}</span>
      <div className="font-mono text-[11px]" style={{ color: 'var(--text3)' }}>
        дней до конца · <span style={{ color: 'var(--text2)' }}>{COUNTRY_FLAGS[country]} {COUNTRY_NAMES[country]}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create DestRow.tsx**

```tsx
import { ChevronRight } from 'lucide-react'
import { COUNTRY_FLAGS, COUNTRY_NAMES, type VisaRule } from '@/types'

interface Props {
  rule: VisaRule
  schemesCount: number
  index: number
  onClick: () => void
}

export default function DestRow({ rule, schemesCount, index, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 border rounded p-3 mb-1.5 cursor-pointer transition-all duration-150 hover:border-[var(--text3)]"
      style={{
        borderColor: 'var(--border)',
        animation: `cardIn 0.28s cubic-bezier(0.16,1,0.3,1) ${0.04 * (index + 1)}s both`,
      }}
    >
      <span className="text-[26px] shrink-0">{COUNTRY_FLAGS[rule.country]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text1)', letterSpacing: '-0.01em' }}>
          {COUNTRY_NAMES[rule.country] ?? rule.country}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Tag highlight>{rule.visa_type.replace(/_/g, ' ')} {rule.max_days} дн</Tag>
          {rule.cost_of_living_usd && <Tag>~${rule.cost_of_living_usd}/мес</Tag>}
          {rule.cities && <Tag>{rule.cities}</Tag>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] font-semibold" style={{ color: 'var(--text2)', letterSpacing: '-0.02em' }}>
          {String(schemesCount).padStart(2, '0')}
        </div>
        <div className="font-mono text-[8px]" style={{ color: 'var(--text3)' }}>схем</div>
      </div>
      <ChevronRight size={15} style={{ color: 'var(--text4)' }} className="shrink-0 ml-1" />
    </div>
  )
}

function Tag({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <span
      className="font-mono text-[9px] border rounded px-1.5 py-0.5"
      style={{
        color: highlight ? 'var(--text2)' : 'var(--text3)',
        borderColor: highlight ? 'var(--text3)' : 'var(--border)',
      }}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 3: Create NextPage.tsx**

```tsx
import StatusBanner from '@/components/StatusBanner'
import DestRow from '@/components/DestRow'
import type { VisaRule, Screen } from '@/types'

interface Props { onNavigate: (screen: Screen) => void }

const MOCK_RULES: Array<VisaRule & { schemesCount: number }> = [
  { passport: 'RU', country: 'TH', visa_type: 'dtv_180', max_days: 180, cost_of_living_usd: 700, cities: 'BKK · CNX', notes: '', schemesCount: 12 },
  { passport: 'RU', country: 'MY', visa_type: 'visa_exempt', max_days: 90, cost_of_living_usd: 800, cities: 'KL · Penang', notes: '', schemesCount: 8 },
  { passport: 'RU', country: 'KH', visa_type: 'visa_on_arrival', max_days: 30, cost_of_living_usd: 600, cities: 'PP · SR', notes: '', schemesCount: 5 },
  { passport: 'RU', country: 'ID', visa_type: 'voa_60', max_days: 60, cost_of_living_usd: 700, cities: 'Bali', notes: '', schemesCount: 7 },
  { passport: 'RU', country: 'PH', visa_type: 'visa_exempt', max_days: 30, cost_of_living_usd: 650, cities: 'Cebu', notes: '', schemesCount: 4 },
]

export default function NextPage({ onNavigate }: Props) {
  return (
    <div className="h-full overflow-y-auto px-[18px] pb-4" style={{ scrollbarWidth: 'none' }}>
      <StatusBanner daysLeft={14} country="VN" />

      <div
        className="font-mono text-[9px] uppercase mb-2 flex items-center gap-2.5"
        style={{ color: 'var(--text4)', letterSpacing: '0.24em' }}
      >
        Подходящие · RU паспорт
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {MOCK_RULES.map((rule, i) => (
        <DestRow key={rule.country} rule={rule} schemesCount={rule.schemesCount} index={i} onClick={() => onNavigate('schemes')} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: add NextPage with StatusBanner and DestRow"
```

---

## Task 8: AI Chat Components

**Files:**
- Create: `frontend/src/components/chat/ChatFAQ.tsx`, `frontend/src/components/chat/ChatMessage.tsx`, `frontend/src/components/chat/ChatInput.tsx`, `frontend/src/components/chat/FollowUpChips.tsx`, `frontend/src/components/chat/ChatSheet.tsx`, `frontend/src/hooks/useChat.ts`

- [ ] **Step 1: Create hooks/useChat.ts**

```ts
import { useState, useCallback } from 'react'
import { chatWithAssistant } from '@/lib/claude'
import type { ChatMessage, VisaEntry, VisaRule, Scheme, PassportCountry } from '@/types'
import { COUNTRY_NAMES } from '@/types'
import { pluralDays } from '@/lib/dates'

interface ChatContext {
  passport: PassportCountry
  currentEntry?: VisaEntry
  history: VisaEntry[]
  rules: VisaRule[]
  schemes: Scheme[]
  currentScreen: string
}

function buildSystemPrompt(ctx: ChatContext): string {
  const parts = [
    `Ты — AI-помощник в приложении Overstay для цифровых номадов в ЮВА.`,
    `Отвечай на русском, кратко и по делу. Используй конкретные данные.`,
    `\nПрофиль пользователя:`,
    `- Паспорт: ${ctx.passport}`,
  ]

  if (ctx.currentEntry) {
    const e = ctx.currentEntry
    parts.push(`- Сейчас в: ${COUNTRY_NAMES[e.country] ?? e.country}`)
    parts.push(`- Виза: ${e.visa_type}, ${e.max_days} дней`)
    parts.push(`- Осталось: ${e.days_left} ${pluralDays(e.days_left)}`)
    parts.push(`- Дедлайн: ${e.deadline}`)
  }

  if (ctx.history.length > 0) {
    parts.push(`\nИстория перемещений:`)
    ctx.history.forEach(h => {
      parts.push(`- ${COUNTRY_NAMES[h.country]}: ${h.visa_type}, ${h.entry_date}, ${h.max_days} дн`)
    })
  }

  if (ctx.schemes.length > 0) {
    parts.push(`\nДоступные схемы визаранов в базе:`)
    ctx.schemes.slice(0, 10).forEach(s => {
      parts.push(`- ${s.from_country}→${s.to_country} ${s.border_crossing ?? 'авиа'}: $${s.cost_usd ?? '?'}, ${s.duration_hours ?? '?'}ч, ${s.works_count} подтверждений`)
    })
  }

  if (ctx.rules.length > 0) {
    parts.push(`\nВизовые правила для паспорта ${ctx.passport}:`)
    ctx.rules.forEach(r => {
      parts.push(`- ${COUNTRY_NAMES[r.country]}: ${r.visa_type}, ${r.max_days} дн. ${r.notes ?? ''}`)
    })
  }

  return parts.join('\n')
}

export function useChat(context: ChatContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const send = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), user_id: '', role: 'user',
      content: text, context_screen: context.currentScreen, created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const reply = await chatWithAssistant(apiMessages, buildSystemPrompt(context))
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), user_id: '', role: 'assistant',
        content: reply, context_screen: context.currentScreen, created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(), user_id: '', role: 'assistant',
        content: 'Не удалось получить ответ. Попробуй ещё раз.', created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [messages, context])

  const clear = useCallback(() => setMessages([]), [])

  return { messages, loading, send, clear }
}
```

- [ ] **Step 2: Create ChatFAQ.tsx**

```tsx
import { MessageCircle } from 'lucide-react'

const FAQ_CHIPS = [
  'Планируй мне визаран',
  'Чек-лист перед поездкой',
  'Что изменилось в визах?',
  'Сравни TH и MY',
  'Overstay — что грозит?',
  'Фразы на границе',
]

interface Props { onSelect: (text: string) => void }

export default function ChatFAQ({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4 p-3 rounded-full" style={{ background: 'var(--bg3)' }}>
        <MessageCircle size={28} strokeWidth={1.5} style={{ color: 'var(--text3)' }} />
      </div>
      <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text1)' }}>AI-помощник</h3>
      <p className="font-mono text-[10px] text-center mb-6" style={{ color: 'var(--text3)' }}>
        Знает твой паспорт, визу и историю
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {FAQ_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => onSelect(chip)}
            className="border rounded-full px-3 py-1.5 font-mono text-[10px] transition-all duration-150"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text3)'; e.currentTarget.style.background = 'var(--bg3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ChatMessage.tsx**

```tsx
import type { ChatMessage as ChatMessageType } from '@/types'

interface Props { message: ChatMessageType }

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-xl ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={{
          background: isUser ? 'var(--text1)' : 'var(--bg3)',
          color: isUser ? 'var(--bg)' : 'var(--text1)',
        }}
      >
        <p className={`text-[13px] leading-[1.6] ${isUser ? '' : 'font-mono text-[12px]'} whitespace-pre-wrap`}>
          {message.content}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create FollowUpChips.tsx**

```tsx
interface Props {
  lastMessage: string
  onSelect: (text: string) => void
}

const CONTEXTUAL_CHIPS: Record<string, string[]> = {
  default: ['Расскажи подробнее', 'Что ещё?', 'А если бюджет меньше?'],
  visa_run: ['Чек-лист для этого рана', 'Сколько стоит?', 'Есть отзывы?'],
  country: ['Визовые правила', 'Стоимость жизни', 'Как добраться?'],
}

export default function FollowUpChips({ lastMessage, onSelect }: Props) {
  const lower = lastMessage.toLowerCase()
  let chips = CONTEXTUAL_CHIPS.default
  if (lower.includes('ран') || lower.includes('маршрут') || lower.includes('граница')) {
    chips = CONTEXTUAL_CHIPS.visa_run
  } else if (lower.includes('страна') || lower.includes('таиланд') || lower.includes('малайзия')) {
    chips = CONTEXTUAL_CHIPS.country
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {chips.map(chip => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="shrink-0 border rounded-full px-2.5 py-1 font-mono text-[9px] transition-all duration-150"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create ChatInput.tsx**

```tsx
import { useState, useRef } from 'react'
import { Send, Paperclip } from 'lucide-react'

interface Props {
  onSend: (text: string) => void
  onAttach: () => void
  loading: boolean
}

export default function ChatInput({ onSend, onAttach, loading }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!text.trim() || loading) return
    onSend(text.trim())
    setText('')
  }

  return (
    <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
      <button onClick={onAttach} className="p-2 shrink-0" style={{ color: 'var(--text3)' }}>
        <Paperclip size={18} strokeWidth={1.5} />
      </button>
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="Спроси что угодно..."
        className="flex-1 py-2.5 px-3 rounded border font-mono text-[13px] outline-none transition-colors"
        style={{
          background: 'var(--bg3)',
          borderColor: 'var(--border)',
          color: 'var(--text1)',
        }}
        disabled={loading}
      />
      <button
        onClick={handleSend}
        className="p-2 shrink-0 transition-opacity"
        style={{ color: text.trim() ? 'var(--text1)' : 'var(--text4)', opacity: loading ? 0.5 : 1 }}
        disabled={loading}
      >
        <Send size={18} strokeWidth={1.5} />
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Create ChatSheet.tsx**

```tsx
import { useRef, useEffect } from 'react'
import BottomSheet from '@/components/BottomSheet'
import ChatFAQ from './ChatFAQ'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import FollowUpChips from './FollowUpChips'
import type { ChatMessage as ChatMessageType } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  messages: ChatMessageType[]
  loading: boolean
  onSend: (text: string) => void
}

export default function ChatSheet({ open, onClose, messages, loading, onSend }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
  const isEmpty = messages.length === 0

  return (
    <BottomSheet open={open} onClose={onClose} height="85vh">
      <div className="flex flex-col" style={{ height: 'calc(85vh - 80px)' }}>
        <h2 className="text-[17px] font-semibold mb-4" style={{ color: 'var(--text1)' }}>AI-помощник</h2>

        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {isEmpty ? (
            <ChatFAQ onSelect={onSend} />
          ) : (
            <>
              {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
              {loading && (
                <div className="flex gap-1 py-2 px-3">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: 'var(--text3)',
                        animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {lastAssistantMsg && !loading && (
          <FollowUpChips lastMessage={lastAssistantMsg.content} onSelect={onSend} />
        )}

        <ChatInput onSend={onSend} onAttach={() => {/* TODO: photo attach */}} loading={loading} />
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add AI chat components — FAQ, messages, input, follow-up chips"
```

---

## Task 9: Wire Up App.tsx with All Pages and Modals

**Files:**
- Create: `frontend/src/components/AddEntrySheet.tsx`, `frontend/src/components/PhotoUpload.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create PhotoUpload.tsx**

```tsx
import { Camera } from 'lucide-react'
import { useRef } from 'react'

interface Props { onCapture: (base64: string) => void; loading: boolean }

export default function PhotoUpload({ onCapture, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      onCapture(base64)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <div
        onClick={() => inputRef.current?.click()}
        className="border border-dashed rounded-[5px] p-6 text-center cursor-pointer transition-all duration-150 mb-4"
        style={{ borderColor: 'var(--border)', opacity: loading ? 0.5 : 1 }}
      >
        <div className="flex justify-center mb-2.5" style={{ color: 'var(--text2)' }}>
          <Camera size={34} strokeWidth={1.5} />
        </div>
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--text1)' }}>
          {loading ? 'Распознаю...' : 'Сфоткай штамп в паспорте'}
        </div>
        <div className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>
          AI распознает страну и дату<br />фото не сохраняется на сервере
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create AddEntrySheet.tsx**

```tsx
import { useState } from 'react'
import BottomSheet from './BottomSheet'
import PhotoUpload from './PhotoUpload'
import { recognizeStamp } from '@/lib/claude'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: { country: string; visa_type: string; entry_date: string }) => void
}

export default function AddEntrySheet({ open, onClose, onSave }: Props) {
  const [country, setCountry] = useState('')
  const [visaType, setVisaType] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [recognizing, setRecognizing] = useState(false)

  const handleCapture = async (base64: string) => {
    setRecognizing(true)
    try {
      const result = await recognizeStamp(base64)
      if (result.country) setCountry(result.country)
      if (result.visa_type) setVisaType(result.visa_type)
      if (result.entry_date) setEntryDate(result.entry_date)
    } finally {
      setRecognizing(false)
    }
  }

  const handleSave = () => {
    if (!country || !visaType || !entryDate) return
    onSave({ country, visa_type: visaType, entry_date: entryDate })
    setCountry(''); setVisaType(''); setEntryDate('')
    onClose()
  }

  const inputStyle = {
    background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text1)',
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-[17px] font-semibold mb-5" style={{ color: 'var(--text1)' }}>Добавить въезд</h2>

      <PhotoUpload onCapture={handleCapture} loading={recognizing} />

      <div className="flex items-center gap-2.5 font-mono text-[9px] uppercase my-3" style={{ color: 'var(--text3)', letterSpacing: '0.26em' }}>
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        или вручную
        <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Страна</label>
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="VN" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Тип визы</label>
          <input value={visaType} onChange={e => setVisaType(e.target.value)} placeholder="E-Visa 90d" className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
        </div>
      </div>
      <div className="mb-2">
        <label className="font-mono text-[9px] uppercase mb-1 block" style={{ color: 'var(--text3)', letterSpacing: '0.2em' }}>Дата въезда</label>
        <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full border rounded py-2.5 px-3 font-mono text-[13px] outline-none" style={inputStyle} />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded font-semibold text-sm tracking-wide mt-3 transition-all duration-150 active:scale-[0.98]"
        style={{ background: 'var(--text1)', color: 'var(--bg)' }}
      >
        Сохранить
      </button>
    </BottomSheet>
  )
}
```

- [ ] **Step 3: Update App.tsx — full wiring**

```tsx
import { useState } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import StatusPage from '@/pages/StatusPage'
import SchemesPage from '@/pages/SchemesPage'
import NextPage from '@/pages/NextPage'
import AddEntrySheet from '@/components/AddEntrySheet'
import ChatSheet from '@/components/chat/ChatSheet'
import { useChat } from '@/hooks/useChat'
import type { Screen } from '@/types'

const SCREEN_TITLES: Record<Screen, string> = {
  status: 'Overstay',
  schemes: 'Схемы',
  next: 'Дальше',
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('status')
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const chat = useChat({
    passport: 'RU',
    currentEntry: {
      id: '1', user_id: '1', country: 'VN', entry_date: '2026-03-15',
      visa_type: 'evisa_90', max_days: 90, created_at: '',
      deadline: '2026-06-13', days_left: 14,
    },
    history: [],
    rules: [],
    schemes: [],
    currentScreen: screen,
  })

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Header title={SCREEN_TITLES[screen]} passport="RU" onChatOpen={() => setChatOpen(true)} />

        <div className="flex-1 overflow-hidden">
          {screen === 'status' && <StatusPage onNavigate={setScreen} onStamp={() => setEntrySheetOpen(true)} />}
          {screen === 'schemes' && <SchemesPage />}
          {screen === 'next' && <NextPage onNavigate={setScreen} />}
        </div>

        <BottomNav active={screen} onChange={setScreen} />

        <AddEntrySheet
          open={entrySheetOpen}
          onClose={() => setEntrySheetOpen(false)}
          onSave={data => { console.log('New entry:', data) }}
        />

        <ChatSheet
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={chat.messages}
          loading={chat.loading}
          onSend={chat.send}
        />
      </div>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Verify the app runs**

```bash
cd frontend && npm run dev
```

Expected: All 3 tabs render, theme toggle works, chat sheet opens with FAQ chips, add entry modal opens.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: wire up App with all pages, AddEntry modal, and AI chat"
```

---

## Task 10: Supabase Hooks (Replace Mock Data)

**Files:**
- Create: `frontend/src/hooks/useUser.ts`, `frontend/src/hooks/useVisaEntry.ts`, `frontend/src/hooks/useSchemes.ts`

- [ ] **Step 1: Create hooks/useUser.ts**

```ts
import { useState, useEffect } from 'react'
import { supabase, getOrCreateUser, setTelegramContext } from '@/lib/supabase'
import { getTelegramId } from '@/lib/telegram'
import type { User } from '@/types'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const telegramId = getTelegramId()
      if (!telegramId) {
        // Dev fallback
        setUser({ id: 'dev', telegram_id: 12345, passport_country: 'RU', created_at: '' })
        setLoading(false)
        return
      }
      await setTelegramContext(telegramId)
      const u = await getOrCreateUser(telegramId, 'RU')
      setUser(u)
      setLoading(false)
    }
    init()
  }, [])

  return { user, loading }
}
```

- [ ] **Step 2: Create hooks/useVisaEntry.ts**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { VisaEntry } from '@/types'

export function useVisaEntry(userId: string | undefined) {
  const [current, setCurrent] = useState<VisaEntry | null>(null)
  const [history, setHistory] = useState<VisaEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data } = await supabase
      .from('visa_entries_with_deadline')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })

    if (data && data.length > 0) {
      const active = data.find((e: VisaEntry) => e.days_left > 0) ?? data[0]
      setCurrent(active)
      setHistory(data.filter((e: VisaEntry) => e.id !== active.id))
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  const addEntry = useCallback(async (entry: { country: string; visa_type: string; entry_date: string }) => {
    if (!userId) return
    // Look up max_days from visa_rules
    const { data: rule } = await supabase
      .from('visa_rules')
      .select('max_days')
      .eq('country', entry.country)
      .eq('visa_type', entry.visa_type)
      .single()

    await supabase.from('visa_entries').insert({
      user_id: userId,
      country: entry.country,
      visa_type: entry.visa_type,
      entry_date: entry.entry_date,
      max_days: rule?.max_days ?? 30,
    })
    await fetch()
  }, [userId, fetch])

  return { current, history, loading, addEntry, refetch: fetch }
}
```

- [ ] **Step 3: Create hooks/useSchemes.ts**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Scheme, SchemeVote } from '@/types'

export function useSchemes(passport: string, userId: string | undefined) {
  const [schemes, setSchemes] = useState<Scheme[]>([])
  const [votes, setVotes] = useState<Record<string, 'works' | 'broken'>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: schemeData } = await supabase
        .from('schemes')
        .select('*')
        .eq('passport', passport)
        .order('works_count', { ascending: false })

      if (schemeData) setSchemes(schemeData)

      if (userId) {
        const { data: voteData } = await supabase
          .from('scheme_votes')
          .select('scheme_id, vote')
          .eq('user_id', userId)

        if (voteData) {
          const map: Record<string, 'works' | 'broken'> = {}
          voteData.forEach((v: SchemeVote) => { map[v.scheme_id] = v.vote })
          setVotes(map)
        }
      }
      setLoading(false)
    }
    fetch()
  }, [passport, userId])

  const vote = useCallback(async (schemeId: string, voteType: 'works' | 'broken') => {
    if (!userId) return
    const existing = votes[schemeId]

    if (existing === voteType) {
      // Remove vote
      await supabase.from('scheme_votes').delete().eq('user_id', userId).eq('scheme_id', schemeId)
      setVotes(prev => { const n = { ...prev }; delete n[schemeId]; return n })
      // Decrement count
      const field = voteType === 'works' ? 'works_count' : 'broken_count'
      const scheme = schemes.find(s => s.id === schemeId)
      if (scheme) {
        await supabase.from('schemes').update({ [field]: Math.max(0, scheme[field] - 1) }).eq('id', schemeId)
        setSchemes(prev => prev.map(s => s.id === schemeId ? { ...s, [field]: Math.max(0, s[field] - 1) } : s))
      }
    } else {
      // Upsert vote
      await supabase.from('scheme_votes').upsert({ user_id: userId, scheme_id: schemeId, vote: voteType })
      setVotes(prev => ({ ...prev, [schemeId]: voteType }))
      // Update counts
      const scheme = schemes.find(s => s.id === schemeId)
      if (scheme) {
        const inc = voteType === 'works' ? 'works_count' : 'broken_count'
        const dec = voteType === 'works' ? 'broken_count' : 'works_count'
        const updates: Record<string, number> = { [inc]: scheme[inc] + 1 }
        if (existing) updates[dec] = Math.max(0, scheme[dec] - 1)
        await supabase.from('schemes').update(updates).eq('id', schemeId)
        setSchemes(prev => prev.map(s => s.id === schemeId ? { ...s, ...updates } : s))
      }
    }
  }, [userId, votes, schemes])

  return { schemes, votes, loading, vote }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add Supabase hooks for user, visa entries, and schemes"
```

---

## Task 11: Telegram Bot

**Files:**
- Create: `bot/package.json`, `bot/tsconfig.json`, `bot/.env.example`, `bot/index.ts`, `bot/scheduler.ts`, `bot/messages.ts`, `bot/Procfile`

- [ ] **Step 1: Initialize bot project**

```bash
cd /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
mkdir -p bot
cd bot
npm init -y
npm install telegraf node-cron @supabase/supabase-js dotenv
npm install -D typescript @types/node ts-node
```

- [ ] **Step 2: Create bot/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: Create bot/.env.example**

```env
BOT_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
FRONTEND_URL=
```

- [ ] **Step 4: Create bot/messages.ts**

```ts
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
```

- [ ] **Step 5: Create bot/scheduler.ts**

```ts
import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { Telegraf } from 'telegraf'
import { formatReminderMessage } from './messages'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export function startScheduler(bot: Telegraf) {
  cron.schedule('0 10 * * *', async () => {
    console.log('Running visa deadline check...')

    const { data: expiring } = await supabase
      .from('visa_entries_with_deadline')
      .select('*, users(telegram_id, passport_country)')
      .gte('days_left', 1)
      .lte('days_left', 14)

    for (const entry of expiring ?? []) {
      const telegramId = (entry as any).users?.telegram_id
      if (!telegramId) continue

      const { data: schemes } = await supabase
        .from('schemes')
        .select('*')
        .eq('passport', (entry as any).users.passport_country)
        .eq('from_country', entry.country)
        .order('works_count', { ascending: false })
        .limit(3)

      const msg = formatReminderMessage(entry, entry.days_left, schemes ?? [])

      try {
        await bot.telegram.sendMessage(telegramId, msg, { parse_mode: 'HTML' })
      } catch (e) {
        console.error(`Failed to send to ${telegramId}:`, e)
      }
    }
  })
}
```

- [ ] **Step 6: Create bot/index.ts**

```ts
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
```

- [ ] **Step 7: Create bot/Procfile**

```
worker: npx ts-node index.ts
```

- [ ] **Step 8: Commit**

```bash
git add bot/
git commit -m "feat: add Telegram bot with scheduler and reminder messages"
```

---

## Task 12: Deploy Configs & README

**Files:**
- Create: `railway.json`, `README.md`, `.gitignore`

- [ ] **Step 1: Create railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "cd bot && npx ts-node index.ts", "restartPolicyType": "ON_FAILURE" }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
.DS_Store
.superpowers/
```

- [ ] **Step 3: Create README.md**

```markdown
# Overstay

Telegram Mini App для цифровых номадов. Трекер визовых дедлайнов + community-база визаранов + AI-помощник.

## Quick Start

### Frontend
```bash
cd frontend && npm install && npm run dev
```

### Bot
```bash
cd bot && npm install && npx ts-node index.ts
```

### Supabase
Apply `supabase/migrations/001_initial.sql` in the SQL Editor.

## Stack

- React + Vite + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + RLS)
- Telegraf.js bot
- Claude API (stamp recognition + AI assistant)
- Vercel (frontend) + Railway (bot)
```

- [ ] **Step 4: Commit**

```bash
git add railway.json .gitignore README.md
git commit -m "feat: add deploy configs and README"
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Project scaffolding & config | 5 min |
| 2 | Supabase schema & seed data | 3 min |
| 3 | Types, lib, theme context | 5 min |
| 4 | Shared components (nav, header, sheet) | 5 min |
| 5 | StatusPage components | 8 min |
| 6 | SchemesPage | 5 min |
| 7 | NextPage | 4 min |
| 8 | AI Chat components | 8 min |
| 9 | Wire up App.tsx | 5 min |
| 10 | Supabase hooks | 5 min |
| 11 | Telegram bot | 5 min |
| 12 | Deploy configs & README | 2 min |

**Total: 12 tasks, ~60 minutes of implementation time.**
