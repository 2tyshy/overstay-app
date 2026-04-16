# Overstay — Design Specification

> Telegram Mini App для цифровых номадов. Трекер визовых дедлайнов + community-база визаранов.

---

## 1. Продукт

**Название:** Overstay
**Платформа:** Telegram Mini App (@twa-dev/sdk)
**Аудитория:** Русскоязычные номады в ЮВА с RU/UA/KZ паспортами
**Монетизация:** MVP бесплатно. Подписка $6-9/мес в будущем
**Цель MVP:** Рабочий продукт для себя и друзей, дальше — рост аудитории

### Уникальное позиционирование

Ни один существующий продукт не совмещает одновременно:
1. Личный трекер визовых дедлайнов с уведомлениями
2. Community-базу реальных визаран-маршрутов с голосованием
3. Telegram как платформу (родной канал для русскоязычных номадов)

### Конкуренты и gap

| Продукт | Сильная сторона | Чего нет |
|---|---|---|
| Nomad App (nomadapp.io) | GPS-трекинг, мульти-паспорт, AI | Нет community-базы визаранов |
| NomadTracker.io | 196 стран, AI-визы, CSV-импорт | Только веб, нет социалки |
| Nomad Tracker iOS | GPS-авто, Шенген, OCR | Только iOS, нет визаран-схем |
| Sherpa | 180+ стран, обновления каждый час | B2B, не для номадов |
| Sarmiza | Tax residency трекинг | Узкий фокус на налогах |

---

## 2. Экраны

### 2.1 Статус (главный)

Центральный экран — всё о текущей визе.

**Компоненты сверху вниз:**
- Header: логотип "OVERSTAY" (light 300, tracking 0.35em) + passport chip (🇷🇺 RU · Pass)
- Theme toggle (☀/☽) в правом верхнем углу
- Hero Card:
  - Top row: флаг + страна + тип визы + status tag (SAFE/WARN/DANGER с пульсирующим dot)
  - Ring section: кольцевой SVG-прогресс (110x110) слева + справа 4 строки (въезд, дедлайн, использовано, тип)
  - Segmented bar: 22 блока, used (серые) → warn (акцентные последние 3) → empty
  - Stats: 3 колонки с разделителями — стран / дней / ранов
  - Dates: въезд / дедлайн с полной датой
- Alert strip: предупреждение если < 14 дней, со ссылкой на количество доступных схем
- Action grid: 3 кнопки — Схемы визаранов / Штамп (фото→AI) / PDF экспорт
- History section: список предыдущих виз (флаг, страна, даты, бейдж длительности)

**Risk-уровни:**
- `safe`: > 25% дней осталось
- `warn`: 10-25% дней осталось
- `danger`: < 10% дней осталось

### 2.2 Схемы

Community-база реальных визаран-маршрутов.

**Компоненты:**
- Фильтры: горизонтальный скролл (Все / VN → / TH → / Граница / Самолёт)
- Section label: "X подтверждено · RU"
- Scheme cards:
  - Header: флаги маршрута (🇻🇳→🇱🇦) + КПП badge + count подтверждений
  - Body: описание маршрута (Geist Mono 11px, line-height 1.8)
  - Tip: цитата-блок с лайфхаком (border-left 2px)
  - Tags: стоимость / время / дата
  - Voting: 👍 works / 👎 broken (один голос на пользователя)
- "Добавить схему" — dashed-border кнопка с формой

### 2.3 Дальше

Куда ехать дальше под паспорт пользователя.

**Компоненты:**
- Status banner: компактное отображение текущего статуса (число дней + страна)
- Section label: "Подходящие · RU паспорт"
- Destination rows:
  - Флаг + название страны
  - Теги: тип визы / стоимость жизни / города
  - Справа: количество схем в базе + chevron
  - Клик → переход на Схемы с фильтром по этой стране

---

## 3. Визуальный стиль

### Философия

Лёгкий, информативный, минималистичный. Не давящий. Данные первичны, декорация минимальна.

### Темы

**Светлая (по умолчанию):**
```
--bg: #faf9f7        фон
--bg2: #ffffff       карточки
--bg3: #f5f3f0       чипы, тогглы
--border: #e8e6e3    основные borders
--border2: #eeece9   вторичные borders
--text1: #1a1a1a     основной текст
--text2: #555        вторичный текст
--text3: #999        третичный/метки
--text4: #bbb        labels
--alert-bg: #fef7ed  алерт фон
--alert-border: #f5deb8
--alert-text: #9a7b4f
--alert-dot: #e8a85c  акцент warn
--ring-color: #e8a85c кольцо
--ring-track: #eeece9
```

**Тёмная:**
```
--bg: #141416
--bg2: #1a1a1e
--bg3: #1e1e22
--border: #28282e
--border2: #222228
--text1: #e8e8ea
--text2: #aaa
--text3: #555
--text4: #444
--alert-bg: rgba(200,150,69,0.06)
--alert-border: rgba(200,150,69,0.15)
--alert-text: #c89545
--alert-dot: #c89545
--ring-color: #c89545
--ring-track: #28282e
```

