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
 * Recognition is not available in every browser (notably Firefox and some
 * Android WebViews). When it is missing we say so and fall back to typing,
 * rather than showing a mic button that silently does nothing.
 */
export default function Ask() {
  const store = useStore()
  const { t, lang, district, districtName, acres } = store
  const { week } = useForecast(district)
  const nav = useNavigate()

  const [supported, setSupported] = useState(true)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [answer, setAnswer] = useState(null)
  const [error, setError] = useState(null)
  const recRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }
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
      if (e.results[e.results.length - 1].isFinal) respond(txt)
    }
    rec.onerror = (e) => {
      setListening(false)
      setError(
        e.error === 'not-allowed'
          ? { mr: 'माइकची परवानगी द्या.', hi: 'माइक की अनुमति दें.', en: 'Allow microphone access.' }[lang]
          : { mr: 'ऐकू आलं नाही. पुन्हा बोला.', hi: 'सुनाई नहीं दिया. फिर बोलें.', en: 'Did not catch that. Try again.' }[lang]
      )
    }
    rec.onend = () => setListening(false)

    recRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        /* already stopped */
      }
    }
  }, [lang])

  function respond(text) {
    const a = ask(text, { lang, district, districtName, acres, week })
    setAnswer(a)
    speak(a)
  }

  function speak(a) {
    if (!a || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance([a.text, a.detail].filter(Boolean).join(' '))
      u.lang = SPEECH_LOCALE[lang]
      u.rate = 0.95 // a little slower — this is being read aloud in a field
      window.speechSynthesis.speak(u)
    } catch {
      /* synthesis unavailable — the answer is still on screen */
    }
  }

  function toggle() {
    setError(null)
    if (listening) {
      recRef.current?.stop()
      return
    }
    setHeard('')
    setAnswer(null)
    try {
      recRef.current.lang = SPEECH_LOCALE[lang]
      recRef.current.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav('/home')} label="back">
        ←
      </RoundIconButton>

      <h1 className="display mt-6 text-[34px] leading-tight text-ink">{t('askTitle')}</h1>
      <p className="mt-1 text-base text-muted">{t('askSub')}</p>

      {/* what we heard */}
      {heard ? (
        <Card className="mt-5 px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            {t('askHeard')}
          </div>
          <div className="mt-1 text-[19px] leading-snug text-ink">{heard}</div>
        </Card>
      ) : null}

      {/* the answer */}
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
            <button
              onClick={() => speak(answer)}
              className="text-[13px] font-semibold text-grow-l"
            >
              {t('askRepeat')}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-[15px] font-medium text-warn-m">{error}</p> : null}

      {/* mic */}
      <div className="mt-7 flex flex-col items-center">
        {supported ? (
          <>
            <button
              onClick={toggle}
              aria-label={t('askTap')}
              className={`flex h-[104px] w-[104px] items-center justify-center rounded-full transition ${
                listening ? 'bg-warn ritu-pulse' : 'bg-grow'
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
          <p className="text-center text-[15px] leading-relaxed text-warn-m">{t('askNoMic')}</p>
        )}
      </div>

      {/* typed fallback — always available, not just when the mic is missing */}
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const v = new FormData(e.currentTarget).get('q')?.toString().trim()
          if (v) {
            setHeard(v)
            respond(v)
          }
        }}
      >
        <input
          name="q"
          placeholder={t('askType')}
          className="h-[54px] flex-1 rounded-[27px] bg-card px-5 text-[16px] text-ink outline-none placeholder:text-hint"
        />
        <button className="h-[54px] rounded-[27px] bg-ink px-5 text-[15px] font-semibold text-white">
          {t('askGo')}
        </button>
      </form>

      {/* example prompts so a first-time user knows what to say */}
      <div className="sc mt-4 flex gap-2 overflow-x-auto">
        {EXAMPLES[lang].map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setHeard(ex)
              respond(ex)
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
