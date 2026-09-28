import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { useForecast } from '../lib/useForecast.js'
import { useToday } from '../lib/useToday.js'
import { speechSupported, useSpeech } from '../lib/useSpeech.js'
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
 * Questions can be typed or spoken. Speech is only turned into the same text a
 * farmer could have typed (lib/useSpeech.js); lib/ask.js answers both alike.
 */
export default function Ask() {
  const { t, lang, district, districtName, acres, fieldCrop } = useStore()
  const forecast = useForecast(district)
  const todayKey = useToday()
  const nav = useNavigate()

  const [heard, setHeard] = useState('')
  const [answer, setAnswer] = useState(null)
  const formRef = useRef(null)
  // no microphone button at all where the browser cannot recognise speech
  const [canSpeak] = useState(speechSupported)

  function respond(text) {
    setHeard(text)
    setAnswer(
      ask(text, {
        lang, district, districtName, acres, fieldCrop, todayKey,
        week: forecast.week, isSample: forecast.isSample,
      })
    )
  }

  const voice = useSpeech(lang, respond)
  const L = (o) => o[lang]

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
          className="h-[54px] min-w-0 flex-1 rounded-[27px] bg-card px-5 text-[16px] text-ink outline-none placeholder:text-hint"
        />
        {canSpeak ? (
          <button
            type="button"
            onClick={() => (voice.state === 'listening' ? voice.stop() : voice.start())}
            aria-label={L({ mr: 'बोलून विचारा', hi: 'बोलकर पूछें', en: 'Ask by voice' })}
            aria-pressed={voice.state === 'listening'}
            className={`flex h-[54px] w-[54px] flex-none items-center justify-center rounded-full ${
              voice.state === 'listening' ? 'animate-pulse bg-warn text-white' : 'bg-card text-grow'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        ) : null}
        <button className="h-[54px] flex-none rounded-[27px] bg-grow px-6 text-[15px] font-semibold text-white">
          {t('askGo')}
        </button>
      </form>

      {voice.state === 'listening' ? (
        <p className="mt-2 px-2 text-[15px] font-semibold text-warn-m">
          {L({ mr: 'ऐकत आहे… बोला', hi: 'सुन रहे हैं… बोलिए', en: 'Listening… speak now' })}
        </p>
      ) : voice.state === 'error' ? (
        <p className="mt-2 px-2 text-[14px] text-warn-m">
          {voice.error === 'not-allowed' || voice.error === 'service-not-allowed'
            ? L({
                mr: 'मायक्रोफोनची परवानगी नाही. ब्राउझरमध्ये परवानगी द्या, किंवा प्रश्न लिहा.',
                hi: 'माइक्रोफ़ोन की अनुमति नहीं है. ब्राउज़र में अनुमति दें, या सवाल लिखें.',
                en: 'No microphone permission. Allow it in the browser, or type the question.',
              })
            : voice.error === 'no-speech'
              ? L({ mr: 'काही ऐकू आलं नाही. पुन्हा बोला.', hi: 'कुछ सुनाई नहीं दिया. फिर से बोलें.', en: 'Heard nothing. Try again.' })
              : voice.error === 'network'
                ? L({
                    mr: 'आवाज ओळखण्यासाठी इंटरनेट लागतं. प्रश्न लिहून विचारा.',
                    hi: 'आवाज़ पहचानने के लिए इंटरनेट चाहिए. सवाल लिखकर पूछें.',
                    en: 'Voice needs an internet connection. Type the question instead.',
                  })
                : L({
                    mr: 'आवाज ओळखता आला नाही. प्रश्न लिहून विचारा.',
                    hi: 'आवाज़ पहचानी नहीं गई. सवाल लिखकर पूछें.',
                    en: 'Could not recognise that. Type the question instead.',
                  })}
        </p>
      ) : null}

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
      {canSpeak ? (
        // the app's privacy line is "nothing leaves your phone"; speech is the
        // one exception, so it is stated where the choice is made
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          {L({
            mr: 'बोलून विचारल्यास तुमचा ब्राउझर आवाज ओळखण्यासाठी तो Google कडे पाठवतो. लिहून विचारल्यास काहीच बाहेर जात नाही.',
            hi: 'बोलकर पूछने पर आपका ब्राउज़र आवाज़ पहचानने के लिए उसे Google को भेजता है. लिखकर पूछने पर कुछ भी बाहर नहीं जाता.',
            en: 'When you speak, your browser sends the audio to Google to recognise it. Typed questions never leave the phone.',
          })}
        </p>
      ) : null}
    </div>
  )
}