### Шрифты

- **Geist Sans** — основной текст, числа, заголовки
- **Geist Mono** — метки, labels, описания схем, теги, навигация
- `-webkit-font-smoothing: antialiased` обязательно

| Элемент | Шрифт | Size | Weight | Letter-spacing |
|---------|-------|------|--------|----------------|
| Кольцо число | Geist | 32px | 700 | -0.03em |
| Логотип | Geist | 11px | 300 | 0.35em, uppercase |
| Название страны | Geist | 15px | 600 | -0.01em |
| Stat value | Geist | 18px | 600 | tabular-nums |
| Body (описание) | Geist Mono | 11px | 400 | 0 |
| Labels | Geist Mono | 9px | 400 | 0.1-0.12em, uppercase |
| Nav labels | Geist Mono | 9px | 400 | 0.12em, uppercase |

### Иконки

Lucide React, `strokeWidth: 1.5`, `strokeLinecap: round`
- Nav: 18-19px
- Actions: 16px
- Inline: 14px

### Геометрия

- Border-radius: до 14px на карточках, 10px на кнопках, 20px на chips
- Borders: 1px solid var(--border)
- Spacing: 18px horizontal padding, 8-12px gap
- Скругления на inputs: 4px

### Анимации

```css
/* Кольцо рисуется */
@keyframes ringDraw {
  from { stroke-dashoffset: 314; }
  to { stroke-dashoffset: var(--ring-offset); }
}
/* 1.2s cubic-bezier(0.16,1,0.3,1) delay 0.3s */

/* Число появляется */
@keyframes numIn {
  from { opacity:0; transform:translateY(6px); }
  to { opacity:1; transform:translateY(0); }
}
/* 0.6s cubic-bezier(0.16,1,0.3,1) delay 0.2s */

/* Карточки выезжают */
@keyframes cardIn {
  from { opacity:0; transform:translateY(12px); }
  to { opacity:1; transform:translateY(0); }
}
/* 0.5s stagger 0.05s per card */

/* Сегменты последовательно */
/* 0.3s stagger 0.03s per segment */

/* Пульсация dot */
@keyframes pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50% { opacity:0.4; transform:scale(0.8); }
}

/* Nav underline */
@keyframes lineIn {
  from { width:0; opacity:0; }
  to { width:18px; opacity:1; }
}
```

Все transitions: `0.15s ease` или `0.2s ease`.
Тема переключается: `transition: background 0.4s, color 0.4s`.

---

## 4. Технический стек

```
Frontend:  React + Vite + TypeScript + Tailwind CSS
Platform:  Telegram Mini App (@twa-dev/sdk)
Backend:   Supabase (PostgreSQL + Auth + Edge Functions)
Bot:       Telegraf.js (уведомления + scheduler)
AI:        Anthropic Claude API (распознавание штампов)
Deploy:    Vercel (frontend) + Railway (bot)
Icons:     Lucide React
Fonts:     Geist (npm install geist)
```

---

## 5. Данные

### Таблицы

- **users** — telegram_id, passport_country (RU/UA/KZ), created_at
- **visa_entries** — user_id, country, entry_date, visa_type, max_days, notes
- **visa_entries_with_deadline** (VIEW) — deadline, days_left computed
- **schemes** — passport, from/to country, border_crossing, cost_usd, duration_hours, description, tip, verified_at, works_count, broken_count
- **scheme_votes** — user_id, scheme_id, vote (works/broken), PK(user_id, scheme_id)
- **visa_rules** — справочник: passport, country, visa_type, max_days, notes
- **chat_messages** — user_id, role (user/assistant), content, context_screen, created_at

### RLS

- users/visa_entries: только свои данные (по telegram_id)
- schemes: читают все, пишут авторизованные
- scheme_votes: только свои голоса

### Seed данные

- 14 визовых правил для RU/UA/KZ в ЮВА (VN, TH, KH, LA, MY, ID, PH, KR)
- 3 стартовых схемы визаранов (VN→LA, VN→KH, VN→KR)

---

## 6. Ключевые фичи

### 6.1 Фото штампа → AI распознавание

- Пользователь фоткает штамп/визу в паспорте
- Base64 → Claude API → JSON {country, entry_date, visa_type}
- Фото НЕ сохраняется на сервере — только base64 → Claude → результат → забыть
- Автозаполнение формы добавления въезда

### 6.2 Уведомления через бота

- Ежедневная проверка в 10:00 UTC
- Если < 14 дней до дедлайна → сообщение в Telegram
- Включает топ-3 релевантные схемы визаранов
- Русский текст с правильным склонением (день/дня/дней)

### 6.3 Голосование по схемам

- "Работает" / "Не работает" — один голос на пользователя на схему
- Клик переключает, счётчик обновляется
- Сортировка по works_count

### 6.4 PDF-экспорт

- Генерация истории перемещений в PDF
- Для подачи визовых заявок (DTV, рабочие визы)
- Включает: страны, даты, типы виз, длительности

### 6.5 AI-помощник

Контекстный чат с Claude, доступный с любого экрана через кнопку в header (не отдельный таб). Открывается как bottom sheet поверх текущего экрана.

