// The sowing calendar across the whole farming year.
//
// These are date-driven, so a screen can look right on the day someone checks
// it and be wrong for most of the year. Every date below once produced the
// wrong answer: "window open: 14 June" in November, "summer sowing closed, the
// corrected date was 14 June" three weeks before 14 June.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cropWindow, rainDecidesSowing, seasonForDate, sowingStatus } from '../src/lib/season.js'
import { SAMPLE_CROPS } from '../src/data/crops.js'

const { districts } = JSON.parse(readFileSync(new URL('../src/data/districts.json', import.meta.url), 'utf8'))
const nashik = districts.find((d) => d.id === 'Nashik')
const ahmednagar = districts.find((d) => d.id === 'Ahmednagar')
const on = (iso) => new Date(iso + 'T10:00:00')
const crop = (id) => SAMPLE_CROPS.find((c) => c.id === id)

test('seasons change on the Maharashtra calendar boundaries', () => {
  assert.equal(seasonForDate(on('2026-05-31')), 'summer')
  assert.equal(seasonForDate(on('2026-06-01')), 'kharif')
  assert.equal(seasonForDate(on('2026-10-15')), 'kharif')
  assert.equal(seasonForDate(on('2026-10-16')), 'rabi')
  assert.equal(seasonForDate(on('2027-03-15')), 'rabi')
  assert.equal(seasonForDate(on('2027-03-16')), 'summer')
})

test('kharif windows follow each district\'s own corrected onset', () => {
  // the demo's hero date: Nashik soybean from 14 June
  assert.deepEqual(cropWindow(crop('soy'), nashik).from, { d: 14, m: 5 })
  // Ahmednagar's monsoon now arrives around 11 July — not the crop's fixed 13 June
  assert.deepEqual(cropWindow(crop('soy'), ahmednagar).from, { d: 11, m: 6 })
  assert.equal(cropWindow(crop('soy'), nashik).basis, 'onset')
})

test('rabi and summer windows stay on the calendar', () => {
  assert.equal(cropWindow(crop('wheat'), nashik).basis, 'calendar')
  assert.deepEqual(cropWindow(crop('wheat'), nashik).from, crop('wheat').window.from)
})

// [date, phase, season, basis, rain decides sowing?]
const YEAR = [
  ['2026-05-25', 'next', 'kharif', 'onset', true],
  ['2026-06-10', 'upcoming', 'kharif', 'onset', true],
  ['2026-06-20', 'open', 'kharif', 'onset', true],
  ['2026-07-10', 'next', 'rabi', 'calendar', false],
  ['2026-09-28', 'next', 'rabi', 'calendar', false],
  ['2026-10-25', 'upcoming', 'rabi', 'calendar', false],
  ['2026-11-10', 'open', 'rabi', 'calendar', false],
  ['2026-12-20', 'next', 'summer', 'calendar', false],
  ['2027-01-20', 'open', 'summer', 'calendar', false],
  ['2027-03-20', 'next', 'kharif', 'onset', false],
]

for (const [iso, phase, season, basis, rain] of YEAR) {
  test(`Nashik on ${iso}: ${phase} ${season} window, ${basis} basis`, () => {
    const st = sowingStatus(SAMPLE_CROPS, nashik, on(iso))
    assert.equal(st.phase, phase)
    assert.equal(st.season, season)
    assert.equal(st.basis, basis)
    assert.equal(rainDecidesSowing(st), rain)
  })
}

test('the monsoon window counts down in the run-up, not months ahead', () => {
  // 21 days ahead is inside the lead; 86 days ahead is not
  assert.equal(rainDecidesSowing({ basis: 'onset', phase: 'next', days: 21 }), true)
  assert.equal(rainDecidesSowing({ basis: 'onset', phase: 'next', days: 22 }), false)
  // an open calendar window is never a reason to wait for rain
  assert.equal(rainDecidesSowing({ basis: 'calendar', phase: 'open', days: 10 }), false)
})
