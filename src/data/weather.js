/**
 * Live 7-day forecast from Open-Meteo — free, no API key, no account.
 *
 * If the network is unavailable (which on a demo stage is likely), the UI falls
 * back to SAMPLE_WEEK and flags itself as sample data rather than pretending.
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

/** WMO weather codes -> icon + a description key per language */
const CODES = [
  { max: 0, icon: '☀️', mr: 'निरभ्र', hi: 'साफ़', en: 'Clear' },
  { max: 2, icon: '🌤️', mr: 'अंशतः ढगाळ', hi: 'हल्का बादल', en: 'Partly cloudy' },
  { max: 3, icon: '⛅', mr: 'ढगाळ', hi: 'बादल', en: 'Cloudy' },
  { max: 48, icon: '🌫️', mr: 'धुकं', hi: 'कोहरा', en: 'Fog' },
  { max: 55, icon: '🌦️', mr: 'रिमझिम', hi: 'बूँदाबाँदी', en: 'Drizzle' },
  { max: 65, icon: '🌧️', mr: 'पाऊस', hi: 'बारिश', en: 'Rain' },
  { max: 82, icon: '🌧️', mr: 'जोरदार पाऊस', hi: 'तेज़ बारिश', en: 'Heavy rain' },
  { max: 99, icon: '⛈️', mr: 'गडगडाट', hi: 'गरज', en: 'Thunderstorm' },
]

export function decodeWeather(code) {
  for (const c of CODES) if (code <= c.max) return c
  return CODES[CODES.length - 1]
}

const SAMPLE_SHAPE = [
  { code: 0, temp: 33, mm: 0 },
  { code: 0, temp: 34, mm: 0 },
  { code: 1, temp: 33, mm: 0 },
  { code: 2, temp: 32, mm: 0 },
  { code: 3, temp: 31, mm: 0 },
  { code: 61, temp: 29, mm: 18 },
  { code: 63, temp: 28, mm: 34 },
]

/** Sample week is dated from today, so the offline fallback never shows a
 *  calendar that has drifted out of date. */
export function sampleWeek(from = new Date()) {
  return SAMPLE_SHAPE.map((d, i) => {
    const dt = new Date(from)
    dt.setDate(dt.getDate() + i)
    const p = (n) => String(n).padStart(2, '0')
    return {
      ...d,
      iso: `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`,
      dow: (dt.getDay() + 6) % 7,
    }
  })
}

export const SAMPLE_WEEK = sampleWeek()

export const SAMPLE_CURRENT = { temp: 33, humidity: 41, wind: 12, code: 0, mm: 0 }

/**
 * Returns { current, week, isSample }. Never throws — a failed fetch degrades to
 * the sample week so the demo path cannot break on venue wifi.
 */
