/** Shared primitives, matching the design canvas token-for-token. */

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`rounded-[28px] bg-card ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Chip({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-chip text-ink-2',
    grow: 'bg-grow-l text-grow-d',
    white: 'bg-card text-ink-2',
  }
  return (
    <span
      className={`rounded-2xl px-3.5 py-1.5 text-sm font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function EyebrowLabel({ children, tone = 'faint' }) {
  const tones = { faint: 'text-faint', warn: 'text-warn-m', ghost: 'text-ghost' }
  return (
    <div className={`text-[13px] font-semibold uppercase tracking-[1.6px] ${tones[tone]}`}>
      {children}
    </div>
  )
}

/** The big-number treatment: value large, unit small and muted beside it. */
export function BigValue({ value, unit, size = 60, tone = 'ink' }) {
  const tones = { ink: 'text-ink', grow: 'text-grow', card: 'text-card' }
  return (
    <div className="flex items-baseline gap-2.5">
      <span className={`display leading-none ${tones[tone]}`} style={{ fontSize: size }}>
        {value}
      </span>
      {unit ? <span className="text-[15px] font-medium text-faint">{unit}</span> : null}
    </div>
  )
}

export function PrimaryButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-[62px] w-full rounded-[34px] text-[19px] font-semibold transition ${
        disabled ? 'bg-track text-faint' : 'bg-grow text-white active:brightness-90'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function RoundIconButton({ children, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-12 w-12 flex-none items-center justify-center rounded-3xl bg-card text-xl text-ink active:brightness-95"
    >
      {children}
    </button>
  )
}

export function SectionHead({ children, action, onAction }) {
  return (
    <div className="mx-1 mb-3 mt-6 flex items-baseline justify-between">
      <h2 className="display text-[22px] text-ink">{children}</h2>
      {action ? (
        <button onClick={onAction} className="text-[15px] font-semibold text-grow">
          {action}
        </button>
      ) : null}
    </div>
  )
}

/** Honest marker for figures that are not sourced yet. */
export function SampleBadge({ children }) {
  return (
    <span className="rounded-lg bg-warn-l px-2 py-1 text-[11px] font-semibold text-warn-m">
      {children}
    </span>
  )
}

export function AlertCard({ tone = 'warn', title, body }) {
  const good = tone === 'good'
  return (
    <div
      className={`mt-4 flex items-start gap-3.5 rounded-[26px] px-5 py-4 ${
        good ? 'bg-grow-l' : 'bg-warn-l'
      }`}
    >
      <div
        className={`num flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[19px] font-semibold text-white ${
          good ? 'bg-grow' : 'bg-warn'
        }`}
      >
        {good ? '✓' : '!'}
      </div>
      <div>
        <div className={`text-[17px] font-semibold ${good ? 'text-grow-d' : 'text-warn-d'}`}>
          {title}
        </div>
        <div className={`mt-0.5 text-[15px] leading-snug ${good ? 'text-grow' : 'text-warn-m'}`}>
          {body}
        </div>
      </div>
    </div>
  )
}
