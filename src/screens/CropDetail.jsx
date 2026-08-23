import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtWindow, getSeasons, getWaterLevels, rupees } from '../i18n/index.js'
import { cropById } from '../data/crops.js'
import { priceFor } from '../lib/prices.js'
import { Card, Chip, EyebrowLabel, RoundIconButton, SampleBadge } from '../components/ui.jsx'
import Rotation from '../components/Rotation.jsx'
import Resilience from '../components/Resilience.jsx'
import { cropWindow, cropWindowStatus } from '../lib/season.js'

export default function CropDetail() {
  const { t, lang, acres, districtId, district } = useStore()
  const { id } = useParams()
  const nav = useNavigate()

  const c = cropById(id)
  const seasonNames = getSeasons(lang)
  const waterNames = getWaterLevels(lang)
  const price = priceFor(c.id, districtId)
  const win = cropWindowStatus(c, district)
  const winLabel = {
    open: t('winOpenNow', { n: win.days }),
    upcoming: t('winUpcoming', { n: win.days }),
    passed: t('winPassed', { n: win.days }),
  }[win.phase]

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav('/crops')} label="back">
        ←
      </RoundIconButton>

      <h1 className="display mt-6 text-[46px] leading-tight text-ink">{c.name[lang]}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip tone="white" className="px-4 py-2.5">
          {t('season')} · {seasonNames[c.season]}
        </Chip>
        <Chip tone="white" className="px-4 py-2.5">
          {t('duration')} · {c.duration[0]}–{c.duration[1]} {t('days')}
        </Chip>
        <Chip tone="white" className="px-4 py-2.5">
          {t('water')} · {waterNames[c.water]}
        </Chip>
      </div>

      {/* real Agmarknet price — the one money figure that is not a sample */}
      <Card className="mt-4 px-6 py-5">
        <div className="flex items-baseline justify-between">
          <EyebrowLabel>{t('mandiPrice')}</EyebrowLabel>
          {price && price.scope !== 'none' ? (
            <span className="text-[11px] font-medium text-faint">
              {price.scope === 'state' ? t('stateAvg') : t('nMarkets', { n: price.markets })}
            </span>
          ) : null}
        </div>
        {price && price.scope !== 'none' ? (
          <>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="num text-[40px] font-bold leading-none tracking-tight text-ink">
                ₹{price.value.toLocaleString('en-IN')}
              </span>
              <span className="text-sm font-medium text-faint">{t('perQuintal')}</span>
            </div>
            {price.scope === 'district' && price.market ? (
              <div className="mt-2.5 text-[15px] text-muted">
                {t('bestMarket')}: <b className="text-ink">{price.market}</b>
                {price.bestTaluka ? (
                  <span className="text-faint"> ({price.bestTaluka})</span>
                ) : null}{' '}
                <span className="num">₹{price.bestPrice.toLocaleString('en-IN')}</span>
              </div>
            ) : null}
            <div className="num mt-1 text-[11px] text-faint">Agmarknet · {price.date}</div>

            {/* every market that traded today, best-paying first — this is the
                sell-where decision, at the finest resolution the source gives */}
            {price.stalls && price.stalls.length > 1 ? (
              <div className="mt-4 border-t border-hair pt-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
                  {t('nearbyMarkets')}
                </div>
                <div className="flex flex-col">
                  {price.stalls.map((st, i) => (
                    <div
                      key={st.m + i}
                      className={`flex items-baseline justify-between py-2 ${
                        i === price.stalls.length - 1 ? '' : 'border-b border-hair'
                      }`}
                    >
                      <span className="min-w-0 truncate pr-3 text-[15px] text-ink">
                        {st.m}
                        {st.t ? <span className="text-faint"> · {st.t}</span> : null}
                      </span>
                      <span
                        className={`num flex-none text-[15px] font-semibold ${
                          i === 0 ? 'text-grow' : 'text-ink-2'
                        }`}
                      >
                        ₹{st.p.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-2 text-[17px] font-medium text-warn-m">
            {price ? t('noArrivals') : t('notFetched')}
          </div>
        )}
      </Card>

      <h2 className="display mx-1 mb-3 mt-7 text-[22px] text-ink">{t('whyThisCrop')}</h2>
      <div className="flex flex-col gap-2.5">
        {c.reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-3.5 rounded-3xl bg-card px-5 py-4.5" style={{ paddingTop: 18, paddingBottom: 18 }}>
            <div className="num flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-grow-l text-[15px] font-semibold text-grow-d">
              {i + 1}
            </div>
            <div className="text-base leading-snug text-ink">{r[lang]}</div>
          </div>
        ))}
      </div>

      <div className="mx-1 mb-3 mt-7 flex items-baseline justify-between">
        <h2 className="display text-[22px] text-ink">
          {t('expectedIncome')} · {acres} {t('acre')}
        </h2>
        <SampleBadge>{t('sampleFlag')}</SampleBadge>
      </div>
      <div className="flex gap-3">
        <Card className="flex-1 p-5">
          <div className="text-sm font-medium text-grow">{t('goodYear')}</div>
          <div className="num mt-1.5 text-[27px] font-bold tracking-tight text-ink">
            {rupees(c.SAMPLE_goodPerAcre * acres)}
          </div>
        </Card>
        <Card className="flex-1 p-5">
          <div className="text-sm font-medium text-warn">{t('poorYear')}</div>
          <div className="num mt-1.5 text-[27px] font-bold tracking-tight text-ink">
            {rupees(c.SAMPLE_poorPerAcre * acres)}
          </div>
        </Card>
      </div>

      <div className="mt-3.5 rounded-[28px] bg-ink p-6">
        <EyebrowLabel tone="ghost">{t('sowingWindow')}</EyebrowLabel>
        <div className="display mt-2 text-[38px] text-white">{fmtWindow(cropWindow(c, district), lang)}</div>
        {/* a window without "where are we now" reads as an instruction */}
        <div
          className={`mt-2 inline-block rounded-2xl px-3 py-1.5 text-[14px] font-semibold ${
            win.phase === 'open'
              ? 'bg-grow text-white'
              : win.phase === 'upcoming'
                ? 'bg-white/15 text-white'
                : 'bg-warn/25 text-warn-l'
          }`}
        >
          {winLabel}
        </div>
        <div className="mt-2.5 text-[15px] text-hint">{c.windowNote[lang]}</div>
      </div>

      {/* resilience answers "should I plant this at all", rotation answers
          "what comes after it" — so resilience reads first */}
      <Resilience crop={c} />
      <Rotation crop={c} />
    </div>
  )
}
