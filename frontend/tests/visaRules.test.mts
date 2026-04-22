import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseMaxDaysFromVisaType,
  computeMaxDays,
  formatVisaType,
  COUNTRY_DATA,
  COUNTRY_CODES,
} from '../src/lib/visaRules.ts'

describe('parseMaxDaysFromVisaType', () => {
  test('e-visa 90 → 90', () => {
    assert.equal(parseMaxDaysFromVisaType('e-visa 90'), 90)
  })

  test('dtv 180 → 180', () => {
    assert.equal(parseMaxDaysFromVisaType('dtv 180'), 180)
  })

  test('visa exempt 45 → 45', () => {
    assert.equal(parseMaxDaysFromVisaType('visa exempt 45'), 45)
  })

  test('legacy underscore form "visa_exempt_60" → 60', () => {
    assert.equal(parseMaxDaysFromVisaType('visa_exempt_60'), 60)
  })

  test('no number → 30 fallback', () => {
    assert.equal(parseMaxDaysFromVisaType('visa free'), 30)
  })

  test('empty string → 30 fallback', () => {
    assert.equal(parseMaxDaysFromVisaType(''), 30)
  })

  test('multiple numbers → takes the LAST one', () => {
    // "e-visa 30 for 90 days" — the trailing 90 wins
    assert.equal(parseMaxDaysFromVisaType('e-visa 30 for 90 days'), 90)
  })

  test('zero → falls back to 30 (guard against 0-day stays)', () => {
    assert.equal(parseMaxDaysFromVisaType('visa 0'), 30)
  })
})

describe('computeMaxDays', () => {
  test('VN e-visa 90 for RU → 90', () => {
    assert.equal(computeMaxDays('VN', 'e-visa 90', 'RU'), 90)
  })

  test('VN visa exempt 45 for UA → 45', () => {
    assert.equal(computeMaxDays('VN', 'visa exempt 45', 'UA'), 45)
  })

  test('TH dtv 180 for RU → 180', () => {
    assert.equal(computeMaxDays('TH', 'dtv 180', 'RU'), 180)
  })

  test('KR any visa for RU → 0 (suspended)', () => {
    // RU passport blocked entirely from KR visa-free since 2022
    assert.equal(computeMaxDays('KR', 'visa free 30', 'RU'), 0)
  })

  test('KR visa free 30 for UA → 30', () => {
    assert.equal(computeMaxDays('KR', 'visa free 30', 'UA'), 30)
  })

  test('KR visa free 30 for KZ → 30', () => {
    assert.equal(computeMaxDays('KR', 'visa free 30', 'KZ'), 30)
  })

  test('unknown country → fallback to parsed value', () => {
    assert.equal(computeMaxDays('ZZ', 'e-visa 90', 'RU'), 90)
  })

  test('unknown country + no number → 30', () => {
    assert.equal(computeMaxDays('ZZ', 'visa free', 'RU'), 30)
  })

  test('legacy underscore form "visa_exempt_60" in TH for RU → 60', () => {
    assert.equal(computeMaxDays('TH', 'visa_exempt_60', 'RU'), 60)
  })

  test('visa_type not in options, but country known → cap at passport max (fallback path)', () => {
    // Unrecognized label "mystery 90" — don't know what rule the user meant,
    // so be conservative: parse 90, then cap at TH's default 60.
    assert.equal(computeMaxDays('TH', 'mystery 90', 'RU'), 60)
  })

  test('explicit option wins over passport default (regression: DTV/VOA no longer under-counted)', () => {
    // Historical bug: Math.min(180, TH.max_days.RU=60) = 60 when user picked DTV.
    // Fix: trust explicit option selections.
    assert.equal(computeMaxDays('TH', 'dtv 180', 'RU'), 180)
    assert.equal(computeMaxDays('ID', 'voa 60', 'UA'), 60)
  })

  test('ID voa 60 for RU → 60', () => {
    assert.equal(computeMaxDays('ID', 'voa 60', 'RU'), 60)
  })

  test('ID voa 30 for KZ → 30', () => {
    assert.equal(computeMaxDays('ID', 'voa 30', 'KZ'), 30)
  })
})

describe('formatVisaType', () => {
  test('underscore → space', () => {
    assert.equal(formatVisaType('visa_exempt_60'), 'visa exempt 60')
  })

  test('already-spaced unchanged', () => {
    assert.equal(formatVisaType('e-visa 90'), 'e-visa 90')
  })

  test('trims whitespace', () => {
    assert.equal(formatVisaType('  e-visa 90  '), 'e-visa 90')
  })
})

describe('COUNTRY_DATA integrity', () => {
  test('all countries have RU/UA/KZ max_days defined', () => {
    for (const code of COUNTRY_CODES) {
      const cd = COUNTRY_DATA[code]
      assert.equal(typeof cd.max_days.RU, 'number', `${code}.max_days.RU`)
      assert.equal(typeof cd.max_days.UA, 'number', `${code}.max_days.UA`)
      assert.equal(typeof cd.max_days.KZ, 'number', `${code}.max_days.KZ`)
    }
  })

  test('all countries have at least one visa_option', () => {
    for (const code of COUNTRY_CODES) {
      const cd = COUNTRY_DATA[code]
      assert.ok(cd.visa_options.length > 0, `${code} has no visa_options`)
    }
  })

  test('KR has RU=0 (visa-free suspended) but UA/KZ nonzero', () => {
    assert.equal(COUNTRY_DATA.KR.max_days.RU, 0)
    assert.ok(COUNTRY_DATA.KR.max_days.UA > 0)
    assert.ok(COUNTRY_DATA.KR.max_days.KZ > 0)
  })

  test('KR has notes_by_passport for RU explaining suspension', () => {
    assert.ok(COUNTRY_DATA.KR.notes_by_passport?.RU)
  })

  test('KR visa_options do NOT include "visa free 60" (would lie for every passport)', () => {
    const labels = COUNTRY_DATA.KR.visa_options.map(o => o.label.toLowerCase())
    assert.ok(!labels.includes('visa free 60'), 'KR should not list 60-day option')
  })

  test('every visa_option.days is a positive integer', () => {
    for (const code of COUNTRY_CODES) {
      for (const opt of COUNTRY_DATA[code].visa_options) {
        assert.ok(
          Number.isInteger(opt.days) && opt.days > 0,
          `${code} option "${opt.label}" has invalid days=${opt.days}`,
        )
      }
    }
  })
})
