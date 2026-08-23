import { useStore } from '../lib/store.jsx'
import { MONTHS, getSeasons } from '../i18n/index.js'
import { seasonWindows } from '../lib/season.js'
import { SAMPLE_CROPS } from '../data/crops.js'
import { Card, EyebrowLabel } from './ui.jsx'

/**
 * The whole cropping year on one strip, with today marked on it.
 *
 * Answers the question a farmer actually carries around — "what is coming, and
 * how long have I got" — without reading three screens. The bands are the real
 * sowing windows from the crop calendar; the marker is today's actual date.
 */
const W = 300
const H = 74
const PAD = 6

const BAND = {
  kharif: '#2E6B3F',
  rabi: '#5B7C86',
  summer: '#D08A2C',
}

export default function FarmingYear() {
  const { t, lang, district } = useStore()
  const seasons = getSeasons(lang)
  const wins = seasonWindows(SAMPLE_CROPS, district)

  const now = new Date()
  const yearLen = 365
  const dayOf = (m, d) => Math.round((Date.UTC(2001, m, d) - Date.UTC(2001, 0, 1)) / 86400000) + 1
  const todayDoy = dayOf(now.getMonth(), now.getDate())

  const x = (doy) => PAD + ((doy - 1) / yearLen) * (W - PAD * 2)

  const bands = Object.entries(wins).map(([season, w]) => ({
    season,
    x1: x(dayOf(w.from.m, w.from.d)),
    x2: x(dayOf(w.to.m, w.to.d)),
  }))

  const months = MONTHS[lang] || MONTHS.mr
  const ticks = [0, 3, 6, 9].map((m) => ({ label: months[m], at: x(dayOf(m, 1)) }))

  return (
    <Card className="mt-3 px-5 py-5">
      <EyebrowLabel>{t('myYear')}</EyebrowLabel>
      <p className="mt-1 text-[13px] text-faint">{t('yearSub')}</p>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="mt-3 block">
        {/* the year */}
        <line x1={PAD} y1="30" x2={W - PAD} y2="30" stroke="#EFECE2" strokeWidth="10" strokeLinecap="round" />

        {/* sowing windows */}
        {bands.map((b) => (
          <line
            key={b.season}
            x1={b.x1}
            y1="30"
            x2={Math.max(b.x2, b.x1 + 4)}
            y2="30"
            stroke={BAND[b.season]}
            strokeWidth="10"
            strokeLinecap="round"
          />
        ))}

        {/* today */}
        <line x1={x(todayDoy)} y1="18" x2={x(todayDoy)} y2="42" stroke="#17150F" strokeWidth="2.5" />
        <circle cx={x(todayDoy)} cy="15" r="3.5" fill="#17150F" />
        <text
          x={Math.min(Math.max(x(todayDoy), 18), W - 18)}
          y="9"
          textAnchor="middle"
          style={{ font: '600 9px Inter, sans-serif' }}
          fill="#17150F"
        >
          {t('todayMark')}
        </text>

        {/* month ticks */}
        {ticks.map((tk) => (
          <text
            key={tk.label}
            x={tk.at}
            y="58"
            style={{ font: '500 10px Inter, sans-serif' }}
            fill="#8A8574"
          >
            {tk.label}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {Object.keys(wins).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: BAND[s] }}
            />
            {seasons[s]}
          </span>
        ))}
      </div>
    </Card>
  )
}
