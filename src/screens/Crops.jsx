import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtDate, getSeasons, getWaterLevels, rupees } from '../i18n/index.js'
import { SAMPLE_CROPS, SEASON_KEYS } from '../data/crops.js'
import { priceFor } from '../lib/prices.js'
import { cropWindow, cropWindowStatus } from '../lib/season.js'
import { Chip, SampleBadge } from '../components/ui.jsx'

export default function Crops() {
  const { t, lang, acres, districtId, district } = useStore()
  const nav = useNavigate()
  const [season, setSeason] = useState('kharif')

  const seasonNames = getSeasons(lang)
  const waterNames = getWaterLevels(lang)
  const list = SAMPLE_CROPS.filter((c) => c.season === season)

  return (
    <div className="px-5 pb-[130px] pt-4">
      <h1 className="display text-[34px] text-ink">{t('crops')}</h1>
      <p className="mt-1 text-base text-muted">
        {t('cropsSub', { acres: `${acres} ${t('acre')}` })}
      </p>

      <div className="sc my-5 flex gap-2.5 overflow-x-auto">
        {SEASON_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setSeason(k)}
            className={`flex-none rounded-[22px] px-5.5 py-3 text-base font-semibold transition ${
              season === k ? 'bg-ink text-white' : 'bg-card text-ink-2'
            }`}
            style={{ paddingLeft: 22, paddingRight: 22 }}
          >
            {seasonNames[k]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => nav('/crops/' + c.id)}
            className="w-full rounded-[26px] bg-card p-5.5 text-left"
            style={{ padding: 22 }}
          >
            <div className="flex items-center justify-between">
              <div className="display text-[27px] text-ink">{c.name[lang]}</div>
              <span className="num text-[22px] text-hint">›</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip className="text-[13px]">
                {t('water')} · {waterNames[c.water]}
              </Chip>
              <Chip className="text-[13px]">
                {c.duration[0]}–{c.duration[1]} {t('days')}
              </Chip>
              {(() => {
                const w = cropWindowStatus(c, district)
                // this district's window, not the crop's fixed `sow` date — that
                // printed "sow 13 June" in Ahmednagar, whose monsoon now arrives
                // around 11 July, while the crop's own page said otherwise
                const from = cropWindow(c, district).from
                return (
                  <span
                    className={`rounded-2xl px-3.5 py-1.5 text-[13px] font-medium ${
                      w.phase === 'open'
                        ? 'bg-grow text-white'
                        : w.phase === 'passed'
                          ? 'bg-chip text-hint line-through'
                          : 'bg-chip text-ink-2'
                    }`}
                  >
                    {t('sowing')} {fmtDate(from, lang)}
                  </span>
                )
              })()}
            </div>
            <div className="mt-3.5 flex items-baseline gap-2">
              <span className="num text-[26px] font-bold tracking-tight text-ink">
                {rupees(c.SAMPLE_poorPerAcre * acres)} – {rupees(c.SAMPLE_goodPerAcre * acres).replace('₹', '')}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SampleBadge>{t('sampleFlag')}</SampleBadge>
              {(() => {
                const p = priceFor(c.id, districtId)
                if (!p || p.scope === 'none') return null
                return (
                  <span className="rounded-lg bg-grow-l px-2 py-1 text-[11px] font-semibold text-grow-d">
                    <span className="num">₹{p.value.toLocaleString('en-IN')}</span>
                    {' / ' + t('quintal')}
                    {p.scope === 'state' ? ' · ' + t('stateAvg') : ''}
                  </span>
                )
              })()}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
