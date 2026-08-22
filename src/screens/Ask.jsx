import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { useForecast } from '../lib/useForecast.js'
import { ask, EXAMPLES, SPEECH_LOCALE } from '../lib/ask.js'
import { Card, RoundIconButton } from '../components/ui.jsx'

/**
 * Voice-first question answering.
 *
 * Speech recognition and synthesis both come from the browser's built-in Web
 * Speech API — free, no key, no account, and no audio leaves the device.
 *
 * Two things make this fail in the field, and both are reported explicitly
 * rather than leaving a mic button that does nothing:
 *
 *   1. INSECURE ORIGIN. The API needs a secure context. localhost counts, but
 *      a phone opening http://192.168.x.x over the LAN does NOT, and Chrome
 *      refuses with "not-allowed" — indistinguishable from a denied permission
 *      unless you check. Use HTTPS or the deployed URL to test on a phone.
 *   2. NO RECOGNITION ENGINE. Firefox has none; some Android WebViews have none.
 */
export default function Ask() {
  const { t, lang, district, districtName, acres } = useStore()
  const forecast = useForecast(district)
  const nav = useNavigate()

  const [support, setSupport] = useState({ ok: true, reason: null })
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [answer, setAnswer] = useState(null)
  const [error, setError] = useState(null)
  const recRef = useRef(null)

  // The recognition object is created once per language, but its callbacks must
  // read the CURRENT forecast. Without this ref they captured the first render's
  // sample week and answered rain questions from stale data.
  const liveRef = useRef({ lang, district, districtName, acres, week: forecast.week })
  liveRef.current = { lang, district, districtName, acres, week: forecast.week }

  function respond(text) {
    const a = ask(text, liveRef.current)
    setAnswer(a)
    speak(a)
  }
  const respondRef = useRef(respond)
  respondRef.current = respond

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!window.isSecureContext) {
      setSupport({ ok: false, reason: 'insecure' })
      return
    }
    if (!SR) {
      setSupport({ ok: false, reason: 'unsupported' })
      return
    }
    setSupport({ ok: true, reason: null })

    const rec = new SR()
    rec.lang = SPEECH_LOCALE[lang]
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = false

    rec.onresult = (e) => {
      const txt = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
      setHeard(txt)
      if (e.results[e.results.length - 1].isFinal) respondRef.current(txt)
    }
    rec.onerror = (e) => {
      setListening(false)
      setError(errorText(e.error, lang))
    }
    rec.onend = () => setListening(false)

    recRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        /* already stopped */
      }
      recRef.current = null
    }
  }, [lang])

  function speak(a) {
    if (!a || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance([a.text, a.detail].filter(Boolean).join(' '))
      u.lang = SPEECH_LOCALE[lang]
      u.rate = 0.95 // slower — this is read aloud in a field
      window.speechSynthesis.speak(u)
    } catch {
      /* synthesis unavailable — the answer is still on screen */
    }
  }

  function toggle() {
    setError(null)
    const rec = recRef.current
    if (!rec) return
    if (listening) {
      try {
        rec.stop()
      } catch {
        setListening(false)
      }
      return
    }
    setHeard('')
    setAnswer(null)
    try {
      rec.lang = SPEECH_LOCALE[lang]
      rec.start()
      setListening(true)
    } catch (e) {
      // start() throws InvalidStateError if a previous session is still closing
      setListening(false)
      setError(errorText('busy', lang))
    }
  }

  function submitTyped(e) {
    e.preventDefault()
    const v = new FormData(e.currentTarget).get('q')?.toString().trim()
    if (!v) return
    setHeard(v)
    respondRef.current(v)
    e.currentTarget.reset()
  }

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav('/home')} label="back">
        ←
      </RoundIconButton>

      <h1 className="display mt-6 text-[34px] leading-tight text-ink">{t('askTitle')}</h1>
      <p className="mt-1 text-base text-muted">{t('askSub')}</p>

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
          <div className="mt-3 flex items-center justify-between">
            {answer.source ? (
              <span className="num text-[11px] text-ghost">{answer.source}</span>
            ) : (
              <span />
            )}
            <button onClick={() => speak(answer)} className="text-[13px] font-semibold text-grow-l">
              {t('askRepeat')}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-2xl bg-warn-l px-4 py-3 text-[15px] font-medium leading-relaxed text-warn-d">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col items-center">
        {support.ok ? (
          <>
            <button
              onClick={toggle}
              aria-label={t('askTap')}
              className={`flex h-[104px] w-[104px] items-center justify-center rounded-full transition ${
                listening ? 'ritu-pulse bg-warn' : 'bg-grow'
              }`}
            >
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
              </svg>
            </button>
            <div className="mt-3 text-[15px] font-medium text-muted">
              {listening ? t('askListening') : t('askTap')}
            </div>
          </>
        ) : (
          <p className="rounded-2xl bg-warn-l px-4 py-3 text-center text-[14px] leading-relaxed text-warn-d">
            {support.reason === 'insecure' ? t('askInsecure') : t('askNoMic')}
          </p>
        )}
      </div>

      {/* typing always works, whatever the browser does with the microphone */}
      <form className="mt-6 flex gap-2" onSubmit={submitTyped}>
        <input
          name="q"
          placeholder={t('askType')}
          className="h-[54px] flex-1 rounded-[27px] bg-card px-5 text-[16px] text-ink outline-none placeholder:text-hint"
        />
        <button className="h-[54px] rounded-[27px] bg-ink px-5 text-[15px] font-semibold text-white">
          {t('askGo')}
        </button>
      </form>

      <div className="sc mt-4 flex gap-2 overflow-x-auto">
        {EXAMPLES[lang].map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setHeard(ex)
              respondRef.current(ex)
            }}
            className="flex-none rounded-[20px] bg-card px-4 py-2.5 text-[14px] text-ink-2"
          >
            {ex}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-faint">{t('askNote')}</p>
    </div>
  )
}

