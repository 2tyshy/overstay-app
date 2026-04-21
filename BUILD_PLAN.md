# RunLog — Build Plan

---

## Структура проекта

```
runlog/
├── AGENT_BRIEF.md          ← читать первым
├── DESIGN_SYSTEM.md        ← дизайн-система
├── BUILD_PLAN.md           ← этот файл
├── UI_REFERENCE.html       ← финальный UI, не менять
│
├── frontend/               ← Telegram Mini App
│   ├── src/
│   │   ├── pages/
│   │   │   ├── StatusPage.tsx
│   │   │   ├── SchemesPage.tsx
│   │   │   └── NextPage.tsx
│   │   ├── components/
│   │   │   ├── HeroCard.tsx
│   │   │   ├── RiskStrip.tsx
│   │   │   ├── SegmentedBar.tsx
│   │   │   ├── StatsRow.tsx
│   │   │   ├── AlertStrip.tsx
│   │   │   ├── ActionGrid.tsx
│   │   │   ├── SchemeCard.tsx
│   │   │   ├── DestRow.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── AddEntryModal.tsx
│   │   │   └── PhotoUpload.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── claude.ts
│   │   │   ├── telegram.ts
│   │   │   └── dates.ts
│   │   ├── hooks/
│   │   │   ├── useVisaEntry.ts
│   │   │   └── useSchemes.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── bot/
│   ├── index.ts
│   ├── scheduler.ts
│   ├── messages.ts
│   └── package.json
│
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## Шаг 1 — Суpabase схема

Создай файл `supabase/migrations/001_initial.sql`:

```sql
-- Пользователи
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  passport_country TEXT NOT NULL CHECK (passport_country IN ('RU','UA','KZ')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Визовые въезды
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

-- Вычисляемый дедлайн
CREATE VIEW visa_entries_with_deadline AS
SELECT
  *,
  entry_date + max_days AS deadline,
  (entry_date + max_days) - CURRENT_DATE AS days_left
FROM visa_entries;

-- Схемы визаранов
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

-- Голосования (чтобы один пользователь не голосовал дважды)
CREATE TABLE scheme_votes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scheme_id UUID REFERENCES schemes(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('works','broken')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, scheme_id)
);

-- Визовые правила (справочник)
CREATE TABLE visa_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport TEXT NOT NULL,
  country TEXT NOT NULL,
  visa_type TEXT NOT NULL,
  max_days INTEGER NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(passport, country, visa_type)
);

-- Seed: базовые визовые правила
INSERT INTO visa_rules (passport, country, visa_type, max_days, notes) VALUES
('RU','VN','evisa_90', 90, 'E-visa онлайн за $25'),
('RU','TH','visa_exempt_30', 30, 'Безвиз на 30 дней'),
('RU','TH','dtv_180', 180, 'DTV виза, нужен $15k на счету'),
('RU','KH','visa_on_arrival_30', 30, '$30 на границе'),
('RU','LA','visa_on_arrival_30', 30, '$20-35 на границе'),
('RU','MY','visa_exempt_30', 30, 'Безвиз 30 дней'),
('RU','ID','visa_on_arrival_60', 60, 'VOA + продление = 60 дней'),
('RU','PH','visa_exempt_30', 30, 'Можно продлить до 59 дней'),
('UA','VN','evisa_90', 90, 'E-visa онлайн'),
('UA','TH','visa_exempt_30', 30, 'Безвиз 30 дней'),
('UA','MY','visa_exempt_30', 30, 'Безвиз 30 дней'),
('KZ','VN','evisa_90', 90, 'E-visa онлайн'),
('KZ','TH','visa_exempt_30', 30, 'Безвиз 30 дней'),
('KZ','MY','visa_exempt_30', 30, 'Безвиз 30 дней');

-- Seed: реальные схемы (добавь свои перед запуском!)
INSERT INTO schemes (passport, from_country, to_country, border_crossing, cost_usd, duration_hours, description, tip, verified_at, works_count) VALUES
('RU','VN','LA','Nam Phao / Cau Treo', 25, 10,
 'Автобус из HCMC → Vinh → граница Nam Phao. Пешком через КПП, штамп Лаос, разворот. Новый VN штамп 90 дней. Весь день туда-обратно.',
 'Бери $35 налик — $20 виза Лаос + буфер на транспорт на месте',
 '2026-03-15', 47),

('RU','VN','KH','Moc Bai / Bavet', 40, 5,
 'Из HCMC автобус до Moc Bai — 2 часа. Быстрый КПП в Камбоджу и назад. Самый короткий ран из Хошимина, можно уложиться в полдня.',
 'Виза Камбоджа $30 на месте. Некоторые автобусы берут $5 доп — торгуйся',
 '2026-02-20', 31),

('RU','VN','KR',NULL, 200, 168,
 'Рейс в Сеул на неделю. В Thai консульстве e-Visa за 3 дня. Прилетаешь обратно с готовой Thai визой или сразу в Бангкок. Корея 90 дней безвиз для RU.',
 'Совмести с путешествием — минус стресс, плюс Thai виза готова',
 '2026-01-10', 19);

