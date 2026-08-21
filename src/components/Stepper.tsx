import type { ReactNode } from 'react'
import { haptic } from '@/lib/useWakeLock'

/**
 * The only way to change a number during a session. A text keyboard would cover
 * half the screen and demand precision you do not have with chalked hands.
 */
export function Stepper({
  label,
  value,
  onChange,
  onTapValue,
  step,
  min = 0,
  suffix,
  emphasis,
}: {
  label: string
  value: number | null
  onChange: (next: number) => void
  onTapValue?: () => void
  step: number
  min?: number
  suffix?: ReactNode
  emphasis?: boolean
}) {
  const current = value ?? 0

  const bump = (delta: number) => {
    haptic(8)
    onChange(Math.max(min, round(current + delta)))
  }

  return (
    <div className={`stepper${emphasis ? ' stepper-lg' : ''}`}>
      <span className="eyebrow">{label}</span>
      <div className="stepper-row">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => bump(-step)}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <button
          type="button"
          className="stepper-value num"
          onClick={onTapValue}
          aria-label={`${label}${value === null ? ', not set' : `, ${value}`}`}
        >
          {value === null ? <span className="stepper-blank">–</span> : trim(value)}
          {suffix ? <span className="stepper-suffix">{suffix}</span> : null}
        </button>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => bump(step)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

const round = (n: number) => Math.round(n * 100) / 100
const trim = (n: number) => String(Math.round(n * 10) / 10)
