import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isPriceStale, priceAgeDays } from '../src/lib/priceAge.js'

const now = new Date('2026-09-28T16:00:00')

test('reads Agmarknet dates and ISO dates as calendar days', () => {
  assert.equal(priceAgeDays({ date: '28/09/2026' }, now), 0)
  assert.equal(priceAgeDays({ date: '21/09/2026' }, now), 7)
  assert.equal(priceAgeDays({ date: '2026-09-26' }, now), 2)
})

test('a weekend gap is normal; a week is stale', () => {
  assert.equal(isPriceStale({ date: '26/09/2026' }, now), false)
  assert.equal(isPriceStale({ date: '25/09/2026' }, now), true)
  assert.equal(isPriceStale({ date: '21/09/2026' }, now), true)
})

test('no date or an unreadable one is unknown, not stale', () => {
  assert.equal(priceAgeDays({}, now), null)
  assert.equal(priceAgeDays({ date: 'yesterday' }, now), null)
  assert.equal(isPriceStale(null, now), false)
})
