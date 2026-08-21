import { MOODS } from '../lib/season.js'

/**
 * The seasonal backdrop. Sits behind everything at low opacity so the white
 * cards and near-black ink keep their contrast — the point is atmosphere, not
 * decoration, and it has to stay readable in direct sunlight.
 *
 * All motion is disabled under prefers-reduced-motion, and the whole thing is
 * two gradients plus one SVG pattern so it costs nothing on a budget phone.
 */
export default function Atmosphere({ mood }) {
  const m = MOODS[mood] || MOODS.clear

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* base wash */}
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{ background: `linear-gradient(170deg, ${m.from} 0%, ${m.to} 62%)` }}
      />

      {m.overlay === 'sun' && (
        <>
          {/* a low sun in the top corner, not a cartoon */}
          <div
            className="absolute -right-16 -top-20 h-64 w-64 rounded-full blur-2xl"
            style={{ background: m.accent, opacity: 0.28 }}
          />
          <div
            className="absolute -right-6 -top-8 h-28 w-28 rounded-full blur-xl"
            style={{ background: '#F6C868', opacity: 0.5 }}
          />
        </>
      )}

      {m.overlay === 'haze' && (
        <div
          className="absolute inset-x-0 top-0 h-72"
          style={{
            background: `radial-gradient(120% 70% at 70% 0%, ${m.accent}22 0%, transparent 70%)`,
          }}
        />
      )}

      {m.overlay === 'rain' && <Rain accent={m.accent} />}
    </div>
  )
}

function Rain({ accent }) {
  return (
    <>
      {/* cloud mass across the top */}
      <div
        className="absolute inset-x-0 top-0 h-56"
        style={{
          background: `radial-gradient(130% 80% at 40% -10%, ${accent}33 0%, transparent 72%)`,
        }}
      />
      <svg
        className="ritu-rain absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 375 812"
      >
        <defs>
          <pattern id="ritu-drops" width="26" height="70" patternUnits="userSpaceOnUse">
            <line
              x1="20"
              y1="0"
              x2="12"
              y2="26"
              stroke={accent}
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.30"
            />
            <line
              x1="4"
              y1="34"
              x2="-4"
              y2="58"
              stroke={accent}
              strokeWidth="1.1"
              strokeLinecap="round"
              opacity="0.20"
            />
          </pattern>
        </defs>
        <rect x="0" y="-70" width="375" height="952" fill="url(#ritu-drops)" />
      </svg>
    </>
  )
}
