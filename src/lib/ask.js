import { SAMPLE_CROPS } from '../data/crops.js'
import { priceFor } from './prices.js'
import { isPriceStale } from './priceAge.js'
import { buildRotation, trajectorySummary } from './rotation.js'
import { seasonForDate, sowingStatus } from './season.js'
import { weekAdvice } from './field.js'
import { MONTHS_FULL, fmtDate, fmtDoy, fmtWindow, getSeasons } from '../i18n/index.js'
import { sellAdvice } from './sell.js'
import { pct, soilFor } from './soil.js'

/**
 * Ask RITU — retrieval-grounded question answering in Marathi, Hindi or English.
 *
 * DELIBERATELY NOT A GENERATIVE MODEL.
 *
 * Every answer is composed from data this app already holds and can defend: the
 * IMD onset series, the live Open-Meteo forecast, real Agmarknet prices, the
 * rotation rules. Nothing is invented at answer time.
 *
 * The reason is not cost, it is safety. A language model that hallucinates a
 * sowing date causes exactly the germination failure this project exists to
 * prevent. A farmer cannot audit a fluent wrong answer. So retrieval selects
 * which verified fact to speak, and templating puts it in the farmer's language.
 *
 * It also means answers work offline, cost nothing, and can always be traced to
 * a source — which is the same standard the rest of the app is held to.
 */

/** Intent vocabulary. Matching is on stems, so inflections still hit. */
const INTENTS = [
  {
    id: 'sow_when',
    kw: {
      mr: ['पेरणी', 'पेरण', 'कधी', 'तारीख', 'लावण'],
      hi: ['बुवाई', 'बुआई', 'कब', 'तारीख', 'बोन', 'बोऊ'],
      en: ['sow', 'sowing', 'when', 'plant date', 'date'],
    },
  },
  {
    id: 'price',
    kw: {
      mr: ['भाव', 'बाजार', 'किंमत', 'दर', 'विक'],
      hi: ['भाव', 'बाज़ार', 'बाजार', 'कीमत', 'दाम', 'मंडी', 'बेच'],
      en: ['price', 'market', 'mandi', 'rate', 'sell', 'cost'],
    },
  },
  {
    id: 'rain',
    kw: {
      mr: ['पाऊस', 'पाउस', 'हवामान', 'ढग', 'वादळ'],
      hi: ['बारिश', 'बरसात', 'मौसम', 'बादल', 'पानी बरस'],
      en: ['rain', 'weather', 'forecast', 'cloud', 'storm'],
    },
  },
  {
    id: 'what_crop',
    kw: {
      mr: ['काय पेर', 'कोणतं पीक', 'कोणते पीक', 'पीक घ्याव', 'सुचव'],
      hi: ['क्या बो', 'कौन सी फ़सल', 'कौन सी फसल', 'फ़सल लूँ', 'सुझा'],
      en: ['what crop', 'which crop', 'what should i grow', 'recommend', 'suggest'],
    },
  },
  {
    id: 'rotation',
    kw: {
      mr: ['नंतर', 'पुढच', 'फेरपालट', 'क्रम'],
      hi: ['बाद', 'अगली', 'चक्र', 'फेरबदल'],
      en: ['after', 'next season', 'rotation', 'rotate'],
    },
  },
  {
    // "when" + "sell" also scores sow_when and price; the phrase match plus a
    // bonus in ask() makes the specific question win over the general ones
    id: 'sell_when',
    kw: {
      mr: ['कधी विक', 'केव्हा विक', 'विकू की', 'थांबू', 'साठव'],
      hi: ['कब बेच', 'बेचूँ या', 'रोकूँ', 'रोक कर', 'भंडार'],
      en: ['when to sell', 'when should i sell', 'when do i sell', 'sell now', 'hold', 'store'],
    },
  },
  {
    id: 'soil',
    kw: {
      mr: ['माती', 'मृदा', 'जमिनीचा कस', 'नत्र', 'खत', 'सेंद्रिय'],
      hi: ['मिट्टी', 'मृदा', 'उर्वरता', 'नाइट्रोजन', 'खाद', 'जैविक'],
      en: ['soil', 'nitrogen', 'fertiliser', 'fertilizer', 'carbon', 'zinc'],
    },
  },
  {
    id: 'shift',
    kw: {
      mr: ['बदल', 'मान्सून', 'आधी', 'पूर्वी', 'वडील'],
      hi: ['बदल', 'मानसून', 'पहले', 'पिता', 'बदलाव'],
      en: ['shift', 'monsoon', 'changed', 'earlier', 'father', 'trend'],
    },
  },
]

