import { cropWindow, rainDecidesSowing, sowingStatus } from './season.js'
import { sowingAdvice } from '../data/weather.js'
import { fmtDate, fmtIsoShort, fmtWindow, getSeasons, relDayLabel } from '../i18n/index.js'

/**
 * The crop in the ground: what stage it is at today, and what this week's
 * forecast means for it.
 *
 * Before this, the home screen only ever spoke about sowing. On 21 September it
 * told a Nashik farmer "rain is light — wait, sow after 50 mm", while his
 * soybean stood ready for harvest with rain on the way. The advice a farmer
 * needs changes with the farming year, so this works out where in that year his
 * crop is.
 *
 * STAGE is estimated, not observed. We assume sowing at the middle of the
 * crop's window — for kharif crops that window is counted from THIS district's
 * corrected monsoon onset — and divide the crop's duration into the ordinary
 * agronomic stages. The screen says it is an estimate.
 */

const MS_DAY = 86400000

// Fractions of total duration. Rule of thumb for field crops; the boundaries
// only decide which warnings apply, never a number shown to the farmer.
const STAGES = [
  ['establish', 0.15],
  ['vegetative', 0.45],
  ['flowering', 0.65],
  ['filling', 0.9],
  ['maturity', 1.0],
]

/** Days after maturity during which the crop is still being harvested. */
const HARVEST_DAYS = 15
/**
 * Days after harvest during which "when to sell" is still the live question.
 * Long enough to cover soybean held to January and rabi onion held in a chawl
 * to June; short enough that May's summer groundnut is off the list by autumn.
 */
const SELL_DAYS = 100

function sowDate(crop, district, year) {
  const w = cropWindow(crop, district)
  const from = Date.UTC(year, w.from.m, w.from.d)
  let to = Date.UTC(year, w.to.m, w.to.d)
  if (to < from) to += 365 * MS_DAY // a window that crosses the new year
  return new Date((from + to) / 2)
}

/**
 * Where one crop is in its life, today.
 *
 * Returns {
 *   phase: 'growing' | 'harvest' | 'sold' | 'none',
 *   stage: 'establish' | 'vegetative' | 'flowering' | 'filling' | 'maturity' | null,
 *   day, duration, sown (Date), harvestFrom (Date), progress (0-1)
 * }
 *   growing — in the field, before maturity
 *   harvest — mature, or within HARVEST_DAYS of maturity
 *   sold    — harvested within SELL_DAYS: the selling decision is live
 *   none    — not in the ground this cycle
 */
export function cropStage(crop, district, now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const duration = Math.round((crop.duration[0] + crop.duration[1]) / 2)

  // the most recent sowing that is not in the future
  let sown = sowDate(crop, district, now.getFullYear())
  if (sown.getTime() > today) sown = sowDate(crop, district, now.getFullYear() - 1)

  const day = Math.floor((today - sown.getTime()) / MS_DAY)
  const harvestFrom = new Date(sown.getTime() + Math.round(duration * STAGES[3][1]) * MS_DAY)
  const base = { day, duration, sown, harvestFrom, progress: Math.min(1, Math.max(0, day / duration)) }

  if (day < 0) return { ...base, phase: 'none', stage: null }
  if (day > duration + HARVEST_DAYS + SELL_DAYS) return { ...base, phase: 'none', stage: null }
  if (day > duration + HARVEST_DAYS) return { ...base, phase: 'sold', stage: null }

  const frac = day / duration
  const stage = (STAGES.find(([, upTo]) => frac < upTo) || STAGES[STAGES.length - 1])[0]
  const phase = stage === 'maturity' || frac >= 1 ? 'harvest' : 'growing'
  return { ...base, phase, stage: frac >= 1 ? 'maturity' : stage }
}

/**
 * Every crop that is the farmer's concern right now: in the ground, being
 * harvested, or harvested recently enough that when to sell is still open.
 */
export function cropsInField(crops, district, now = new Date()) {
  return crops
    .map((c) => ({ crop: c, st: cropStage(c, district, now) }))
    .filter((x) => x.st.phase !== 'none')
}

/**
 * Picks the crop to show: the farmer's own choice if it is still his to worry
 * about, otherwise the most pressing one — ready to harvest, then growing, then
 * harvested and waiting to be sold.
 */
const PRIORITY = { harvest: 0, growing: 1, sold: 2 }
export function pickFieldCrop(inField, chosenId) {
  if (!inField.length) return null
  const chosen = inField.find((x) => x.crop.id === chosenId)
  if (chosen) return chosen
  return [...inField].sort(
    (a, b) => PRIORITY[a.st.phase] - PRIORITY[b.st.phase] || (b.crop.id === 'soy') - (a.crop.id === 'soy')
  )[0]
}