export async function fetchForecast(lat, lon) {
  const url =
    `${ENDPOINT}?latitude=${lat}&longitude=${lon}` +
    '&daily=weather_code,temperature_2m_max,precipitation_sum' +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
    '&timezone=Asia%2FKolkata&forecast_days=7'

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('http ' + res.status)
    const j = await res.json()
    if (!j.daily || !j.daily.time) throw new Error('malformed')

    const week = j.daily.time.map((iso, i) => {
      const dt = new Date(iso + 'T00:00:00')
      return {
        iso,                        // the real calendar date from the API
        dow: (dt.getDay() + 6) % 7, // 0 = Monday
        code: j.daily.weather_code[i] ?? 0,
        temp: Math.round(j.daily.temperature_2m_max[i] ?? 0),
        // one decimal, not a whole number. Rounding 1.5 mm up to 2 and 0.4 mm
        // down to 0 both misreport the forecast, and the thresholds below read
        // this value — a drizzle day should not be rounded into a dry one.
        mm: Math.round((j.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      }
    })

    const c = j.current || {}
    // When the service worker answers from cache — which is the whole point of
    // the offline story — this payload can be hours or a day old while the app
    // happily calls it "live". navigator.onLine is no help: it still reported
    // true with the server dead. The payload's own clock is the honest signal.
    //
    // `current.time` is local time in the requested zone (Asia/Kolkata) with no
    // offset suffix, so parsing it as local time is correct on a phone in India.
    return {
      isSample: false,
      fetchedAt: c.time || null,
      week,
      current: {
        temp: Math.round(c.temperature_2m ?? week[0].temp),
        humidity: Math.round(c.relative_humidity_2m ?? 0),
        wind: Math.round(c.wind_speed_10m ?? 0),
        code: c.weather_code ?? week[0].code,
        mm: week[0].mm,
      },
    }
  } catch {
    return { isSample: true, week: sampleWeek(), current: SAMPLE_CURRENT, fetchedAt: null }
  }
}

/**
 * How old the reading is, in hours, or null when unknown.
 * Anything past STALE_HOURS should not be presented as current conditions.
 */
export const STALE_HOURS = 2

export function ageHours(fetchedAt, now = new Date()) {
  if (!fetchedAt) return null
  const t = new Date(fetchedAt)
  if (isNaN(t)) return null
  return (now - t) / 3600000
}

/**
 * The germination threshold this app advises against, in mm. It is the same
 * number every crop card already prints ("sow after the first 50 mm"), so it
 * lives here once rather than being restated in each branch below.
 */
export const SOW_MM = 50

/**
 * Turns the forecast into the one sentence that matters before sowing:
 * is there enough rain coming to germinate a seed?
 */
export function sowingAdvice(week, lang) {
  const next5 = week.slice(0, 5)
  const total5 = Math.round(next5.reduce((a, d) => a + d.mm, 0))
  const total7 = Math.round(week.reduce((a, d) => a + d.mm, 0))

  // Only one branch may say "you can sow", and it is the one where the rain a
  // farmer would act on has actually arrived inside the window he acts in.
  //
  // This used to also fire on `week.findIndex(d => d.mm >= 10) >= 0`, i.e. on a
  // single wet day anywhere in seven — which produced "Enough rain for sowing /
  // 3 mm expected this week", a green card contradicting its own body and
  // telling a farmer to sow into dry soil. Rain on day 7 is not a reason to
  // sow on day 1.
  if (total5 >= SOW_MM) {
    return {
      tone: 'good',
      title: {
        mr: 'पेरणीसाठी पाऊस पुरेसा',
        hi: 'बुवाई के लिए बारिश पर्याप्त',
        en: 'Enough rain for sowing',
      }[lang],
      body: {
        mr: `पुढील 5 दिवसांत ${total5} मिमी अपेक्षित. पेरणी करू शकता.`,
        hi: `अगले 5 दिन में ${total5} मिमी अनुमानित. बुवाई कर सकते हैं.`,
        en: `${total5} mm expected over the next 5 days. You can sow.`,
      }[lang],
    }
  }

  // enough is coming, but not yet — worth saying, because "wait" is easier to
  // follow when the farmer knows what he is waiting for
  if (total7 >= SOW_MM) {
    return {
      tone: 'warn',
      title: {
        mr: 'अजून नाही — पाऊस येतो आहे',
        hi: 'अभी नहीं — बारिश आ रही है',
        en: 'Not yet — rain is on the way',
      }[lang],
      body: {
        mr: `पुढील 5 दिवसांत फक्त ${total5} मिमी, पण 7 दिवसांत ${total7} मिमी. मोठ्या पावसाची वाट पहा.`,
        hi: `अगले 5 दिन में सिर्फ़ ${total5} मिमी, पर 7 दिन में ${total7} मिमी. बड़ी बारिश का इंतज़ार करें.`,
        en: `Only ${total5} mm in the next 5 days, but ${total7} mm across 7. Wait for the heavier rain.`,
      }[lang],
    }
  }

  if (next5.every((d) => d.mm < 2.5)) {
    return {
      tone: 'warn',
      title: {
        mr: 'पुढील 5 दिवस पेरणीयोग्य पाऊस नाही',
        hi: 'अगले 5 दिन बुवाई लायक बारिश नहीं',
        en: 'No sowing rain for the next 5 days',
      }[lang],
      body: {
        mr: 'पेरणी थांबवा. कोरड्या जमिनीत बी टाकल्यास उगवण कमी होते.',
        hi: 'बुवाई रोकें. सूखी ज़मीन में बीज डालने से अंकुरण घटता है.',
        en: 'Hold off sowing. Seed in dry soil germinates poorly.',
      }[lang],
    }
  }

  return {
    tone: 'warn',
    title: {
      mr: 'पाऊस कमी — थांबा',
      hi: 'बारिश कम — रुकें',
      en: 'Rain is light — wait',
    }[lang],
    body: {
      mr: `पुढील 5 दिवसांत फक्त ${total5} मिमी अपेक्षित. ${SOW_MM} मिमीनंतर पेरा.`,
      hi: `अगले 5 दिन में केवल ${total5} मिमी अनुमानित. ${SOW_MM} मिमी के बाद बोएँ.`,
      en: `Only ${total5} mm expected over the next 5 days. Sow after ${SOW_MM} mm.`,
    }[lang],
  }
}