/**
 * Score an intent by how many of its keywords appear in the utterance.
 *
 * Matched across ALL THREE languages, not just the selected one. Farmers
 * code-switch constantly — a Marathi speaker asks "कपास के बाद क्या?" without
 * changing the app's language, and scoring only the selected language answered
 * the wrong question. The three vocabularies are distinct enough not to collide.
 */
function scoreIntent(intent, text) {
  let hits = 0
  for (const l of ['mr', 'hi', 'en']) {
    for (const k of intent.kw[l] || []) {
      if (text.includes(k.toLowerCase())) hits += 1
    }
  }
  return hits
}

/**
 * Did they name a crop? Checked in all three languages, and on STEMS.
 *
 * Devanagari inflects heavily: a farmer asking about onion says "कांद्याचा",
 * not "कांदा". Exact matching silently answered about the wrong crop, which is
 * worse than not answering, so we match a trimmed stem too. Stems shorter than
 * three characters are not used — they would collide.
 */
const DEVANAGARI = /[ऀ-ॿ]/

/**
 * Trimmed stems, for Devanagari only.
 *
 * Devanagari inflects by changing the stem, so a 1-2 character trim genuinely
 * helps match "गव्हाची" against "गहू". Latin script does not inflect that way,
 * and trimming there is actively harmful: stemming "wheat" yields "whe", which
 * is a substring of "when" — so every English question beginning "when should
 * I sow..." silently resolved to wheat. Latin names are matched whole, on a
 * word boundary, and English inflection is handled by the explicit alias list.
 */
function stems(name) {
  const n = (name || '').toLowerCase().trim()
  if (!n) return []
  if (!DEVANAGARI.test(n)) return [n]
  const out = [n]
  for (const cut of [1, 2]) {
    const st = n.slice(0, n.length - cut)
    if (st.length >= 3) out.push(st)
  }
  return out
}

