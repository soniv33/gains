import type { Routine, Session } from '@/types'
import { completedSessions } from './history'

/**
 * Which day comes next. Driven by what you last finished, not by the calendar —
 * miss a Thursday and Thursday's workout is still what's next, which is how
 * people actually run a split.
 */
export function nextDay(routine: Routine, sessions: Session[]): Routine['days'][number] {
  if (!routine.days.length) throw new Error('routine has no days')

  const last = completedSessions(sessions).find(
    (s) => s.routineId === routine.id && s.dayId,
  )
  if (!last) return routine.days[0]

  const index = routine.days.findIndex((d) => d.id === last.dayId)
  if (index < 0) return routine.days[0]
  return routine.days[(index + 1) % routine.days.length]
}

/** Consecutive days, counting back from today, with at least one finished session. */
export function streak(sessions: Session[], now = Date.now()): number {
  const days = new Set(
    completedSessions(sessions).map((s) => localDateKey(new Date(s.startedAt))),
  )
  if (!days.size) return 0

  const cursor = new Date(now)
  // A rest day today should not zero out a streak you are mid-way through.
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)

  let count = 0
  while (days.has(localDateKey(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
