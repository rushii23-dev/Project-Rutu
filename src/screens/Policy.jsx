import { useMemo, useState } from 'react'
import districtData from '../data/districts.json'
import { fmtDoy } from '../i18n/index.js'

/**
 * The state / policy surface — rubric items 1, 8 and 9.
 *
 * Deliberately English and laptop-sized: the audience is a state agriculture
 * department, not a farmer. It is not linked from the farmer app.
 *
 * The map is plotted from real district coordinates rather than a GeoJSON
 * boundary file — every point is a district we actually computed, so there is
 * no decorative geometry standing in for data we do not have.
 */

const W = 760
const H = 560

/**
 * The federation roster.
 *
 * Only India is computed. The other four carry NO numbers on purpose — naming
 * the question a country's archive would be asked is honest; inventing its
 * answer is not. `signal` is the locally meaningful onset each nation already
 * tracks, not something RITU has measured.
 *
 * TODO: a second live node needs that country's onset rule agreed first.
 */
const NODES = [
  {
    country: 'India',
    live: true,
    signal: 'Monsoon onset, 36 districts, 1985–2025',
    crop: 'Soybean, cotton, bajra',
  },
  {
    country: 'Brazil',
    live: false,
    signal: 'Rainy-season onset that opens the planting window',
    crop: 'Soybean, maize',
  },
  {
    country: 'Russia',
    live: false,
    signal: 'Thermal spring onset and last-frost date',
    crop: 'Spring wheat, barley',
  },
  {
    country: 'China',
    live: false,
    signal: 'East Asian monsoon onset',
    crop: 'Rice, winter wheat',
  },
  {
    country: 'South Africa',
    live: false,
    signal: 'Summer-rainfall onset on the Highveld',
    crop: 'Maize, sorghum',
  },
]

