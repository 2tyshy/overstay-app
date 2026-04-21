# RunLog — Design System

> Nothing OS эстетика. Строго следуй этому файлу.
> Референс: `UI_REFERENCE.html` — открой и смотри параллельно.

---

## Философия

- **Три уровня иерархии и только три:** display / body / metadata
- **Монохром + один акцент:** белое на чёрном, красный только для warn/danger
- **Данные первичны:** числа крупно, метки мелко, никакой декорации ради декорации
- **iOS-first:** `-webkit-font-smoothing: antialiased`, фиксированные font-weight, нет variable fonts

---

## Цвета

```css
:root {
  /* Фоны — настоящий OLED чёрный */
  --black:  #000000;   /* основной фон */
  --b1:     #090909;   /* sheet фон */
  --b2:     #101010;   /* hover state */
  --b3:     #181818;   /* активный элемент */
  --b4:     #222222;   /* disabled */
  --b5:     #2c2c2c;   /* резерв */

  /* Белые — для текста и элементов */
  --white:  #ffffff;   /* primary text, active icons */
  --w1:     #ebebeb;   /* secondary text */
  --w2:     #a8a8a8;   /* tertiary text, inactive icons */
  --w3:     #606060;   /* metadata, labels */
  --w4:     #2e2e2e;   /* borders active */
  --w5:     #1c1c1c;   /* borders default */

  /* Акцент — только для warn/danger */
  --red:    #ff2626;
  --rdim:   rgba(255, 38, 38, 0.08);
  --rglow:  rgba(255, 38, 38, 0.28);
}
```

**Правило:** Красный только для статуса WARN/DANGER, alert-полоски, кнопки vote.no, risk-strip. Нигде больше.

---

## Шрифты

```css
/* В React/Tailwind — установить: npm install geist */
/* В HTML — Google Fonts: */
/* <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500;600&display=swap" rel="stylesheet"> */

--font-display: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono:    'Geist Mono', ui-monospace, 'SF Mono', monospace;
```

### Использование

| Элемент | Шрифт | Size | Weight | Letter-spacing |
|---------|-------|------|--------|----------------|
| Большое число (дни) | Geist | 88px | 700 | -0.04em |
| Заголовок экрана (wordmark) | Geist | 12px | 300 | +0.38em |
| Название страны | Geist | 16px | 600 | -0.01em |
| Кнопка action | Geist | 11px | 600 | 0 |
| Stat value | Geist | 20px | 600 | -0.02em |
| Body (описание схемы) | Geist Mono | 11px | 400 | 0 |
| Метка (label) | Geist Mono | 9px | 400 | +0.2em, uppercase |
| Дата | Geist | 15px | 500 | +0.01em |
| Теги | Geist Mono | 9px | 400 | 0 |
| Nav label | Geist Mono | 9px | 400 | +0.14em, uppercase |

**Важно для iOS:**
```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Иконки

**Библиотека:** Lucide React (`npm install lucide-react`)

**Правила:**
```tsx
// Всегда:
strokeWidth={1.5}
strokeLinecap="round"
strokeLinejoin="round"

// Размеры:
// Nav: 19x19
// Action buttons: 18x18
// Alert: 15x15
// Inline: 14x14

