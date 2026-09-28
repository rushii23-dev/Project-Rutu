// What the Weather screen, the Ask answer and Home tell a farmer this week.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pickFieldCrop, weekAdvice } from '../src/lib/field.js'
import { SOW_MM, sowingAdvice } from '../src/data/weather.js'
import { SAMPLE_CROPS } from '../src/data/crops.js'

const { districts } = JSON.parse(readFileSync(new URL('../src/data/districts.json', import.meta.url), 'utf8'))
const nashik = districts.find((d) => d.id === 'Nashik')
const on = (iso) => new Date(iso + 'T10:00:00')
const crop = (id) => SAMPLE_CROPS.find((c) => c.id === id)

/** A 7-day forecast starting on `iso` with the given rain per day. */
function week(iso, mm) {
  return mm.map((rain, i) => {
    const d = on(iso)
    d.setDate(d.getDate() + i)
    const p = (n) => String(n).padStart(2, '0')
    return { iso: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, mm: rain, temp: 31, tmin: 22, gust: 12, code: 3 }
  })
}

test('sowing advice says "sow" only when the rain lands inside five days', () => {
  assert.equal(sowingAdvice(week('2026-06-10', [20, 20, 15, 0, 0, 0, 0]), 'en').tone, 'good')
  // enough across the week, but not yet: wait
  const later = sowingAdvice(week('2026-06-10', [0, 0, 5, 0, 5, 30, 30]), 'en')
  assert.equal(later.tone, 'warn')
  assert.match(later.title, /Not yet/)
  // one wet day on day 7 is not a reason to sow on day 1
  assert.equal(sowingAdvice(week('2026-06-10', [0, 0, 0, 0, 0, 0, SOW_MM]), 'en').tone, 'warn')
  assert.match(sowingAdvice(week('2026-06-10', [0, 0, 0, 0, 0, 0, 0]), 'en').title, /No sowing rain/)
  assert.match(sowingAdvice(week('2026-06-10', [3, 3, 3, 0, 0, 0, 0]), 'en').title, /light/)
})

test('before the monsoon, the week is read as sowing advice', () => {
  const a = weekAdvice({ crops: SAMPLE_CROPS, district: nashik, week: week('2026-06-10', [1, 1, 1, 1, 1, 1, 1]), lang: 'en', todayKey: '2026-06-10', fieldCrop: null, now: on('2026-06-10') })
  assert.equal(a.kind, 'sowing')
})

test('at harvest, the week is about the crop in the field — never "sow after 50 mm"', () => {
  // 28 September: Nashik soybean is ready to harvest
  const a = weekAdvice({ crops: SAMPLE_CROPS, district: nashik, week: week('2026-09-28', [1.3, 7.7, 3.1, 0.9, 0, 0, 0]), lang: 'en', todayKey: '2026-09-28', fieldCrop: null, now: on('2026-09-28') })
  assert.equal(a.kind, 'field')
  assert.equal(a.crop.id, 'soy')
  assert.doesNotMatch(a.title + a.body, /Sow after|sowing rain/i)
})

test('an open rabi window says so, and does not tell the farmer to wait for rain', () => {
  const a = weekAdvice({ crops: [crop('wheat')], district: nashik, week: week('2026-11-10', [0, 0, 0, 0, 0, 0, 0]), lang: 'en', todayKey: '2026-11-10', fieldCrop: null, now: on('2026-11-10') })
  assert.equal(a.kind, 'window')
  assert.match(a.body, /do not wait for rain/)
})

test('with nothing to sow and nothing standing, it says when the next window opens', () => {
  const a = weekAdvice({ crops: [crop('wheat')], district: nashik, week: week('2026-08-01', [0, 0, 0, 0, 0, 0, 0]), lang: 'mr', todayKey: '2026-08-01', fieldCrop: null, now: on('2026-08-01') })
  assert.equal(a.kind, 'rest')
  assert.match(a.body, /दिवसांनी/)
})

test('the farmer\'s own crop choice wins; otherwise harvest before growing before sold', () => {
  const soy = { crop: crop('soy'), st: { phase: 'sold' } }
  const cotton = { crop: crop('cotton'), st: { phase: 'growing' } }
  const maize = { crop: crop('maize'), st: { phase: 'harvest' } }
  assert.equal(pickFieldCrop([soy, cotton, maize], 'soy').crop.id, 'soy')
  assert.equal(pickFieldCrop([soy, cotton, maize], null).crop.id, 'maize')
  assert.equal(pickFieldCrop([soy, cotton], 'nope').crop.id, 'cotton')
  assert.equal(pickFieldCrop([], 'soy'), null)
})
