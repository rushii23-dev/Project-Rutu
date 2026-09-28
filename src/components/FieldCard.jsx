import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { MONTHS, rupees } from '../i18n/index.js'
import { useToday } from '../lib/useToday.js'
import { useForecast } from '../lib/useForecast.js'
import { fieldRisks, forecastDayLabel } from '../lib/field.js'
import { sellAdvice } from '../lib/sell.js'
import { priceFor } from '../lib/prices.js'
import { SampleBadge } from './ui.jsx'

/**
 * "What is in your field, and what does this week mean for it?"
 *
 * The home screen's lead once sowing is over. Before this the app only spoke
 * about sowing, so from July to May it had nothing to say to a farmer whose crop
 * was already in the ground.
 */

const STAGE = {
  establish: { mr: 'पेरणी', hi: 'बुवाई', en: 'Sown' },
  vegetative: { mr: 'वाढ', hi: 'बढ़वार', en: 'Growing' },
  flowering: { mr: 'फुलोरा', hi: 'फूल', en: 'Flowering' },
  filling: {
    soy: { mr: 'शेंगा भरणे', hi: 'फली भराव', en: 'Pod filling' },
    gram: { mr: 'घाटे भरणे', hi: 'फली भराव', en: 'Pod filling' },
    ground: { mr: 'शेंगा भरणे', hi: 'फली भराव', en: 'Pod filling' },
    moong: { mr: 'शेंगा भरणे', hi: 'फली भराव', en: 'Pod filling' },
    cotton: { mr: 'बोंड भरणे', hi: 'टिंडे बनना', en: 'Boll forming' },
    onion: { mr: 'कांदा पोसणे', hi: 'कंद बनना', en: 'Bulbing' },
    default: { mr: 'दाणे भरणे', hi: 'दाना भराव', en: 'Grain filling' },
  },
  maturity: { mr: 'कापणी', hi: 'कटाई', en: 'Harvest' },
}
const ORDER = ['establish', 'vegetative', 'flowering', 'filling', 'maturity']

function stageName(stage, cropId, lang) {
  const s = STAGE[stage]
  if (stage === 'filling') return (s[cropId] || s.default)[lang]
  return s[lang]
}

const TONE = {
  danger: 'bg-warn text-white',
  warn: 'bg-warn-l text-warn-d',
  good: 'bg-grow-l text-grow-d',
}

