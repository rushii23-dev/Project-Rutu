import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtDoy } from '../i18n/index.js'
import OnsetChart from '../components/OnsetChart.jsx'
import { Card, EyebrowLabel, RoundIconButton } from '../components/ui.jsx'
import Satellite from '../components/Satellite.jsx'

export default function Evidence() {
  const { t, lang, district, districtName, meta } = useStore()
  const nav = useNavigate()
  const [sourceOpen, setSourceOpen] = useState(false)

  const onset = district.onset
  const sup = district.supporting
  const today = fmtDoy(onset.todayDoy, lang)
  const father = fmtDoy(onset.fatherDoy, lang)

  const stats = [
    { label: t('st_onset'), before: father, after: today },
    {
      label: t('st_raindays'),
      before: `${sup.rainDays.then} ${t('days')}`,
      after: `${sup.rainDays.now} ${t('days')}`,
    },
    {
      label: t('st_seasonal'),
      before: `${sup.seasonal.then} ${t('mm')}`,
      after: `${sup.seasonal.now} ${t('mm')}`,
    },
    {
      label: t('st_dry'),
      before: `${sup.dry.then} ${t('days')}`,
      after: `${sup.dry.now} ${t('days')}`,
    },
  ]

  const narrative = onset.significant
    ? {
        mr: `${onset.yearFrom} मध्ये मान्सून ${father}ला येत होता. आज ${today}ला येतो.`,
        hi: `${onset.yearFrom} में मानसून ${father} को आता था. आज ${today} को आता है.`,
        en: `In ${onset.yearFrom} the monsoon arrived on ${father}. Today it arrives on ${today}.`,
      }[lang]
    : {
        mr: `${districtName()}मध्ये ${onset.nYears} वर्षांत मान्सूनच्या तारखेत मोजता येण्याजोगा बदल दिसत नाही. आम्ही तो असल्याचं भासवणार नाही.`,
        hi: `${districtName()} में ${onset.nYears} साल में मानसून की तारीख़ में मापने लायक बदलाव नहीं दिखता. हम इसे होने का दावा नहीं करेंगे.`,
        en: `Across ${onset.nYears} years, ${districtName()} shows no measurable shift in the monsoon date. We will not pretend otherwise.`,
      }[lang]

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav('/home')} label="back">
        ←
      </RoundIconButton>

      <div className="mt-6">
        <EyebrowLabel>{t('todayCorrected')}</EyebrowLabel>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2.5">
        <span className="display text-[66px] leading-none text-ink">{today}</span>
        <span className="text-[15px] font-medium text-faint">{t('avgArrival')}</span>
      </div>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">{narrative}</p>

      <Card className="mt-5 px-4.5 pb-4 pt-5" style={{ paddingLeft: 18, paddingRight: 18 }}>
        <div className="mb-2.5 text-sm font-semibold text-ink-2">
          {t('onsetChartTitle', { range: `${onset.yearFrom} – ${onset.yearTo}` })}
        </div>
        <OnsetChart onset={onset} lang={lang} />
        <div className="mt-0.5 text-center text-sm font-medium text-faint">
          {t('fromNYears', { n: onset.nYears })}
        </div>
      </Card>

      {/* years the chart cannot show honestly, named rather than dropped */}
      {(onset.offScaleYears.length > 0 || onset.noOnsetYears.length > 0) && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-warn-m">
          {onset.offScaleYears.length > 0 &&
            t('offScaleNote', { years: onset.offScaleYears.join(', ') }) + ' '}
          {onset.noOnsetYears.length > 0 &&
            t('noOnsetNote', { years: onset.noOnsetYears.join(', ') })}
        </p>
      )}

      <div className="mt-3.5 flex flex-col gap-2.5">
        {stats.map((s, i) => (
          <Card key={i} className="px-5.5 py-5" style={{ paddingLeft: 22, paddingRight: 22 }}>
            <div className="text-[15px] font-medium text-muted">{s.label}</div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="num text-[22px] font-semibold text-ghost line-through">
                {s.before}
              </span>
              <span className="text-base font-medium text-faint">→</span>
              <span className="num text-[28px] font-bold tracking-tight text-ink">{s.after}</span>
            </div>
          </Card>
        ))}
      </div>

      <Satellite />

      <button
        onClick={() => setSourceOpen(!sourceOpen)}
        className="mt-3.5 flex w-full items-center justify-between rounded-[26px] bg-card px-5.5 py-5"
        style={{ paddingLeft: 22, paddingRight: 22 }}
      >
        <span className="text-[17px] font-semibold text-ink">{t('dataSource')}</span>
        <span className="num text-[15px] font-medium text-faint">{sourceOpen ? '−' : '+'}</span>
      </button>
      {sourceOpen ? (
        <Card className="mt-2 px-5.5 py-5 text-[15px] leading-relaxed text-ink-2" style={{ paddingLeft: 22, paddingRight: 22 }}>
          <p>
            <b>{meta.source.name}</b>, {meta.source.years}.
          </p>
          <p className="mt-2">{meta.method.onset}</p>
          <p className="mt-2">
            {meta.method.trend}{' '}
            <span className="num">
              {onset.slopePerDecade} {t('days')}/10y, p = {onset.p}
            </span>
            {' — '}
            {onset.significant
              ? { mr: 'सार्थक', hi: 'सार्थक', en: 'significant' }[lang]
              : { mr: 'सार्थक नाही', hi: 'सार्थक नहीं', en: 'not significant' }[lang]}
          </p>
          <a
            className="mt-2 inline-block underline"
            href={meta.source.url}
            target="_blank"
            rel="noreferrer"
          >
            IMD
          </a>
        </Card>
      ) : null}
    </div>
  )
}