/** Speech errors are cryptic; say what the farmer should actually do. */
function errorText(code, lang) {
  const M = {
    'not-allowed': {
      mr: 'माइक बंद आहे. ब्राउझरमध्ये माइकची परवानगी द्या. (फोनवर http:// वापरत असाल तर आवाज चालणार नाही — https:// लागतं.)',
      hi: 'माइक बंद है. ब्राउज़र में माइक की अनुमति दें. (फ़ोन पर http:// है तो आवाज़ नहीं चलेगी — https:// चाहिए.)',
      en: 'Microphone blocked. Allow mic access in the browser. (On a phone over http:// speech will not work — it needs https://.)',
    },
    'service-not-allowed': {
      mr: 'या ब्राउझरमध्ये आवाज सेवा बंद आहे.',
      hi: 'इस ब्राउज़र में आवाज़ सेवा बंद है.',
      en: 'The speech service is disabled in this browser.',
    },
    'no-speech': {
      mr: 'काही ऐकू आलं नाही. जरा जवळून बोला.',
      hi: 'कुछ सुनाई नहीं दिया. थोड़ा पास से बोलें.',
      en: 'Nothing was heard. Speak a little closer.',
    },
    network: {
      mr: 'आवाज ओळखण्यासाठी इंटरनेट लागतं. खाली लिहून विचारा.',
      hi: 'आवाज़ पहचानने के लिए इंटरनेट चाहिए. नीचे लिखकर पूछें.',
      en: 'Speech recognition needs internet. Type your question instead.',
    },
    busy: {
      mr: 'जरा थांबा आणि पुन्हा दाबा.',
      hi: 'थोड़ा रुकें और फिर दबाएँ.',
      en: 'Wait a moment and tap again.',
    },
  }
  const fallback = {
    mr: 'ऐकू आलं नाही. पुन्हा बोला किंवा खाली लिहा.',
    hi: 'सुनाई नहीं दिया. फिर बोलें या नीचे लिखें.',
    en: 'Did not catch that. Try again or type below.',
  }
  return (M[code] || fallback)[lang]
}
