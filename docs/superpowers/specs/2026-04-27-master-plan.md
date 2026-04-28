# RunLog — Master Plan (2026-04-27)

> Результат параллельного аудита: frontend bugs, bot bugs, security audit, TODO review.
> Приоритет: CRITICAL security → high bugs → features → polish.

---

## СТАТУС ПРОЕКТА

Деплой: https://frontend-beta-eight-48.vercel.app | Bot: @ooverstay_bot  
Stack: React + Vite + TS + Tailwind v4 + Supabase + Telegraf.js  
Состояние: Core MVP готов, критические дыры в безопасности, 4 фичи в TODO

---

## ФАЗА 1 — КРИТИЧЕСКАЯ БЕЗОПАСНОСТЬ (делать немедленно)

### 1.1 Восстановить RLS (CRITICAL — вся БД открыта)

`supabase/migrations/004_open_user_scoped_rls.sql` заменил все политики на `USING (true)` — любой с anon key читает/пишет всё.

**Правильное решение (JWT-based):**
- Supabase Edge Function `tg-auth`: принимает `initData` от Telegram WebApp, верифицирует HMAC подпись с BOT_TOKEN, выдаёт Supabase JWT с `sub = telegram_id`
- Frontend: вызывает edge function при инициализации, хранит JWT, передаёт в каждый запрос
- RLS политики: `USING (auth.uid()::text = telegram_id::text)` — нормальная user-scoped фильтрация

**Временный фикс (до реализации Edge Function):**
- Добавить `user_id` как явный фильтр во всех client queries (`.eq('user_id', userId)`)
- Убрать SET CONFIG вызов (он не работает в PgBouncer transaction mode)
- Добавить RLS на `visa_rules`: только SELECT, без мутаций через anon

**Файлы для изменения:**
- `supabase/migrations/005_restore_rls.sql` (новая миграция)
- `frontend/src/lib/supabase.ts`
- `frontend/src/hooks/useUser.ts`
- `frontend/src/hooks/useSchemes.ts`
- `frontend/src/hooks/useSchemeComments.ts`
- `supabase/functions/tg-auth/index.ts` (новый)

### 1.2 Ротировать Gemini API ключ (CRITICAL)

`VITE_GEMINI_API_KEY` вшит в production JS bundle — виден в devtools. Нужно:
1. Ротировать ключ в Google Cloud Console
2. Создать Supabase Edge Function `ai-proxy` — проксирует Gemini/Claude запросы, ключ остаётся на сервере
3. Frontend обращается к `/functions/v1/ai-proxy`, не к Gemini напрямую

**Файлы:**
- `supabase/functions/ai-proxy/index.ts` (новый)
- `frontend/src/lib/gemini.ts` — поменять endpoint
- `frontend/src/lib/ocr.ts` — поменять endpoint

### 1.3 HTML escaping в bot messages (HIGH)

`bot/messages.ts` интерполирует `entry.visa_type`, `entry.country`, `s.border_crossing` напрямую в HTML-строки с `parse_mode: 'HTML'`.  
Stored XSS в Telegram: пользователь может вставить `</code><a href="...">` в visa_type.

**Фикс:** одна утилита `escapeHtml(s: string)` в `bot/messages.ts`, обернуть все user-provided поля.

### 1.4 CHECK constraints на visa_entries (MED)

`visa_entries.country` и `visa_entries.visa_type` — unconstrained freetext. Добавить:
- `country ~ '^[A-Z]{2}$'`
- `char_length(visa_type) <= 100`
- `char_length(notes) <= 2000`

В `supabase/migrations/005_restore_rls.sql`.

### 1.5 Bot validation и error handling (CRITICAL/HIGH)

- `bot/index.ts:7` — `process.env.BOT_TOKEN!` без проверки → crash на старте
- `bot/index.ts:77` — `bot.launch()` без `.catch()` → silent failure
- `bot/index.ts:10` — `ctx.from.first_name` без null check → crash на channel messages
- `bot/index.ts:14` — `FRONTEND_URL` без проверки → undefined в inline keyboard

**Фикс:** валидация всех env vars на старте, `bot.catch()` handler, null check на `ctx.from`.

### 1.6 bot/.gitignore (MED)

Добавить `bot/.gitignore` с `.env` — защита если bot вынесут в отдельный repo.

---

## ФАЗА 2 — КРИТИЧЕСКИЕ БАГИ FRONTEND

### 2.1 Hardcoded user_id (CRITICAL)

`App.tsx:194` — `user_id: '1'` вместо `user_id: userId`. Все записи создаются с user_id='1'.  
**Фикс:** `user_id: userId ?? 'dev'` (использовать реальный userId).

### 2.2 useVisaEntry hook — мёртвый код (LOW)

`frontend/src/hooks/useVisaEntry.ts` — весь файл не импортируется нигде. Удалить.

### 2.3 VisaRule type — мёртвый тип (LOW)

`frontend/src/types/index.ts:56-64` — `VisaRule` не используется во frontend. Удалить или перенести.

### 2.4 RingProgress null check (HIGH)

`frontend/src/components/RingProgress.tsx:13` — `parseLocalDate(entryDate)` без проверки `entryDate !== undefined`.  
**Фикс:** early return если entryDate undefined.

### 2.5 EntryDetailSheet — подтверждение удаления (UX)

Удаление записи без confirm диалога. Добавить BottomSheet с "Удалить?" / "Отмена".

