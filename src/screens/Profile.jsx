import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { LANGS } from '../i18n/index.js'
import { Card } from '../components/ui.jsx'

const VERSION = '0.2.0'

export default function Profile() {
  const { t, lang, name, village, acres, district, districtName, set, reset } = useStore()
  const nav = useNavigate()

  const rows = [
    { label: t('name'), value: name || '—', edit: () => nav('/onboarding') },
    { label: t('village'), value: village || '—', edit: () => nav('/onboarding') },
    { label: t('district'), value: districtName(), edit: () => nav('/onboarding') },
    { label: t('land'), value: `${acres} ${t('acre')}`, edit: () => nav('/onboarding') },
  ]

  const tiles = [
    { icon: '🔔', label: t('notifications') },
    { icon: '📥', label: t('offlineData') },
    { icon: '📄', label: t('myRecords') },
    { icon: '☎️', label: t('help') },
  ]

  return (
    <div className="px-5 pb-[130px] pt-4">
      <h1 className="display text-[34px] text-ink">{t('profile')}</h1>

      <Card className="mt-4.5 flex items-center gap-4 p-5.5" style={{ marginTop: 18, padding: 22 }}>
        <div className="display flex h-[62px] w-[62px] flex-none items-center justify-center rounded-full bg-grow-l text-[26px] text-grow-d">
          {(name || '?').trim().charAt(0)}
        </div>
        <div>
          <div className="display text-[26px] text-ink">{name || '—'}</div>
          <div className="text-[15px] text-muted">
            {village || '—'} · {acres} {t('acre')}
          </div>
        </div>
      </Card>

      <Card className="mt-3.5 px-5.5" style={{ paddingLeft: 22, paddingRight: 22 }}>
        {rows.map((r, i) => (
          <button
            key={r.label}
            onClick={r.edit}
            className={`flex w-full items-center justify-between py-4.5 text-left ${
              i === rows.length - 1 ? '' : 'border-b border-hair'
            }`}
            style={{ paddingTop: 18, paddingBottom: 18 }}
          >
            <span className="text-base text-muted">{r.label}</span>
            <span className="flex items-center gap-2.5">
              <span className="text-[17px] font-semibold text-ink">{r.value}</span>
              <span className="num text-xl text-hint">›</span>
            </span>
          </button>
        ))}
      </Card>

      <div className="mt-3.5 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            className="flex min-h-[104px] flex-col justify-between p-5"
          >
            <span className="text-[22px]">{tile.icon}</span>
            <span className="text-base font-semibold text-ink">{tile.label}</span>
          </Card>
        ))}
      </div>

      <Card className="mt-3.5 px-5.5 py-5" style={{ paddingLeft: 22, paddingRight: 22 }}>
        <div className="mb-3 text-base text-muted">{t('language')}</div>
        <div className="flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => set({ lang: l.code })}
              className={`flex-1 rounded-[22px] py-3.5 text-base font-semibold transition ${
                lang === l.code ? 'bg-ink text-white' : 'bg-chip text-ink-2'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      <p className="mt-5.5 text-center text-sm leading-relaxed text-faint" style={{ marginTop: 22 }}>
        {t('version', { v: VERSION })}
        <br />
        {district.onset.yearFrom}–{district.onset.yearTo}
      </p>

      <button
        onClick={() => {
          reset()
          nav('/')
        }}
        className="mt-4 w-full text-center text-[13px] text-hint"
      >
        reset
      </button>
    </div>
  )
}