export default function Policy() {
  const [hover, setHover] = useState(null)
  const districts = districtData.districts

  const { pts, bounds } = useMemo(() => {
    const lats = districts.map((d) => d.lat)
    const lons = districts.map((d) => d.lon)
    const b = {
      minLat: Math.min(...lats) - 0.4,
      maxLat: Math.max(...lats) + 0.4,
      minLon: Math.min(...lons) - 0.4,
      maxLon: Math.max(...lons) + 0.4,
    }
    const x = (lon) => ((lon - b.minLon) / (b.maxLon - b.minLon)) * (W - 80) + 40
    // latitude increases northward, screen y increases downward
    const y = (lat) => H - 60 - ((lat - b.minLat) / (b.maxLat - b.minLat)) * (H - 120)
    return {
      bounds: b,
      pts: districts.map((d) => ({ ...d, cx: x(d.lon), cy: y(d.lat) })),
    }
  }, [districts])

  const sig = districts.filter((d) => d.onset.significant)
  const maxAbs = Math.max(...districts.map((d) => Math.abs(d.onset.slopePerDecade)))

  const colourFor = (slope, significant) => {
    if (!significant) return '#C8C3B4' // no measurable trend — deliberately grey
    return slope < 0 ? '#2E6B3F' : '#C1531B'
  }

  return (
    <div className="min-h-screen bg-canvas px-8 py-10">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-8">
          <div className="flex items-baseline gap-3">
            <span className="display text-[38px] text-grow">ऋतु</span>
            <span className="num text-xs font-semibold uppercase tracking-[3px] text-faint">
              State View
            </span>
          </div>
          <h1 className="display mt-3 text-[42px] leading-tight text-ink">
            Monsoon onset shift across Maharashtra
          </h1>
          <p className="mt-2 max-w-[62ch] text-[17px] leading-relaxed text-muted">
            Agricultural onset computed for every district-year from IMD gridded daily
            rainfall, {districtData.source.years}. Trend by Theil–Sen, significance by
            Mann–Kendall.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {/* ---- the map ------------------------------------------------- */}
          <div className="rounded-[28px] bg-card p-6">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
              {pts.map((d) => {
                const slope = d.onset.slopePerDecade
                const r = 7 + (Math.abs(slope) / maxAbs) * 11
                const on = hover === d.id
                return (
                  <g
                    key={d.id}
                    onMouseEnter={() => setHover(d.id)}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {d.onset.significant && (
                      <circle
                        cx={d.cx}
                        cy={d.cy}
                        r={r + 6}
                        fill="none"
                        stroke={colourFor(slope, true)}
                        strokeWidth="2"
                        opacity="0.55"
                      />
                    )}
                    <circle
                      cx={d.cx}
                      cy={d.cy}
                      r={r}
                      fill={colourFor(slope, d.onset.significant)}
                      opacity={d.onset.significant ? 0.9 : 0.42}
                    />
                    <text
                      x={d.cx}
                      y={d.cy - r - 7}
                      textAnchor="middle"
                      style={{
                        font: `${on || d.onset.significant ? '600' : '500'} 11px Inter, sans-serif`,
                      }}
                      fill={on || d.onset.significant ? '#17150F' : '#8A8574'}
                    >
                      {d.en}
                    </text>
                    {on && (
                      <text
                        x={d.cx}
                        y={d.cy + r + 15}
                        textAnchor="middle"
                        style={{ font: '600 11px Inter, sans-serif' }}
                        fill="#4A4638"
                      >
                        {slope > 0 ? '+' : ''}
                        {slope} d/decade · p={d.onset.p}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-grow" /> arriving earlier
                (significant)
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-warn" /> arriving later
                (significant)
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-hint" /> no measurable
                trend
              </span>
              <span className="text-faint">circle size = magnitude</span>
            </div>
          </div>

          {/* ---- findings ------------------------------------------------ */}
          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] bg-ink p-6 text-white">
              <div className="num text-[13px] font-semibold uppercase tracking-[1.6px] text-ghost">
                Significant at p &lt; 0.05
              </div>
              <div className="num mt-2 flex items-baseline gap-2">
                <span className="display text-[64px] leading-none">{sig.length}</span>
                <span className="text-[17px] text-hint">of {districts.length} districts</span>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-hint">
                The calendar did not shift uniformly. It shifted in two districts and
                stayed put in {districts.length - sig.length}. A statewide advisory would
                be wrong in both directions.
              </p>
            </div>

            {sig.map((d) => (
              <div key={d.id} className="rounded-[26px] bg-card p-5">
                <div className="flex items-baseline justify-between">
                  <span className="display text-[24px] text-ink">{d.en}</span>
                  <span className="num text-[13px] font-semibold text-grow">
                    p = {d.onset.p}
                  </span>
                </div>
                <div className="num mt-2 flex items-baseline gap-2 text-[15px]">
                  <span className="text-ghost line-through">{fmtDoy(d.onset.fatherDoy, 'en')}</span>
                  <span className="text-faint">→</span>
                  <span className="text-[22px] font-bold text-ink">
                    {fmtDoy(d.onset.todayDoy, 'en')}
                  </span>
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {d.onset.slopePerDecade} days per decade · {d.division}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- federation ------------------------------------------------ */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] bg-card p-7">
            <h2 className="display text-[26px] text-ink">Models cross borders. Records do not.</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-muted">
              States will not share raw farmer data, and nations share it less readily
              still — it is politically and legally fraught, and they are right to
              refuse. So RITU shares the <b className="text-ink">method</b>, not the
              records. That is what makes a second node possible at all.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-grow-l p-4">
                <div className="text-[13px] font-semibold uppercase tracking-wide text-grow-d">
                  Crosses the border
                </div>
                <ul className="mt-2 space-y-1.5 text-[15px] text-grow-d">
                  <li>Onset detection rule</li>
                  <li>Trend + significance method</li>
                  <li>Crop and rotation schema</li>
                  <li>Climate-resilience scoring rules</li>
                  {/* the disease model is not built. Say so here rather than let
                      the list imply it ships — README and DPG.md both disclose it. */}
                  <li className="opacity-60">
                    Trained disease weights{' '}
                    <span className="rounded bg-warn-l px-1.5 py-0.5 text-[11px] font-semibold text-warn-m">
                      not built yet
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-warn-l p-4">
                <div className="text-[13px] font-semibold uppercase tracking-wide text-warn-d">
                  Never leaves the state
                </div>
                <ul className="mt-2 space-y-1.5 text-[15px] text-warn-d">
                  <li>Farmer name and village</li>
                  <li>Land holding</li>
                  <li>Individual advisories</li>
                  <li>Any personal record</li>
                </ul>
              </div>
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              The four rules above already work this way today. When the disease model
              lands, it joins them on the same terms — a pattern learned in Maharashtra
              improving detection in Karnataka without a single farmer record crossing
              the border.
            </p>
          </div>

          <div className="rounded-[28px] bg-card p-7">
            <h2 className="display text-[26px] text-ink">Open schema</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-muted">
              Adding a district is one row. Adding a crop is one object. Any state with a
              rainfall archive and a crop calendar can run this — the export is the
              method, not the app.
            </p>
            <pre className="num mt-4 overflow-x-auto rounded-2xl bg-chip p-4 text-[12px] leading-relaxed text-ink-2">
{`{
  "id": "Nashik",
  "lat": 20.00, "lon": 73.79,
  "onset": {
    "slopePerDecade": -5.17,
    "p": 0.0179,
    "significant": true,
    "fatherDoy": 178.4,
    "todayDoy": 164.7
  }
}`}
            </pre>
            <p className="mt-4 text-[14px] leading-relaxed text-faint">
              MIT licensed. Every derived file is regenerated by a script in{' '}
              <span className="num">scripts/</span> — nothing is hand-written.
            </p>
          </div>
        </section>

        {/* ---- cross-border / BRICS ---------------------------------------- */}
        <section className="mt-6 rounded-[28px] bg-card p-7">
          <h2 className="display text-[26px] text-ink">
            Maharashtra is the first node, not the only one.
          </h2>
          <p className="mt-3 max-w-[80ch] text-[16px] leading-relaxed text-muted">
            Every farming country has the same problem in a different accent: a sowing
            calendar inherited from a climate that has since moved. The calculation on
            this page needs only two things a nation already has — a multi-decade daily
            rainfall archive and a crop calendar. Nothing about it is specific to India.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {NODES.map((n) => (
              <div
                key={n.country}
                className={`rounded-2xl p-4 ${n.live ? 'bg-grow-l' : 'bg-chip'}`}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={`text-[15px] font-semibold ${n.live ? 'text-grow-d' : 'text-ink-2'}`}
                  >
                    {n.country}
                  </span>
                  <span
                    className={`num rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      n.live ? 'bg-grow text-white' : 'bg-warn-l text-warn-m'
                    }`}
                  >
                    {n.live ? 'live' : 'not computed'}
                  </span>
                </div>
                <div
                  className={`mt-2 text-[13px] leading-relaxed ${n.live ? 'text-grow-d' : 'text-muted'}`}
                >
                  {n.signal}
                </div>
                <div className="mt-2 text-[12px] leading-relaxed text-faint">{n.crop}</div>
              </div>
            ))}
          </div>

          <p className="mt-5 max-w-[80ch] text-[15px] leading-relaxed text-muted">
            Only the India node is computed. The other four are named to show what the
            same rule would be asked to find, not to imply we have found it — each would
            need its own onset definition agreed with that country&rsquo;s meteorological
            agency, which is the point of a shared network rather than an exported app.
          </p>
          <p className="mt-3 max-w-[80ch] text-[14px] leading-relaxed text-faint">
            India uses IMD&rsquo;s national gridded archive because it is the finest
            available here. Where a nation has no comparable national product, ECMWF
            ERA5 covers the whole globe from 1940 at no cost — the same free
            infrastructure RITU already calls for its forecasts. The barrier to a second
            node is agreement on the onset rule, not data access.
          </p>
        </section>

        <footer className="mt-8 border-t border-track pt-5 text-[13px] leading-relaxed text-faint">
          Source: {districtData.source.name}, {districtData.source.years}.{' '}
          {districtData.method.onset} {districtData.method.trend}
        </footer>
      </div>
    </div>
  )
}
