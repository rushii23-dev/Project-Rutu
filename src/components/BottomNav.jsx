import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'

const ICONS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </>
  ),
  crops: (
    <>
      <path d="M12 21V9" />
      <path d="M12 12c-4 0-6-2-6-6 4 0 6 2 6 6z" />
      <path d="M12 12c4 0 6-2 6-6-4 0-6 2-6 6z" />
    </>
  ),
  weather: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 21c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
    </>
  ),
}

const TABS = [
  { key: 'home', path: '/home', label: 'nav_home' },
  { key: 'crops', path: '/crops', label: 'nav_crops' },
  { key: 'weather', path: '/weather', label: 'nav_weather' },
  { key: 'profile', path: '/profile', label: 'nav_profile' },
]

export default function BottomNav() {
  const { t } = useStore()
  const nav = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="absolute bottom-[22px] left-5 right-5 flex h-[70px] items-center justify-around rounded-[35px] bg-ink px-2.5 shadow-[0_14px_34px_rgba(23,21,15,.32)]">
      {TABS.map((tab) => {
        const active = pathname === tab.path
        return (
          <button
            key={tab.key}
            onClick={() => nav(tab.path)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-3xl px-4 py-3 transition ${
              active ? 'bg-[#F4F1E6] text-ink' : 'text-ghost'
            }`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {ICONS[tab.key]}
            </svg>
            {active ? <span className="text-[15px] font-semibold">{t(tab.label)}</span> : null}
          </button>
        )
      })}
    </nav>
  )
}
