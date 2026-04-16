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

- React + Vite + TypeScript + Tailwind CSS 4
- Supabase (PostgreSQL + RLS)
- Telegraf.js bot
- Claude API (stamp recognition + AI assistant)
- Vercel (frontend) + Railway (bot)