// Цвет берётся из currentColor — управляй через className
```

### Маппинг иконок

| Место | Lucide компонент |
|-------|-----------------|
| Nav — Статус | `LayoutGrid` |
| Nav — Схемы | `ArrowLeftRight` |
| Nav — Дальше | `CircleArrowRight` |
| Action — Схемы | `List` |
| Action — Штамп | `Camera` |
| Action — PDF | `FileText` |
| Alert — Warn | `AlertTriangle` |
| Add scheme | `Plus` |
| Chevron в списке | `ChevronRight` |

---

## Компоненты

### Hero Card (главная карточка)

```
┌─ risk strip (2px) ────────────────────┐
│ safe(зел) │ mid(жёл) │ danger │ active │
├───────────────────────────────────────┤
│ 🇻🇳 Вьетнам          [● WARN]         │
│    E-Visa · 90 дней                   │
├───────────────────────────────────────┤
│              14                       │
│         дней осталось                 │
├───────────────────────────────────────┤
│ Использовано        84 / 90 дн.       │
│ [■■■■■■■■■■■■■■■■■■■□□] ← сегменты  │
├───────────────────────────────────────┤
│   07      │   312    │    04          │
│  Стран    │  Дней    │  Ранов         │
├───────────────────────────────────────┤
│ Въезд          Дедлайн               │
│ 15 Мар         13 Июн                │
└───────────────────────────────────────┘
```

**Risk strip:** 4 зоны. Flex. safe:flex-6, mid:flex-2, danger:flex-1, active:flex-1. Active зона = `background: var(--red)`.

**Segmented bar:** 22 блока. Первые N = used (серые), последние 3 из used = danger (красные), остальные = пустые.

```tsx
const total = 22
const used = Math.round((daysUsed / maxDays) * total)
// last 3 of used → danger class
```

### Scheme Card

```
┌───────────────────────────────────────┐
│ 🇻🇳→🇱🇦  [Nam Phao]          ● 47     │
├───────────────────────────────────────┤
│ Описание маршрута в Geist Mono 11px   │
│ line-height: 1.8                      │
│                                       │
│ │ Лайфхак в виде цитаты              │
│                                       │
│ [~$25] [~10ч] [МАР 2026]             │
├───────────────────────────────────────┤
│  [👍 47]              [👎 3]          │
└───────────────────────────────────────┘
```

### Alert Strip

```
┌─ left border 2px red ─────────────────┐
│ △  Планируй ран                       │
│    3 схемы доступны · RU → LA, KH, TH │
└───────────────────────────────────────┘
background: rgba(255,38,38,0.08)
border: 1px solid rgba(255,38,38,0.22)
border-left: 2px solid #ff2626
```

### Action Buttons (3 в ряд)

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│  [icon]  │ │  [icon]  │ │  [icon]  │
│  Схемы   │ │  Штамп   │ │   PDF    │
│ визаранов│ │  фото→AI │ │  экспорт │
└──────────┘ └──────────┘ └──────────┘
border: 1px solid var(--w5)
border-radius: 4px
hover: border-color var(--w4), background var(--b2)
hover первой (schemes): border-color var(--red), background var(--rdim)
```

### Bottom Nav

```
┌──────────────────────────────────────┐
│  [icon]    [icon]    [icon]          │
│  Статус    Схемы     Дальше          │
│    ──                                │ ← белая линия 18px под активным
└──────────────────────────────────────┘
background: rgba(0,0,0,0.97)
backdrop-filter: blur(24px) saturate(180%)
-webkit-backdrop-filter: blur(24px) saturate(180%)
border-top: 1px solid var(--w5)
padding-bottom: 32px (safe area для iPhone)
```

**Активный tab:** icon и label становятся `var(--white)`, линия снизу `18px × 2px white`.

### Destination Row (экран Дальше)

```
┌─────────────────────────────────────┐
│ 🇹🇭  Таиланд                12  ›  │
│      [DTV 180 дн] [~$700] [BKK]   схем│
└─────────────────────────────────────┘
border: 1px solid var(--w5)
border-radius: 4px
hover: border-color var(--w4), background var(--b2)
transition: all 0.15s
```

---

## Spacing

```
Горизонтальные отступы контента: 18px
Gap между элементами: 7-9px
Gap между карточками: 7-9px
Section label margin-top: 16px, margin-bottom: 9px
```

---

## Анимации

Только две:

```css
/* Появление числа */
@keyframes numIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: numIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;

/* Появление карточек (stagger) */
@keyframes schIn {
  from { opacity: 0; transform: translateY(7px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card:nth-child(1) { animation-delay: 0.04s; }
.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.12s; }
```

Все transitions: `0.15s ease` или `0.2s ease`. Не быстрее, не медленнее.

---

## Что запрещено

- ❌ Любые цвета кроме палитры выше
- ❌ Border-radius > 5px (кроме border-radius: 52px на корпусе телефона)
- ❌ Тени (`box-shadow`, `text-shadow`) — только `box-shadow: 0 0 Xpx var(--rglow)` для красного glow
- ❌ Градиенты — только `linear-gradient` для декоративной линии в hero баннере
- ❌ Другие шрифты
- ❌ Emoji в качестве иконок навигации или action кнопок
- ❌ Скругления на input больше 4px
- ❌ Padding на input больше `10px 11px`
- ❌ `font-weight` промежуточные значения (только 300/400/500/600/700)