export default function FieldCard({ inField, active, onPick }) {
  const { lang, acres, district, districtId, t } = useStore()
  const nav = useNavigate()
  const todayKey = useToday()
  const { crop, st } = active
  const L = (o) => o[lang]

  return (
    <section className="mt-4 overflow-hidden rounded-[28px] bg-card">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-baseline justify-between">
          <div className="text-[13px] font-semibold uppercase tracking-[1.6px] text-faint">
            {L({ mr: 'तुमच्या शेतात', hi: 'आपके खेत में', en: 'In your field' })}
          </div>
          <div className="text-[11px] font-medium text-faint">
            {L({ mr: 'अंदाजित टप्पा', hi: 'अनुमानित अवस्था', en: 'estimated stage' })}
          </div>
        </div>

        {/* one tap to say which crop is actually his */}
        {inField.length > 1 ? (
          <div className="sc -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {inField.map(({ crop: c }) => (
              <button
                key={c.id}
                onClick={() => onPick(c.id)}
                className={`flex-none rounded-2xl px-3.5 py-1.5 text-[15px] font-semibold ${
                  c.id === crop.id ? 'bg-ink text-white' : 'bg-chip text-ink-2'
                }`}
              >
                {c.name[lang]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <div className="display text-[30px] leading-tight text-ink">{crop.name[lang]}</div>
          <div className="num text-right text-[14px] font-medium text-muted">
            {st.phase === 'sold'
              ? L({ mr: 'कापणी झाली', hi: 'कटाई हो चुकी', en: 'Harvested' })
              : st.day >= st.duration
                ? // past its expected length the count reads like an error
                  // ("Day 109 of ~100"); what the farmer needs is the fact
                  L({ mr: 'कापणीला तयार', hi: 'कटाई के लिए तैयार', en: 'Ready to harvest' })
                : L({
                    mr: `दिवस ${Math.max(0, st.day)} / ~${st.duration}`,
                    hi: `दिन ${Math.max(0, st.day)} / ~${st.duration}`,
                    en: `Day ${Math.max(0, st.day)} of ~${st.duration}`,
                  })}
          </div>
        </div>

        {st.phase !== 'sold' ? <StageBar crop={crop} st={st} lang={lang} /> : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <span className="num">
            {acres} {t('acre')} · ~{rupees(crop.SAMPLE_goodPerAcre * acres)}{' '}
            {L({ mr: 'चं पीक', hi: 'की फ़सल', en: 'of crop' })}
          </span>
          <SampleBadge>{t('sampleFlag')}</SampleBadge>
        </div>
      </div>

      {st.phase === 'sold' ? (
        <SellStrip crop={crop} district={district} districtId={districtId} lang={lang} nav={nav} />
      ) : (
        <Risks crop={crop} st={st} lang={lang} todayKey={todayKey} />
      )}

      {st.phase === 'harvest' ? (
        <SellStrip crop={crop} district={district} districtId={districtId} lang={lang} nav={nav} />
      ) : null}
    </section>
  )
}

function StageBar({ crop, st, lang }) {
  const idx = ORDER.indexOf(st.stage)
  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {ORDER.map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${i < idx ? 'bg-grow' : i === idx ? 'bg-grow' : 'bg-track'}`}
            style={i === idx ? { opacity: 0.55 } : undefined}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[12px]">
        {ORDER.map((s, i) => (
          <span
            key={s}
            className={`flex-1 truncate ${i === 0 ? 'text-left' : i === ORDER.length - 1 ? 'text-right' : 'text-center'} ${
              i === idx ? 'font-semibold text-ink' : 'text-faint'
            }`}
          >
            {i === idx || i === 0 || i === ORDER.length - 1 ? stageName(s, crop.id, lang) : '·'}
          </span>
        ))}
      </div>
    </div>
  )
}

function Risks({ crop, st, lang, todayKey }) {
  const { district } = useStore()
  const { week, isSample, loading } = useForecast(district)
  if (isSample) {
    return (
      <div className="border-t border-hair px-5 py-4 text-[15px] text-muted">
        {loading
          ? { mr: 'हवामान अंदाज येत आहे…', hi: 'मौसम अनुमान आ रहा है…', en: 'Fetching the forecast…' }[lang]
          : {
              mr: 'हवामान अंदाज मिळाला नाही — शेतासाठीच्या सूचना अंदाजाशिवाय देत नाही.',
              hi: 'मौसम अनुमान नहीं मिला — खेत की चेतावनी बिना अनुमान के नहीं देते.',
              en: 'No forecast — we give no field warnings without one.',
            }[lang]}
      </div>
    )
  }
  const dayLabel = forecastDayLabel(week, todayKey, lang)
  const risks = fieldRisks({ crop, st, week, lang, dayLabel }).slice(0, 3)
  return (
    <div className="flex flex-col gap-px border-t border-hair bg-hair">
      {risks.map((r) => (
        <div key={r.key} className={`px-5 py-4 ${TONE[r.tone]}`}>
          <div className="flex items-start gap-3">
            <span
              className={`num mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                r.tone === 'danger' ? 'bg-white text-warn' : r.tone === 'warn' ? 'bg-warn text-white' : 'bg-grow text-white'
              }`}
            >
              {r.tone === 'good' ? '✓' : '!'}
            </span>
            <div>
              <div className="text-[17px] font-semibold leading-snug">{r.title}</div>
              <div className={`mt-1 text-[15px] leading-snug ${r.tone === 'danger' ? 'text-white/90' : ''}`}>{r.body}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SellStrip({ crop, district, districtId, lang, nav }) {
  const price = priceFor(crop.id, districtId)
  const a = sellAdvice(crop, district, price)
  if (!a) return null
  const M = MONTHS[lang]
  return (
    <button
      onClick={() => nav('/crops/' + crop.id + '#sell')}
      className="flex w-full items-center justify-between gap-3 border-t border-hair px-5 py-4 text-left"
    >
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wide text-faint">
          {{ mr: 'कधी विकायचं?', hi: 'कब बेचें?', en: 'When to sell' }[lang]}
        </div>
        <div className="mt-0.5 text-[17px] font-semibold text-ink">
          {a.verdict === 'hold'
            ? {
                mr: `${M[a.best.month]}पर्यंत थांबा${a.perQtl ? ` · ~₹${a.perQtl.toLocaleString('en-IN')}/क्विंटल जास्त` : ''}`,
                hi: `${M[a.best.month]} तक रुकें${a.perQtl ? ` · ~₹${a.perQtl.toLocaleString('en-IN')}/क्विंटल ज़्यादा` : ''}`,
                en: `Hold till ${M[a.best.month]}${a.perQtl ? ` · ~₹${a.perQtl.toLocaleString('en-IN')}/qtl more` : ''}`,
              }[lang]
            : { mr: 'काढणीनंतर विका', hi: 'कटाई के बाद बेचें', en: 'Sell at harvest' }[lang]}
        </div>
        {a.best ? (
          <div className="mt-0.5 text-[13px] text-muted">
            {a.verdict === 'hold'
              ? {
                  mr: `${a.best.n} पैकी ${a.best.wins} वर्षांत फायदा झाला`,
                  hi: `${a.best.n} में से ${a.best.wins} साल फ़ायदा हुआ`,
                  en: `Paid in ${a.best.wins} of ${a.best.n} years`,
                }[lang]
              : a.why === 'small'
                ? {
                    mr: 'थांबल्याचा फायदा साठवणुकीच्या खर्चाइतकाही नाही',
                    hi: 'रुकने का फ़ायदा भंडारण ख़र्च जितना भी नहीं',
                    en: "Waiting gains less than holding costs",
                  }[lang]
                : {
                    mr: 'थांबल्याचा फायदा नियमित नाही',
                    hi: 'रुकने का फ़ायदा भरोसेमंद नहीं',
                    en: "Waiting hasn't paid reliably here",
                  }[lang]}
          </div>
        ) : null}
      </div>
      <span className="text-[17px] text-grow">→</span>
    </button>
  )
}

// lives in lib/field.js now, beside the advice that also needs it
export { pickFieldCrop } from '../lib/field.js'
