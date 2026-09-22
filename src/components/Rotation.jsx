import { useStore } from '../lib/store.jsx'
import { getSeasons } from '../i18n/index.js'
import {
  buildRotation,
  isRegenerative,
  reasonText,
  soilTrajectory,
  trajectorySummary,
} from '../lib/rotation.js'

/**
 * The three-season regenerative plan for a chosen starting crop.
 *
 * Lives as a section inside crop detail rather than its own screen — the plan is
 * inherently about the crop already on screen, so it costs the farmer no extra tap.
 */
export default function Rotation({ crop }) {
  const { t, lang } = useStore()
  const plan = buildRotation(crop)
  const traj = soilTrajectory(plan)
  const summary = trajectorySummary(plan, lang)
  const seasons = getSeasons(lang)
  const regen = isRegenerative(plan)

  // scale the bars against the largest absolute swing in the plan
  const peak = Math.max(1, ...traj.map((p) => Math.abs(p.n)))

  return (
    <section id="rotation" className="mt-7 scroll-mt-4">
      <div className="mx-1 mb-1 flex items-baseline justify-between">
        <h2 className="display text-[22px] text-ink">{t('rotation')}</h2>
        {regen ? (
          <span className="rounded-lg bg-grow-l px-2 py-1 text-[11px] font-semibold text-grow-d">
            {t('regenerative')}
          </span>
        ) : null}
      </div>
      <p className="mx-1 mb-3 text-[13px] text-faint">{t('rotationSub')}</p>

      <div className="flex flex-col gap-2.5">
        {plan.map((step, i) => {
          const first = i === 0
          const bar = traj[i]
          const pct = Math.round((Math.abs(bar.n) / peak) * 100)
          const up = bar.n >= 0
          return (
            <div
              key={i}
              className={`rounded-[26px] px-5 py-4 ${first ? 'bg-ink' : 'bg-card'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2.5">
                  <span
                    className={`display text-[24px] ${first ? 'text-white' : 'text-ink'}`}
                  >
                    {step.crop.name[lang]}
                  </span>
                  <span
                    className={`text-[13px] font-medium ${first ? 'text-hint' : 'text-faint'}`}
                  >
                    {first ? t('nowSowing') : seasons[step.season]}
                  </span>
                </div>
                {step.crop.soil.legume ? (
                  <span
                    className={`num rounded-lg px-2 py-1 text-[11px] font-semibold ${
                      first ? 'bg-grow text-white' : 'bg-grow-l text-grow-d'
                    }`}
                  >
                    N +
                  </span>
                ) : null}
              </div>

              {/* why this crop follows the previous one */}
              {step.reasons
                .map((r) => reasonText(r, lang))
                .filter(Boolean)
                .slice(0, 1)
                .map((text, k) => (
                  <p
                    key={k}
                    className={`mt-1.5 text-[15px] leading-snug ${
                      first ? 'text-hint' : 'text-muted'
                    }`}
                  >
                    {text}
                  </p>
                ))}

              {/* cumulative nitrogen balance after this season */}
              <div className="mt-3 flex items-center gap-2.5">
                <span
                  className={`text-[11px] font-medium ${first ? 'text-ghost' : 'text-faint'}`}
                >
                  {t('soilBalance')}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-chip/60">
                  <span
                    className="block h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: pct + '%',
                      background: up ? '#2E8F4E' : '#C1531B',
                    }}
                  />
                </span>
                <span
                  className={`num w-8 text-right text-[13px] font-bold ${
                    up ? 'text-grow' : 'text-warn'
                  }`}
                >
                  {bar.n > 0 ? '+' : ''}
                  {bar.n}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className={`mt-3 rounded-[24px] px-5 py-4 text-[15px] leading-relaxed ${
          summary.tone === 'good' ? 'bg-grow-l text-grow-d' : 'bg-warn-l text-warn-d'
        }`}
      >
        {summary.text}
      </div>

      <p className="mx-1 mt-2 text-[11px] leading-relaxed text-faint">
        {{
          mr: 'नत्राचा हिशोब पीक-प्रकारावरून — कडधान्य नत्र बांधतं, कापूस-कांदा जास्त घेतात. हा तुमच्या शेताचा प्रत्यक्ष मातीचा अहवाल नाही.',
          hi: 'नाइट्रोजन का हिसाब फ़सल-प्रकार से — दलहन नाइट्रोजन बाँधती है, कपास-प्याज़ ज़्यादा लेते हैं. यह आपके खेत की असली मिट्टी जाँच नहीं है.',
          en: 'Nitrogen balance is derived from crop type — legumes fix, cotton and onion deplete. This is not a soil test of your field.',
        }[lang]}
      </p>
    </section>
  )
}
