import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { useForecast } from '../lib/useForecast.js'
import { seasonForDate, sowingStatus } from '../lib/season.js'
import { fmtDate, fmtDoy, fmtWindow, fmtIsoShort, relDayLabel, rupees, getSeasons } from '../i18n/index.js'
import { useToday } from '../lib/useToday.js'
import { decodeWeather, sowingAdvice } from '../data/weather.js'
import { SAMPLE_CROPS } from '../data/crops.js'
import { AlertCard, Card, Chip, EyebrowLabel, SampleBadge, SectionHead } from '../components/ui.jsx'

export default function Home() {
  const { t, lang, name, acres, district, districtName } = useStore()
  const nav = useNavigate()
  const { week, isSample } = useForecast(district)
  const todayKey = useToday()

  const onset = district.onset
  const today = fmtDoy(onset.todayDoy, lang)
  const father = fmtDoy(onset.fatherDoy, lang)
  const advice = sowingAdvice(week, lang)

  // the season the farmer is actually in, from today's date — not hardcoded
  const season = seasonForDate()
  const seasonNames = getSeasons(lang)
  const seasonLabel = `${seasonNames[season]} ${t('seasonWord')}`

  // which sowing window today actually falls in, so the hero card cannot show a
  // date that has already passed
  const status = sowingStatus(SAMPLE_CROPS)
  const showSeason = status.phase === 'next' ? status.season : season
  const inSeason = SAMPLE_CROPS.filter((c) => c.season === showSeason).slice(0, 2)

  const heroTitle =
    status.phase === 'open' ? t('sowOpen') : status.phase === 'next' ? t('sowNext') : t('correctedSowing')
  // upcoming/open lead with the corrected onset; once it has passed, lead with
  // the next window that is actually actionable
  const heroDate = status.phase === 'next' ? fmtDate(status.from, lang) : today
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

      <AlertCard tone={advice.tone} title={advice.title} body={advice.body} />

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
              ? {
                  mr: `मान्सून ${onset.nYears} वर्षांत ${Math.abs(Math.round(onset.shiftDays))} दिवस लवकर येतो आहे.`,
                  hi: `मानसून ${onset.nYears} साल में ${Math.abs(Math.round(onset.shiftDays))} दिन जल्दी आ रहा है.`,
                  en: `The monsoon has moved ${Math.abs(Math.round(onset.shiftDays))} days earlier across ${onset.nYears} years.`,
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

      <SectionHead action={t('seeAll')} onAction={() => nav('/weather')}>
        {t('next7')}
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
              <span className="text-[19px]">{w.icon}</span>
              <span className="num text-base font-semibold text-ink">{d.temp}°</span>
              <span
                className="num text-[13px] font-medium"
                style={{ color: d.mm ? '#2E6B3F' : '#C1531B' }}
              >
                {d.mm ? d.mm : '—'}
              </span>
            </div>
          )
        })}
      </div>
      {isSample ? (
        <div className="mt-2 text-[11px] text-warn-m">
          {{ mr: 'हवामान जोडलं नाही — नमुना आकडे', hi: 'मौसम जुड़ा नहीं — नमूना आँकड़े', en: 'Forecast offline — sample figures' }[lang]}
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
