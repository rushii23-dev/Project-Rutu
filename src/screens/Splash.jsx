import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'

/**
 * Opening screen. The wordmark settles in, a short line about the name follows,
 * then the whole thing lifts away and hands over to the first question.
 *
 * Deliberately bare: no district, no language picker, no controls. Language is
 * chosen later from Profile, so this screen has exactly one job and no decisions
 * on it. Tapping anywhere skips — nobody should wait out an animation on stage,
 * and neither should a farmer opening the app for the tenth time.
 *
 * A returning farmer goes to the dashboard rather than back through onboarding.
 */
const HOLD_MS = 3200
const LEAVE_MS = 550

export default function Splash() {
  const { t, onboarded } = useStore()
  const nav = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const timers = useRef([])
  const done = useRef(false)

  // Read through a ref so the timer effect can run exactly once. useNavigate
  // returns a fresh function identity on re-render, so depending on it made the
  // effect re-run when `leaving` flipped — and its cleanup cancelled the pending
  // navigation before it ever fired.
  const goRef = useRef(null)
  goRef.current = () => nav(onboarded ? '/home' : '/onboarding', { replace: true })

  function leave() {
    if (done.current) return
    done.current = true
    timers.current.forEach(clearTimeout)
    timers.current = []
    setLeaving(true)
    timers.current.push(setTimeout(() => goRef.current(), LEAVE_MS))
  }

  useEffect(() => {
    timers.current.push(setTimeout(leave, HOLD_MS))
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
    // run once: the screen has a fixed lifetime
  }, [])

  return (
    <div
      onClick={leave}
      className={`flex min-h-[760px] flex-col justify-center px-7 pb-16 ${leaving ? 'sp-out' : ''}`}
    >
      <div className="sp-mark display text-[104px] leading-none text-ink">{t('brand')}</div>

      <div className="sp-rule my-7 h-1 w-16 rounded-sm bg-grow" />

      <p className="sp-quote display whitespace-pre-line text-[27px] leading-snug text-ink-2">
        {t('splashQuote')}
      </p>
    </div>
  )
}
