import { SAMPLE_CROPS, cropById } from '../data/crops.js'
import { priceFor } from './prices.js'
import { buildRotation, trajectorySummary } from './rotation.js'
import { seasonForDate, sowingStatus } from './season.js'
import { sowingAdvice } from '../data/weather.js'
import { fmtDate, fmtDoy, fmtWindow, getSeasons } from '../i18n/index.js'

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
      mr: ['नंतर', 'पुढच', 'फेरपालट', 'क्रम', 'जमिनीचा कस', 'नत्र'],
      hi: ['बाद', 'अगली', 'चक्र', 'फेरबदल', 'उर्वरता', 'नाइट्रोजन'],
      en: ['after', 'next season', 'rotation', 'rotate', 'soil', 'nitrogen'],
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
function stems(name) {
  const n = (name || '').toLowerCase().trim()
  if (!n) return []
  const out = [n]
  for (const cut of [1, 2]) {
    const st = n.slice(0, n.length - cut)
    if (st.length >= 3) out.push(st)
  }
  return out
}

function findCrop(text) {
  let best = null
  for (const c of SAMPLE_CROPS) {
    const forms = ['mr', 'hi', 'en'].flatMap((l) => stems(c.name[l]))
    for (const a of c.aliases || []) forms.push(a.toLowerCase())
    {
      for (const st of forms) {
        // longest match wins, so "मूग" cannot hijack "भुईमूग"
        if (text.includes(st) && (!best || st.length > best.len)) {
          best = { crop: c, len: st.length }
        }
      }
    }
  }
  return best ? best.crop : null
}

/**
 * Answer a question.
 * Returns { intent, text, detail, crop, source } — `source` names where the
 * numbers came from so the UI can show provenance rather than assert.
 */
export function ask(utterance, ctx) {
  const { lang, district, districtName, acres, week } = ctx
  const text = (utterance || '').toLowerCase().trim()
  if (!text) return null

  const crop = findCrop(text)

  let best = null
  for (const it of INTENTS) {
    let s = scoreIntent(it, text)
    // "after groundnut, what should I sow" reads as both rotation and
    // what_crop. Naming a crop next to an "after" word settles it as rotation.
    if (it.id === 'rotation' && s > 0 && crop) s += 2
    if (s > 0 && (!best || s > best.s)) best = { id: it.id, s }
  }
  // naming a crop with no other signal is almost always a price question
  if (!best && crop) best = { id: 'price', s: 1 }
  if (!best) return { intent: 'unknown', text: UNKNOWN[lang], crop: null }

  const seasons = getSeasons(lang)
  const season = seasonForDate()

  switch (best.id) {
    case 'sow_when': {
      const st = sowingStatus(SAMPLE_CROPS)
      const win = fmtWindow({ from: st.from, to: st.to }, lang)
      const when = fmtDate(st.from, lang)
      if (st.phase === 'open') {
        return {
          intent: best.id, crop,
          text: {
            mr: `पेरणीची खिडकी आत्ता सुरू आहे — ${win}. ${st.days} दिवस बाकी.`,
            hi: `बुवाई की खिड़की अभी खुली है — ${win}. ${st.days} दिन बाक़ी.`,
            en: `The sowing window is open now — ${win}. ${st.days} days left.`,
          }[lang],
          source: 'IMD + crop calendar',
        }
      }
      return {
        intent: best.id, crop,
        text: {
          mr: `पुढची पेरणी ${when} पासून — ${seasons[st.season]} हंगाम, ${st.days} दिवसांनी.`,
          hi: `अगली बुवाई ${when} से — ${seasons[st.season]} मौसम, ${st.days} दिन में.`,
          en: `Next sowing from ${when} — ${seasons[st.season]} season, in ${st.days} days.`,
        }[lang],
        source: 'IMD + crop calendar',
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
      return {
        intent: best.id, crop: c,
        text: {
          mr: `${c.name.mr} आज ₹${p.value.toLocaleString('en-IN')} प्रति क्विंटल.`,
          hi: `${c.name.hi} आज ₹${p.value.toLocaleString('en-IN')} प्रति क्विंटल.`,
          en: `${c.name.en} is ₹${p.value.toLocaleString('en-IN')} per quintal today.`,
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
      const a = sowingAdvice(week, lang)
      const mm = week.slice(0, 5).reduce((s, d) => s + d.mm, 0)
      return {
        intent: best.id, crop,
        text: a.title,
        detail: {
          mr: `पुढील 5 दिवसांत ${Math.round(mm)} मिमी अपेक्षित. ${a.body}`,
          hi: `अगले 5 दिनों में ${Math.round(mm)} मिमी अनुमानित. ${a.body}`,
          en: `${Math.round(mm)} mm expected over the next 5 days. ${a.body}`,
        }[lang],
        source: 'Open-Meteo (live)',
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
        source: 'crop calendar',
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
        source: 'rotation rules',
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
      return {
        intent: best.id, crop,
        text: {
          mr: `मान्सून ${days} दिवस लवकर येतो — पूर्वी ${fmtDoy(o.fatherDoy, lang)}, आता ${fmtDoy(o.todayDoy, lang)}.`,
          hi: `मानसून ${days} दिन जल्दी आता है — पहले ${fmtDoy(o.fatherDoy, lang)}, अब ${fmtDoy(o.todayDoy, lang)}.`,
          en: `The monsoon arrives ${days} days earlier — was ${fmtDoy(o.fatherDoy, lang)}, now ${fmtDoy(o.todayDoy, lang)}.`,
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
  mr: 'हे समजलं नाही. पेरणी, भाव, पाऊस किंवा पीक याबद्दल विचारा.',
  hi: 'यह समझ नहीं आया. बुवाई, भाव, बारिश या फ़सल के बारे में पूछें.',
  en: "I did not understand. Ask about sowing, price, rain or crops.",
}

/** Example prompts, shown as tappable chips so the farmer knows what to say. */
export const EXAMPLES = {
  mr: ['पेरणी कधी करावी?', 'कांद्याचा भाव काय?', 'पाऊस पडेल का?', 'सोयाबीननंतर काय?'],
  hi: ['बुवाई कब करें?', 'प्याज़ का भाव क्या है?', 'क्या बारिश होगी?', 'सोयाबीन के बाद क्या?'],
  en: ['When should I sow?', 'What is the onion price?', 'Will it rain?', 'What after soybean?'],
}

export const SPEECH_LOCALE = { mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN' }
