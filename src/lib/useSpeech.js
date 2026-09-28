import { useEffect, useRef, useState } from 'react'

/**
 * Speech to text through the browser's own Web Speech API — free, no key, no
 * server of ours. It only turns speech into the same text a farmer could have
 * typed; the answer is still retrieved by lib/ask.js exactly as for typing.
 *
 * Honest about where the audio goes: Chrome sends it to Google's speech
 * service to be recognised. The Ask screen says so beside the microphone, so
 * the "nothing leaves your phone" promise holds for everything else.
 */
const LOCALE = { mr: 'mr-IN', hi: 'hi-IN', en: 'en-IN' }

// looked up when used, not at import, so it is never touched outside a browser
const recognizer = () =>
  typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null

export function speechSupported() {
  return Boolean(recognizer())
}

/**
 * state: 'idle' | 'listening' | 'error'
 * error: the Web Speech error code ('not-allowed', 'no-speech', 'network', ...)
 */
export function useSpeech(lang, onText) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const rec = useRef(null)
  // the latest handler, so a result arriving after a re-render uses fresh data
  const handler = useRef(onText)
  handler.current = onText

  useEffect(() => () => rec.current?.abort(), [])

  function start() {
    const Recognition = recognizer()
    if (!Recognition || state === 'listening') return
    const r = new Recognition()
    r.lang = LOCALE[lang] || LOCALE.mr
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim()
      if (text) handler.current(text)
    }
    r.onerror = (e) => {
      setError(e.error || 'unknown')
      setState('error')
    }
    r.onend = () => setState((s) => (s === 'listening' ? 'idle' : s))
    rec.current = r
    setError(null)
    setState('listening')
    try {
      r.start()
    } catch {
      setError('unknown')
      setState('error')
    }
  }

  function stop() {
    rec.current?.stop()
  }

  return { state, error, start, stop }
}
