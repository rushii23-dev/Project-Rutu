import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtWindow } from '../i18n/index.js'
import { sowingStatus } from '../lib/season.js'
import { Card, PrimaryButton } from '../components/ui.jsx'
import AcreInput from '../components/AcreInput.jsx'
import { SAMPLE_CROPS } from '../data/crops.js'

const FIELD =
  'h-[66px] w-full rounded-[26px] bg-card px-6 text-[21px] font-medium text-ink outline-none placeholder:text-hint'

export default function Onboarding() {
  const { t, lang, name, village, districtId, acres, districts, districtName, set } = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)

  const district = districts.find((d) => d.id === districtId)
  // the window that is actually next, not soybean's regardless of month
  const status = sowingStatus(SAMPLE_CROPS)
  const window = fmtWindow({ from: status.from, to: status.to }, lang)

  const canNext =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && village.trim().length > 0) ||
    step === 2 ||
    step === 3

  const next = () => {
    if (step === 3) {
      set({ onboarded: true })
      nav('/home')
    } else setStep(step + 1)
  }
  const back = () => (step === 0 ? nav('/', { replace: true }) : setStep(step - 1))

  return (
    <div className="flex min-h-[760px] flex-col px-6 pb-10 pt-3.5">
      <div className="flex items-center gap-3.5">
        <button
          onClick={back}
          aria-label="back"
          className="h-11 w-11 flex-none rounded-[22px] bg-card text-xl text-ink"
        >
          ←
        </button>
        <div className="flex flex-1 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-sm ${i <= step ? 'bg-grow' : 'bg-track'}`}
            />
          ))}
        </div>
        <div className="num flex-none text-sm font-semibold text-faint">{step + 1}/4</div>
      </div>

      <div className="flex-1 pt-12">
        {step === 0 && (
          <>
            <Title>{t('q_name')}</Title>
            <Sub>{t('q_name_sub')}</Sub>
            <input
              className={`${FIELD} mt-8`}
              value={name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={t('ph_name')}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Title>{t('q_where')}</Title>
            <Sub>{t('q_where_sub')}</Sub>
            <Label>{t('district')}</Label>
            <select
              className={`${FIELD} appearance-none`}
              value={districtId}
              onChange={(e) => set({ districtId: e.target.value })}
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {lang === 'en' ? d.en : d.dev}
                </option>
              ))}
            </select>
            <Label className="mt-5">{t('village')}</Label>
            <input
              className={FIELD}
              value={village}
              onChange={(e) => set({ village: e.target.value })}
              placeholder={t('ph_village')}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Title>{t('q_land')}</Title>
            <Sub>{t('q_land_sub')}</Sub>
            <div className="mt-8">
              <AcreInput value={acres} onChange={(n) => set({ acres: n })} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Title>{t('q_confirm')}</Title>
            <Card className="mt-7 px-6 py-2">
              <Row label={t('name')} value={name} />
              <Row label={t('village')} value={village} />
              <Row label={t('district')} value={districtName(district)} />
              <Row label={t('land')} value={`${acres} ${t('acre')}`} last />
            </Card>
            <div className="mt-4 rounded-3xl bg-grow-l px-6 py-4 text-[16px] leading-relaxed text-grow-d">
              {t('confirmNote', { district: districtName(district), window })}
            </div>
          </>
        )}
      </div>

      <PrimaryButton onClick={next} disabled={!canNext}>
        {step === 3 ? t('start') : t('next')}
      </PrimaryButton>
    </div>
  )
}

const Title = ({ children }) => (
  <h1 className="display whitespace-pre-line text-[36px] leading-[1.25] text-ink">{children}</h1>
)
const Sub = ({ children }) => <p className="mt-3 text-base text-muted">{children}</p>
const Label = ({ children, className = '' }) => (
  <div className={`mb-2 mt-8 text-[13px] font-semibold tracking-[1.4px] text-faint ${className}`}>
    {children}
  </div>
)

function Row({ label, value, last }) {
  return (
    <div
      className={`flex items-center justify-between py-4.5 ${last ? '' : 'border-b border-chip'}`}
      style={{ paddingTop: 18, paddingBottom: 18 }}
    >
      <span className="text-base text-muted">{label}</span>
      <span className="text-[18px] font-semibold text-ink">{value || '—'}</span>
    </div>
  )
}
