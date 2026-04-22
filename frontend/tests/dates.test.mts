import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseLocalDate,
  addDaysLocal,
  calcDeadline,
  daysBetween,
  effectiveDeadline,
  calcDaysLeft,
  pluralDays,
} from '../src/lib/dates.ts'

describe('parseLocalDate', () => {
  test('YYYY-MM-DD parses as local midnight (not UTC)', () => {
    const d = parseLocalDate('2026-04-15')
    assert.equal(d.getFullYear(), 2026)
    assert.equal(d.getMonth(), 3) // April = 3
    assert.equal(d.getDate(), 15)
    assert.equal(d.getHours(), 0)
    assert.equal(d.getMinutes(), 0)
  })

  test('leap day 2024-02-29', () => {
    const d = parseLocalDate('2024-02-29')
    assert.equal(d.getMonth(), 1)
    assert.equal(d.getDate(), 29)
  })
})

describe('addDaysLocal', () => {
  test('adds days within month', () => {
    assert.equal(addDaysLocal('2026-03-15', 10), '2026-03-25')
  })

  test('rolls over month boundary', () => {
    assert.equal(addDaysLocal('2026-03-30', 5), '2026-04-04')
  })

  test('rolls over year boundary', () => {
    assert.equal(addDaysLocal('2026-12-28', 5), '2027-01-02')
  })

  test('negative days subtract', () => {
    assert.equal(addDaysLocal('2026-03-10', -5), '2026-03-05')
  })

  test('adding 0 returns same date', () => {
    assert.equal(addDaysLocal('2026-06-15', 0), '2026-06-15')
  })

  test('leap year Feb 28 + 1 = Feb 29', () => {
    assert.equal(addDaysLocal('2024-02-28', 1), '2024-02-29')
  })

  test('non-leap year Feb 28 + 1 = Mar 1', () => {
    assert.equal(addDaysLocal('2025-02-28', 1), '2025-03-01')
  })
})

describe('calcDeadline', () => {
  test('entry + maxDays - 1 (day of entry counts)', () => {
    // 30-day stay starting Mar 15 → deadline is Apr 13 (not Apr 14)
    assert.equal(calcDeadline('2026-03-15', 30), '2026-04-13')
  })

  test('1-day visa: deadline = entry', () => {
    assert.equal(calcDeadline('2026-03-15', 1), '2026-03-15')
  })

  test('90-day visa from Mar 15', () => {
    assert.equal(calcDeadline('2026-03-15', 90), '2026-06-12')
  })

  test('0 or negative maxDays falls back to entry', () => {
    assert.equal(calcDeadline('2026-03-15', 0), '2026-03-15')
    assert.equal(calcDeadline('2026-03-15', -5), '2026-03-15')
  })
})

describe('daysBetween (inclusive)', () => {
  test('same day = 1', () => {
    assert.equal(daysBetween('2026-03-15', '2026-03-15'), 1)
  })

  test('next day = 2', () => {
    assert.equal(daysBetween('2026-03-15', '2026-03-16'), 2)
  })

  test('Mar 15 to Apr 13 = 30 (matches calcDeadline inverse)', () => {
    assert.equal(daysBetween('2026-03-15', '2026-04-13'), 30)
  })
})

describe('effectiveDeadline (visa_end capping)', () => {
  test('no visaEnd → rule values unchanged', () => {
    const r = effectiveDeadline('2026-04-05', 45)
    assert.equal(r.deadline, '2026-05-19')
    assert.equal(r.maxDays, 45)
  })

  test('visaEnd earlier than entry is ignored (treated as typo)', () => {
    const r = effectiveDeadline('2026-04-05', 45, '2026-03-01')
    assert.equal(r.deadline, '2026-05-19')
    assert.equal(r.maxDays, 45)
  })

  test('visaEnd equal to rule deadline → rule wins (no change)', () => {
    const r = effectiveDeadline('2026-04-05', 45, '2026-05-19')
    assert.equal(r.deadline, '2026-05-19')
    assert.equal(r.maxDays, 45)
  })

  test('visaEnd after rule deadline → rule wins', () => {
    const r = effectiveDeadline('2026-04-05', 45, '2026-12-31')
    assert.equal(r.deadline, '2026-05-19')
    assert.equal(r.maxDays, 45)
  })

  test('visaEnd before rule deadline → visaEnd caps stay', () => {
    // User booked entry Apr 5, visa-exempt rule = 45d (deadline May 19),
    // but actual visa_end = Jul 2... wait that's AFTER. Use real case:
    // entry Apr 5, rule 90d → deadline Jul 3. visa_end = Jun 1 → cap.
    const r = effectiveDeadline('2026-04-05', 90, '2026-06-01')
    assert.equal(r.deadline, '2026-06-01')
    // days from Apr 5 to Jun 1 inclusive = 58
    assert.equal(r.maxDays, 58)
  })

  test('visaEnd == entry → 1 day stay', () => {
    const r = effectiveDeadline('2026-04-05', 45, '2026-04-05')
    assert.equal(r.deadline, '2026-04-05')
    assert.equal(r.maxDays, 1)
  })

  test('original bug case: entry=Apr 5, visa_end=Jul 2, 90d rule', () => {
    // Rule would say Jul 3 (entry + 90 - 1). visa_end=Jul 2 is earlier → cap.
    const r = effectiveDeadline('2026-04-05', 90, '2026-07-02')
    assert.equal(r.deadline, '2026-07-02')
    assert.equal(r.maxDays, 89)
  })
})

describe('calcDaysLeft', () => {
  function todayYMD(offset = 0): string {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    t.setDate(t.getDate() + offset)
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, '0')
    const d = String(t.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  test('deadline is today → 1 day left', () => {
    assert.equal(calcDaysLeft(todayYMD(0)), 1)
  })

  test('deadline was yesterday → 0', () => {
    assert.equal(calcDaysLeft(todayYMD(-1)), 0)
  })

  test('deadline in 9 days → 10 days left', () => {
    assert.equal(calcDaysLeft(todayYMD(9)), 10)
  })

  test('deadline far in past → 0 (not negative)', () => {
    assert.equal(calcDaysLeft('2020-01-01'), 0)
  })
})

describe('pluralDays (Russian grammar)', () => {
  test('1 → день', () => {
    assert.equal(pluralDays(1), 'день')
  })

  test('2/3/4 → дня', () => {
    assert.equal(pluralDays(2), 'дня')
    assert.equal(pluralDays(3), 'дня')
    assert.equal(pluralDays(4), 'дня')
  })

  test('5-20 → дней', () => {
    for (let n = 5; n <= 20; n++) {
      assert.equal(pluralDays(n), 'дней', `n=${n}`)
    }
  })

  test('21 → день, 22 → дня, 25 → дней', () => {
    assert.equal(pluralDays(21), 'день')
    assert.equal(pluralDays(22), 'дня')
    assert.equal(pluralDays(25), 'дней')
  })

  test('111/112/113 → дней (teens exception)', () => {
    assert.equal(pluralDays(111), 'дней')
    assert.equal(pluralDays(112), 'дней')
    assert.equal(pluralDays(113), 'дней')
  })

  test('0 → дней', () => {
    assert.equal(pluralDays(0), 'дней')
  })
})
