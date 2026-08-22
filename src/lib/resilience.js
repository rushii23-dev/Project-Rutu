/**
 * Climate-resilience score — "does this crop survive the rainfall this block
 * gets NOW, not the rainfall it used to get."
 *
 * Rule-based and fully explainable. Every point added or removed produces a
 * sentence a team member can defend when a judge points at it. No model.
 *
 * It reuses statistics already computed from the 41-year IMD record and stored
 * per district — seasonal total, rain days, and longest dry spell, each as a
 * "then" and a "now" — so the score is anchored to that district's own history
 * rather than to a national average.
 *
 * WHERE IT REFUSES TO SCORE
 * The stored rainfall statistics are monsoon-season statistics. They describe
 * what a kharif crop lives on directly, and what a rabi crop inherits as
 * residual soil moisture. They say nothing useful about a summer crop grown on
 * well water. So summer crops return `scored: false` with the reason, rather
 * than a confident number derived from the wrong measurement. The app already
 * declines to claim an onset shift in 34 of 36 districts; this is the same rule
 * applied to the same evidence.
 *
 * TODO: NEED_MM and DRY_TOLERANCE are agronomic rules of thumb, not yet cited
 * to the Maharashtra package of practices. See DPG.md.
 */

/** Approximate seasonal water requirement, mm, by the crop's water class. */
const NEED_MM = { low: 350, mid: 550, high: 800 }

/** Days without rain the crop tolerates at a critical stage. */
const DRY_TOLERANCE = { low: 25, mid: 18, high: 12 }

/** How much of the crop's water comes from rain that falls on it. */
const RAIN_WEIGHT = { kharif: 1, rabi: 0.5, summer: 0 }

const BASE = 50

function txt(mr, hi, en) {
  return { mr, hi, en }
}

/** Seasonal rainfall against what the crop actually needs. */
function waterFactor(crop, sup) {
  const need = NEED_MM[crop.water]
  const now = Math.round(sup.seasonal.now)
  const ratio = now / need
  const w = RAIN_WEIGHT[crop.season]

  // more rain is not linearly better. Well past the requirement it becomes
  // waterlogging and fungal pressure, which is why this band is not the top one.
  if (ratio >= 1.6) {
    return {
      key: 'water-surplus',
      delta: Math.round(5 * w),
      text: txt(
        `या भागात ${now} मिमी पाऊस पडतो, या पिकाला फक्त ${need} मिमी लागतं. जास्तीच्या पाण्याने पाणी साचणं आणि बुरशी येऊ शकते.`,
        `यहाँ ${now} मिमी बारिश होती है, इस फ़सल को सिर्फ़ ${need} मिमी चाहिए. अतिरिक्त पानी से जलभराव और फफूँदी हो सकती है.`,
        `Your block gets ${now} mm but this crop needs only ${need} mm. The surplus brings waterlogging and fungal risk.`,
      ),
    }
  }
  if (ratio >= 1.15) {
    return {
      key: 'water-comfortable',
      delta: Math.round(25 * w),
      text: txt(
        `या भागात आता ${now} मिमी पाऊस पडतो. या पिकाला ${need} मिमी लागतं — पुरेसा.`,
        `यहाँ अब ${now} मिमी बारिश होती है. इस फ़सल को ${need} मिमी चाहिए — पर्याप्त.`,
        `Your block now gets ${now} mm. This crop needs about ${need} mm — comfortable.`,
      ),
    }
  }
  if (ratio >= 0.9) {
    return {
      key: 'water-adequate',
      delta: Math.round(18 * w),
      text: txt(
        `${now} मिमी पाऊस, गरज ${need} मिमी — जेमतेम भागतं.`,
        `${now} मिमी बारिश, ज़रूरत ${need} मिमी — बस पूरा पड़ता है.`,
        `${now} mm against a need of ${need} mm — just covered.`,
      ),
    }
  }
  if (ratio >= 0.7) {
    return {
      key: 'water-tight',
      delta: Math.round(5 * w),
      text: txt(
        `${now} मिमी पाऊस, गरज ${need} मिमी — कमी पडू शकतं.`,
        `${now} मिमी बारिश, ज़रूरत ${need} मिमी — कम पड़ सकता है.`,
        `${now} mm against a need of ${need} mm — it can fall short.`,
      ),
    }
  }
  return {
    key: 'water-short',
    delta: Math.round(-20 * w),
    text: txt(
      `${now} मिमी पाऊस, गरज ${need} मिमी — पाणी कमी पडेल.`,
      `${now} मिमी बारिश, ज़रूरत ${need} मिमी — पानी कम पड़ेगा.`,
      `${now} mm against a need of ${need} mm — this crop will run short.`,
    ),
  }
}

