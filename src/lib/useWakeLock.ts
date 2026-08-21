import { useEffect } from 'react'

/**
 * Holds the screen awake for the duration of a workout. Without this you unlock
 * your phone between every set, which is the single biggest source of
 * interaction cost in a gym app.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | undefined
    let cancelled = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {
        // Denied, or the tab is backgrounded. Not worth interrupting anyone over.
      }
    }

    // iOS drops the lock whenever the tab is hidden, so re-take it on return.
    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => {})
    }
  }, [active])
}

/** Short confirmation buzz on log. Silently absent on desktop and on iOS Safari. */
export function haptic(pattern: number | number[] = 12) {
  navigator.vibrate?.(pattern)
}
