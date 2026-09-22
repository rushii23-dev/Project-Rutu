import timing from '../data/sellTiming.json'
import { cropStage } from './field.js'

/**
 * When to sell — from 11 years of real Agmarknet prices.
 *
 * The evidence is a HOLDING RECORD, not a forecast: for every year on record,
 * what a farmer in this district got if he sold in his harvest month, against
 * what he got if he waited one to four months. The advice is the wait that has
 * paid most reliably, and the screen shows in how many years it paid, so a bad
 * year is never hidden inside an average.
 *
 * Nothing here predicts this year's price. A farmer who holds is making a bet
 * the record says has usually paid; the screen says "usually", with the count.
 */

/**
 * Holding is not free. ASSUMPTION, not a sourced figure: 1% of the crop's value
 * per month, i.e. 12% a year — above a Kisan Credit Card rate, to stand in for
 * interest plus storage costs. Printed on screen next to the advice.
 */
export const HOLD_COST_PER_MONTH = 1

/** Hold only if, after that cost, waiting clears this much... */
const MIN_NET_GAIN = 3
/** ...and paid in at least this share of years. */
const MIN_WIN_SHARE = 0.6

/** Crops that lose weight and rot in store. Their gain is before that loss. */
const PERISHABLE = new Set(['onion'])

export const sellSource = timing.source
export const sellMethod = timing.method

/** Month the farmer's own crop is ready to sell: maturity + ~10 days to thresh and dry. */
export function saleMonth(crop, district, now = new Date()) {
  const st = cropStage(crop, district, now)
  const ready = new Date(st.sown.getTime() + (st.duration + 10) * 86400000)
  return ready.getUTCMonth()
}

/** The record for one crop, district first, state if the district is too thin. */
export function sellRecord(cropId, districtId) {
  const local = timing.districts[districtId]?.[cropId]
  if (local) return { ...local, scope: 'district' }
  const st = timing.state[cropId]
  if (st && st.index) return { ...st, scope: 'state' }
  return null
}

/**
 * Returns null when there is no record, otherwise {
 *   scope, years, month (sale month 0-11), index (12 values),
 *   verdict: 'hold' | 'sell',
 *   best: { wait, month, gain, wins, n, net } | null,   the strongest wait
 *   perQtl: rupees per quintal at today's price, or null,
 *   perishable
 * }
 */
export function sellAdvice(crop, district, price, now = new Date()) {
  const rec = sellRecord(crop.id, district.id)
  if (!rec) return null
  const month = saleMonth(crop, district, now)
  const row = rec.hold[String(month)] || []

  const cands = row
    .map((r, i) => {
      if (!r) return null
      const [gain, wins, n] = r
      const wait = i + 1
      return { wait, month: (month + wait) % 12, gain, wins, n, net: gain - HOLD_COST_PER_MONTH * wait }
    })
    .filter(Boolean)
  const byNet = (a, b) => b.net - a.net
  const ok = (c) => c.wins / c.n >= MIN_WIN_SHARE && c.net >= MIN_NET_GAIN
  // the most profitable wait that ALSO paid reliably; only if none does, the
  // most profitable one overall, so the screen can say why it is not advised.
  // Picking by profit first would let a lucky 4-month wait (5 of 11 years) hide
  // a dependable 2-month one (9 of 11).
  const best = cands.filter(ok).sort(byNet)[0] || cands.sort(byNet)[0] || null

  const reliable = best && best.wins / best.n >= MIN_WIN_SHARE
  const enough = best && best.net >= MIN_NET_GAIN
  const hold = reliable && enough
  const today = price && price.scope !== 'none' ? price.value : null

  return {
    scope: rec.scope,
    years: rec.years,
    month,
    index: rec.index,
    verdict: hold ? 'hold' : 'sell',
    // why not hold — the screen must name the reason that actually applies:
    // 'rarely' = waiting did not pay often enough; 'small' = it paid often but
    // too little to cover the holding cost
    why: hold || !best ? null : !reliable ? 'rarely' : 'small',
    best,
    perQtl: hold && today ? Math.round((today * best.net) / 100 / 10) * 10 : null,
    todayPrice: today,
    perishable: PERISHABLE.has(crop.id),
  }
}
