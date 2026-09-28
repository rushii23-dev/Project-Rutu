// The rupee figure on the "calendar, corrected" card — the number said aloud in
// the demo — is arithmetic on three sourced inputs. If any of them drifts, this
// fails before the screen does.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { lateSowingCost, TRIAL } from '../src/lib/lateCost.js'

const { districts } = JSON.parse(readFileSync(new URL('../src/data/districts.json', import.meta.url), 'utf8'))
const nashik = districts.find((d) => d.id === 'Nashik')

test('Nashik: 14 days late on 3 acres at ₹5,950 costs about ₹15,000', () => {
  const c = lateSowingCost(nashik, 3, { scope: 'district', value: 5950 })
  assert.equal(c.direction, 'late')
  assert.equal(c.days, 14)
  // 14 days × 14.86 kg/ha/day × 3 acres ÷ 2.471 acres/ha = 252.6 kg
  assert.ok(Math.abs(c.kg - 252.6) < 0.1)
  assert.equal(Math.round(c.rupees / 1000) * 1000, 15000)
})

test('the trial rate is the published one', () => {
  assert.equal(TRIAL.kgPerHaPerDay, 14.86)
  assert.match(TRIAL.cite, /Nath et al\. 2017/)
})

test('no price, no rupees — the kilograms still stand', () => {
  const c = lateSowingCost(nashik, 3, { scope: 'none' })
  assert.equal(c.rupees, null)
  assert.ok(c.kg > 0)
})

test('a district with no significant shift is not priced at all', () => {
  const flat = districts.find((d) => !d.onset.significant)
  assert.equal(lateSowingCost(flat, 3, { scope: 'district', value: 5950 }), null)
})