-- RLS политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_votes ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только свои данные
CREATE POLICY "users_own" ON users FOR ALL USING (telegram_id = (current_setting('app.telegram_id'))::BIGINT);
CREATE POLICY "entries_own" ON visa_entries FOR ALL USING (user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id'))::BIGINT));

-- Схемы читают все, пишут авторизованные
CREATE POLICY "schemes_read" ON schemes FOR SELECT USING (true);
CREATE POLICY "schemes_write" ON schemes FOR INSERT WITH CHECK (true);

-- Голоса
CREATE POLICY "votes_own" ON scheme_votes FOR ALL USING (user_id = (SELECT id FROM users WHERE telegram_id = (current_setting('app.telegram_id'))::BIGINT));
```

---

## Шаг 2 — Frontend setup

```bash
cd frontend

# Инициализация
npm create vite@latest . -- --template react-ts
npm install

# Зависимости
npm install @supabase/supabase-js @twa-dev/sdk
npm install geist lucide-react
npm install date-fns
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### `tailwind.config.ts`

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
      colors: {
        black: '#000000',
        b1: '#090909',
        b2: '#101010',
        b3: '#181818',
        b4: '#222222',
        w1: '#ebebeb',
        w2: '#a8a8a8',
        w3: '#606060',
        w4: '#2e2e2e',
        w5: '#1c1c1c',
        red: '#ff2626',
      },
      letterSpacing: {
        tight: '-0.04em',
        tighter: '-0.03em',
        wide: '0.14em',
        wider: '0.26em',
        widest: '0.38em',
      },
    },
  },
} satisfies Config
```

### `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WebApp from '@twa-dev/sdk'
import 'geist/dist/sans.css'
import 'geist/dist/mono.css'
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

### `src/index.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  height: 100%;
  background: #000000;
  color: #ebebeb;
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior: none;
}

/* Убираем iOS стили */
input, button, select, textarea {
  -webkit-appearance: none;
  appearance: none;
  border-radius: 0;
}

/* Скроллбар */
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; }
```

---

## Шаг 3 — Types

### `src/types/index.ts`

```typescript
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
  // computed
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

export interface VisaRule {
  passport: PassportCountry
  country: string
  visa_type: string
  max_days: number
  notes?: string
}

export type RiskLevel = 'safe' | 'warn' | 'danger'