/**
 * "Today" / "Tomorrow" alone; any later day also gets its date, so a warning
 * can never be read against the wrong Wednesday.
 */
export function forecastDayLabel(week, todayKey, lang) {
  return (iso) => {
    const r = relDayLabel(iso, todayKey, lang)
    return week.findIndex((d) => d.iso === iso) <= 1 ? r : `${r} ${fmtIsoShort(iso, lang)}`
  }
}

/**
 * The one piece of advice this week's forecast supports, for the Weather
 * screen and the Ask answer. It follows the same order as Home, so the three
 * screens cannot contradict each other:
 *
 *   sowing — a rain-triggered window is open or near: is there rain to sow on?
 *   field  — a crop is in the ground: the most pressing weather risk to it
 *   window — a calendar (rabi/summer) window is open: say so, not "wait for rain"
 *   rest   — nothing to sow and nothing standing: when the next window opens
 *
 * Weather and Ask used to call sowingAdvice() unconditionally, so on
 * 28 September — soybean at harvest — both told a Nashik farmer "rain is
 * light, wait, sow after 50 mm", the exact line Home had already stopped
 * saying.
 */
export function weekAdvice({ crops, district, week, lang, todayKey, fieldCrop, now = new Date() }) {
  const status = sowingStatus(crops, district, now)
  if (rainDecidesSowing(status)) return { kind: 'sowing', ...sowingAdvice(week, lang) }

  const active = pickFieldCrop(cropsInField(crops, district, now), fieldCrop)
  if (active && active.st.phase !== 'sold') {
    const dayLabel = forecastDayLabel(week, todayKey, lang)
    const top = fieldRisks({ crop: active.crop, st: active.st, week, lang, dayLabel })[0]
    return { kind: 'field', crop: active.crop, tone: top.tone, title: top.title, body: top.body }
  }

  const season = getSeasons(lang)[status.season]
  if (status.phase === 'open') {
    const win = fmtWindow({ from: status.from, to: status.to }, lang)
    return {
      kind: 'window',
      tone: 'good',
      title: {
        mr: `${season} पेरणीची खिडकी सुरू — ${win}`,
        hi: `${season} बुवाई की खिड़की खुली — ${win}`,
        en: `${season} sowing window open — ${win}`,
      }[lang],
      body: {
        mr: `${status.days} दिवस बाकी. ही पेरणी पावसावर नाही, जमिनीतल्या ओलीवर किंवा पाण्यावर होते — म्हणून पावसाची वाट पाहू नका.`,
        hi: `${status.days} दिन बाक़ी. यह बुवाई बारिश पर नहीं, ज़मीन की नमी या सिंचाई पर होती है — इसलिए बारिश का इंतज़ार न करें.`,
        en: `${status.days} days left. This sowing runs on soil moisture or irrigation, not rain — so do not wait for rain.`,
      }[lang],
    }
  }

  const when = fmtDate(status.from, lang)
  return {
    kind: 'rest',
    tone: 'good',
    title: {
      mr: 'या आठवड्यात पेरणीचा निर्णय नाही',
      hi: 'इस हफ़्ते बुवाई का फ़ैसला नहीं',
      en: 'No sowing decision this week',
    }[lang],
    body: {
      mr: `पुढची पेरणी ${season} हंगामात — ${when} पासून, ${status.days} दिवसांनी.`,
      hi: `अगली बुवाई ${season} मौसम में — ${when} से, ${status.days} दिन में.`,
      en: `Next sowing is ${season}, from ${when} — in ${status.days} days.`,
    }[lang],
  }
}

/* ------------------------------------------------------------------ *
 * Weather risk for a standing crop
 * ------------------------------------------------------------------ */

// IMD classifies 64.5 mm or more in a day as "heavy rain".
export const IMD_HEAVY_MM = 64.5
// Rules of thumb, not official thresholds — named so a reader can see which
// numbers are ours.
const HARVEST_RAIN_MM = 10 // enough to wet a cut crop or open bolls
const SPRAY_WASH_MM = 5 // rain within a day of spraying washes most of it off
const SPRAY_GUST_KMH = 25 // drift makes spraying wasteful above this
const LODGING_GUST_KMH = 50 // tall mature cereals start to go flat
const HEAT_C = 40 // IMD's plains heat-wave floor; also where flowers start to drop
const TERMINAL_HEAT_C = 35 // wheat grain filling is hurt above this
const FROST_C = 4 // ground frost becomes possible below this on clear nights
const DRY_WEEK_MM = 5