### 2.6 SchemeCommentsThread — подтверждение удаления коммента (UX)

Аналогично — confirm перед удалением.

### 2.7 Sync toast confusion (MED)

`App.tsx:219` — два тоста при успехе (локальный сейв + "☁ синк ок"). Убрать второй тост или смёрджить в один.

---

## ФАЗА 3 — НЕЗАКРЫТЫЕ TODO ФИЧИ

### 3.1 Редактирование схем (medium/high value)

Инфраструктура 90% готова (`useSchemes` hook). Нужно:
- Кнопка "Редактировать" в `SchemeCard` (только для автора — `author_id === userId`)
- Открывать AddSchemeSheet в режиме edit с prefilled данными
- `useSchemes.updateScheme()` — UPDATE запрос
- Кнопка "Удалить" с confirm

**Файлы:** `frontend/src/components/SchemeCard.tsx`, `frontend/src/pages/SchemesPage.tsx`, `frontend/src/hooks/useSchemes.ts`

### 3.2 FAQ страница (hard/high value)

Вместо `ChatSheet` — структурированные FAQ с AI ответами. Концепт:
- 6-8 предустановленных вопросов (визовые правила, схемы, КПП)
- По клику → показывает cached ответ ИЛИ запрашивает Claude
- Не требует личный API ключ (через ai-proxy edge function)
- Отдельный экран, доступный с main nav

**Файлы:** новый `frontend/src/pages/FAQPage.tsx`, обновить `frontend/src/components/BottomNav.tsx`

### 3.3 Скан штампа — полировка (easy/high value)

`CameraSheet` + `ocr.ts` уже работают. Нужно:
- Camera permission prompt (iOS/Android UX)
- Guidance when OCR fails ("Попробуй сфотографировать четче")
- После миграции ai-proxy — убрать требование личного Gemini ключа

**Файлы:** `frontend/src/components/CameraSheet.tsx`

### 3.4 Город на странице статуса (medium/high value)

Карточка с текущей страной пребывания на StatusPage:
- Флаг + название страны
- Cost of living (уже есть в данных NextPage)
- Топ-3 города (уже есть в NextPage данных)

**Файлы:** новый компонент `frontend/src/components/CountryCard.tsx`, обновить `StatusPage.tsx`

---

## ФАЗА 4 — УЛУЧШЕНИЯ (после фаз 1-3)

| Приоритет | Задача | Сложность |
|-----------|--------|-----------|
| HIGH | Timezone-aware notifications (сейчас 10:00 UTC) | medium |
| HIGH | Батчинг нотификаций (несколько виз → одно сообщение) | easy |
| MED | Scheme relevance badge (🔥 для текущей страны) | easy |
| MED | Offline-first bot (retry очередь при Supabase down) | hard |
| LOW | Rate limit на схем-комменты (1 в день per user) | easy |
| LOW | Visa rules admin UI (сейчас hardcoded в seed) | hard |

---

## ПОРЯДОК РЕАЛИЗАЦИИ

```
Sprint 1 (этот):
  ├── 1.3 HTML escaping в bot (30 мин)
  ├── 1.5 Bot validation + error handling (1 час)
  ├── 1.6 bot/.gitignore (5 мин)
  ├── 2.1 Fix hardcoded user_id (15 мин)
  ├── 2.2-2.3 Удалить мёртвый код (15 мин)
  ├── 2.4 RingProgress null check (15 мин)
  ├── 2.7 Sync toast fix (15 мин)
  └── 1.4 + 005 миграция с CHECK constraints (30 мин)

Sprint 2:
  ├── 1.2 ai-proxy Edge Function (2-3 часа)
  ├── 3.1 Редактирование схем (2 часа)
  └── 3.3 Скан штампа полировка (1 час)

Sprint 3:
  ├── 1.1 RLS + Edge Function tg-auth (4-5 часов) — самое сложное
  ├── 3.4 Город на статусе (2 часа)
  └── 3.2 FAQ страница (3 часа)

Sprint 4:
  └── Фаза 4 улучшения по приоритету
```

---

## ПРОМТ ДЛЯ РЕАЛИЗАЦИИ

```
Ты работаешь над проектом RunLog — Telegram Mini App для номадов.
Путь: /Users/2tyshy/Documents/claude-personal/nomad-tracker-tg-app
Деплой: frontend на Vercel, bot на Railway.
Читай файлы перед изменением. Коммить после каждой логической единицы.

КОНТЕКСТ СТЕКА:
- Frontend: React + Vite + TypeScript + Tailwind CSS v4
- Platform: Telegram Mini App (@twa-dev/sdk)
- Backend: Supabase (PostgreSQL + RLS + Edge Functions)
- Bot: Telegraf.js (TypeScript)
- AI: Gemini Vision (OCR) + Claude API (чат)
- Deploy: Vercel (frontend) + Railway (bot)
- Дизайн: Nothing OS эстетика — #000000 OLED, монохром, акцент #ff2626, Geist шрифт, Lucide иконки

ПРИНЦИПЫ:
- Не менять дизайн без явной просьбы
- Не добавлять фичи кроме запрошенных
- Каждый коммит — одна атомарная правка с понятным сообщением
- При правке Supabase — всегда новая пронумерованная миграция (005_, 006_, ...)
- Тестируй через existing тесты: cd frontend/tests && npm test

ПЛАН РАБОТ: docs/superpowers/specs/2026-04-27-master-plan.md
Начинай с Sprint 1 — критические баги и безопасность.
```
