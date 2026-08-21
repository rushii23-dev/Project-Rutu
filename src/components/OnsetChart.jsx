import { fmtDoy } from '../i18n/index.js'

/**
 * Plain SVG rather than a chart library. The chart is a scatter plus one straight
 * line, so a dependency buys nothing and costs a silent-failure mode we already
 * hit once with Recharts' ResponsiveContainer.
 *
 * Later onset sits at the top, so a downward line reads as "arriving earlier".
 */
const W = 300
const H = 190
const LEFT = 34
const RIGHT = 296
const TOP = 14
const BOT = 150

export default function OnsetChart({ onset, lang }) {
  const [dMin, dMax] = onset.plotDomain
  const { yearFrom, yearTo, series, significant } = onset

  const x = (year) => LEFT + 6 + ((year - yearFrom) / (yearTo - yearFrom)) * (RIGHT - LEFT - 12)
  const y = (doy) => TOP + ((dMax - doy) / (dMax - dMin)) * (BOT - TOP)

  const gridDoys = [dMax, Math.round((dMax + dMin) / 2), dMin]

  // Theil-Sen line, clipped to the plotted window
  const first = series[0]
  const last = series[series.length - 1]
  const clamp = (v) => Math.max(dMin, Math.min(dMax, v))

  const inRange = series.filter((p) => !p.o)
  const offScale = series.filter((p) => p.o)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      {gridDoys.map((d, i) => (
        <g key={i}>
          <line x1={LEFT} y1={y(d)} x2={RIGHT} y2={y(d)} stroke="#F2EFE6" strokeWidth="1" />
          <text x="0" y={y(d) + 4} style={{ font: "500 11px Inter, sans-serif" }} fill="#8A8574">
            {fmtDoy(d, lang)}
          </text>
        </g>
      ))}

      {/* every year with a detected onset */}
      {inRange.map((p) => (
        <circle key={p.y} cx={x(p.y)} cy={y(p.p)} r="4.5" fill="#2E6B3F" opacity="0.55" />
      ))}

      {/* years later than the plotted window, pinned to the top edge */}
      {offScale.map((p) => (
        <path
          key={p.y}
          d={`M ${x(p.y)} ${y(dMax) - 5} l 5 8 l -10 0 Z`}
          fill="#C1531B"
        />
      ))}

      {/* trend — solid when significant, dashed and muted when it is not */}
      <line
        x1={x(first.y)}
        y1={y(clamp(first.t))}
        x2={x(last.y)}
        y2={y(clamp(last.t))}
        stroke={significant ? '#C1531B' : '#C8C3B4'}
        strokeWidth={significant ? 3 : 2}
        strokeDasharray={significant ? undefined : '5 5'}
        strokeLinecap="round"
      />

      <text x={LEFT + 2} y="184" style={{ font: "500 11px Inter, sans-serif" }} fill="#8A8574">
        {yearFrom}
      </text>
      <text x={RIGHT - 28} y="184" style={{ font: "500 11px Inter, sans-serif" }} fill="#8A8574">
        {yearTo}
      </text>
    </svg>
  )
}
