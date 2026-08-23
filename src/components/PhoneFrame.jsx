import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'
import Atmosphere from './Atmosphere.jsx'
import { useStore } from '../lib/store.jsx'
import { useForecast } from '../lib/useForecast.js'
import { moodFor, seasonForDate } from '../lib/season.js'

const NAV_ROUTES = ['/home', '/crops', '/weather', '/profile']

/**
 * On a laptop (the demo case) the app sits inside a phone bezel on the canvas.
 * On an actual phone the bezel is dropped and the app fills the screen.
 */
function useIsWide() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 500
  )
  useEffect(() => {
    // ResizeObserver on the root element rather than matchMedia or a resize
    // listener: under devtools/CDP viewport emulation neither of those fires, so
    // the bezel stayed rendered on a 375px screen. This observes the box itself.
    const on = () => setWide(document.documentElement.clientWidth >= 500)
    on()
    const ro = new ResizeObserver(on)
    ro.observe(document.documentElement)
    window.addEventListener('resize', on)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', on)
    }
  }, [])
  return wide
}

/**
 * The phone chrome. The clock is the real local time, not the 9:41 every
 * mockup ships with — a frozen marketing clock above a live forecast is the
 * one detail that makes a working app look like a slide.
 *
 * The signal and battery glyphs stay decorative: the browser exposes no
 * reliable reading for either, so they are drawn as static chrome rather than
 * invented values.
 */
function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])
  const hh = now.getHours()
  const mm = String(now.getMinutes()).padStart(2, '0')
  return (
    <div className="num relative z-10 flex h-[52px] items-end justify-between px-7 pb-1.5 text-[13px] font-semibold text-ink">
      <span>{`${((hh + 11) % 12) + 1}:${mm}`}</span>
      <span className="flex items-center gap-1.5 text-[11px] tracking-wide">2G ▮▮▯</span>
    </div>
  )
}

export default function PhoneFrame({ children }) {
  const wide = useIsWide()
  const { pathname, key } = useLocation()
  const showNav = NAV_ROUTES.includes(pathname)

  const { district } = useStore()
  const { current, week } = useForecast(district)
  const season = seasonForDate()
  const mood = moodFor({ season, current, week })

  const screen = (
    <>
      <Atmosphere mood={mood} />
      <StatusBar />
      <div
        key={key}
        className="sc fade relative overflow-y-auto overflow-x-hidden"
        style={{ height: wide ? 760 : 'calc(100dvh - 52px)' }}
      >
        {children}
      </div>
      {showNav ? <BottomNav /> : null}
    </>
  )

  if (!wide) {
    return <div className="relative h-dvh w-full overflow-hidden bg-screen">{screen}</div>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-9">
      <div
        className="relative overflow-hidden bg-screen"
        style={{
          width: 375,
          height: 812,
          borderRadius: 44,
          boxShadow:
            '0 30px 70px rgba(30,26,16,.28), 0 0 0 10px #17150F, 0 0 0 11px #35312a',
        }}
      >
        {screen}
      </div>
    </div>
  )
}
