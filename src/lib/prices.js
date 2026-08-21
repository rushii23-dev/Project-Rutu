import prices from '../data/prices.json'

/**
 * Real Agmarknet modal prices, precomputed per district.
 *
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
      bestPrice: local.bestPrice,
      markets: local.markets,
      date: local.date,
    }
  }

  const st = prices.state?.[cropId]
  if (st) {
    return { value: st.modal, scope: 'state', markets: st.markets, date: prices.source.fetched }
  }

  return covered ? { scope: 'none' } : null
}

export const priceSource = prices.source
export const priceCoverage = prices.coverage || []
