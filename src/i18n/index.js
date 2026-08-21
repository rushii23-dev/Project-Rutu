/**
 * Three languages: Marathi (default — Nashik is Marathi-speaking), Hindi, English.
 *
 * Crop-specific copy lives in src/data/crops.js keyed by the same language codes,
 * so adding a crop never means touching this file.
 */

export const LANGS = [
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
]

export const MONTHS = {
  mr: ['जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑग', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अग', 'सित', 'अक्तू', 'नव', 'दिस'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

export const DAYS = {
  mr: ['सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
  hi: ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

export const DAYS_FULL = {
  mr: ['सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'],
  hi: ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
}

export const MONTHS_FULL = {
  mr: ['जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्तूबर', 'नवंबर', 'दिसंबर'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

const REL = {
  mr: { today: 'आज', tomorrow: 'उद्या' },
  hi: { today: 'आज', tomorrow: 'कल' },
  en: { today: 'Today', tomorrow: 'Tomorrow' },
}

/** '2026-08-21' -> '21 ऑग' */
export function fmtIsoShort(iso, lang) {
  const d = new Date(iso + 'T00:00:00')
  return d.getDate() + ' ' + (MONTHS[lang] || MONTHS.mr)[d.getMonth()]
}

/** '2026-08-21' -> 'शुक्रवार, 21 ऑगस्ट 2026' */
export function fmtIsoLong(iso, lang) {
  const d = new Date(iso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  const days = DAYS_FULL[lang] || DAYS_FULL.mr
  const months = MONTHS_FULL[lang] || MONTHS_FULL.mr
  return `${days[dow]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/** 'आज' / 'उद्या' for the first two days, otherwise the weekday name */
export function relDayLabel(iso, todayKey, lang) {
  const rel = REL[lang] || REL.mr
  if (iso === todayKey) return rel.today
  const t = new Date(todayKey + 'T00:00:00')
  t.setDate(t.getDate() + 1)
  const p = (n) => String(n).padStart(2, '0')
  const tomorrow = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
  if (iso === tomorrow) return rel.tomorrow
  const d = new Date(iso + 'T00:00:00')
  return (DAYS[lang] || DAYS.mr)[(d.getDay() + 6) % 7]
}

const STRINGS = {
  mr: {
    brand: 'ऋतु',
    districtSuffix: 'जिल्हा',
    tagline1: 'हवामान बदललं.',
    tagline2: 'आता माहितीही बदलेल.',
    sowingThisYear: 'यंदाची पेरणीची तारीख',
    corrected: 'सुधारित',
    start: 'सुरू करा',
    next: 'पुढे',

    q_name: 'तुमचं नाव\nकाय आहे?',
    q_name_sub: 'सल्ला तुमच्या नावाने दिला जाईल.',
    ph_name: 'नाव लिहा',
    q_where: 'तुम्ही कुठे\nराहता?',
    q_where_sub: 'जिल्ह्यानुसार हवामान बदलतं.',
    district: 'जिल्हा',
    village: 'गाव',
    ph_village: 'गावाचं नाव',
    q_land: 'तुमची किती\nजमीन आहे?',
    q_land_sub: 'उत्पन्नाचा अंदाज याच्यावर ठरतो.',
    acre: 'एकर',
    q_confirm: 'हे बरोबर आहे\nना?',
    name: 'नाव',
    land: 'जमीन',
    confirmNote: '{district}साठी यंदाची पेरणीची खिडकी {window} आहे.',

    hello: 'नमस्कार',
    seasonNow: 'खरीप हंगाम',
    correctedSowing: 'यंदाची सुधारित पेरणी',
    from: 'पासून',
    windowChip: 'खिडकी {window}',
    oldDateChip: 'जुनी तारीख {date}',
    whyShort: 'का?',
    next7: 'पुढील 7 दिवस',
    seeAll: 'सर्व',
    cropsForYou: 'तुमच्यासाठी पिके',
    expected: 'अपेक्षित',

    crops: 'पिके',
    cropsSub: '{acres} जमिनीसाठी अंदाज',
    water: 'पाणी',
    sowing: 'पेरणी',
    rupees: 'रुपये',
    season: 'हंगाम',
    duration: 'कालावधी',
    whyThisCrop: 'का हे पीक?',
    expectedIncome: 'अपेक्षित उत्पन्न',
    goodYear: 'चांगलं वर्ष',
    poorYear: 'कमी पावसाचं वर्ष',
    sowingWindow: 'पेरणीची खिडकी',

    weather: 'हवामान',
    humidity: 'आर्द्रता',
    wind: 'वारा',
    rain: 'पाऊस',
    whatToDo: 'काय करावं',
    forecast7: '7 दिवसांचा अंदाज',
    degC: '°से',
    mm: 'मिमी',
    kmh: 'किमी/ता',

    todayCorrected: 'आजची सुधारित तारीख',
    avgArrival: 'सरासरी आगमन',
    onsetChartTitle: 'मान्सून आगमन · {range}',
    fromNYears: '{n} वर्षांच्या आकडेवारीवरून',
    dataSource: 'माहितीचा स्रोत',
    st_onset: 'मान्सूनचं सरासरी आगमन',
    st_raindays: 'पावसाचे दिवस (हंगामात)',
    st_seasonal: 'हंगामी पाऊस',
    st_dry: 'सर्वात मोठा खंड',
    days: 'दिवस',
    notSignificant: 'या जिल्ह्यात बदल मोजता येण्याइतका नाही',
    offScaleNote: '{years} — मान्सून खूप उशिरा आला, चार्टच्या वरच्या कडेला दाखवला आहे.',
    noOnsetNote: '{years} — मान्सून नीट आलाच नाही; त्या वर्षाचा बिंदू नाही.',

    profile: 'प्रोफाइल',
    notifications: 'सूचना',
    offlineData: 'ऑफलाइन डेटा',
    myRecords: 'माझ्या नोंदी',
    help: 'मदत',
    language: 'भाषा',
    version: 'ऋतु {v} · माहिती: IMD',

    nav_home: 'होम',
    nav_crops: 'पिके',
    nav_weather: 'हवामान',
    nav_profile: 'प्रोफाइल',

    rotation: 'पुढचे तीन हंगाम',
    rotationSub: 'जमिनीचा कस टिकवणारा क्रम',
    soilBalance: 'जमिनीतलं नत्र',
    regenerative: 'पुनरुज्जीवक',
    nowSowing: 'आता',
    mandiPrice: 'आजचा बाजारभाव',
    perQuintal: 'प्रति क्विंटल',
    quintal: 'क्विंटल',
    bestMarket: 'सर्वोत्तम बाजार',
    stateAvg: 'राज्य सरासरी',
    nMarkets: '{n} बाजार',
    noArrivals: 'आज आवक नाही',
    notFetched: 'या जिल्ह्याचे भाव अजून आणलेले नाहीत',
    sowOpen: 'पेरणीची खिडकी सुरू',
    sowNext: 'पुढील पेरणी',
    daysLeft: '{n} दिवस बाकी',
    daysUntil: '{n} दिवसांनी',
    windowPassed: 'यंदाची {season} पेरणी संपली. सुधारित तारीख {date} होती.',
    seasonWord: 'हंगाम',
    seasons: { kharif: 'खरीप', rabi: 'रब्बी', summer: 'उन्हाळी' },
    waterLevels: { low: 'कमी', mid: 'मध्यम', high: 'जास्त' },
    sampleFlag: 'नमुना आकडे',
  },

  hi: {
    brand: 'ऋतु',
    districtSuffix: 'ज़िला',
    tagline1: 'मौसम बदल गया.',
    tagline2: 'अब जानकारी भी बदलेगी.',
    sowingThisYear: 'इस साल की बुवाई तारीख़',
    corrected: 'सुधारी हुई',
    start: 'शुरू करें',
    next: 'आगे',

    q_name: 'आपका नाम\nक्या है?',
    q_name_sub: 'सलाह आपके नाम से दी जाएगी.',
    ph_name: 'नाम लिखें',
    q_where: 'आप कहाँ\nरहते हैं?',
    q_where_sub: 'ज़िले के हिसाब से मौसम बदलता है.',
    district: 'ज़िला',
    village: 'गाँव',
    ph_village: 'गाँव का नाम',
    q_land: 'आपकी कितनी\nज़मीन है?',
    q_land_sub: 'आमदनी का अंदाज़ा इसी पर तय होता है.',
    acre: 'एकड़',
    q_confirm: 'क्या यह सही\nहै?',
    name: 'नाम',
    land: 'ज़मीन',
    confirmNote: '{district} के लिए इस साल बुवाई की खिड़की {window} है.',

    hello: 'नमस्ते',
    seasonNow: 'खरीफ़ मौसम',
    correctedSowing: 'इस साल की सुधारी बुवाई',
    from: 'से',
    windowChip: 'खिड़की {window}',
    oldDateChip: 'पुरानी तारीख़ {date}',
    whyShort: 'क्यों?',
    next7: 'अगले 7 दिन',
    seeAll: 'सभी',
    cropsForYou: 'आपके लिए फ़सलें',
    expected: 'अनुमानित',

    crops: 'फ़सलें',
    cropsSub: '{acres} ज़मीन के लिए अनुमान',
    water: 'पानी',
    sowing: 'बुवाई',
    rupees: 'रुपये',
    season: 'मौसम',
    duration: 'अवधि',
    whyThisCrop: 'यह फ़सल क्यों?',
    expectedIncome: 'अनुमानित आमदनी',
    goodYear: 'अच्छा साल',
    poorYear: 'कम बारिश का साल',
    sowingWindow: 'बुवाई की खिड़की',

    weather: 'मौसम',
    humidity: 'नमी',
    wind: 'हवा',
    rain: 'बारिश',
    whatToDo: 'क्या करें',
    forecast7: '7 दिन का अनुमान',
    degC: '°से',
    mm: 'मिमी',
    kmh: 'किमी/घं',

    todayCorrected: 'आज की सुधारी तारीख़',
    avgArrival: 'औसत आगमन',
    onsetChartTitle: 'मानसून आगमन · {range}',
    fromNYears: '{n} साल के आँकड़ों से',
    dataSource: 'आँकड़ों का स्रोत',
    st_onset: 'मानसून का औसत आगमन',
    st_raindays: 'बारिश के दिन (मौसम में)',
    st_seasonal: 'मौसमी बारिश',
    st_dry: 'सबसे लंबा सूखा',
    days: 'दिन',
    notSignificant: 'इस ज़िले में बदलाव मापने लायक नहीं है',
    offScaleNote: '{years} — मानसून बहुत देर से आया, चार्ट के ऊपरी किनारे पर दिखाया गया है.',
    noOnsetNote: '{years} — मानसून ठीक से आया ही नहीं; उस साल का कोई बिंदु नहीं है.',

    profile: 'प्रोफ़ाइल',
    notifications: 'सूचनाएँ',
    offlineData: 'ऑफ़लाइन डेटा',
    myRecords: 'मेरे रिकॉर्ड',
    help: 'मदद',
    language: 'भाषा',
    version: 'ऋतु {v} · आँकड़े: IMD',

    nav_home: 'होम',
    nav_crops: 'फ़सलें',
    nav_weather: 'मौसम',
    nav_profile: 'प्रोफ़ाइल',

    rotation: 'अगले तीन मौसम',
    rotationSub: 'ज़मीन की उर्वरता बनाए रखने वाला क्रम',
    soilBalance: 'ज़मीन का नाइट्रोजन',
    regenerative: 'पुनर्योजी',
    nowSowing: 'अभी',
    mandiPrice: 'आज का बाज़ार भाव',
    perQuintal: 'प्रति क्विंटल',
    quintal: 'क्विंटल',
    bestMarket: 'सबसे अच्छी मंडी',
    stateAvg: 'राज्य औसत',
    nMarkets: '{n} मंडी',
    noArrivals: 'आज आवक नहीं',
    notFetched: 'इस ज़िले के भाव अभी नहीं लाए गए',
    sowOpen: 'बुवाई की खिड़की खुली',
    sowNext: 'अगली बुवाई',
    daysLeft: '{n} दिन बाक़ी',
    daysUntil: '{n} दिन में',
    windowPassed: 'इस साल की {season} बुवाई ख़त्म. सुधारी तारीख़ {date} थी.',
    seasonWord: 'मौसम',
    seasons: { kharif: 'खरीफ़', rabi: 'रबी', summer: 'गर्मी' },
    waterLevels: { low: 'कम', mid: 'मध्यम', high: 'ज़्यादा' },
    sampleFlag: 'नमूना आँकड़े',
  },

  en: {
    brand: 'RITU',
    districtSuffix: 'district',
    tagline1: 'The climate moved.',
    tagline2: 'Now the knowledge moves too.',
    sowingThisYear: "This year's sowing date",
    corrected: 'corrected',
    start: 'Get started',
    next: 'Next',

    q_name: 'What is\nyour name?',
    q_name_sub: 'Your advice will be addressed to you.',
    ph_name: 'Enter name',
    q_where: 'Where do\nyou live?',
    q_where_sub: 'Weather differs by district.',
    district: 'District',
    village: 'Village',
    ph_village: 'Village name',
    q_land: 'How much land\ndo you farm?',
    q_land_sub: 'Income estimates are based on this.',
    acre: 'acres',
    q_confirm: 'Is this\ncorrect?',
    name: 'Name',
    land: 'Land',
    confirmNote: "This year's sowing window for {district} is {window}.",

    hello: 'Hello',
    seasonNow: 'Kharif season',
    correctedSowing: 'Corrected sowing date',
    from: 'onward',
    windowChip: 'Window {window}',
    oldDateChip: 'Old date {date}',
    whyShort: 'Why?',
    next7: 'Next 7 days',
    seeAll: 'All',
    cropsForYou: 'Crops for you',
    expected: 'expected',

    crops: 'Crops',
    cropsSub: 'Estimates for {acres}',
    water: 'Water',
    sowing: 'Sow',
    rupees: 'rupees',
    season: 'Season',
    duration: 'Duration',
    whyThisCrop: 'Why this crop?',
    expectedIncome: 'Expected income',
    goodYear: 'Good year',
    poorYear: 'Low-rain year',
    sowingWindow: 'Sowing window',

    weather: 'Weather',
    humidity: 'Humidity',
    wind: 'Wind',
    rain: 'Rain',
    whatToDo: 'What to do',
    forecast7: '7-day forecast',
    degC: '°C',
    mm: 'mm',
    kmh: 'km/h',

    todayCorrected: "Today's corrected date",
    avgArrival: 'average arrival',
    onsetChartTitle: 'Monsoon onset · {range}',
    fromNYears: 'From {n} years of records',
    dataSource: 'Data source',
    st_onset: 'Average monsoon arrival',
    st_raindays: 'Rain days (season)',
    st_seasonal: 'Seasonal rainfall',
    st_dry: 'Longest dry spell',
    days: 'days',
    notSignificant: 'No measurable shift in this district',
    offScaleNote: '{years} — monsoon arrived very late; shown pinned to the top edge.',
    noOnsetNote: '{years} — the monsoon never properly arrived; no point for that year.',

    profile: 'Profile',
    notifications: 'Notifications',
    offlineData: 'Offline data',
    myRecords: 'My records',
    help: 'Help',
    language: 'Language',
    version: 'RITU {v} · Data: IMD',

    nav_home: 'Home',
    nav_crops: 'Crops',
    nav_weather: 'Weather',
    nav_profile: 'Profile',

    rotation: 'Next three seasons',
    rotationSub: 'A sequence that keeps the soil alive',
    soilBalance: 'Soil nitrogen',
    regenerative: 'Regenerative',
    nowSowing: 'Now',
    mandiPrice: "Today's mandi price",
    perQuintal: 'per quintal',
    quintal: 'quintal',
    bestMarket: 'Best market',
    stateAvg: 'State average',
    nMarkets: '{n} markets',
    noArrivals: 'No arrivals today',
    notFetched: 'Prices not yet fetched for this district',
    sowOpen: 'Sowing window open',
    sowNext: 'Next sowing',
    daysLeft: '{n} days left',
    daysUntil: 'in {n} days',
    windowPassed: "This year's {season} sowing has closed. The corrected date was {date}.",
    seasonWord: 'season',
    seasons: { kharif: 'Kharif', rabi: 'Rabi', summer: 'Summer' },
    waterLevels: { low: 'Low', mid: 'Medium', high: 'High' },
    sampleFlag: 'sample figures',
  },
}

/** t('hello') -> string; t('windowChip', { window: '13–22 Jun' }) interpolates. */
export function makeT(lang) {
  const dict = STRINGS[lang] || STRINGS.mr
  return function t(key, vars) {
    let s = dict[key]
    if (s === undefined) s = STRINGS.mr[key]
    if (s === undefined) return key
    if (typeof s !== 'string') return s
    if (vars) {
      for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(vars[k])
    }
    return s
  }
}

export function getSeasons(lang) {
  return (STRINGS[lang] || STRINGS.mr).seasons
}
export function getWaterLevels(lang) {
  return (STRINGS[lang] || STRINGS.mr).waterLevels
}

/** {d:13,m:5} -> "13 जून" / "13 Jun" */
export function fmtDate(date, lang) {
  if (!date) return ''
  const months = MONTHS[lang] || MONTHS.mr
  return date.d + ' ' + months[date.m]
}

/** a {from,to} pair -> "13 – 22 जून", collapsing the month when shared */
export function fmtWindow(win, lang) {
  if (!win) return ''
  const months = MONTHS[lang] || MONTHS.mr
  if (win.from.m === win.to.m) {
    return win.from.d + ' – ' + win.to.d + ' ' + months[win.to.m]
  }
  return fmtDate(win.from, lang) + ' – ' + fmtDate(win.to, lang)
}

/** day-of-year -> "13 जून"; uses a non-leap reference year */
export function fmtDoy(doy, lang) {
  const d = new Date(2001, 0, 1)
  d.setDate(d.getDate() + Math.round(doy) - 1)
  return d.getDate() + ' ' + (MONTHS[lang] || MONTHS.mr)[d.getMonth()]
}

/** Indian digit grouping: 105000 -> "₹1,05,000" */
export function rupees(n) {
  const v = Math.round(n)
  return '₹' + v.toLocaleString('en-IN')
}
