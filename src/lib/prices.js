import bundled from '../data/prices.json'

/**
 * Real Agmarknet modal prices, precomputed per district.
 *
 * The copy imported above is the one baked into this build, so the app has
 * prices offline from the first open. A GitHub Action refreshes the file
 * several times a day and every refresh redeploys — but an installed app keeps
 * running the build it opened with. So the same file is also fetched at
 * runtime (refreshPrices, below) and swapped in when it is newer: an app left
 * open, or installed a month ago, shows today's mandi price, not the one it
 * was installed with.
 */
let prices = bundled
export let priceSource = prices.source
export let priceCoverage = prices.coverage || []

/** Where the deployment serves the current file (emitted by vite.config.js). */
const LIVE_URL = '/data/prices.json'

// `fetchedAt` is a full timestamp so the evening run can replace the morning
// run of the same day; files written before it existed carry only a date.
const stamp = (p) => p?.source?.fetchedAt || p?.source?.fetched || ''

/**
 * Fetch the deployed price file and use it if it is newer than what we hold.
 * Resolves true when the prices changed. Never throws: offline, or a response
 * that is not a price file, leaves the current prices exactly as they were.
 */
export async function refreshPrices() {
  try {
    const res = await fetch(LIVE_URL, { cache: 'no-cache' })
    if (!res.ok) return false
    const next = await res.json()
    if (!next?.source?.fetched || !next.districts) return false
    // never step backwards: a stale copy must not replace newer prices
    if (stamp(next) <= stamp(prices)) return false
    prices = next
    priceSource = next.source
    priceCoverage = next.coverage || []
    return true
  } catch {
    return false
  }
}

/**
 * Three distinct outcomes, deliberately not collapsed into one:
 *   { scope: 'district' } — we queried this district and the crop traded
 *   { scope: 'state' }    — no local arrivals, showing the state median
 *   { scope: 'none' }     — we queried and the crop did not trade anywhere
 *   null                  — we have not fetched this district at all
 *
 * The last case matters: claiming "no arrivals today" for a district we never
 * queried would be inventing a fact.
 */
export function priceFor(cropId, districtId) {
  const covered = (prices.coverage || []).includes(districtId)

  const local = prices.districts?.[districtId]?.[cropId]
  if (local) {
    return {
      value: local.modal,
      low: local.low,
      high: local.high,
      scope: 'district',
      market: local.bestMarket,
      bestTaluka: local.bestTaluka || '',
      bestPrice: local.bestPrice,
      markets: local.markets,
      // one row per market, best-paying first. Agmarknet market names carry
      // the taluka, which is the finest location the source publishes.
      stalls: local.stalls || [],
      date: local.date,
    }
  }

  const st = prices.state?.[cropId]
  if (st) {
    return { value: st.modal, scope: 'state', markets: st.markets, date: prices.source.fetched }
  }

  return covered ? { scope: 'none' } : null
}
