import { useStore } from '../lib/store.jsx'
import { fmtIsoShort } from '../i18n/index.js'
import ndvi from '../data/ndvi.json'
import { Card } from './ui.jsx'

/**
 * Satellite vegetation for the district — MODIS NDVI via NASA GIBS.
 *
 * Precomputed, as the scope rules require: two static frames and a small JSON
 * series, so the section costs nothing on 2G and cannot fail on stage.
 *
 * Cloud-obscured readings are drawn as hollow orange rings rather than being
 * quietly dropped, and dates GIBS never published are excluded entirely — an
 * empty tile is the absence of a measurement, not a measurement of zero.
 */
const W = 300
const H = 120

export default function Satellite() {
  const { t, lang, district, districtName } = useStore()

  // The NDVI layer is precomputed for ONE district. Showing it under the
  // heading "your district from orbit" while the farmer has another district
  // selected labels Nashik's imagery as his own field. Show it only where it
  // is actually true, and say plainly that the rest are not built yet.
  if (district.id !== ndvi.source.district) {
    return (
      <section className="mt-7">
        <h2 className="display mx-1 text-[22px] text-ink">{t('satellite')}</h2>
        <Card className="mt-3 px-5 py-4">
          <p className="text-[15px] leading-relaxed text-muted">
            {
              {
                mr: `उपग्रहाचा थर सध्या फक्त ${ndvi.source.district} जिल्ह्यासाठी तयार केला आहे. ${districtName()}साठी तो अजून काढलेला नाही, आणि दुसऱ्या जिल्ह्याचं चित्र तुमचं म्हणून दाखवणार नाही.`,
                hi: `उपग्रह की परत अभी सिर्फ़ ${ndvi.source.district} ज़िले के लिए बनाई गई है. ${districtName()} के लिए अभी नहीं निकाली गई, और दूसरे ज़िले की तस्वीर आपकी बताकर नहीं दिखाएँगे.`,
                en: `The satellite layer is precomputed for ${ndvi.source.district} only. It has not been computed for ${districtName()}, and we will not show another district's imagery as yours.`,
              }[lang]
            }
          </p>
        </Card>
      </section>
    )
  }

  const plotted = ndvi.series.filter((s) => s.index !== null)
  const cloudy = plotted.filter((s) => !s.reliable)
  const values = plotted.map((s) => s.index)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const x = (i) => 8 + (i / (plotted.length - 1)) * (W - 16)
  const y = (v) => H - 14 - ((v - min) / (max - min || 1)) * (H - 28)

  // the line only connects readings we trust
  const reliable = plotted.map((s, i) => ({ ...s, i })).filter((s) => s.reliable)
  const path = reliable.map((s, k) => `${k ? 'L' : 'M'} ${x(s.i)} ${y(s.index)}`).join(' ')

  const { low, high } = ndvi.extremes

  return (
    <section className="mt-7">
      <h2 className="display mx-1 text-[22px] text-ink">{t('satellite')}</h2>
      <p className="mx-1 mb-3 text-[13px] text-faint">
        {t('satSub', { n: plotted.length })}
      </p>

      {/* the two frames, bare soil against standing crop */}
      <div className="flex gap-3">
        {[
          { k: 'dry', d: ndvi.hero.dry, label: t('satDry'), val: low.index },
          { k: 'peak', d: ndvi.hero.peak, label: t('satPeak'), val: high.index },
        ].map((f) => (
          <div key={f.k} className="flex-1 overflow-hidden rounded-[22px] bg-card">
            <img
              src={f.d.img}
              alt={f.label}
              width="560"
              height="440"
              /* NOT loading="lazy": the phone frame is a fixed-height scroll
                 container, and lazy loading is measured against the document
                 viewport, so a clipped image can never become "visible" and
                 never loads. Both frames together are ~180 KB and precomputed. */
              className="block h-auto w-full"
            />
            <div className="px-3 py-2.5">
              <div className="text-[13px] font-semibold text-ink">{f.label}</div>
              <div className="num text-[11px] text-faint">
                {fmtIsoShort(f.d.date, lang)} · {t('satGreen')} {f.val}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* seasonal greenness profile */}
      <Card className="mt-3 px-4 pb-3 pt-4">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
          <path d={path} fill="none" stroke="#2E6B3F" strokeWidth="2.5" strokeLinecap="round" />
          {plotted.map((s, i) =>
            s.reliable ? (
              <circle key={s.date} cx={x(i)} cy={y(s.index)} r="3" fill="#2E6B3F" />
            ) : (
              <circle
                key={s.date}
                cx={x(i)}
                cy={y(s.index)}
                r="3.5"
                fill="none"
                stroke="#C1531B"
                strokeWidth="1.6"
              />
            )
          )}
          <text x="8" y={H - 2} style={{ font: '500 10px Inter, sans-serif' }} fill="#8A8574">
            {fmtIsoShort(plotted[0].date, lang)}
          </text>
          <text
            x={W - 8}
            y={H - 2}
            textAnchor="end"
            style={{ font: '500 10px Inter, sans-serif' }}
            fill="#8A8574"
          >
            {fmtIsoShort(plotted[plotted.length - 1].date, lang)}
          </text>
        </svg>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-grow" /> {t('satGreen')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-warn" />{' '}
            {t('satCloud')}
          </span>
        </div>
      </Card>

      {cloudy.length > 0 ? (
        <p className="mx-1 mt-2 text-[11px] leading-relaxed text-warn-m">
          {t('satNote', { n: cloudy.length })}
        </p>
      ) : null}

      <p className="mx-1 mt-1.5 text-[11px] leading-relaxed text-faint">
        {ndvi.source.name} · NASA GIBS
      </p>
    </section>
  )
}
