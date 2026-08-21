import { useEffect, useState } from 'react'

/** Local calendar day as 'YYYY-MM-DD' — not UTC, a farmer's day is a local day. */
export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Re-renders the app when the local calendar day changes.
 *
 * Three triggers, because none alone is reliable on a phone:
 *   1. a timeout aimed at the next midnight — instant rollover while awake
 *   2. a 30s interval — catches a timer the OS throttled or delayed
 *   3. visibilitychange/focus — catches the phone being asleep through midnight
 *
 * Returns the day key; everything downstream keys off it, so the forecast
 * refetches and the season/sowing status recompute on the same tick.
 */
export function useToday() {
  const [key, setKey] = useState(() => dateKey())

  useEffect(() => {
    let midnightTimer

    const check = () => {
      const now = dateKey()
      setKey((prev) => (prev === now ? prev : now))
    }

    const armMidnight = () => {
      clearTimeout(midnightTimer)
      const now = new Date()
      const next = new Date(now)
      next.setHours(24, 0, 0, 0) // start of tomorrow, local
      // +1s of slack so we land safely on the far side of the boundary
      midnightTimer = setTimeout(() => {
        check()
        armMidnight()
      }, next - now + 1000)
    }

    armMidnight()
    const interval = setInterval(check, 30000)
    const onWake = () => {
      check()
      armMidnight()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)

    return () => {
      clearTimeout(midnightTimer)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])

  return key
}
