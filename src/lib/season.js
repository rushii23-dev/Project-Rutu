/**
 * Season and atmosphere, both derived from real inputs.
 *
 * Season comes from the actual date (no API needed — these are the standard
 * Maharashtra cropping seasons). Mood comes from the live Open-Meteo forecast,
 * so the dashboard reflects the weather the farmer is actually standing in.
 */

/** Maharashtra cropping calendar. Returns 'kharif' | 'rabi' | 'summer'. */
export function seasonForDate(date = new Date()) {
  const m = date.getMonth() // 0-11
  const d = date.getDate()
  if (m > 4 && (m < 9 || (m === 9 && d <= 15))) return 'kharif' // 1 Jun – 15 Oct
  if ((m === 9 && d > 15) || m > 9 || m < 2 || (m === 2 && d <= 15)) return 'rabi' // 16 Oct – 15 Mar
  return 'summer' // 16 Mar – 31 May
}

/**
 * Mood drives the dashboard atmosphere. Weather wins over season — a dry spell
 * inside the monsoon should not look like rain.
 */
export function moodFor({ season, current, week }) {
  const code = current?.code ?? 0
  const soon = (week || []).slice(0, 3).reduce((a, d) => a + (d.mm || 0), 0)
  const wetNow = code >= 51
  const temp = current?.temp ?? 30

  if (wetNow || soon >= 15) return 'rain'
  if (code >= 3 && code <= 48) return 'overcast'
  if (season === 'kharif') return 'break' // monsoon season, but no rain coming
  if (season === 'summer' || temp >= 36) return 'sun'
  return 'clear'
}

/**
 * Palettes stay close to the design canvas — the card surface is always white
 * and the ink never changes, so contrast in sunlight is unaffected. Only the
 * canvas behind the cards shifts.
 */
export const MOODS = {
  rain: {
    from: '#CBD6D2',
    to: '#E4E6DE',
    accent: '#5B7C86',
    overlay: 'rain',
  },
  overcast: {
    from: '#D8D8D0',
    to: '#E9E7DD',
    accent: '#8A8B85',
    overlay: 'none',
  },
  break: {
    from: '#E8DAC6',
    to: '#EDE7DA',
    accent: '#C1531B',
    overlay: 'haze',
  },
  sun: {
    from: '#F0DEB8',
    to: '#EFE9D9',
    accent: '#D08A2C',
    overlay: 'sun',
  },
  clear: {
    from: '#DCE2D6',
    to: '#EAE7DC',
    accent: '#2E6B3F',
    overlay: 'none',
  },
}

/* ------------------------------------------------------------------ *
 * Sowing status
 *
 * The corrected onset date is real, but on its own it is only useful in
 * the weeks around sowing. Shown on 21 August it tells a farmer to sow in
 * a window that shut two months ago. This works out which window the
 * farmer is actually standing in, so the dashboard can lead with the next
 * real decision instead of a stale date.
 * ------------------------------------------------------------------ */

const MS_DAY = 86400000

/** day-of-year for a {d,m} pair in a given year */
function doy(year, m, d) {
  return Math.round((Date.UTC(year, m, d) - Date.UTC(year, 0, 1)) / MS_DAY) + 1
}

/** Widest sowing window per season, derived from whatever crops are loaded. */
export function seasonWindows(crops) {
  const out = {}
  for (const c of crops) {
    const s = (out[c.season] ||= { from: c.window.from, to: c.window.to })
    const y = 2001
    if (doy(y, c.window.from.m, c.window.from.d) < doy(y, s.from.m, s.from.d)) s.from = c.window.from
    if (doy(y, c.window.to.m, c.window.to.d) > doy(y, s.to.m, s.to.d)) s.to = c.window.to
  }
  return out
}

/**
 * Returns { phase, season, from, to, days }.
 *   open     — today is inside the window; `days` is days remaining
 *   upcoming — window not yet started; `days` is days until it opens
 *   next     — every window this year has passed for the current season;
 *              `season` is the next one due and `days` counts to it
 */
export function sowingStatus(crops, now = new Date()) {
  const wins = seasonWindows(crops)
  const y = now.getFullYear()
  const today = doy(y, now.getMonth(), now.getDate())

  const entries = Object.entries(wins).map(([season, w]) => ({
    season,
    from: w.from,
    to: w.to,
    start: doy(y, w.from.m, w.from.d),
    end: doy(y, w.to.m, w.to.d),
  }))

  const open = entries.find((e) => today >= e.start && today <= e.end)
  if (open) {
    return { phase: 'open', season: open.season, from: open.from, to: open.to, days: open.end - today }
  }

  const ahead = entries.filter((e) => e.start > today).sort((a, b) => a.start - b.start)
  if (ahead.length) {
    const n = ahead[0]
    // "upcoming" if it is the season we are already in, otherwise "next"
    const phase = n.season === seasonForDate(now) ? 'upcoming' : 'next'
    return { phase, season: n.season, from: n.from, to: n.to, days: n.start - today }
  }

  // everything this year has passed — wrap to the earliest window next year
  const first = entries.sort((a, b) => a.start - b.start)[0]
  const daysInYear = doy(y, 11, 31)
  return {
    phase: 'next',
    season: first.season,
    from: first.from,
    to: first.to,
    days: daysInYear - today + first.start,
  }
}

/**
 * Where TODAY sits relative to one crop's own sowing window.
 *
 * A crop's window is a fact about the crop, but shown bare it reads as an
 * instruction — "18 – 30 Jun" on an August screen tells a farmer to sow into a
 * window that shut seven weeks ago. Every place that prints a window should
 * print this alongside it.
 *
 * Returns { phase: 'open' | 'upcoming' | 'passed', days }
 *   open     — days remaining in the window
 *   upcoming — days until it opens, this year
 *   passed   — days until it opens again next year
 */
export function cropWindowStatus(crop, now = new Date()) {
  const y = now.getFullYear()
  const today = doy(y, now.getMonth(), now.getDate())
  const start = doy(y, crop.window.from.m, crop.window.from.d)
  const end = doy(y, crop.window.to.m, crop.window.to.d)

  if (today >= start && today <= end) return { phase: 'open', days: end - today }
  if (today < start) return { phase: 'upcoming', days: start - today }

  const yearLen = doy(y, 11, 31)
  return { phase: 'passed', days: yearLen - today + start }
}
