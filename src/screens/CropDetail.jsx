import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtWindow, getSeasons, getWaterLevels, rupees } from '../i18n/index.js'
import { cropById } from '../data/crops.js'
import { priceFor, priceSource } from '../lib/prices.js'
import { Card, Chip, EyebrowLabel, RoundIconButton, SampleBadge } from '../components/ui.jsx'

export default function CropDetail() {
  const { t, lang, acres, districtId } = useStore()
  const { id } = useParams()
  const nav = useNavigate()

  const c = cropById(id)
  const seasonNames = getSeasons(lang)
  const waterNames = getWaterLevels(lang)
  const price = priceFor(c.id, districtId)

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
                {t('bestMarket')}: <b className="text-ink">{price.market}</b>{' '}
                <span className="num">₹{price.bestPrice.toLocaleString('en-IN')}</span>
              </div>
            ) : null}
            <div className="num mt-1 text-[11px] text-faint">
              Agmarknet · {price.date}
            </div>
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
        <div className="display mt-2 text-[38px] text-white">{fmtWindow(c.window, lang)}</div>
        <div className="mt-1 text-[15px] text-hint">{c.windowNote[lang]}</div>
      </div>
    </div>
  )
}