/** The longest break in the rains, against what the crop survives. */
function dryFactor(crop, sup) {
  const tol = DRY_TOLERANCE[crop.water]
  const now = Math.round(sup.dry.now)
  const margin = tol - now

  if (margin >= 5) {
    return {
      key: 'dry-safe',
      delta: 20,
      text: txt(
        `पावसाचा सर्वात मोठा खंड ${now} दिवस. हे पीक ${tol} दिवस तग धरतं.`,
        `बारिश का सबसे बड़ा खंड ${now} दिन. यह फ़सल ${tol} दिन झेलती है.`,
        `The longest dry spell is ${now} days. This crop tolerates about ${tol}.`,
      ),
    }
  }
  if (margin >= 0) {
    return {
      key: 'dry-close',
      delta: 8,
      text: txt(
        `खंड ${now} दिवस, सहनशक्ती ${tol} दिवस — फार फरक नाही.`,
        `खंड ${now} दिन, सहनशक्ति ${tol} दिन — ज़्यादा अंतर नहीं.`,
        `A ${now}-day dry spell against ${tol} days of tolerance — little margin.`,
      ),
    }
  }
  return {
    key: 'dry-exceeds',
    delta: margin >= -5 ? -8 : -22,
    text: txt(
      `खंड ${now} दिवस — हे पीक ${tol} दिवसांपेक्षा जास्त सहन करत नाही.`,
      `खंड ${now} दिन — यह फ़सल ${tol} दिन से ज़्यादा सहन नहीं करती.`,
      `Dry spells run ${now} days; this crop only tolerates about ${tol}.`,
    ),
  }
}

/**
 * A later onset shortens the kharif season. A long-duration crop gets squeezed
 * against the retreating monsoon; a short one absorbs the shift.
 * Only applied where the shift is statistically significant.
 */
function seasonFitFactor(crop, onset) {
  if (crop.season !== 'kharif' || !onset.significant) return null
  const later = onset.todayDoy - onset.fatherDoy
  if (later <= 0) return null

  const days = Math.round(later)
  const long = crop.duration[1]

  if (long > 140) {
    return {
      key: 'squeezed',
      delta: -15,
      text: txt(
        `मान्सून ${days} दिवस उशिरा येतो आणि हे पीक ${long} दिवसांचं आहे — हंगाम अपुरा पडतो.`,
        `मानसून ${days} दिन देर से आता है और यह फ़सल ${long} दिन की है — मौसम कम पड़ता है.`,
        `Onset is ${days} days later and this crop runs ${long} days — the season is squeezed.`,
      ),
    }
  }
  if (long <= 100) {
    return {
      key: 'absorbs-shift',
      delta: 8,
      text: txt(
        `${long} दिवसांचं पीक — मान्सून ${days} दिवस उशिरा आला तरी वेळ पुरतो.`,
        `${long} दिन की फ़सल — मानसून ${days} दिन देर से आए तब भी समय बचता है.`,
        `At ${long} days this crop still finishes even with onset ${days} days later.`,
      ),
    }
  }
  return null
}