const TALL = new Set(['maize', 'wheat', 'bajra'])
const RAIN_AT_HARVEST = {
  soy: {
    mr: 'पक्व सोयाबीनवर पाऊस पडला तर शेंगा फुटतात आणि दाणे शेंगेतच उगवतात.',
    hi: 'पकी सोयाबीन पर बारिश पड़े तो फलियाँ चटकती हैं और दाने फली में ही अंकुरित हो जाते हैं.',
    en: 'Rain on mature soybean splits the pods and sprouts the seed inside them.',
  },
  maize: {
    mr: 'पक्व कणसं भिजली तर बुरशी लागते.',
    hi: 'पके भुट्टे भीगें तो फफूंद लगती है.',
    en: 'Mature cobs that get wet go mouldy.',
  },
  cotton: {
    mr: 'उघडलेल्या बोंडातील कापूस भिजला तर डागाळतो आणि भाव पडतो.',
    hi: 'खुले टिंडों की कपास भीगे तो दाग़ी होती है और दाम गिरता है.',
    en: 'Open bolls that get wet stain the lint and lose grade.',
  },
  default: {
    mr: 'कापणीला आलेलं पीक भिजलं तर दाणे खराब होतात.',
    hi: 'कटाई को तैयार फ़सल भीगे तो दाना ख़राब होता है.',
    en: 'A crop ready to harvest loses grain quality if it gets wet.',
  },
}

/**
 * Warnings for one crop at one stage, from the forecast week.
 *
 * Returns a list, most urgent first, of
 *   { key, tone: 'danger' | 'warn' | 'good', title, body, day? }
 * The list is never empty: a quiet week returns one 'good' entry, because
 * "nothing to worry about this week" is itself the answer a farmer wants.
 */