export function getRiskLevel(daysLeft: number, maxDays: number): RiskLevel {
  const pct = daysLeft / maxDays
  if (pct > 0.25) return 'safe'
  if (pct > 0.1) return 'warn'
  return 'danger'
}
```

---

## Шаг 4 — Lib

### `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import WebApp from '@twa-dev/sdk'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Установить telegram_id для RLS
export async function setTelegramContext(telegramId: number) {
  await supabase.rpc('set_config', {
    setting_name: 'app.telegram_id',
    setting_value: String(telegramId)
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

### `src/lib/claude.ts`

```typescript
// Распознавание фото штампа/визы через Claude API
// Фото НЕ сохраняется — только base64 → Claude → результат → забыть

export async function recognizeVisaStamp(imageBase64: string): Promise<{
  country: string | null
  entry_date: string | null
  visa_type: string | null
}> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Посмотри на это фото штампа или визы в паспорте.
Извлеки ТОЛЬКО три поля:
1. country — ISO код страны (VN, TH, KH, LA, MY, ID, PH, KR, etc.)
2. entry_date — дата въезда в формате YYYY-MM-DD
3. visa_type — тип (evisa_90, visa_exempt_30, dtv_180, visa_on_arrival_30, etc.)

Ответь ТОЛЬКО JSON, без markdown, без пояснений:
{"country":"VN","entry_date":"2026-03-15","visa_type":"evisa_90"}

Если поле не определить — null. Не упоминай персональные данные.`,
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
```

### `src/lib/dates.ts`

```typescript
import { differenceInDays, addDays, format, parseISO } from 'date-fns'

export function getDaysLeft(entryDate: string, maxDays: number): number {
  const deadline = addDays(parseISO(entryDate), maxDays)
  return differenceInDays(deadline, new Date())
}

export function getDeadline(entryDate: string, maxDays: number): string {
  return format(addDays(parseISO(entryDate), maxDays), 'd MMM yyyy')
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM')
}

export function getSegments(daysLeft: number, maxDays: number, total = 22) {
  const used = Math.round(((maxDays - daysLeft) / maxDays) * total)
  return Array.from({ length: total }, (_, i) => {
    if (i >= used) return 'empty'
    if (i >= used - 3) return 'danger'
    return 'used'
  })
}
```

---

## Шаг 5 — Компоненты (реализуй строго по UI_REFERENCE.html)

### Порядок реализации:

1. `BottomNav.tsx` — навигация
2. `HeroCard.tsx` — главная карточка (включает RiskStrip, SegmentedBar, StatsRow)
3. `AlertStrip.tsx`
4. `ActionGrid.tsx`
5. `StatusPage.tsx` — собирает компоненты
6. `SchemeCard.tsx`
7. `SchemesPage.tsx`
8. `DestRow.tsx`
9. `NextPage.tsx`
10. `PhotoUpload.tsx`
11. `AddEntryModal.tsx`
12. `App.tsx` — роутинг между страницами

### `App.tsx` — базовый роутинг

```tsx
import { useState } from 'react'
import StatusPage from './pages/StatusPage'
import SchemesPage from './pages/SchemesPage'
import NextPage from './pages/NextPage'
import BottomNav from './components/BottomNav'

type Screen = 'status' | 'schemes' | 'next'

export default function App() {
  const [screen, setScreen] = useState<Screen>('status')

  return (
    <div className="h-screen bg-black overflow-hidden relative flex flex-col">
      <div className="flex-1 overflow-hidden">
        {screen === 'status'  && <StatusPage onNavigate={setScreen} />}
        {screen === 'schemes' && <SchemesPage />}
        {screen === 'next'    && <NextPage />}
      </div>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}
```

---

## Шаг 6 — Bot

```bash
cd bot
npm init -y
npm install telegraf node-cron @supabase/supabase-js dotenv
npm install -D typescript @types/node ts-node
```

### `bot/index.ts`

```typescript
import { Telegraf, Markup } from 'telegraf'
import dotenv from 'dotenv'
import { startScheduler } from './scheduler'

dotenv.config()

const bot = new Telegraf(process.env.BOT_TOKEN!)

bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name

  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nRunLog — трекер виз для номадов в ЮВА.\nОтслеживай дедлайны, находи схемы визаранов.`,
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть RunLog', process.env.FRONTEND_URL!)
    ])
  )
})

bot.command('status', async (ctx) => {
  // TODO: получить активную визу пользователя и показать текстом
  await ctx.reply('Открой приложение для деталей', Markup.inlineKeyboard([
    Markup.button.webApp('Открыть', process.env.FRONTEND_URL!)
  ]))
})

startScheduler(bot)

bot.launch()
console.log('Bot started')

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
```

### `bot/scheduler.ts`

```typescript
import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { Telegraf } from 'telegraf'
import { formatReminderMessage } from './messages'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export function startScheduler(bot: Telegraf) {
  // Каждый день в 10:00 UTC
  cron.schedule('0 10 * * *', async () => {
    console.log('Running visa deadline check...')

    const today = new Date().toISOString().split('T')[0]
    const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

    const { data: expiring } = await supabase
      .from('visa_entries_with_deadline')
      .select('*, users(telegram_id, passport_country)')
      .gte('days_left', 1)
      .lte('days_left', 14)

    for (const entry of expiring ?? []) {
      const telegramId = entry.users?.telegram_id
      if (!telegramId) continue

      // Найти топ-3 схемы
      const { data: schemes } = await supabase
        .from('schemes')
        .select('*')
        .eq('passport', entry.users.passport_country)
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

### `bot/messages.ts`

```typescript
export function formatReminderMessage(entry: any, daysLeft: number, schemes: any[]): string {
  const emoji = daysLeft <= 7 ? '🔴' : '🟡'
  const countryFlag = getFlag(entry.country)

  let msg = `${emoji} <b>Осталось ${daysLeft} ${pluralDays(daysLeft)} во ${countryFlag}</b>\n\n`
  msg += `Дедлайн: <b>${entry.deadline}</b>\n\n`

  if (schemes.length > 0) {
    msg += `🗺 <b>Топ схемы для визарана:</b>\n\n`
    schemes.forEach((s, i) => {
      const to = getFlag(s.to_country)
      const cost = s.cost_usd ? `~$${s.cost_usd}` : ''
      const time = s.duration_hours ? `~${s.duration_hours}ч` : ''
      msg += `${i + 1}. ${countryFlag}→${to} ${s.border_crossing ?? ''} ${cost} ${time}\n`
      msg += `   ✅ ${s.works_count} подтверждений\n\n`
    })
  }

  return msg
}

function pluralDays(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день'
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'дня'
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

---

## Шаг 7 — Deploy конфиги

### `frontend/vercel.json`

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

### `bot/Procfile`

```
worker: npx ts-node index.ts
```

### `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": { "startCommand": "npx ts-node bot/index.ts", "restartPolicyType": "ON_FAILURE" }
}
```

---

## MVP Checklist

- [ ] БД миграция применена в Supabase
- [ ] Seed данные загружены (visa_rules + первые schemes)
- [ ] Frontend запускается локально
- [ ] StatusPage отображает визу / пустое состояние
- [ ] Фото штампа → Claude → автозаполнение формы
- [ ] SchemesPage фильтрует и показывает схемы
- [ ] Голосование работает
- [ ] NextPage показывает страны под паспорт
- [ ] Bot отвечает на /start
- [ ] Scheduler отправляет уведомления (проверь в dev)
- [ ] Frontend задеплоен на Vercel
- [ ] Bot задеплоен на Railway
- [ ] Mini App URL настроен в BotFather
- [ ] Работает на iOS Safari в Telegram
- [ ] Работает на Android Chrome в Telegram
