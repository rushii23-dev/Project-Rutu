import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'

/**
 * Landholding input.
 *
 * A stepper alone is wrong here: a farmer with 100 acres is not going to tap
 * plus a hundred times, and Indian holdings are routinely fractional — half an
 * acre, two and a half. So the number itself is the field. The stepper stays
 * for nudging by one, and the chips cover the sizes most holdings actually are.
 *
 * Typing is held as a string so the field can be emptied mid-edit without the
 * value snapping back to 1 under the farmer's fingers.
 */
const MIN = 0.5
const MAX = 500
const COMMON = [1, 2, 3, 5, 10, 25, 50, 100]

function clamp(n) {
  if (!Number.isFinite(n)) return null
  return Math.min(MAX, Math.max(MIN, Math.round(n * 10) / 10))
}

export default function AcreInput({ value, onChange, compact = false }) {
  const { t } = useStore()
  const [draft, setDraft] = useState(String(value))

  // follow external changes (chips, stepper, a different screen) unless the
  // farmer is mid-keystroke on the same number
  useEffect(() => {
    if (Number(draft) !== value) setDraft(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function commit(raw) {
    const n = clamp(parseFloat(String(raw).replace(',', '.')))
    if (n === null) {
      setDraft(String(value)) // unparseable — put the old number back
      return
    }
    onChange(n)
    setDraft(String(n))
  }

  const step = (d) => onChange(clamp((value || 0) + d))

  return (
    <div>
      <div
        className={`flex items-center justify-between rounded-[28px] bg-card ${
          compact ? 'px-4 py-3' : 'px-5 py-6'
        }`}
      >
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="less"
          className={`num flex-none rounded-full bg-chip font-semibold text-ink ${
            compact ? 'h-10 w-10 text-[20px]' : 'h-14 w-14 text-[28px]'
          }`}
        >
          −
        </button>

        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-2">
          <input
            value={draft}
            onChange={(e) => {
              const v = e.target.value
              // digits and one separator only — keeps the numeric pad honest
              if (/^[0-9]*[.,]?[0-9]*$/.test(v)) setDraft(v)
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'ArrowUp') { e.preventDefault(); step(1) }
              if (e.key === 'ArrowDown') { e.preventDefault(); step(-1) }
            }}
            inputMode="decimal"
            enterKeyHint="done"
            aria-label={t('land')}
            className={`display w-full min-w-0 bg-transparent text-center leading-none text-ink outline-none ${
              compact ? 'text-[26px]' : 'text-[56px]'
            }`}
            style={{ maxWidth: compact ? 90 : 160 }}
          />
          <span
            className={`flex-none font-medium text-faint ${compact ? 'text-[13px]' : 'text-[15px]'}`}
          >
            {t('acre')}
          </span>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label="more"
          className={`num flex-none rounded-full bg-grow font-semibold text-white ${
            compact ? 'h-10 w-10 text-[20px]' : 'h-14 w-14 text-[26px]'
          }`}
        >
          +
        </button>
      </div>

      {!compact && (
        <>
          <p className="mt-2 text-center text-[13px] text-faint">{t('acreTypeHint')}</p>
          <div className="sc mt-3 flex gap-2 overflow-x-auto">
            {COMMON.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => onChange(n)}
                className={`num flex-none rounded-[20px] px-4 py-2.5 text-[15px] font-semibold transition ${
                  value === n ? 'bg-ink text-white' : 'bg-card text-ink-2'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