**Контекст:** AI автоматически получает профиль пользователя (паспорт, текущая виза, дни, история перемещений, доступные схемы). Не нужно объяснять свою ситуацию — помощник уже знает.

**Возможности:**

**Консьерж визарана:**
- "Виза кончается через 12 дней, бюджет $50, хочу наземный" → подбор оптимальной схемы из базы + дополнение знаниями AI
- Планировщик цепочки: "6 месяцев в ЮВА, $800/мес" → VN(90) → Cambodia run → VN(90) → TH DTV(180)

**Визовый эксперт:**
- "Могу ли я с RU паспортом в Малайзию на 60 дней?" → правила + нюансы + подводные камни
- "Что изменилось в визовых правилах VN?" → мониторинг изменений человеческим языком
- Объяснение непонятного штампа по фото

**Проактивный анализ:**
- "Ты был в TH 3 раза за год — на границе могут задать вопросы"
- "160 дней в TH за 12 месяцев — осторожно с налоговым резидентством"
- Персональные рекомендации на основе истории

**Утилиты:**
- Чек-лист перед визараном: документы, наличка, фото, адрес отеля — под конкретный маршрут
- Фразы на границе: тайский/вьетнамский/кхмерский + транслитерация
- Агрегация данных community: "Маршрут через Nam Phao работает в апреле 2026?" → данные голосований + даты + знания AI

**Экстренная помощь:**
- "Не пускают на границе" / "Потерял паспорт" / "Overstay на 3 дня — что грозит?" → конкретные шаги

**Контекстный вход:**
- Со Статуса → AI уже знает ситуацию, предлагает действия
- Со Схем → "Расскажи подробнее про этот маршрут"
- С Дальше → "Сравни TH и MY для меня"

**UI чата:**
- Bottom sheet 85% высоты экрана, выезжает снизу
- Сообщения пользователя справа, AI слева
- AI-ответы в Geist Mono для consistency с дизайном
- Typing indicator — 3 пульсирующих dot'а
- При пустом чате: FAQ-экран с chips-примерами вопросов вместо пустоты:
  - "Планируй мне визаран"
  - "Чек-лист перед поездкой"
  - "Что изменилось в визах?"
  - "Сравни TH и MY"
  - "Overstay — что грозит?"
  - "Фразы на границе"
- Chips также отображаются над input после каждого ответа AI как follow-up подсказки (контекстные, меняются в зависимости от темы)
- Input с кнопкой отправки + attach фото (для распознавания штампов прямо в чате)

**Технически:**
- Claude API (claude-sonnet) с system prompt, содержащим профиль пользователя + visa_rules + текущие схемы
- История чата хранится в Supabase (таблица chat_messages)
- Rate limit: 20 сообщений/день на бесплатном плане (будущая монетизация)

---

## 7. Модальные окна

### Добавить въезд

- Bottom sheet с handle
- Upload zone: "Сфоткай штамп" → AI распознавание
- Разделитель "или вручную"
- Форма: страна (input), тип визы (input), дата въезда (date picker)
- Кнопка "Сохранить" (белая в light, светлая в dark)

### Добавить схему

- Bottom sheet
- Форма: откуда, куда, КПП (опц.), стоимость (опц.), время (опц.), описание, лайфхак (опц.)
- Анонимно

---

## 8. Bottom Navigation

3 вкладки:
1. **Статус** (LayoutGrid) — главный экран
2. **Схемы** (ArrowLeftRight) — community-база
3. **Дальше** (CircleArrowRight) — куда ехать

Активная: иконка и label белые + underline 18px × 2px.
Фон: полупрозрачный с blur (backdrop-filter).
Padding-bottom: 30-32px (safe area iPhone).

---

## 9. Отложено на v2

- GPS-автотрекинг пересечений границ
- Налоговый трекинг 183 дня с предупреждениями
- Социалка: друзья, видеть статус друзей, совместный визаран
- Интерактивная карта маршрутов
- Комментарии/чат к схемам
- "Вопрос автору" через бота
- Расширение за пределы ЮВА
- Онбординг-экраны
- Подписка и монетизация

---

## 10. MVP Checklist

- [ ] БД миграция применена в Supabase
- [ ] Seed данные загружены (visa_rules + schemes)
- [ ] Frontend запускается локально
- [ ] Переключение тем работает
- [ ] StatusPage: кольцо, сегменты, статистика, анимации
- [ ] Фото штампа → Claude → автозаполнение формы
- [ ] SchemesPage: фильтры, карточки, голосование
- [ ] Добавление схемы работает
- [ ] NextPage: страны под паспорт
- [ ] Bot отвечает на /start
- [ ] Scheduler отправляет уведомления
- [ ] Frontend задеплоен на Vercel
- [ ] Bot задеплоен на Railway
- [ ] Mini App URL настроен в BotFather
- [ ] AI-помощник: bottom sheet чат работает
- [ ] AI-помощник: контекст пользователя передаётся в system prompt
- [ ] AI-помощник: quick-action chips работают
- [ ] Работает на iOS и Android в Telegram
