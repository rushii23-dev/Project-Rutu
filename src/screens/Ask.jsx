import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { useForecast } from '../lib/useForecast.js'
import { useToday } from '../lib/useToday.js'
import { ask, EXAMPLES } from '../lib/ask.js'
import { Card, RoundIconButton } from '../components/ui.jsx'

/**
 * Typed question answering in Marathi, Hindi or English.
 *
 * Answers are RETRIEVED, NEVER GENERATED — every reply is composed from data
 * the app already holds and can defend (the IMD onset series, the live
 * forecast, real Agmarknet prices, the rotation rules) and shows its source.
 * A model that hallucinated a sowing date would cause the exact germination
 * failure this project exists to prevent, and a farmer cannot audit a fluent
 * wrong answer.
 *
 * Speech input was removed on request. The retrieval engine in lib/ask.js is
 * input-agnostic, so a microphone can be reattached without touching it.
 */
export default function Ask() {
  const { t, lang, district, districtName, acres, fieldCrop } = useStore()
  const forecast = useForecast(district)
  const todayKey = useToday()
  const nav = useNavigate()

  const [heard, setHeard] = useState('')
  const [answer, setAnswer] = useState(null)
  const formRef = useRef(null)

  function respond(text) {
    setHeard(text)
    setAnswer(
      ask(text, {
        lang, district, districtName, acres, fieldCrop, todayKey,
        week: forecast.week, isSample: forecast.isSample,
      })
    )
  }

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav('/home')} label="back">
        ←
      </RoundIconButton>

      <h1 className="display mt-6 text-[34px] leading-tight text-ink">{t('askTitle')}</h1>
      <p className="mt-1 text-base text-muted">{t('askSub')}</p>

      <form
        ref={formRef}
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const v = new FormData(e.currentTarget).get('q')?.toString().trim()
          if (!v) return
          respond(v)
          e.currentTarget.reset()
        }}
      >
        <input
          name="q"
          autoComplete="off"
          enterKeyHint="search"
          placeholder={t('askType')}
          className="h-[54px] flex-1 rounded-[27px] bg-card px-5 text-[16px] text-ink outline-none placeholder:text-hint"
        />
        <button className="h-[54px] flex-none rounded-[27px] bg-grow px-6 text-[15px] font-semibold text-white">
          {t('askGo')}
        </button>
      </form>

      {/* example prompts, so a first-time user knows what can be asked */}
      <div className="sc mt-3 flex gap-2 overflow-x-auto">
        {EXAMPLES[lang].map((ex) => (
          <button
            key={ex}
            onClick={() => respond(ex)}
            className="flex-none rounded-[20px] bg-card px-4 py-2.5 text-[14px] text-ink-2"
          >
            {ex}
          </button>
        ))}
      </div>

      {heard ? (
        <Card className="mt-5 px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            {t('askHeard')}
          </div>
          <div className="mt-1 text-[19px] leading-snug text-ink">{heard}</div>
        </Card>
      ) : null}

      {answer ? (
        <div className="mt-3 rounded-[28px] bg-ink px-6 py-5">
          <div className="display text-[26px] leading-snug text-white">{answer.text}</div>
          {answer.detail ? (
            <p className="mt-2 text-[16px] leading-relaxed text-hint">{answer.detail}</p>
          ) : null}
          {answer.source ? (
            <div className="num mt-3 text-[11px] text-ghost">{answer.source}</div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 text-[11px] leading-relaxed text-faint">{t('askNote')}</p>
    </div>
  )
}
