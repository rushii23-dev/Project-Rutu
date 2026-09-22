import soil from '../data/soil.json'

/**
 * District soil status from the Soil Health Card scheme.
 *
 * These are shares of FIELD SAMPLES tested in a district, not a reading of any
 * one farmer's field. "74% low in nitrogen" is the odds his field is low — and
 * the reason to get it tested, which is free under the scheme.
 */

export const soilSource = soil.source
export const soilRatings = soil.ratings

function shares(counts) {
  const total = counts.reduce((a, b) => a + b, 0)
  return total ? counts.map((c) => c / total) : counts.map(() => 0)
}

/**
 * Returns null for a district with no soil tests (Mumbai), otherwise
 * { cycle, samples, n, p, k, oc: [low, med, high] shares,
 *   deficient: { S, Zn, B, Fe } shares, history: [{ cycle, samples, ocLow, nLow }] }
 */
export function soilFor(districtId) {
  const d = soil.districts[districtId]
  if (!d) return null
  const cycles = Object.keys(d).sort()
  const latest = cycles[cycles.length - 1]
  const c = d[latest]
  const def = (counts) => shares(counts)[0]
  return {
    cycle: latest,
    samples: c.samples,
    n: shares(c.n),
    p: shares(c.p),
    k: shares(c.k),
    oc: shares(c.OC),
    deficient: { S: def(c.S), Zn: def(c.Zn), B: def(c.B), Fe: def(c.Fe) },
    history: cycles.map((cy) => ({
      cycle: cy,
      samples: d[cy].samples,
      nLow: shares(d[cy].n)[0],
      ocLow: shares(d[cy].OC)[0],
    })),
  }
}

/** '0.743' -> 74 */
export const pct = (x) => Math.round(x * 100)