/** Is the district's rainfall moving toward what this crop needs, or away? */
function trendFactor(crop, sup) {
  if (crop.season === 'summer') return null
  const need = NEED_MM[crop.water]
  const before = Math.abs(sup.seasonal.then - need)
  const after = Math.abs(sup.seasonal.now - need)
  if (Math.abs(after - before) < 20) return null

  if (after < before) {
    return {
      key: 'trend-toward',
      delta: 7,
      text: txt(
        'पावसाचा बदल या पिकाच्या बाजूने जातो आहे.',
        'बारिश का बदलाव इस फ़सल के पक्ष में जा रहा है.',
        'The way rainfall is changing moves toward this crop, not away from it.',
      ),
    }
  }
  // name the direction. "Drifting away" beside a surplus reads as a
  // contradiction unless the farmer is told it is drifting away upward.
  const wetter = sup.seasonal.now > sup.seasonal.then
  return {
    key: wetter ? 'trend-wetter' : 'trend-drier',
    delta: -7,
    text: wetter
      ? txt(
          `पाऊस ${Math.round(sup.seasonal.then)} वरून ${Math.round(sup.seasonal.now)} मिमी झाला — या पिकाच्या गरजेपेक्षा जास्त वाढतो आहे.`,
          `बारिश ${Math.round(sup.seasonal.then)} से ${Math.round(sup.seasonal.now)} मिमी हुई — इस फ़सल की ज़रूरत से ज़्यादा बढ़ रही है.`,
          `Rain has risen from ${Math.round(sup.seasonal.then)} to ${Math.round(sup.seasonal.now)} mm — moving past what this crop wants, not toward it.`,
        )
      : txt(
          `पाऊस ${Math.round(sup.seasonal.then)} वरून ${Math.round(sup.seasonal.now)} मिमी घटला — या पिकाच्या गरजेपासून दूर जातो आहे.`,
          `बारिश ${Math.round(sup.seasonal.then)} से घटकर ${Math.round(sup.seasonal.now)} मिमी — इस फ़सल की ज़रूरत से दूर जा रही है.`,
          `Rain has fallen from ${Math.round(sup.seasonal.then)} to ${Math.round(sup.seasonal.now)} mm — away from what this crop needs.`,
        ),
  }
}

/** strong / workable / fragile */
export function bandFor(score) {
  if (score >= 70) return 'strong'
  if (score >= 45) return 'workable'
  return 'fragile'
}

/**
 * Score one crop against one district's current rainfall behaviour.
 * Returns { scored, score, band, factors } — `scored: false` where the stored
 * statistics cannot honestly speak to this crop.
 */
export function resilience(crop, district) {
  const sup = district.supporting
  if (!sup) return { scored: false, reason: 'no-stats' }

  // summer crops run on well water; a monsoon statistic cannot score them
  if (crop.season === 'summer') {
    return {
      scored: false,
      reason: 'not-rainfed',
      text: txt(
        'हे उन्हाळी पीक विहिरीच्या पाण्यावर येतं. मान्सूनच्या आकड्यांवरून याचं मूल्यमापन करणं चुकीचं ठरेल, म्हणून आम्ही करत नाही.',
        'यह गर्मी की फ़सल कुएँ के पानी पर होती है. मानसून के आँकड़ों से इसका आकलन ग़लत होगा, इसलिए हम नहीं करते.',
        'This summer crop runs on well water. Scoring it against monsoon statistics would be misleading, so we do not.',
      ),
    }
  }

  const factors = [
    waterFactor(crop, sup),
    crop.season === 'kharif' ? dryFactor(crop, sup) : null,
    seasonFitFactor(crop, district.onset),
    trendFactor(crop, sup),
  ].filter(Boolean)

  const score = Math.max(0, Math.min(100, factors.reduce((a, f) => a + f.delta, BASE)))
  return { scored: true, score, band: bandFor(score), factors }
}

/** One line summarising what the band means, in the farmer's language. */
export function bandSummary(band, lang) {
  const t = {
    strong: txt(
      'तुमच्या भागात आज पडणाऱ्या पावसात हे पीक टिकतं.',
      'आपके इलाक़े में आज होने वाली बारिश में यह फ़सल टिकती है.',
      'This crop holds up in the rainfall your block actually gets today.',
    ),
    workable: txt(
      'हे पीक चालतं, पण पाऊस लहरी झाला तर धोका आहे.',
      'यह फ़सल चलती है, पर बारिश बिगड़ी तो जोखिम है.',
      'Workable, but a bad rain year will hurt it.',
    ),
    fragile: txt(
      'तुमच्या भागातला आजचा पाऊस या पिकाला पुरेसा नाही.',
      'आपके इलाक़े की आज की बारिश इस फ़सल के लिए काफ़ी नहीं.',
      'Your block’s current rainfall does not suit this crop.',
    ),
  }[band]
  return t[lang] || t.mr
}
