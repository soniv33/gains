import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { haptic } from '@/lib/useWakeLock'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

/**
 * For the occasional weight the steppers would take too long to reach. Custom
 * rather than <input type="number"> so the OS keyboard never appears — it covers
 * the screen, needs a second tap to dismiss, and its keys are half the size.
 */
export function NumberPad({
  open,
  title,
  initial,
  allowDecimal = true,
  onCommit,
  onClose,
}: {
  open: boolean
  title: string
  initial: number | null
  allowDecimal?: boolean
  onCommit: (value: number) => void
  onClose: () => void
}) {
  const [buffer, setBuffer] = useState('')

  useEffect(() => {
    if (open) setBuffer('')
  }, [open, initial])

  const press = (key: string) => {
    haptic(8)
    setBuffer((b) => {
      if (key === '⌫') return b.slice(0, -1)
      if (key === '.') return !allowDecimal || b.includes('.') ? b : (b || '0') + '.'
      return (b + key).slice(0, 7)
    })
  }

  const parsed = buffer === '' ? initial : Number(buffer)
  const valid = parsed !== null && Number.isFinite(parsed) && parsed >= 0

  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <div className="pad">
        <div className="pad-head">
          <span className="eyebrow">{title}</span>
          <span className="pad-display num">{buffer === '' ? (initial ?? '–') : buffer}</span>
        </div>
        <div className="pad-keys">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="pad-key num"
              onClick={() => press(key)}
              disabled={key === '.' && !allowDecimal}
            >
              {key}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!valid}
          onClick={() => {
            if (valid) onCommit(parsed)
            onClose()
          }}
        >
          Set
        </button>
      </div>
    </Sheet>
  )
}
