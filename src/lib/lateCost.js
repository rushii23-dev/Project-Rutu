/**
 * What sowing on the old date costs, in kilos and rupees.
 *
 * The one input we do not measure ourselves is how fast soybean yield falls as
 * sowing is delayed. It comes from a published field trial, not from us:
 *
 *   Nath, Karunakar, Kumar & Nagar (2017). Effect of sowing dates and varieties
 *   on soybean performance in Vidarbha region of Maharashtra, India.
 *   Journal of Applied and Natural Science 9(1): 544–550.
 *   AICRP on Agrometeorology, Dr. PDKV Akola, kharif 2014. Table 2 seed yield:
 *     7 Jul 839 · 14 Jul 763 · 21 Jul 650 · 28 Jul 530 kg/ha
 *
 * A least-squares line through those four points falls 14.86 kg/ha for every
 * day of delay. We use the ABSOLUTE loss rather than a percentage: it was
 * measured in a low-yield dryland season, so on a better-yielding farm it
 * understates the loss rather than overstating it.
 *
 * Limits, which the screen repeats:
 *   - one season at one station, and that station is Akola, not the farmer's own
 *   - the trial measured delay from 7 July; we apply it to delay after the rain
 *     arrives, which is the same mechanism (fewer rain-fed days) but not the
 *     same experiment
 *   - it is only valid across the 21 days the trial spanned, so we cap there
 */
export const TRIAL = {
  kgPerHaPerDay: 14.86,
  maxDays: 21,
  points: [
    { date: '7 Jul', kg: 839 },
    { date: '14 Jul', kg: 763 },
    { date: '21 Jul', kg: 650 },
    { date: '28 Jul', kg: 530 },
  ],
  cite: 'Nath et al. 2017, J. Appl. Nat. Sci. 9(1):544–550 — Dr. PDKV Akola field trial',
  crop: 'soy',
}

const ACRES_PER_HA = 2.471

/**
 * Returns null when there is no measured shift to price, otherwise
 *   { direction: 'late',  days, usedDays, kg, rupees | null }
 *     the old date now falls AFTER the rain: yield lost to a late start
 *   { direction: 'early', days }
 *     the old date now falls BEFORE the rain: the risk is seed in dry soil,
 *     which this trial does not measure, so no rupee figure is offered
 */
export function lateSowingCost(district, acres, price) {
  const o = district?.onset
  if (!o || !o.significant) return null
  // rounded the same way the hero card rounds it, so the two can never disagree
  const days = Math.round(o.fatherDoy - o.todayDoy)
  if (days <= 0) return { direction: 'early', days: -days }

  const usedDays = Math.min(days, TRIAL.maxDays)
  const kg = (usedDays * TRIAL.kgPerHaPerDay * acres) / ACRES_PER_HA
  const perQtl = price && price.scope !== 'none' ? price.value : null
  return {
    direction: 'late',
    days,
    usedDays,
    kg,
    perQtl,
    priceScope: price?.scope || null,
    rupees: perQtl ? (kg / 100) * perQtl : null,
  }
}
