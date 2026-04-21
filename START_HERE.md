# RunLog — Start Here

## Порядок чтения файлов

```
1. AGENT_BRIEF.md      — что строим, стек, чего не делать
2. DESIGN_SYSTEM.md    — цвета, шрифты, иконки, компоненты
3. UI_REFERENCE.html   — открой в браузере, это финальный UI
4. BUILD_PLAN.md       — код, структура, последовательность шагов
```

## Перед стартом (делает человек вручную, ~15 минут)

### 1. Telegram Bot
```
→ @BotFather в Telegram
→ /newbot → назвать RunLog → получить TOKEN
→ Сохранить TOKEN
```

### 2. Supabase
```
→ supabase.com → New project
→ Settings → API → скопировать URL и anon key
→ SQL Editor → вставить содержимое supabase/migrations/001_initial.sql → Run
```

### 3. .env файлы
```
frontend/.env:
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  VITE_ANTHROPIC_API_KEY=sk-ant-...
  VITE_BOT_USERNAME=runlog_bot

bot/.env:
  BOT_TOKEN=123456:ABC...
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_KEY=eyJ...
  ANTHROPIC_API_KEY=sk-ant-...
  FRONTEND_URL=https://runlog.vercel.app
```

## Запуск агента

После того как .env заполнены:

```bash
# В новой сессии Claude Code:
claude "Прочитай START_HERE.md и все указанные файлы, затем построй проект RunLog по BUILD_PLAN.md. UI должен точно соответствовать UI_REFERENCE.html."
```

## Локальная разработка

```bash
# Frontend
cd frontend && npm install && npm run dev

# Bot (в отдельном терминале)
cd bot && npm install && npx ts-node index.ts
```
