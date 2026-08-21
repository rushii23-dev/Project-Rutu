import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtDoy, LANGS } from '../i18n/index.js'
import { Card, PrimaryButton } from '../components/ui.jsx'

export default function Welcome() {
  const { t, lang, set, district, districtName } = useStore()
  const nav = useNavigate()
  const today = fmtDoy(district.onset.todayDoy, lang)

  return (
    <div className="flex min-h-[760px] flex-col justify-between px-7 pb-12 pt-10">
      <div>
        {/* language is offered before anything else — it gates comprehension */}
        <div className="mb-10 flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => set({ lang: l.code })}
              className={`rounded-2xl px-4 py-2 text-[15px] font-semibold transition ${
                lang === l.code ? 'bg-ink text-white' : 'bg-card text-ink-2'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="text-[13px] font-medium uppercase tracking-[2.5px] text-faint">
          {districtName()} {t('districtSuffix')}
        </div>
        <div className="display mt-5 text-[104px] leading-none text-ink">{t('brand')}</div>
        <div className="my-6 h-1 w-14 rounded-sm bg-grow" />
        <div className="display text-[27px] leading-snug text-ink">
          {t('tagline1')}
          <br />
          <span className="italic">{t('tagline2')}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="px-6 py-5">
          <div className="text-[15px] font-medium text-muted">{t('sowingThisYear')}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="display text-[44px] leading-none text-ink">{today}</span>
            <span className="text-sm font-medium text-faint">{t('corrected')}</span>
          </div>
        </Card>
        <PrimaryButton onClick={() => nav('/onboarding')}>{t('start')}</PrimaryButton>
      </div>
    </div>
  )
}
