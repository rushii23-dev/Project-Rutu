import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { useForecast } from '../lib/useForecast.js'
import { rainDecidesSowing, seasonForDate, sowingStatus } from '../lib/season.js'
import { fmtDate, fmtDoy, fmtWindow, fmtIsoShort, relDayLabel, rupees, getSeasons } from '../i18n/index.js'
import { useToday } from '../lib/useToday.js'
import { decodeWeather, sowingAdvice } from '../data/weather.js'
import { SAMPLE_CROPS } from '../data/crops.js'
import { AlertCard, Card, Chip, EyebrowLabel, SampleBadge, SectionHead } from '../components/ui.jsx'
import FieldCard from '../components/FieldCard.jsx'
import LateCost from '../components/LateCost.jsx'
import SoilSummary from '../components/SoilSummary.jsx'
import { cropsInField, pickFieldCrop, weekAdvice } from '../lib/field.js'

export default function Home() {
  const { t, lang, name, acres, district, districtName, fieldCrop, set } = useStore()
  const nav = useNavigate()
  const { week, isSample, loading, stale, ageHours } = useForecast(district)
  const todayKey = useToday()

  const onset = district.onset
  const today = fmtDoy(onset.todayDoy, lang)
  const father = fmtDoy(onset.fatherDoy, lang)

  // the season the farmer is actually in, from today's date — not hardcoded
  const season = seasonForDate()
  const seasonNames = getSeasons(lang)
  const seasonLabel = `${seasonNames[season]} ${t('seasonWord')}`

  // which sowing window today actually falls in, so the hero card cannot show a
  // date that has already passed
  const status = sowingStatus(SAMPLE_CROPS, district)
  const showSeason = status.phase === 'next' ? status.season : season
  const inSeason = SAMPLE_CROPS.filter((c) => c.season === showSeason).slice(0, 2)

  const heroTitle =
    status.phase === 'open' ? t('sowOpen') : status.phase === 'next' ? t('sowNext') : t('correctedSowing')
  // upcoming/open lead with the corrected onset; once it has passed, lead with
  // the next window that is actually actionable
  const heroDate = status.phase === 'next' ? fmtDate(status.from, lang) : today
  // The farming year has three moments and the top of this screen follows
  // them. Rain-based sowing advice only while a rain-triggered sowing decision
  // is close; otherwise the crop already in the ground and this week's weather
  // for it; with nothing standing, the next window.
  const rainSowing = rainDecidesSowing(status)
  // Never derive a sowing recommendation from the sample week. Until the real
  // forecast lands, this card must say it has no forecast rather than issue an
  // authoritative-sounding instruction computed from invented rainfall.
  const advice = isSample || !rainSowing ? null : sowingAdvice(week, lang)
  const inField = cropsInField(SAMPLE_CROPS, district)
  const active = pickFieldCrop(inField, fieldCrop)
  const idle =
    rainSowing || active
      ? null
      : weekAdvice({ crops: SAMPLE_CROPS, district, week, lang, todayKey, fieldCrop })

  const heroCount =
    status.phase === 'open'
      ? t('daysLeft', { n: status.days })
      : t('daysUntil', { n: status.days })

  return (
    <div className="px-5 pb-[130px] pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="display text-[34px] leading-tight text-ink">
            {t('hello')} <span className="italic">{name || '—'}</span>,
          </h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-[20px] bg-card px-4 py-2 text-sm font-medium text-ink-2">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-grow" />
            {districtName()} · {seasonLabel}
          </div>
        </div>
        <button
          onClick={() => nav('/profile')}
          className="display h-12 w-12 flex-none rounded-3xl bg-card text-xl text-ink"
        >
          {(name || '?').trim().charAt(0)}
        </button>
      </div>

      {idle ? (
        <AlertCard tone={idle.tone} title={idle.title} body={idle.body} />
      ) : !rainSowing ? (
        <FieldCard inField={inField} active={active} onPick={(id) => set({ fieldCrop: id })} />
      ) : advice ? (
        <AlertCard tone={advice.tone} title={advice.title} body={advice.body} />
      ) : (
        <div className="mt-4 rounded-[26px] bg-chip px-5 py-4">
          <div className="text-[17px] font-semibold text-ink-2">
            {loading ? t('fcLoading') : t('fcOffline')}
          </div>
          <div className="mt-0.5 text-[15px] leading-snug text-muted">
            {loading ? t('fcLoadingBody') : t('fcOfflineBody')}
          </div>
        </div>
      )}

      {/* question entry — a farmer with a question should not have to navigate */}
      <button
        onClick={() => nav('/ask')}
        className="mt-3.5 flex w-full items-center gap-4 rounded-[26px] bg-grow px-5 py-4 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.4A8.4 8.4 0 1 1 21 11.5z" />
          </svg>
        </span>
        <span>
          <span className="block text-[17px] font-semibold text-white">{t('askTitle')}</span>
          <span className="block text-[14px] text-white/75">{t('askSub')}</span>
        </span>
      </button>

      {/* the crop-choice comparison: the question a farmer actually arrives
          with, so it sits above the per-crop screens rather than inside one */}
      <button
        onClick={() => nav('/compare')}
        className="mt-2.5 flex w-full items-center gap-4 rounded-[26px] bg-card px-5 py-4 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-grow-l">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E6B3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 20V10M12 20V5M19 20v-7" />
          </svg>
        </span>
        <span>
          <span className="block text-[17px] font-semibold text-ink">{t('cmpOpen')}</span>
          <span className="block text-[14px] text-muted">{t('cmpOpenSub')}</span>
        </span>
      </button>

      {/* leaf diagnosis — demo step 6, so it must be one tap from the home
          screen rather than buried inside a crop */}
      <button
        onClick={() => nav('/diagnose')}
        className="mt-2.5 flex w-full items-center gap-4 rounded-[26px] bg-card px-5 py-4 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-grow-l">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E6B3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5h3.5L8 6h8l1.5 2.5H21V19H3z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
        <span>
          <span className="block text-[17px] font-semibold text-ink">{t('dxOpen')}</span>
          <span className="block text-[14px] text-muted">{t('dxOpenSub')}</span>
        </span>
      </button>

      {/* the hero: the corrected sowing date */}
      <Card className="mt-3.5 px-6 pb-5 pt-6">
        <EyebrowLabel>{heroTitle}</EyebrowLabel>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="display text-[60px] leading-none text-ink">{heroDate}</span>
          <span className="text-[15px] font-medium text-faint">{t('from')}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="grow">{heroCount}</Chip>
          <Chip>
            {t('windowChip', {
              window: fmtWindow({ from: status.from, to: status.to }, lang),
            })}
          </Chip>
          {status.phase !== 'next' ? <Chip>{t('oldDateChip', { date: father })}</Chip> : null}
        </div>
        <p className="mt-4 text-base leading-relaxed text-ink-2">
          {status.phase === 'next'
            ? t('windowPassed', { season: seasonNames[season], date: today })
            : onset.significant
              ? // Direction comes from the sign, never from a hardcoded word.
                // Both significant districts happen to have moved earlier, so
                // "earlier" was baked in and read correctly by luck. Hingoli
                // trends LATER at p = 0.056; one more year of record could take
                // it under 0.05, and this line would then state the opposite of
                // its own chart.
                {
                  mr: `मान्सून ${onset.nYears} वर्षांत ${Math.abs(Math.round(onset.shiftDays))} दिवस ${onset.shiftDays < 0 ? 'लवकर' : 'उशिरा'} येतो आहे.`,
                  hi: `मानसून ${onset.nYears} साल में ${Math.abs(Math.round(onset.shiftDays))} दिन ${onset.shiftDays < 0 ? 'जल्दी' : 'देर से'} आ रहा है.`,
                  en: `The monsoon has moved ${Math.abs(Math.round(onset.shiftDays))} days ${onset.shiftDays < 0 ? 'earlier' : 'later'} across ${onset.nYears} years.`,
                }[lang]
              : t('notSignificant')}
        </p>
        <button
          onClick={() => nav('/evidence')}
          className="mt-3.5 flex items-center gap-1.5 text-[17px] font-semibold text-grow"
        >
          {t('whyShort')} <span className="text-[15px]">→</span>
        </button>
      </Card>

      {/* the old date against the new one, priced — every figure sourced */}
      <LateCost />

      <SoilSummary />

      <SectionHead action={t('seeAll')} onAction={() => nav('/weather')}>
        {t('next7', { n: week.length })}
      </SectionHead>
      <div className="sc flex overflow-x-auto rounded-[26px] bg-card px-2 py-4.5" style={{ paddingTop: 18, paddingBottom: 18 }}>
        {week.map((d, i) => {
          const w = decodeWeather(d.code)
          return (
            <div key={i} className="flex w-[47px] flex-none flex-col items-center gap-1.5 text-center">
              <span className="text-[13px] font-medium text-faint">
                {relDayLabel(d.iso, todayKey, lang)}
              </span>
              <span className="num text-[10px] text-hint">{fmtIsoShort(d.iso, lang)}</span>
              <span className="text-[19px]">{isSample ? '' : w.icon}</span>
              <span className="num text-base font-semibold text-ink">
                {isSample ? '—' : `${d.temp}°`}
              </span>
              <span
                className="num text-[13px] font-medium"
                style={{ color: isSample ? '#8A8574' : d.mm ? '#2E6B3F' : '#C1531B' }}
              >
                {isSample || !d.mm ? '—' : d.mm}
              </span>
            </div>
          )
        })}
      </div>
      {isSample ? (
        <div className={`mt-2 text-[11px] ${loading ? 'text-faint' : 'text-warn-m'}`}>
          {loading ? t('fcLoading') : t('fcSampleTag')}
        </div>
      ) : stale ? (
        <div className="mt-2 text-[11px] text-warn-m">
          {t('fcStaleNote', { n: Math.max(1, Math.round(ageHours)) })}
        </div>
      ) : null}

      <SectionHead action={t('seeAll')} onAction={() => nav('/crops')}>
        {t('cropsForYou')}
      </SectionHead>
      <div className="flex flex-col gap-3">
        {inSeason.map((c) => (
          <button
            key={c.id}
            onClick={() => nav('/crops/' + c.id)}
            className="w-full rounded-[26px] bg-card px-6 pb-5 pt-5.5 text-left"
            style={{ paddingTop: 22 }}
          >
            <div className="flex items-start justify-between">
              <div className="display text-[27px] text-ink">{c.name[lang]}</div>
              <Chip tone="grow" className="text-[13px] font-semibold">
                {c.badge[lang]}
              </Chip>
            </div>
            <p className="mt-1.5 text-base leading-snug text-muted">{c.reason[lang]}</p>
            <div className="mt-3.5 flex items-baseline gap-2">
              <span className="num text-[30px] font-bold tracking-tight text-ink">
                {rupees(c.SAMPLE_goodPerAcre * acres)}
              </span>
              <span className="text-sm font-medium text-faint">
                {acres} {t('acre')} · {t('expected')}
              </span>
            </div>
            <div className="mt-2">
              <SampleBadge>{t('sampleFlag')}</SampleBadge>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
