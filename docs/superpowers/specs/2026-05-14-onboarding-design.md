# Onboarding Bottom Sheet — Design Spec

**Date:** 2026-05-14  
**Status:** Approved

## Goal

Get new users to add their first visa entry as fast as possible. No feature tour, no multi-step wizard — one screen, one CTA.

## Trigger Condition

Show `OnboardingSheet` when **all** of the following are true:

1. `localStorage.getItem('overstay_entries')` is null or an empty array (`[]`)
2. `localStorage.getItem('overstay_onboarding_done')` is null

Check runs once on `App` mount, stored in `showOnboarding` boolean state.

## Component: OnboardingSheet

New file: `frontend/src/components/OnboardingSheet.tsx`

### Props

```typescript
interface Props {
  open: boolean
  onAddEntry: () => void  // opens AddEntrySheet
  onDismiss: () => void   // sets flag + closes
}
```

### Content

```
[drag handle — 32×3px, centered]

Не пропусти дедлайн 🚨          ← h2, color: var(--text1)

Бот напишет в 10:00 по твоему
времени когда пора выезжать.    ← body text, color: var(--text2)

Сфоткай штамп въезда —
заполним за тебя.               ← body text, color: var(--text3)

[Добавить штамп]                ← primary button, full width
[позже]                         ← ghost link, centered, small
```

### Behaviour

- **«Добавить штамп»**: calls `onAddEntry()` which closes the sheet and opens `AddEntrySheet` (reuses existing `onStamp` callback in App.tsx). Sets `overstay_onboarding_done = '1'` before opening.
- **«позже»**: calls `onDismiss()` which sets `overstay_onboarding_done = '1'` and closes the sheet.
- **Backdrop tap**: same as «позже».
- Sheet does **not** reappear after either action.

### Style

- Same animation and backdrop as `FeedbackSheet` / `AddEntrySheet`
- `border-radius: 24px 24px 0 0`, `background: var(--bg2)`
- Bottom padding accounts for safe-area-inset (`pb-safe` or inline style)

## Post-Entry Toast

After `AddEntrySheet` successfully saves the **first** entry (entries length goes from 0 to 1), show a one-time toast:

> 🔔 Бот напомнит за 7, 3 и 1 день до дедлайна

Duration: 3 seconds. Reuse existing toast/snackbar pattern if one exists; otherwise a simple fixed-bottom div with fade animation.

## App.tsx Changes

```typescript
const [showOnboarding, setShowOnboarding] = useState(() => {
  const done = localStorage.getItem('overstay_onboarding_done')
  if (done) return false
  const raw = localStorage.getItem('overstay_entries')
  try { return !raw || JSON.parse(raw).length === 0 } catch { return true }
})

const handleOnboardingAdd = () => {
  localStorage.setItem('overstay_onboarding_done', '1')
  setShowOnboarding(false)
  setShowAddEntry(true)  // or however AddEntrySheet is triggered
}

const handleOnboardingDismiss = () => {
  localStorage.setItem('overstay_onboarding_done', '1')
  setShowOnboarding(false)
}
```

Render `<OnboardingSheet>` in StatusPage branch (only shown when screen === 'status').

## Out of Scope

- Multi-step wizard or feature tour
- Passport selection during onboarding (user already selects passport elsewhere)
- Analytics / tracking of onboarding completion
- Onboarding for returning users who deleted all entries

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/OnboardingSheet.tsx` | New — ~60 lines |
| `frontend/src/App.tsx` | Add `showOnboarding` state + handlers + render sheet |
