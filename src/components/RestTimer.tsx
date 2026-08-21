import { useEffect, useRef, useState } from 'react'
import { haptic } from '@/lib/useWakeLock'

/**
 * Starts itself the moment a set is logged and clears itself when it runs out.
 * Counting rest is a zero-tap job; the only buttons here are for when you want
 * to override it.
 */
export function useRestTimer(defaultSec: number) {
  const [endsAt, setEndsAt] = useState<number | undefined>()
  const [now, setNow] = useState(() => Date.now())
  const chimed = useRef(false)

  useEffect(() => {
    if (!endsAt) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [endsAt])

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0

  useEffect(() => {
    if (!endsAt) return
    if (remaining === 0 && !chimed.current) {
      chimed.current = true
      haptic([80, 60, 80])
      // Clearing on the next tick keeps "0:00" on screen for a beat.
      const id = setTimeout(() => setEndsAt(undefined), 1200)
      return () => clearTimeout(id)
    }
  }, [remaining, endsAt])

  const start = (sec = defaultSec) => {
    chimed.current = false
    setNow(Date.now())
    setEndsAt(Date.now() + sec * 1000)
  }

  return {
    remaining,
    running: Boolean(endsAt),
    start,
    stop: () => setEndsAt(undefined),
    extend: (sec: number) => setEndsAt((e) => (e ? e + sec * 1000 : Date.now() + sec * 1000)),
  }
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RestBar({
  remaining,
  total,
  onSkip,
  onExtend,
}: {
  remaining: number
  total: number
  onSkip: () => void
  onExtend: (sec: number) => void
}) {
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
  return (
    <div className="restbar" role="timer" aria-label={`Rest, ${remaining} seconds left`}>
      <div className="restbar-fill" style={{ transform: `scaleX(${pct})` }} />
      <div className="restbar-content">
        <span className="restbar-time num">{formatClock(remaining)}</span>
        <span className="small dim">Rest</span>
        <div className="restbar-actions">
          <button type="button" className="btn-quiet" onClick={() => onExtend(15)}>
            +15s
          </button>
          <button type="button" className="btn-quiet" onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
