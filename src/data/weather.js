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
        mm: Math.round(j.daily.precipitation_sum[i] ?? 0),
      }
    })

    const c = j.current || {}
    return {
      isSample: false,
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
    return { isSample: true, week: sampleWeek(), current: SAMPLE_CURRENT }
  }
}

/**
 * Turns the forecast into the one sentence that matters before sowing:
 * is there enough rain coming to germinate a seed?
 */
export function sowingAdvice(week, lang) {
  const next5 = week.slice(0, 5)
  const total5 = next5.reduce((a, d) => a + d.mm, 0)
  const dryRun = next5.every((d) => d.mm < 2.5)
  const firstWet = week.findIndex((d) => d.mm >= 10)

  if (dryRun) {
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
  if (total5 >= 50 || firstWet >= 0) {
    return {
      tone: 'good',
      title: {
        mr: 'पेरणीसाठी पाऊस पुरेसा',
        hi: 'बुवाई के लिए बारिश पर्याप्त',
        en: 'Enough rain for sowing',
      }[lang],
      body: {
        mr: 'पुढील आठवड्यात ' + Math.round(total5) + ' मिमी अपेक्षित. पेरणी करू शकता.',
        hi: 'अगले हफ़्ते ' + Math.round(total5) + ' मिमी अनुमानित. बुवाई कर सकते हैं.',
        en: Math.round(total5) + ' mm expected this week. You can sow.',
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
      mr: 'फक्त ' + Math.round(total5) + ' मिमी अपेक्षित. 50 मिमीनंतर पेरा.',
      hi: 'केवल ' + Math.round(total5) + ' मिमी अनुमानित. 50 मिमी के बाद बोएँ.',
      en: 'Only ' + Math.round(total5) + ' mm expected. Sow after 50 mm.',
    }[lang],
  }
}