export function fieldRisks({ crop, st, week, lang, dayLabel }) {
  const out = []
  // English crop names are capitalised; mid-sentence they should not be
  const name = lang === 'en' ? crop.name.en.toLowerCase() : crop.name[lang]
  const L = (o) => o[lang]
  const label = (d) => dayLabel(d.iso)
  // English puts the day after the event: "rain tomorrow", "rain on Wed 23 Sep"
  const onL = (d) => {
    const l = label(d)
    return l === 'Today' || l === 'Tomorrow' ? l.toLowerCase() : 'on ' + l
  }
  const next = week.slice(0, 7)
  const firstWet = (mm, within = 7) => next.slice(0, within).find((d) => d.mm >= mm)

  // --- heavy rain: any stage ------------------------------------------------
  const heavy = firstWet(IMD_HEAVY_MM)

  // --- harvest window: rain is the enemy ------------------------------------
  if (st.phase === 'harvest') {
    const wet = firstWet(HARVEST_RAIN_MM)
    if (wet) {
      const dryBefore = next.slice(0, next.indexOf(wet)).filter((d) => d.mm < 2.5)
      out.push({
        key: 'harvest-rain',
        tone: 'danger',
        day: wet.iso,
        title: L({
          mr: `${label(wet)} ${Math.round(wet.mm)} मिमी पाऊस — कापणी नियोजन करा`,
          hi: `${label(wet)} ${Math.round(wet.mm)} मिमी बारिश — कटाई की योजना बनाएँ`,
          en: `${Math.round(wet.mm)} mm of rain ${onL(wet)} — plan the harvest around it`,
        }),
        body:
          L(RAIN_AT_HARVEST[crop.id] || RAIN_AT_HARVEST.default) +
          ' ' +
          (dryBefore.length
            ? L({
                mr: `त्याआधी ${dryBefore.length} कोरडे दिवस आहेत: कापणी करून पीक झाकून ठेवा.`,
                hi: `उससे पहले ${dryBefore.length} सूखे दिन हैं: कटाई कर के फ़सल ढक दें.`,
                en: `There ${dryBefore.length === 1 ? 'is 1 dry day' : `are ${dryBefore.length} dry days`} before it: harvest then, and keep the cut crop covered.`,
              })
            : L({
                mr: 'कापणी पावसानंतर करा; कापलेलं पीक ताडपत्रीने झाका.',
                hi: 'कटाई बारिश के बाद करें; कटी फ़सल तिरपाल से ढकें.',
                en: 'Hold the harvest until it passes, and keep anything already cut under a tarpaulin.',
              })),
      })
    }
    const gusty = next.find((d) => d.gust >= LODGING_GUST_KMH)
    if (gusty && TALL.has(crop.id)) {
      out.push({
        key: 'lodging',
        tone: 'warn',
        day: gusty.iso,
        title: L({
          mr: `${label(gusty)} ${gusty.gust} किमी/तास वारा`,
          hi: `${label(gusty)} ${gusty.gust} किमी/घंटा हवा`,
          en: `${gusty.gust} km/h gusts ${onL(gusty)}`,
        }),
        body: L({
          mr: `पक्व ${name} आडवं पडू शकतं. शक्य असल्यास आधी कापणी करा.`,
          hi: `पकी ${name} गिर सकती है. हो सके तो पहले काट लें.`,
          en: `Mature ${name} can go flat in wind like this. Harvest ahead of it if you can.`,
        }),
      })
    }
  }

  // --- standing crop --------------------------------------------------------
  if (st.phase === 'growing') {
    if (heavy) {
      out.push({
        key: 'heavy-rain',
        tone: 'danger',
        day: heavy.iso,
        title: L({
          mr: `${label(heavy)} मुसळधार पाऊस — ${Math.round(heavy.mm)} मिमी`,
          hi: `${label(heavy)} भारी बारिश — ${Math.round(heavy.mm)} मिमी`,
          en: `Heavy rain ${onL(heavy)} — ${Math.round(heavy.mm)} mm`,
        }),
        body: L({
          mr: 'शेतातील पाण्याचा निचरा आधीच मोकळा करा; साचलेलं पाणी मुळं कुजवतं. खत त्यानंतर द्या.',
          hi: 'खेत की नालियाँ पहले से खोल दें; रुका पानी जड़ें सड़ाता है. खाद उसके बाद दें.',
          en: 'Open the field drains before it arrives — standing water rots roots. Hold any fertiliser until after.',
        }),
      })
    }

    // heat at flowering and filling, where it costs grain rather than leaves
    const hotLimit = crop.id === 'wheat' ? TERMINAL_HEAT_C : HEAT_C
    const hot = next.find((d) => d.temp >= hotLimit)
    if (hot && (st.stage === 'flowering' || st.stage === 'filling')) {
      out.push({
        key: 'heat',
        tone: 'warn',
        day: hot.iso,
        title: L({
          mr: `${label(hot)} ${hot.temp}° — फुलोऱ्यातील ${name}साठी जास्त`,
          hi: `${label(hot)} ${hot.temp}° — फूल पर खड़ी ${name} के लिए ज़्यादा`,
          en: `${hot.temp}° ${onL(hot)} — too hot for ${name} at this stage`,
        }),
        body: L({
          mr: 'पाणी देता येत असेल तर संध्याकाळी हलकं पाणी द्या. उष्णतेत फुलं गळतात आणि दाणा हलका भरतो.',
          hi: 'सिंचाई हो सके तो शाम को हल्का पानी दें. गर्मी में फूल झड़ते हैं और दाना हल्का भरता है.',
          en: 'If you can irrigate, give a light watering in the evening. Heat now drops flowers and leaves the grain light.',
        }),
      })
    }

    const cold = next.find((d) => d.tmin > -50 && d.tmin <= FROST_C)
    if (cold && crop.season === 'rabi') {
      out.push({
        key: 'frost',
        tone: 'warn',
        day: cold.iso,
        title: L({
          mr: `${label(cold)} रात्री ${cold.tmin}° — दवबिंदू गोठू शकतात`,
          hi: `${label(cold)} रात ${cold.tmin}° — पाला पड़ सकता है`,
          en: `${cold.tmin}° overnight ${onL(cold)} — frost is possible`,
        }),
        body: L({
          mr: 'आदल्या संध्याकाळी हलकं पाणी द्या; ओली जमीन उष्णता धरून ठेवते.',
          hi: 'एक शाम पहले हल्की सिंचाई करें; गीली ज़मीन गर्मी रोक कर रखती है.',
          en: 'Give a light irrigation the evening before — moist soil holds heat through the night.',
        }),
      })
    }

    // a dry week in the middle of a rainfed kharif crop's life
    const week7 = next.reduce((a, d) => a + d.mm, 0)
    if (
      crop.season === 'kharif' &&
      week7 < DRY_WEEK_MM &&
      (st.stage === 'flowering' || st.stage === 'filling') &&
      next.some((d) => d.temp >= 32)
    ) {
      out.push({
        key: 'dry-spell',
        tone: 'warn',
        title: L({
          mr: 'पुढील आठवडा कोरडा — पीक फुलोऱ्यात आहे',
          hi: 'अगला हफ़्ता सूखा — फ़सल फूल पर है',
          en: 'A dry week ahead, at the stage that needs water most',
        }),
        body: L({
          mr: 'विहीर/शेततळं असेल तर संरक्षित पाणी आत्ता द्या. या टप्प्यावरचा ताण दाण्यावर थेट परिणाम करतो.',
          hi: 'कुआँ/खेत-तालाब हो तो अभी सुरक्षात्मक सिंचाई दें. इस अवस्था का तनाव सीधा दाने पर असर करता है.',
          en: 'If you have a well or farm pond, a protective irrigation now pays. Stress at this stage goes straight to the grain.',
        }),
      })
    }

    // spraying: the most frequent decision a farmer makes on a forecast
    const first2 = next.slice(0, 2)
    const washOut = first2.find((d) => d.mm >= SPRAY_WASH_MM)
    const windy = first2.find((d) => d.gust >= SPRAY_GUST_KMH)
    if (washOut || windy) {
      const good = next.slice(1).find((d) => d.mm < 1 && d.gust < SPRAY_GUST_KMH && (next[next.indexOf(d) + 1]?.mm ?? 0) < SPRAY_WASH_MM)
      out.push({
        key: 'spray',
        tone: 'warn',
        title: L({ mr: 'आज फवारणी करू नका', hi: 'आज छिड़काव न करें', en: "Don't spray today" }),
        body:
          (washOut
            ? L({
                mr: `${label(washOut)} ${Math.round(washOut.mm)} मिमी पाऊस औषध धुवून नेईल.`,
                hi: `${label(washOut)} ${Math.round(washOut.mm)} मिमी बारिश दवा धो देगी.`,
                en: `${Math.round(washOut.mm)} mm of rain ${onL(washOut)} would wash it off.`,
              })
            : L({
                mr: `${windy.gust} किमी/तास वाऱ्यात औषध उडून जातं.`,
                hi: `${windy.gust} किमी/घंटा की हवा में दवा उड़ जाती है.`,
                en: `In ${windy.gust} km/h gusts most of it drifts away.`,
              })) +
          ' ' +
          (good
            ? L({
                mr: `${label(good)} फवारणीला योग्य दिसतो.`,
                hi: `${label(good)} छिड़काव के लिए ठीक दिखता है.`,
                en: `Next good day: ${label(good)}.`,
              })
            : L({
                mr: 'या आठवड्यात योग्य दिवस दिसत नाही.',
                hi: 'इस हफ़्ते कोई ठीक दिन नहीं दिखता.',
                en: 'No good day shows up this week.',
              })),
      })
    }
  }

  if (!out.length) {
    out.push({
      key: 'clear',
      tone: 'good',
      title: L({
        mr: `या आठवड्यात ${name}ला हवामानाचा धोका नाही`,
        hi: `इस हफ़्ते ${name} को मौसम का ख़तरा नहीं`,
        en: `No weather risk to your ${name} this week`,
      }),
      // say exactly what was checked: light showers are not "dry"
      body:
        st.phase === 'harvest'
          ? (() => {
              const wettest = Math.max(0, ...next.map((d) => d.mm))
              return wettest < 2.5
                ? L({
                    mr: 'पुढचे 7 दिवस कोरडे आहेत — कापणीसाठी चांगली वेळ.',
                    hi: 'अगले 7 दिन सूखे हैं — कटाई का अच्छा समय.',
                    en: 'The next 7 days are dry — a good window to harvest.',
                  })
                : L({
                    mr: `पुढच्या 7 दिवसांत कोणत्याही दिवशी ${Math.round(wettest)} मिमीपेक्षा जास्त पाऊस नाही — कापणी करता येईल; कापलेलं पीक झाकून ठेवा.`,
                    hi: `अगले 7 दिन में किसी भी दिन ${Math.round(wettest)} मिमी से ज़्यादा बारिश नहीं — कटाई हो सकती है; कटी फ़सल ढक कर रखें.`,
                    en: `No day in the next 7 brings more than ${Math.round(wettest)} mm — you can harvest; keep the cut crop covered.`,
                  })
            })()
          : L({
              mr: 'पुढील 7 दिवसांचा अंदाज पाहिला: मुसळधार पाऊस, उष्णता किंवा जोरदार वारा नाही.',
              hi: 'अगले 7 दिन का अनुमान देखा: भारी बारिश, गर्मी या तेज़ हवा नहीं.',
              en: 'Checked the next 7 days: no heavy rain, heat or strong wind.',
            }),
    })
  }

  const rank = { danger: 0, warn: 1, good: 2 }
  return out.sort((a, b) => rank[a.tone] - rank[b.tone])
}
