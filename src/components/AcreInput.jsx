import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'

/**
 * Landholding input.
 *
 * A stepper alone cannot express a 100-acre holding, and Indian holdings are
 * routinely fractional, so the number itself is the field. The stepper stays
 * for nudging by one and the chips cover the sizes most holdings actually are.
 *
 * The class beneath the number is the Government of India landholding
 * classification, converted from hectares — marginal under 1 ha, small to 2,
 * semi-medium to 4, medium to 10, large above. It is a real category a farmer
 * will recognise from his own paperwork, not a label we invented.
 *
 * Typing is held as a string so the field can be emptied mid-edit without the
 * value snapping back under the farmer's fingers.
 */
const MIN = 0.5
const MAX = 500
const COMMON = [1, 2, 3, 5, 10, 25, 50, 100]

const HA = 2.4711 // acres per hectare

const CLASSES = [
  { key: 'hMarginal', upTo: 1 * HA, tone: '#8A8574' },
  { key: 'hSmall', upTo: 2 * HA, tone: '#5B7C86' },
  { key: 'hSemiMedium', upTo: 4 * HA, tone: '#2E8F4E' },
  { key: 'hMedium', upTo: 10 * HA, tone: '#2E6B3F' },
  { key: 'hLarge', upTo: Infinity, tone: '#D08A2C' },
]

function clamp(n) {
  if (!Number.isFinite(n)) return null
  return Math.min(MAX, Math.max(MIN, Math.round(n * 10) / 10))
}

function classify(acres) {
  return CLASSES.find((c) => acres <= c.upTo) || CLASSES[CLASSES.length - 1]
}

/** Log scale — a quarter-acre change matters at 1 acre, not at 100. */
function fill(acres) {
  const lo = Math.log(MIN)
  const hi = Math.log(MAX)
  return Math.min(100, Math.max(3, ((Math.log(Math.max(acres, MIN)) - lo) / (hi - lo)) * 100))
}

export default function AcreInput({ value, onChange, compact = false }) {
  const { t } = useStore()
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (Number(draft) !== value) setDraft(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit(raw) {
    const n = clamp(parseFloat(String(raw).replace(',', '.')))
    if (n === null) {
      setDraft(String(value))
      return
    }
    onChange(n)
    setDraft(String(n))
  }

  const step = (d) => onChange(clamp((value || 0) + d))
  const cls = classify(value || MIN)

  const Round = ({ label, onClick, glyph, primary }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`num flex flex-none items-center justify-center rounded-full font-semibold transition active:scale-95 ${
        compact ? 'h-10 w-10 text-[19px]' : 'h-[52px] w-[52px] text-[24px]'
      } ${primary ? 'bg-grow text-white shadow-[0_6px_16px_rgba(46,107,63,.32)]' : 'bg-chip text-ink-2'}`}
    >
      {glyph}
    </button>
  )

  if (compact) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Round label="less" glyph="−" onClick={() => step(-1)} />
        <input
          value={draft}
          onChange={(e) => {
            const v = e.target.value
            if (/^[0-9]*[.,]?[0-9]*$/.test(v)) setDraft(v)
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          inputMode="decimal"
          aria-label={t('land')}
          className="display w-14 bg-transparent text-center text-[24px] leading-none text-ink outline-none"
        />
        <Round label="more" glyph="+" primary onClick={() => step(1)} />
      </div>
    )
  }

  return (
    <div>
      {/* the number is the whole control */}
      <div
        className={`rounded-[32px] bg-card px-5 pb-5 pt-6 transition-shadow ${
          focused ? 'shadow-[0_0_0_2px_var(--color-grow)]' : 'shadow-[0_10px_30px_rgba(30,26,16,.07)]'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <Round label="less" glyph="−" onClick={() => step(-1)} />

          <div className="flex min-w-0 flex-1 flex-col items-center">
            <input
              value={draft}
              onChange={(e) => {
                const v = e.target.value
                if (/^[0-9]*[.,]?[0-9]*$/.test(v)) setDraft(v)
              }}
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                setFocused(false)
                commit(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'ArrowUp') { e.preventDefault(); step(1) }
                if (e.key === 'ArrowDown') { e.preventDefault(); step(-1) }
              }}
              inputMode="decimal"
              enterKeyHint="done"
              aria-label={t('land')}
              className="display w-full min-w-0 bg-transparent text-center text-[64px] leading-none tracking-tight text-ink outline-none"
            />
            <span className="mt-1.5 text-[12px] font-semibold uppercase tracking-[2px] text-faint">
              {t('acre')}
            </span>
          </div>

          <Round label="more" glyph="+" primary onClick={() => step(1)} />
        </div>

        {/* where this holding sits, on a log scale so small farms still move it */}
        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-chip">
            <div
              className="h-full rounded-full transition-[width,background] duration-300"
              style={{ width: fill(value) + '%', background: cls.tone }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[1.4px] text-faint">
              {t('holdingClass')}
            </span>
            <span
              className="rounded-full px-3 py-1 text-[13px] font-semibold text-white transition-colors"
              style={{ background: cls.tone }}
            >
              {t(cls.key)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[13px] text-faint">{t('acreTypeHint')}</p>

      <div className="sc mt-2.5 flex gap-2 overflow-x-auto pb-1">
        {COMMON.map((n) => {
          const on = value === n
          return (
            <button
              type="button"
              key={n}
              onClick={() => onChange(n)}
              className={`num flex-none rounded-full px-4 py-2.5 text-[15px] font-semibold transition ${
                on
                  ? 'bg-ink text-white'
                  : 'border border-track bg-transparent text-ink-2 active:bg-card'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