/** Whole-word containment for Latin script; plain containment for Devanagari. */
function contains(text, form) {
  if (DEVANAGARI.test(form)) return text.includes(form)
  const esc = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`).test(text)
}

function findCrop(text) {
  let best = null
  for (const c of SAMPLE_CROPS) {
    const forms = ['mr', 'hi', 'en'].flatMap((l) => stems(c.name[l]))
    for (const a of c.aliases || []) forms.push(a.toLowerCase())
    for (const st of forms) {
      // longest match wins, so "मूग" cannot hijack "भुईमूग"
      if (contains(text, st) && (!best || st.length > best.len)) {
        best = { crop: c, len: st.length }
      }
    }
  }
  return best ? best.crop : null
}

/**
 * Source lines in the farmer's language. Only proper names — IMD, Agmarknet,
 * Open-Meteo — stay in Latin script; they are what he would search for.
 */
const WORDS = {
  calendar: { mr: 'पीक दिनदर्शिका', hi: 'फ़सल कैलेंडर', en: 'crop calendar' },
  live: { mr: 'थेट', hi: 'लाइव', en: 'live' },
  rotation: { mr: 'फेरपालटीचे नियम', hi: 'फ़सल-चक्र के नियम', en: 'rotation rules' },
  shc: { mr: 'मृदा आरोग्य पत्रिका', hi: 'मृदा स्वास्थ्य कार्ड', en: 'Soil Health Card' },
  tests: { mr: 'चाचण्या', hi: 'जाँच', en: 'tests' },
  yearsOfPrices: { mr: 'वर्षांचे भाव', hi: 'साल के भाव', en: 'years of prices' },
}

/**
 * Answer a question.
 * Returns { intent, text, detail, crop, source } — `source` names where the
 * numbers came from so the UI can show provenance rather than assert.
 */
export function ask(utterance, ctx) {
  const { lang, district, districtName, week, isSample, fieldCrop, todayKey } = ctx
  const w = (k) => WORDS[k][lang]
  const text = (utterance || '').toLowerCase().trim()
  if (!text) return null

  const crop = findCrop(text)

  let best = null
  for (const it of INTENTS) {
    let s = scoreIntent(it, text)
    // "after groundnut, what should I sow" reads as both rotation and
    // what_crop. Naming a crop next to an "after" word settles it as rotation.
    if (it.id === 'rotation' && s > 0 && crop) s += 2
    if (it.id === 'sell_when' && s > 0) s += 2
    if (s > 0 && (!best || s > best.s)) best = { id: it.id, s }
  }
  // naming a crop with no other signal is almost always a price question
  if (!best && crop) best = { id: 'price', s: 1 }
  if (!best) return { intent: 'unknown', text: UNKNOWN[lang], crop: null }

  const seasons = getSeasons(lang)
  const season = seasonForDate()

  switch (best.id) {
    case 'sow_when': {
      // If the farmer named a crop, answer about THAT crop's window. This used
      // to always scan every crop, so "when should I sow soybean" replied with
      // the nearest rabi date — a different crop in a different season.
      const st = sowingStatus(crop ? [crop] : SAMPLE_CROPS, district)
      const win = fmtWindow({ from: st.from, to: st.to }, lang)
      const when = fmtDate(st.from, lang)
      const named = crop ? crop.name[lang] : null

      if (st.phase === 'open') {
        return {
          intent: best.id, crop,
          text: {
            mr: named
              ? `${named} — पेरणीची खिडकी आत्ता सुरू आहे, ${win}. ${st.days} दिवस बाकी.`
              : `पेरणीची खिडकी आत्ता सुरू आहे — ${win}. ${st.days} दिवस बाकी.`,
            hi: named
              ? `${named} — बुवाई की खिड़की अभी खुली है, ${win}. ${st.days} दिन बाक़ी.`
              : `बुवाई की खिड़की अभी खुली है — ${win}. ${st.days} दिन बाक़ी.`,
            en: named
              ? `The sowing window for ${named} is open now — ${win}. ${st.days} days left.`
              : `The sowing window is open now — ${win}. ${st.days} days left.`,
          }[lang],
          source: `IMD + ${w('calendar')}`,
        }
      }
      return {
        intent: best.id, crop,
        text: {
          mr: named
            ? `${named} — पुढची पेरणी ${when} पासून, ${seasons[st.season]} हंगाम, ${st.days} दिवसांनी.`
            : `पुढची पेरणी ${when} पासून — ${seasons[st.season]} हंगाम, ${st.days} दिवसांनी.`,
          hi: named
            ? `${named} — अगली बुवाई ${when} से, ${seasons[st.season]} मौसम, ${st.days} दिन में.`
            : `अगली बुवाई ${when} से — ${seasons[st.season]} मौसम, ${st.days} दिन में.`,
          en: named
            ? `Next ${named} sowing from ${when} — ${seasons[st.season]} season, in ${st.days} days.`
            : `Next sowing from ${when} — ${seasons[st.season]} season, in ${st.days} days.`,
        }[lang],
        source: `IMD + ${w('calendar')}`,
      }
    }

    case 'price': {
      const c = crop || SAMPLE_CROPS.find((x) => x.season === season) || SAMPLE_CROPS[0]
      const p = priceFor(c.id, district.id)
      if (!p || p.scope === 'none') {
        return {
          intent: best.id, crop: c,
          text: {
            mr: `${c.name.mr} — आज ${districtName()}मध्ये आवक नाही, त्यामुळे भाव नाही.`,
            hi: `${c.name.hi} — आज ${districtName()} में आवक नहीं, इसलिए भाव नहीं.`,
            en: `${c.name.en} — no arrivals in ${districtName()} today, so no price.`,
          }[lang],
          source: 'Agmarknet',
        }
      }
      // an old price is answered with its date, never as today's
      const when = isPriceStale(p) ? p.date : null
      return {
        intent: best.id, crop: c,
        text: {
          mr: `${c.name.mr} ${when ? when + ' रोजी' : 'आज'} ₹${p.value.toLocaleString('en-IN')} प्रति क्विंटल.`,
          hi: `${c.name.hi} ${when ? when + ' को' : 'आज'} ₹${p.value.toLocaleString('en-IN')} प्रति क्विंटल.`,
          en: when
            ? `${c.name.en} was ₹${p.value.toLocaleString('en-IN')} per quintal on ${when}.`
            : `${c.name.en} is ₹${p.value.toLocaleString('en-IN')} per quintal today.`,
        }[lang],
        detail: p.market
          ? {
              mr: `सर्वोत्तम बाजार ${p.market} — ₹${p.bestPrice.toLocaleString('en-IN')}.`,
              hi: `सबसे अच्छी मंडी ${p.market} — ₹${p.bestPrice.toLocaleString('en-IN')}.`,
              en: `Best market ${p.market} — ₹${p.bestPrice.toLocaleString('en-IN')}.`,
            }[lang]
          : null,
        source: `Agmarknet ${p.date || ''}`,
      }
    }

    case 'rain': {
      // The source line used to read "Open-Meteo (live)" unconditionally, which
      // labelled the sample week as a live reading. Answer only from a forecast
      // we actually fetched.
      if (isSample) {
        return {
          intent: best.id, crop,
          text: {
            mr: 'हवामान सेवेशी संपर्क झाला नाही',
            hi: 'मौसम सेवा से संपर्क नहीं हुआ',
            en: 'Could not reach the forecast service',
          }[lang],
          detail: {
            mr: 'अंदाज मिळाल्याशिवाय पावसाबद्दल उत्तर देणार नाही.',
            hi: 'अनुमान मिले बिना बारिश के बारे में जवाब नहीं देंगे.',
            en: 'We will not answer a rain question without a forecast in hand.',
          }[lang],
          source: null,
        }
      }
      // the same advice the Weather screen gives, so the two never disagree;
      // it already states the millimetres — do not restate them here
      const a = weekAdvice({ crops: SAMPLE_CROPS, district, week, lang, todayKey, fieldCrop })
      return {
        intent: best.id, crop: a.crop || crop,
        text: a.title,
        detail: a.body,
        source: `Open-Meteo (${w('live')})`,
      }
    }

    case 'what_crop': {
      const opts = SAMPLE_CROPS.filter((c) => c.season === season).slice(0, 2)
      const names = opts.map((c) => c.name[lang]).join({ mr: ' किंवा ', hi: ' या ', en: ' or ' }[lang])
      return {
        intent: best.id, crop: opts[0],
        text: {
          mr: `${seasons[season]} हंगामासाठी ${names}.`,
          hi: `${seasons[season]} मौसम के लिए ${names}.`,
          en: `For the ${seasons[season]} season: ${names}.`,
        }[lang],
        detail: opts[0] ? opts[0].reason[lang] : null,
        source: w('calendar'),
      }
    }

    case 'rotation': {
      const c = crop || SAMPLE_CROPS.find((x) => x.season === season) || SAMPLE_CROPS[0]
      const plan = buildRotation(c)
      const seq = plan.map((p) => p.crop.name[lang]).join(' → ')
      return {
        intent: best.id, crop: c,
        text: seq,
        detail: trajectorySummary(plan, lang).text,
        source: w('rotation'),
      }
    }

    case 'sell_when': {
      const c = crop || SAMPLE_CROPS.find((x) => x.id === 'soy')
      const a = sellAdvice(c, district, priceFor(c.id, district.id))
      const MF = MONTHS_FULL[lang]
      if (!a) {
        return {
          intent: best.id, crop: c,
          text: {
            mr: `${c.name.mr} — पुरेसे जुने भाव उपलब्ध नाहीत.`,
            hi: `${c.name.hi} — पर्याप्त पुराने भाव उपलब्ध नहीं.`,
            en: `${c.name.en} — not enough price history to judge.`,
          }[lang],
          source: 'Agmarknet',
        }
      }
      const where = a.scope === 'district' ? districtName() : { mr: 'महाराष्ट्र', hi: 'महाराष्ट्र', en: 'Maharashtra' }[lang]
      const hold = a.verdict === 'hold'
      const perQtl = a.perQtl ? a.perQtl.toLocaleString('en-IN') : null
      return {
        intent: best.id, crop: c,
        text: hold
          ? {
              mr: `${c.name.mr} ${MF[a.best.month]}पर्यंत थांबवा${perQtl ? ` — साधारण ₹${perQtl}/क्विंटल जास्त` : ''}.`,
              hi: `${c.name.hi} ${MF[a.best.month]} तक रोकें${perQtl ? ` — लगभग ₹${perQtl}/क्विंटल ज़्यादा` : ''}.`,
              en: `Hold ${c.name.en.toLowerCase()} until ${MF[a.best.month]}${perQtl ? ` — about ₹${perQtl}/qtl more` : ''}.`,
            }[lang]
          : {
              mr: `${c.name.mr} काढणीनंतरच विका.`,
              hi: `${c.name.hi} कटाई के बाद ही बेचें.`,
              en: `Sell ${c.name.en.toLowerCase()} at harvest.`,
            }[lang],
        detail: !a.best
          ? null
          : hold
            ? {
                mr: `${where}मध्ये ${a.best.n} पैकी ${a.best.wins} वर्षांत थांबणं फायद्याचं ठरलं, साठवणुकीचा खर्च वजा करून.`,
                hi: `${where} में ${a.best.n} में से ${a.best.wins} साल रुकना फ़ायदेमंद रहा, भंडारण ख़र्च घटा कर.`,
                en: `In ${where}, waiting paid in ${a.best.wins} of ${a.best.n} years, after holding costs.`,
              }[lang]
            : a.why === 'small'
              ? {
                  mr: `${where}मध्ये थांबल्यावर भाव फक्त ${a.best.gain}% वाढला — साठवणुकीचा खर्च त्यापेक्षा जास्त.`,
                  hi: `${where} में रुकने पर भाव सिर्फ़ ${a.best.gain}% बढ़ा — भंडारण ख़र्च उससे ज़्यादा.`,
                  en: `In ${where}, waiting raised the price by only ${a.best.gain}% — less than it costs to hold.`,
                }[lang]
              : {
                  mr: `${where}मध्ये थांबल्याचा फायदा फक्त ${a.best.n} पैकी ${a.best.wins} वर्षांत झाला.`,
                  hi: `${where} में रुकने का फ़ायदा ${a.best.n} में से सिर्फ़ ${a.best.wins} साल हुआ.`,
                  en: `In ${where}, waiting paid in only ${a.best.wins} of ${a.best.n} years.`,
                }[lang],
        source: `Agmarknet, ${a.years} ${w('yearsOfPrices')}`,
      }
    }

    case 'soil': {
      const sl = soilFor(district.id)
      if (!sl) {
        return {
          intent: best.id, crop,
          text: {
            mr: `${districtName()}साठी मृदा चाचण्या उपलब्ध नाहीत.`,
            hi: `${districtName()} के लिए मिट्टी जाँच उपलब्ध नहीं.`,
            en: `There are no soil tests on record for ${districtName()}.`,
          }[lang],
          source: w('shc'),
        }
      }
      return {
        intent: best.id, crop,
        text: {
          mr: `${districtName()}मध्ये ${pct(sl.n[0])}% शेतांत नत्र कमी, ${pct(sl.oc[0])}% शेतांत सेंद्रिय कर्ब कमी.`,
          hi: `${districtName()} में ${pct(sl.n[0])}% खेतों में नाइट्रोजन कम, ${pct(sl.oc[0])}% में जैविक कार्बन कम.`,
          en: `In ${districtName()}, ${pct(sl.n[0])}% of fields tested are low in nitrogen and ${pct(sl.oc[0])}% low in organic carbon.`,
        }[lang],
        detail: {
          mr: 'फेरपालटीत कडधान्य ठेवा. तुमच्या शेताची पत्रिका मोफत काढून घ्या — हा जिल्ह्याचा अंदाज आहे, तुमच्या शेताचा नाही.',
          hi: 'फ़सल-चक्र में दलहन रखें. अपने खेत का कार्ड मुफ़्त बनवाएँ — यह ज़िले का अनुमान है, आपके खेत का नहीं.',
          en: 'Keep a legume in your rotation, and get your own field tested free — these are the district odds, not your field.',
        }[lang],
        source: `${w('shc')} ${sl.cycle}, ${sl.samples.toLocaleString('en-IN')} ${w('tests')}`,
      }
    }

    case 'shift': {
      const o = district.onset
      if (!o.significant) {
        return {
          intent: best.id, crop,
          text: {
            mr: `${districtName()}मध्ये मान्सूनच्या तारखेत मोजता येण्याजोगा बदल नाही.`,
            hi: `${districtName()} में मानसून की तारीख़ में मापने लायक बदलाव नहीं है.`,
            en: `${districtName()} shows no measurable shift in the monsoon date.`,
          }[lang],
          source: `IMD ${o.yearFrom}–${o.yearTo}`,
        }
      }
      const days = Math.abs(Math.round(o.shiftDays))
      // direction from the sign, never a hardcoded word — the same fix the home
      // screen got; a district trending later must not be told "earlier"
      const early = o.shiftDays < 0
      return {
        intent: best.id, crop,
        text: {
          mr: `मान्सून ${days} दिवस ${early ? 'लवकर' : 'उशिरा'} येतो — पूर्वी ${fmtDoy(o.fatherDoy, lang)}, आता ${fmtDoy(o.todayDoy, lang)}.`,
          hi: `मानसून ${days} दिन ${early ? 'जल्दी' : 'देर से'} आता है — पहले ${fmtDoy(o.fatherDoy, lang)}, अब ${fmtDoy(o.todayDoy, lang)}.`,
          en: `The monsoon arrives ${days} days ${early ? 'earlier' : 'later'} — was ${fmtDoy(o.fatherDoy, lang)}, now ${fmtDoy(o.todayDoy, lang)}.`,
        }[lang],
        detail: {
          mr: `${o.nYears} वर्षांच्या IMD नोंदींवरून, p = ${o.p}.`,
          hi: `${o.nYears} साल के IMD आँकड़ों से, p = ${o.p}.`,
          en: `From ${o.nYears} years of IMD records, p = ${o.p}.`,
        }[lang],
        source: `IMD ${o.yearFrom}–${o.yearTo}`,
      }
    }

    default:
      return { intent: 'unknown', text: UNKNOWN[lang], crop: null }
  }
}

const UNKNOWN = {
  mr: 'हे समजलं नाही. पेरणी, भाव, विक्री, पाऊस, माती किंवा पीक याबद्दल विचारा.',
  hi: 'यह समझ नहीं आया. बुवाई, भाव, बिक्री, बारिश, मिट्टी या फ़सल के बारे में पूछें.',
  en: 'I did not understand. Ask about sowing, prices, selling, rain, soil or crops.',
}

/** Example prompts, shown as tappable chips so the farmer knows what to say. */
export const EXAMPLES = {
  mr: ['सोयाबीन कधी विकू?', 'माझी माती कशी आहे?', 'पेरणी कधी करावी?', 'कांद्याचा भाव काय?', 'पाऊस पडेल का?', 'सोयाबीननंतर काय?'],
  hi: ['सोयाबीन कब बेचूँ?', 'मेरी मिट्टी कैसी है?', 'बुवाई कब करें?', 'प्याज़ का भाव क्या है?', 'क्या बारिश होगी?', 'सोयाबीन के बाद क्या?'],
  en: ['When should I sell soybean?', 'How is my soil?', 'When should I sow?', 'What is the onion price?', 'Will it rain?', 'What after soybean?'],
}

export const SPEECH_LOCALE = { mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN' }
