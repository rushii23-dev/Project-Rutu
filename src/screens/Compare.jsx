import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtWindow, getSeasons, rupees } from '../i18n/index.js'
import { SAMPLE_CROPS } from '../data/crops.js'
import { sowingStatus } from '../lib/season.js'
import { rankForSeason, switchGain, whyNot } from '../lib/compare.js'
import { EyebrowLabel, RoundIconButton, SampleBadge } from '../components/ui.jsx'

/**
 * "Which crop, and why not the others?"
 *
 * The rest of the app answers one crop at a time. A farmer is choosing between
 * four things he could plant on the same acre, so this screen puts them side by
 * side, names the winner, and gives every loser its own reason for losing.
 *
 * The screen prints the model it uses. That is deliberate: a ranking a farmer
 * cannot interrogate is just another authority telling him what to do, which is
 * the thing this project exists to replace.
 */
export default function Compare() {
  const { t, lang, acres, district, districtName } = useStore()
  const nav = useNavigate()

  // the season he can actually act on, same rule the home screen uses
  const status = sowingStatus(SAMPLE_CROPS, district)
  const season = status.season
  const seasons = getSeasons(lang)

  const result = rankForSeason(season, district, acres)
  const { rows, best } = result
  const others = rows.filter((r) => r.crop.id !== best.crop.id)
  const sg = switchGain(result, lang)

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav('/home')} label="back">←</RoundIconButton>

      <h1 className="display mt-5 text-[32px] leading-tight text-ink">{t('cmpTitle')}</h1>
      <p className="mt-1 text-[15px] text-muted">
        {seasons[season]} · {districtName()} · {acres} {t('acre')}
      </p>

      {/* ---------------- the recommendation ---------------- */}
      <div className="mt-4 rounded-[28px] bg-ink px-6 pb-5 pt-6">
        <EyebrowLabel tone="ghost">{t('cmpRecommend')}</EyebrowLabel>
        <div className="display mt-1.5 text-[40px] leading-none text-white">
          {best.crop.name[lang]}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-2xl bg-grow px-3.5 py-1.5 text-[14px] font-semibold text-white">
            {t('resilience')} {best.score}/100
          </span>
          <span className="rounded-2xl bg-white/12 px-3.5 py-1.5 text-[14px] font-medium text-white">
            {fmtWindow(best.window, lang)}
          </span>
        </div>

        <div className="mt-4 border-t border-white/12 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-[1.6px] text-ghost">
              {t('cmpAvg')}
            </span>
            <SampleBadge>{t('sampleFlag')}</SampleBadge>
          </div>
          <div className="num mt-1 text-[34px] font-bold tracking-tight text-white">
            {rupees(best.expected)}
          </div>
          <div className="num mt-1 text-[13px] text-hint">
            {t('goodYear')} {rupees(best.good)} · {t('poorYear')} {rupees(best.poor)}
          </div>
        </div>

        {/* the two strongest reasons, taken straight from the resilience factors */}
        {best.factors.length ? (
          <ul className="mt-4 flex flex-col gap-1.5">
            {best.factors
              .filter((f) => f.delta > 0)
              .slice(0, 2)
              .map((f) => (
                <li key={f.key} className="flex items-start gap-2 text-[15px] leading-snug text-hint">
                  <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-grow" />
                  {f.text[lang]}
                </li>
              ))}
          </ul>
        ) : null}
      </div>

      {/* ------- what changes if he follows this rather than instinct ------- */}
      {sg ? (
        <div className="mt-3 rounded-[26px] bg-grow-l px-5 py-4">
          <EyebrowLabel>{t('cmpIfYouListen')}</EyebrowLabel>
          <p className="mt-1.5 text-[15px] leading-relaxed text-grow-d">{sg.text}</p>
          {sg.gain ? (
            <div className="num mt-2 text-[26px] font-bold tracking-tight text-grow-d">
              + {rupees(sg.gain)}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---------------- the alternatives ---------------- */}
      <h2 className="display mx-1 mb-3 mt-7 text-[22px] text-ink">{t('cmpOthers')}</h2>
      <div className="flex flex-col gap-2.5">
        {others.map((r) => {
          const gated = r.band === 'fragile'
          return (
            <button
              key={r.crop.id}
              onClick={() => nav('/crops/' + r.crop.id)}
              className={`w-full rounded-[26px] px-5 py-4 text-left ${gated ? 'bg-warn-l' : 'bg-card'}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="display text-[24px] text-ink">{r.crop.name[lang]}</span>
                <span
                  className={`num rounded-lg px-2 py-1 text-[11px] font-semibold ${
                    gated
                      ? 'bg-warn text-white'
                      : r.scored
                        ? 'bg-chip text-ink-2'
                        : 'bg-chip text-faint'
                  }`}
                >
                  {r.scored ? `${r.score}/100` : t('notScored')}
                </span>
              </div>

              {r.scored ? (
                <div className="num mt-1.5 text-[14px] text-muted">
                  {t('cmpAvg')} <b className="text-ink">{rupees(r.expected)}</b> ·{' '}
                  {t('goodYear')} {rupees(r.good)}
                </div>
              ) : null}

              {gated ? (
                <div className="mt-2 inline-block rounded-lg bg-warn px-2 py-1 text-[11px] font-semibold text-white">
                  {t('cmpNotRec')}
                </div>
              ) : null}

              <p
                className={`mt-2 text-[15px] leading-snug ${gated ? 'text-warn-d' : 'text-muted'}`}
              >
                {whyNot(r, best, lang)}
              </p>
            </button>
          )
        })}
      </div>

      {/* ---------------- the model, on screen ---------------- */}
      <div className="mt-5 rounded-[26px] bg-card px-5 py-4">
        <EyebrowLabel>{t('cmpHow')}</EyebrowLabel>
        <div className="num mt-2 rounded-2xl bg-chip px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          {t('cmpFormula')}
        </div>
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
          {
            {
              mr: `चांगलं वर्ष आलं तर पीक जास्त देतं, नाही आलं तर कमी. चांगलं वर्ष येण्याची शक्यता कुणालाच माहीत नाही — म्हणून आम्ही ${districtName()}च्या ४१ वर्षांच्या पावसाच्या नोंदीवरून काढलेला लवचिकता गुण वापरतो. म्हणूनच सर्वात मोठा आकडा नेहमी जिंकत नाही.`,
              hi: `अच्छा साल आया तो फ़सल ज़्यादा देती है, नहीं आया तो कम. अच्छा साल आने की संभावना किसी को नहीं पता — इसलिए हम ${districtName()} के ४१ साल के बारिश रिकॉर्ड से निकला सहनशीलता अंक इस्तेमाल करते हैं. इसीलिए सबसे बड़ा आँकड़ा हमेशा नहीं जीतता.`,
              en: `A crop pays its good-year figure when the season goes well and its poor-year figure when it does not. Nobody knows the odds of a good year, so we weight it by the resilience score computed from ${districtName()}'s own 41-year rainfall record. That is why the biggest number does not always win.`,
            }[lang]
          }
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          {
            {
              mr: '४५ पेक्षा कमी गुण असलेलं पीक आम्ही कधीच सुचवत नाही, ते कितीही देत असलं तरी. लवचिकता गुण खरा आहे; रुपयांचे आकडे नमुना आहेत, अजून CACP तक्त्यांवरून घेतलेले नाहीत.',
              hi: '४५ से कम अंक वाली फ़सल हम कभी नहीं सुझाते, चाहे वह कितना भी दे. सहनशीलता अंक असली है; रुपये के आँकड़े नमूना हैं, अभी CACP तालिकाओं से नहीं लिए गए.',
              en: 'We never recommend a crop scoring below 45 here, whatever it pays. The resilience score is real; the rupee figures are samples, not yet taken from CACP tables.',
            }[lang]
          }
        </p>
      </div>
    </div>
  )
}
