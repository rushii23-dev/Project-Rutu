import { SAMPLE_CROPS, SEASON_KEYS } from '../data/crops.js'

/**
 * Regenerative three-season rotation.
 *
 * Rule-based and fully explainable — every recommendation carries a reason a
 * team member can defend when a judge points at it. No model, no training.
 *
 * The soil figures are CROP-TYPE AGRONOMY, not measurements of anyone's field:
 * legumes fix nitrogen, cereals return residue, cotton and onion are heavy
 * feeders. We therefore report a *relative* soil balance, never an absolute
 * organic-carbon percentage — we have no Soil Health Card reading to anchor one
 * to, and inventing a baseline would be fabrication.
 *
 * The district's Soil Health Card odds (lib/soil.js) are shown alongside, as
 * the reason the plan leans on legumes. They are shares of tested fields, not
 * this farmer's reading, so they set the direction here, not a starting number.
 */


/** Season that follows the given one in the cropping year. */
export function nextSeason(season) {
  const i = SEASON_KEYS.indexOf(season)
  return SEASON_KEYS[(i + 1) % SEASON_KEYS.length]
}

/**
 * Score a candidate as the follower of `prev`.
 * Higher is better. Every term is a stated agronomic rule.
 */
function score(candidate, prev, prevPrev) {
  let s = 0
  const reasons = []

  if (prev && candidate.id === prev.id) {
    s -= 100 // never the same crop twice running
    reasons.push('repeat')
  }

  // a legume after a depleting crop is the core regenerative move
  if (prev && candidate.soil.legume && prev.soil.n < 0) {
    s += 40
    reasons.push('fixes-after-depleting')
  }
  // two heavy feeders back to back drains the field
  if (prev && candidate.soil.n <= -2 && prev.soil.n <= -2) {
    s -= 35
    reasons.push('two-heavy-feeders')
  }
  // alternating families breaks pest and disease cycles
  if (prev && candidate.soil.legume !== prev.soil.legume) {
    s += 15
    reasons.push('breaks-cycle')
  }
  // back-to-back legumes is not a rotation — a farmer alternates legume with
  // cereal for residue, food grain and a genuine break in the disease cycle
  if (prev && candidate.soil.legume && prev.soil.legume) {
    s -= 28
    reasons.push('legume-after-legume')
  }
  // three non-legumes in a row is the pattern that degrades soil
  if (prev && prevPrev && !candidate.soil.legume && !prev.soil.legume && !prevPrev.soil.legume) {
    s -= 30
    reasons.push('no-legume-in-cycle')
  }

  s += candidate.soil.n * 8 + candidate.soil.om * 5
  // income matters, but must not overwhelm the soil logic
  s += (candidate.SAMPLE_goodPerAcre / 10000) * 3

  return { s, reasons }
}

/**
 * Build a three-season plan starting from `startCrop`.
 * Returns [{ season, crop, reasons }] of length 3.
 */
export function buildRotation(startCrop) {
  const plan = [{ season: startCrop.season, crop: startCrop, reasons: [] }]

  for (let i = 1; i < 3; i++) {
    const season = nextSeason(plan[i - 1].season)
    const prev = plan[i - 1].crop
    const prevPrev = i >= 2 ? plan[i - 2].crop : null

    const options = SAMPLE_CROPS.filter((c) => c.season === season)
    if (!options.length) break

    let best = null
    for (const c of options) {
      const r = score(c, prev, prevPrev)
      if (!best || r.s > best.s) best = { crop: c, ...r }
    }
    plan.push({ season, crop: best.crop, reasons: best.reasons })
  }
  return plan
}

/**
 * Cumulative soil balance across the plan, as a relative index starting at 0.
 * Deliberately unitless — see the note at the top of this file.
 */
export function soilTrajectory(plan) {
  let n = 0
  let om = 0
  return plan.map((step) => {
    n += step.crop.soil.n
    om += step.crop.soil.om
    return { season: step.season, n, om, total: n + om }
  })
}

/** Does this plan include at least one nitrogen-fixing crop? */
export function isRegenerative(plan) {
  return plan.some((p) => p.crop.soil.legume)
}

const REASON_TEXT = {
  'fixes-after-depleting': {
    mr: 'आधीच्या पिकाने घेतलेलं नत्र हे पीक परत भरतं.',
    hi: 'पिछली फ़सल ने जो नाइट्रोजन लिया, यह फ़सल वापस भरती है.',
    en: 'Replaces the nitrogen the previous crop removed.',
  },
  'breaks-cycle': {
    mr: 'वेगळं कूळ — कीड आणि रोगाचं चक्र तुटतं.',
    hi: 'अलग कुल — कीट और रोग का चक्र टूटता है.',
    en: 'A different crop family, which breaks pest and disease cycles.',
  },
  'two-heavy-feeders': {
    mr: 'सलग दोन जास्त खाणारी पिकं — जमीन थकते.',
    hi: 'लगातार दो भारी फ़सलें — ज़मीन थकती है.',
    en: 'Two heavy feeders in a row exhaust the field.',
  },
  'no-legume-in-cycle': {
    mr: 'तीनही हंगामात कडधान्य नाही — कस घटतो.',
    hi: 'तीनों मौसम में दलहन नहीं — उर्वरता घटती है.',
    en: 'No legume across the cycle, so fertility declines.',
  },
  'legume-after-legume': {
    mr: 'सलग दोन कडधान्यं नकोत — मधे तृणधान्य घ्या.',
    hi: 'लगातार दो दलहन नहीं — बीच में अनाज लें.',
    en: 'Two legumes running is not a rotation — put a cereal between them.',
  },
  repeat: {
    mr: 'तेच पीक पुन्हा घेऊ नका.',
    hi: 'वही फ़सल दोबारा न लें.',
    en: 'Do not repeat the same crop.',
  },
}

export function reasonText(key, lang) {
  const r = REASON_TEXT[key]
  return r ? r[lang] || r.mr : null
}

/** Plain-language summary of what the whole plan does to the soil. */
export function trajectorySummary(plan, lang) {
  const t = soilTrajectory(plan)
  const end = t[t.length - 1]
  const legumes = plan.filter((p) => p.crop.soil.legume).length

  if (end.n > 0) {
    return {
      tone: 'good',
      text: {
        mr: `या क्रमात ${legumes} कडधान्य पीक आहे. तीन हंगामांनंतर जमिनीतलं नत्र वाढतं.`,
        hi: `इस क्रम में ${legumes} दलहनी फ़सल है. तीन मौसम बाद ज़मीन का नाइट्रोजन बढ़ता है.`,
        en: `This sequence includes ${legumes} legume crop${legumes > 1 ? 's' : ''}. Nitrogen ends higher than it started.`,
      }[lang],
    }
  }
  return {
    tone: 'warn',
    text: {
      mr: 'या क्रमात जमिनीतलं नत्र घटतं. एक कडधान्य पीक जोडा.',
      hi: 'इस क्रम में ज़मीन का नाइट्रोजन घटता है. एक दलहनी फ़सल जोड़ें.',
      en: 'This sequence ends with less nitrogen than it started. Add a legume.',
    }[lang],
  }
}
