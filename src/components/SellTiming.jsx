import { useStore } from '../lib/store.jsx'
import { MONTHS, MONTHS_FULL } from '../i18n/index.js'
import { priceFor } from '../lib/prices.js'
import { HOLD_COST_PER_MONTH, sellAdvice, sellSource } from '../lib/sell.js'

/**
 * When to sell, for one crop in one district — 11 years of Agmarknet prices.
 *
 * The chart is the shape of a typical year: how far each month's price sits
 * above or below that year's trend. The harvest month and the best month to
 * sell are marked on it, so the advice can be checked against the picture.
 */
export default function SellTiming({ crop }) {
  const { lang, district, districtId, districtName } = useStore()
  const price = priceFor(crop.id, districtId)
  const a = sellAdvice(crop, district, price)
  const L = (o) => o[lang]
  if (!a || !a.index) return null

  const M = MONTHS[lang]
  const MF = MONTHS_FULL[lang]
  const name = crop.name[lang]
  const where = a.scope === 'district' ? districtName() : L({ mr: 'महाराष्ट्र', hi: 'महाराष्ट्र', en: 'Maharashtra' })

  return (
    <section id="sell" className="mt-7 scroll-mt-4">
      <div className="mx-1 mb-1 flex items-baseline justify-between">
        <h2 className="display text-[22px] text-ink">{L({ mr: 'कधी विकायचं?', hi: 'कब बेचें?', en: 'When to sell' })}</h2>
        <span className="rounded-lg bg-grow-l px-2 py-1 text-[11px] font-semibold text-grow-d">
          {L({ mr: `${a.years} वर्षांचे भाव`, hi: `${a.years} साल के भाव`, en: `${a.years} years of prices` })}
        </span>
      </div>
      <p className="mx-1 mb-3 text-[13px] text-faint">
        {L({
          mr: `${where} बाजारांतील खरे भाव, Agmarknet`,
          hi: `${where} मंडियों के असली भाव, Agmarknet`,
          en: `Real prices from ${where} markets, Agmarknet`,
        })}
      </p>

      <div className="rounded-[28px] bg-card px-5 pb-5 pt-6">
        {/* the verdict, first and large */}
        <div className="text-[13px] font-medium text-muted">
          {L({
            mr: `तुमचं ${name} ${MF[a.month]}मध्ये विक्रीला तयार होईल`,
            hi: `आपकी ${name} ${MF[a.month]} में बिकने को तैयार होगी`,
            en: `Your ${name} is ready to sell in ${MF[a.month]}`,
          })}
        </div>
        <div className="display mt-1.5 text-[30px] leading-tight text-ink">
          {a.verdict === 'hold'
            ? L({ mr: `${MF[a.best.month]}पर्यंत थांबा`, hi: `${MF[a.best.month]} तक रुकें`, en: `Hold until ${MF[a.best.month]}` })
            : L({ mr: 'काढणीनंतरच विका', hi: 'कटाई के बाद ही बेचें', en: 'Sell at harvest' })}
        </div>

        {a.verdict === 'hold' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {a.perQtl ? (
              <span className="num rounded-2xl bg-grow-l px-3.5 py-1.5 text-[15px] font-semibold text-grow-d">
                +₹{a.perQtl.toLocaleString('en-IN')}/{L({ mr: 'क्विंटल', hi: 'क्विंटल', en: 'qtl' })}
              </span>
            ) : null}
            <span className="num rounded-2xl bg-chip px-3.5 py-1.5 text-[15px] font-medium text-ink-2">
              {L({
                mr: `${a.best.n} पैकी ${a.best.wins} वर्षांत फायदा`,
                hi: `${a.best.n} में से ${a.best.wins} साल फ़ायदा`,
                en: `paid in ${a.best.wins} of ${a.best.n} years`,
              })}
            </span>
          </div>
        ) : null}

        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {a.verdict === 'hold'
            ? L({
                mr: `${MF[a.month]}मध्ये विकण्याऐवजी ${a.best.wait} महिना थांबलेल्यांना साधारण ${a.best.gain}% जास्त भाव मिळाला. साठवणुकीचा ${HOLD_COST_PER_MONTH}% दरमहा खर्च वजा करूनही फायदा उरतो.`,
                hi: `${MF[a.month]} में बेचने के बजाय ${a.best.wait} महीने रुकने वालों को आम तौर पर ${a.best.gain}% ज़्यादा भाव मिला. भंडारण का ${HOLD_COST_PER_MONTH}% प्रति माह ख़र्च घटाने के बाद भी फ़ायदा बचता है.`,
                en: `Farmers who waited ${a.best.wait} month${a.best.wait > 1 ? 's' : ''} instead of selling in ${MF[a.month]} typically got ${a.best.gain}% more. That still clears a holding cost of ${HOLD_COST_PER_MONTH}% a month.`,
              })
            : a.why === 'rarely'
              ? L({
                  mr: `थांबल्याचा फायदा फक्त ${a.best.n} पैकी ${a.best.wins} वर्षांत झाला — हा जुगार आहे. जवळच्या सर्वात चांगल्या बाजारात विका.`,
                  hi: `रुकने का फ़ायदा ${a.best.n} में से सिर्फ़ ${a.best.wins} साल हुआ — यह जुआ है. पास की सबसे अच्छी मंडी में बेचें.`,
                  en: `Waiting paid in only ${a.best.wins} of ${a.best.n} years — that is a gamble, not a plan. Sell at the best nearby market instead.`,
                })
              : a.why === 'small'
                ? L({
                    mr: `थांबल्यावर भाव ${a.best.n} पैकी ${a.best.wins} वर्षांत वाढला, पण फक्त ${a.best.gain}% — साठवणुकीचा खर्च त्यापेक्षा जास्त. जवळच्या सर्वात चांगल्या बाजारात विका.`,
                    hi: `रुकने पर भाव ${a.best.n} में से ${a.best.wins} साल बढ़ा, पर सिर्फ़ ${a.best.gain}% — भंडारण का ख़र्च उससे ज़्यादा. पास की सबसे अच्छी मंडी में बेचें.`,
                    en: `Waiting raised the price in ${a.best.wins} of ${a.best.n} years, but only by ${a.best.gain}% — less than it costs to hold. Sell at the best nearby market instead.`,
                  })
              : L({
                  mr: 'या महिन्यासाठी पुरेसे भाव नोंदलेले नाहीत.',
                  hi: 'इस महीने के लिए पर्याप्त भाव दर्ज नहीं हैं.',
                  en: 'Not enough recorded prices for this month to judge.',
                })}
        </p>

        {a.perishable && a.verdict === 'hold' ? (
          <p className="mt-2.5 rounded-2xl bg-warn-l px-4 py-3 text-[14px] leading-snug text-warn-d">
            {L({
              mr: 'कांदा साठवणुकीत वजन गमावतो आणि सडतो. हा फायदा त्या घटीआधीचा आहे — चांगली कांदा चाळ असेल तरच थांबा.',
              hi: 'प्याज़ भंडारण में वज़न खोता है और सड़ता है. यह फ़ायदा उस घाटे से पहले का है — अच्छा भंडार हो तभी रुकें.',
              en: 'Onion loses weight and rots in storage. This gain is before that loss — only hold with a proper onion store.',
            })}
          </p>
        ) : null}

        <SeasonChart a={a} M={M} lang={lang} />

        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          {L({
            mr: `${sellSource.since.slice(0, 4)}पासूनचे Agmarknet भाव. थांबण्याचा खर्च ${HOLD_COST_PER_MONTH}% दरमहा हा आमचा अंदाज आहे (व्याज + साठवण), मोजलेला आकडा नाही. हा मागील भावांचा आढावा आहे, यंदाचा भाव-अंदाज नाही.`,
            hi: `${sellSource.since.slice(0, 4)} से Agmarknet के भाव. रुकने का ख़र्च ${HOLD_COST_PER_MONTH}% प्रति माह हमारा अनुमान है (ब्याज + भंडारण), मापा हुआ आँकड़ा नहीं. यह पिछले भावों का रिकॉर्ड है, इस साल का भाव-अनुमान नहीं.`,
            en: `Agmarknet prices since ${sellSource.since.slice(0, 4)}. The ${HOLD_COST_PER_MONTH}%-a-month holding cost is our assumption (interest plus storage), not a measured figure. This is the record of past years, not a forecast of this one.`,
          })}
        </p>
      </div>
    </section>
  )
}

