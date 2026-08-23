import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtDate, fmtDoy, getSeasons, LANGS } from '../i18n/index.js'
import { seasonForDate, sowingStatus } from '../lib/season.js'
import { SAMPLE_CROPS } from '../data/crops.js'
import { Card, EyebrowLabel } from '../components/ui.jsx'
import FarmingYear from '../components/FarmingYear.jsx'
import BestPrices from '../components/BestPrices.jsx'
import AcreInput from '../components/AcreInput.jsx'

const VERSION = '0.3.0'

/**
 * Profile as a control panel, not a settings list.
 *
 * Everything here is either editable in place or a real, verifiable fact: the
 * district's own onset finding, the cropping year with today marked on it, and
 * today's best-paying markets from live Agmarknet data.
 *
 * Nothing on this screen is decorative. An earlier version had four tiles that
 * did nothing when tapped, and later two cards that only restated provenance —
 * a farmer opening Profile should find something worth acting on.
 */
export default function Profile() {
  const { t, lang, name, village, acres, district, districtId, districts, districtName, set, reset } =
    useStore()
  const nav = useNavigate()

  const [editing, setEditing] = useState(null) // 'name' | 'village' | null
  const [draft, setDraft] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const season = seasonForDate()
  const status = sowingStatus(SAMPLE_CROPS, district)
  const seasons = getSeasons(lang)
  const onset = district.onset

  function beginEdit(field, value) {
    setEditing(field)
    setDraft(value)
  }
  function commit() {
    if (editing) set({ [editing]: draft.trim() })
    setEditing(null)
  }

  return (
    <div className="px-5 pb-[130px] pt-4">
      <h1 className="display text-[34px] text-ink">{t('profile')}</h1>

      {/* ---- identity, editable in place --------------------------------- */}
      <Card className="mt-4 px-5 py-5">
        <div className="flex items-center gap-4">
          <div className="display flex h-[62px] w-[62px] flex-none items-center justify-center rounded-full bg-grow-l text-[26px] text-grow-d">
            {(name || '?').trim().charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            {editing === 'name' ? (
              <EditRow
                value={draft}
                onChange={setDraft}
                onSave={commit}
                onCancel={() => setEditing(null)}
                save={t('save')}
              />
            ) : (
              <button onClick={() => beginEdit('name', name)} className="block w-full text-left">
                <span className="display block truncate text-[26px] text-ink">{name || '—'}</span>
                <span className="text-[13px] font-medium text-grow">{t('edit')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-hair pt-3">
          {editing === 'village' ? (
            <EditRow
              value={draft}
              onChange={setDraft}
              onSave={commit}
              onCancel={() => setEditing(null)}
              save={t('save')}
            />
          ) : (
            <Row label={t('village')} value={village || '—'} onClick={() => beginEdit('village', village)} />
          )}

          {/* district drives every number in the app, so it is switchable here */}
          <div className="flex items-center justify-between border-t border-hair py-3.5">
            <span className="text-base text-muted">{t('district')}</span>
            <select
              value={districtId}
              onChange={(e) => set({ districtId: e.target.value })}
              className="max-w-[58%] appearance-none bg-transparent text-right text-[17px] font-semibold text-ink outline-none"
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {lang === 'en' ? d.en : d.dev}
                </option>
              ))}
            </select>
          </div>

          {/* acreage scales every income figure, so it is typeable here too */}
          <div className="flex items-center justify-between gap-3 border-t border-hair py-3">
            <span className="flex-none text-base text-muted">{t('land')}</span>
            <div className="min-w-0 flex-1">
              <AcreInput value={acres} onChange={(n) => set({ acres: n })} compact />
            </div>
          </div>
        </div>
      </Card>

      {/* ---- what this district's data actually says ---------------------- */}
      <Card className="mt-3 px-5 py-5">
        <EyebrowLabel>{t('myFarm')}</EyebrowLabel>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span className="display text-[40px] leading-none text-ink">
            {onset.significant ? fmtDoy(onset.todayDoy, lang) : '—'}
          </span>
          <span className="text-[14px] font-medium text-faint">
            {onset.significant ? t('avgArrival') : t('notSignificantShort')}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-2xl bg-chip px-3.5 py-1.5 text-sm font-medium text-ink-2">
            {seasons[season]} {t('seasonWord')}
          </span>
          <span className="rounded-2xl bg-grow-l px-3.5 py-1.5 text-sm font-medium text-grow-d">
            {t('sowNext')} {fmtDate(status.from, lang)}
          </span>
          <span className="num rounded-2xl bg-chip px-3.5 py-1.5 text-sm font-medium text-ink-2">
            p = {onset.p}
          </span>
        </div>
        <button
          onClick={() => nav('/evidence')}
          className="mt-3.5 flex items-center gap-1.5 text-[16px] font-semibold text-grow"
        >
          {t('whyShort')} <span className="text-[14px]">→</span>
        </button>
      </Card>

      <FarmingYear />

      <BestPrices />

      {/* ---- privacy: true, and worth saying ------------------------------ */}
      <Card className="mt-3 px-5 py-5">
        <div className="flex items-start gap-3">
          <span className="text-[20px]">🔒</span>
          <div>
            <div className="text-[16px] font-semibold text-ink">{t('privacyTitle')}</div>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">{t('privacyBody')}</p>
          </div>
        </div>
      </Card>

      {/* ---- language ----------------------------------------------------- */}
      <Card className="mt-3 px-5 py-5">
        <EyebrowLabel>{t('language')}</EyebrowLabel>
        <div className="mt-3 flex gap-2">
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

      {/* ---- erase --------------------------------------------------------- */}
      <div className="mt-3">
        {confirmReset ? (
          <Card className="px-5 py-4">
            <p className="text-[15px] leading-snug text-ink">{t('resetAsk')}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  reset()
                  nav('/', { replace: true })
                }}
                className="flex-1 rounded-3xl bg-warn py-3 text-[15px] font-semibold text-white"
              >
                {t('resetYes')}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-3xl bg-chip py-3 text-[15px] font-semibold text-ink-2"
              >
                {t('cancel')}
              </button>
            </div>
          </Card>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full py-3 text-center text-[14px] font-medium text-warn-m"
          >
            {t('resetTitle')}
          </button>
        )}
      </div>

      <p className="mt-2 text-center text-[11px] leading-relaxed text-faint">
        {t('version', { v: VERSION })}
      </p>
    </div>
  )
}

function Row({ label, value, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between py-3.5 text-left">
      <span className="text-base text-muted">{label}</span>
      <span className="flex items-center gap-2.5">
        <span className="text-[17px] font-semibold text-ink">{value}</span>
        <span className="num text-xl text-hint">›</span>
      </span>
    </button>
  )
}

function EditRow({ value, onChange, onSave, onCancel, save }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave()
          if (e.key === 'Escape') onCancel()
        }}
        className="h-12 min-w-0 flex-1 rounded-3xl bg-chip px-4 text-[17px] text-ink outline-none"
      />
      <button
        onClick={onSave}
        className="h-12 flex-none rounded-3xl bg-grow px-4 text-[15px] font-semibold text-white"
      >
        {save}
      </button>
    </div>
  )
}

