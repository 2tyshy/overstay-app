# Onboarding Bottom Sheet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time bottom sheet on first launch that explains the bot reminder value and leads directly to adding the first visa entry.

**Architecture:** New `OnboardingSheet` component wraps existing `BottomSheet`. `App.tsx` tracks `showOnboarding` state initialized from localStorage. Onboarding marks itself done on either CTA or dismiss. A toast fires after the first entry is saved.

**Tech Stack:** React, TypeScript, existing `BottomSheet` + `Toast` components, localStorage.

---

### Task 1: OnboardingSheet component

**Files:**
- Create: `frontend/src/components/OnboardingSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
import BottomSheet from './BottomSheet'

interface Props {
  open: boolean
  onAddEntry: () => void
  onDismiss: () => void
}

export default function OnboardingSheet({ open, onAddEntry, onDismiss }: Props) {
  return (
    <BottomSheet open={open} onClose={onDismiss} height="auto">
      <div className="px-6 pt-3 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* drag handle */}
        <div className="w-8 h-[3px] rounded-full mx-auto mb-6" style={{ background: 'var(--border)' }} />

        <div className="text-[20px] font-bold mb-3" style={{ color: 'var(--text1)' }}>
          Не пропусти дедлайн 🚨
        </div>

        <p className="text-[13px] leading-relaxed mb-1" style={{ color: 'var(--text2)' }}>
          Бот напишет в <span style={{ color: 'var(--text1)', fontWeight: 600 }}>10:00 по твоему времени</span> когда пора выезжать.
        </p>
        <p className="text-[13px] leading-relaxed mb-8" style={{ color: 'var(--text3)' }}>
          Сфоткай штамп въезда — заполним за тебя.
        </p>

        <button
          onClick={onAddEntry}
          className="w-full py-3.5 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] mb-3"
          style={{ background: 'var(--text1)', color: 'var(--bg)' }}
        >
          Добавить штамп
        </button>

        <button
          onClick={onDismiss}
          className="w-full py-2 text-[12px] font-mono transition-opacity active:opacity-50"
          style={{ color: 'var(--text4)' }}
        >
          позже
        </button>
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OnboardingSheet.tsx
git commit -m "feat(onboarding): add OnboardingSheet component"
```

---

### Task 2: Wire OnboardingSheet into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add import at top of App.tsx with the other sheet imports**

```tsx
import OnboardingSheet from '@/components/OnboardingSheet'
```

- [ ] **Step 2: Add showOnboarding state after the other useState declarations (around line 117)**

```tsx
const [showOnboarding, setShowOnboarding] = useState(() => {
  try {
    if (localStorage.getItem('overstay_onboarding_done')) return false
    const raw = localStorage.getItem('overstay_entries')
    return !raw || JSON.parse(raw).length === 0
  } catch {
    return false
  }
})
```

- [ ] **Step 3: Add handlers after the other handler functions**

```tsx
const handleOnboardingAdd = useCallback(() => {
  try { localStorage.setItem('overstay_onboarding_done', '1') } catch { }
  setShowOnboarding(false)
  setEntrySheetOpen(true)
}, [])

const handleOnboardingDismiss = useCallback(() => {
  try { localStorage.setItem('overstay_onboarding_done', '1') } catch { }
  setShowOnboarding(false)
}, [])
```

- [ ] **Step 4: Render OnboardingSheet — add it alongside the other sheets at the bottom of the JSX (before the closing tag, after FeedbackSheet)**

```tsx
<OnboardingSheet
  open={showOnboarding}
  onAddEntry={handleOnboardingAdd}
  onDismiss={handleOnboardingDismiss}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(onboarding): wire OnboardingSheet into App — shows on first launch"
```

---

### Task 3: Post-first-entry toast

**Files:**
- Modify: `frontend/src/App.tsx` — update `handleSaveEntry` to fire toast on first save

- [ ] **Step 1: Find `handleSaveEntry` in App.tsx — locate the line that calls `showToast('Запись добавлена', 'success')` (around line 270)**

Replace that specific toast call with one that detects the first entry:

```tsx
// Before (find this exact line):
showToast('Запись добавлена', 'success')

// After (replace with):
if (entries.length === 0) {
  showToast('🔔 Бот напомнит за 7, 3 и 1 день до дедлайна', 'success')
} else {
  showToast('Запись добавлена', 'success')
}
```

Note: `entries` here refers to the current entries state at the time of save. Since the new entry hasn't been appended to state yet at this point, `entries.length === 0` correctly identifies the first save.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(onboarding): show bot reminder toast after first visa entry saved"
```

---

### Task 4: Build and verify

- [ ] **Step 1: Build frontend**

```bash
cd frontend && npm run build
```

Expected: `✓ built` with no TypeScript errors. Chunk size warning is pre-existing and acceptable.

- [ ] **Step 2: Manual smoke test — first launch flow**

Open the app with a clean localStorage (DevTools → Application → Local Storage → clear all `overstay_*` keys). Verify:

1. OnboardingSheet appears on load
2. Tap "позже" → sheet closes, does not reappear on reload
3. Clear localStorage again, tap "Добавить штамп" → AddEntrySheet opens
4. Save an entry → toast says "🔔 Бот напомнит за 7, 3 и 1 день до дедлайна"
5. Reload → OnboardingSheet does NOT appear (entries exist AND flag set)

- [ ] **Step 3: Push**

```bash
git push origin main
```