/**
 * Twelve bars: each month's price relative to the year's trend line.
 *
 * Deliberately unlabelled. The bars have inflation removed so the harvest dip
 * shows; the holding record above keeps inflation in, because it is real money.
 * Printing both sets of percentages side by side reads as a contradiction, so
 * the chart carries the shape and the verdict carries the number.
 */
function SeasonChart({ a, M, lang }) {
  const W = 320
  const H = 132
  const base = 64 // y of the trend line
  const vals = a.index.map((v) => (v == null ? null : (v - 1) * 100))
  const span = Math.max(4, ...vals.filter((v) => v != null).map((v) => Math.abs(v)))
  const scale = 44 / span
  const bw = W / 12
  const bestM = a.verdict === 'hold' ? a.best.month : null

  return (
    <div className="mt-5">
      <div className="mb-1 flex items-center justify-between text-[11px] text-faint">
        <span>{{ mr: 'सामान्य वर्षातील भाव', hi: 'सामान्य साल के भाव', en: 'Price through a typical year' }[lang]}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-warn" />
            {{ mr: 'काढणी', hi: 'कटाई', en: 'harvest' }[lang]}
          </span>
          {bestM != null ? (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-grow" />
              {{ mr: 'सर्वोत्तम', hi: 'सबसे अच्छा', en: 'best' }[lang]}
            </span>
          ) : null}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="seasonal price pattern">
        <line x1="0" x2={W} y1={base} y2={base} stroke="#D6D1C2" strokeWidth="1" strokeDasharray="3 3" />
        {vals.map((v, m) => {
          if (v == null) return null
          const h = Math.max(1.5, Math.abs(v) * scale)
          const y = v >= 0 ? base - h : base
          const fill = m === a.month ? '#C1531B' : m === bestM ? '#2E6B3F' : '#C8C3B4'
          return <rect key={m} x={m * bw + 3} y={y} width={bw - 6} height={h} rx="2.5" fill={fill} />
        })}
        {M.map((mm, m) => (
          <text
            key={m}
            x={m * bw + bw / 2}
            y={H - 4}
            textAnchor="middle"
            fontSize="9.5"
            fill={m === a.month || m === bestM ? '#17150F' : '#8A8574'}
            fontWeight={m === a.month || m === bestM ? 600 : 400}
          >
            {mm}
          </text>
        ))}
      </svg>
      <div className="mt-0.5 flex justify-between text-[10px] text-faint">
        <span>{{ mr: 'रेषेवर: महाग', hi: 'रेखा के ऊपर: महँगा', en: 'above the line: dearer' }[lang]}</span>
        <span>{{ mr: 'रेषेखाली: स्वस्त', hi: 'रेखा के नीचे: सस्ता', en: 'below: cheaper' }[lang]}</span>
      </div>
    </div>
  )
}
