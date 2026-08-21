import type { Exercise, RepRange, Session, Settings } from '@/types'
import { performances } from './history'
import { workSets } from './prs'
import { nearestLoadableLb } from './plates'
import { snapLb } from './units'

export type Verdict = 'advance' | 'hold' | 'miss'

/**
 * Judge one performance against its rep range.
 *  - advance: every work set reached the top of the range, so the weight is light
 *  - miss:    a work set fell below the bottom of the range
 *  - hold:    somewhere in between; repeat the weight and earn the reps first
 */
export function judge(reps: number[], range: RepRange): Verdict {
  const done = reps.filter((r) => r > 0)
  if (!done.length) return 'hold'
  if (done.every((r) => r >= range.max)) return 'advance'
  if (done.some((r) => r < range.min)) return 'miss'
  return 'hold'
}

export function incrementLb(exercise: Exercise, settings: Settings): number {
  return exercise.isLower
    ? settings.progression.lowerIncrementLb
    : settings.progression.upperIncrementLb
}

/** How many performances in a row, counting back from the most recent, were misses. */
export function consecutiveMisses(
  sessions: Session[],
  exerciseId: string,
  range: RepRange,
): number {
  let streak = 0
  for (const { entry } of performances(sessions, exerciseId)) {
    const verdict = judge(
      workSets(entry.sets).map((s) => s.reps),
      entry.targetRepRange ?? range,
    )
    if (verdict === 'miss') streak += 1
    else break
  }
  return streak
}

export interface Adjustment {
  deltaLb: number
  multiplier: number
  source: 'previous' | 'progression' | 'deload'
}

/**
 * What to do with last session's weight. Always a prefill, never enforced —
 * one tap on a stepper overrides it.
 */
export function adjustment(
  exercise: Exercise,
  sessions: Session[],
  range: RepRange,
  settings: Settings,
): Adjustment {
  const flat: Adjustment = { deltaLb: 0, multiplier: 1, source: 'previous' }
  if (!settings.progression.enabled) return flat

  const history = performances(sessions, exercise.id)
  if (!history.length) return flat

  const misses = consecutiveMisses(sessions, exercise.id, range)
  if (misses >= settings.progression.deloadAfterMisses) {
    return {
      deltaLb: 0,
      multiplier: 1 - settings.progression.deloadPct,
      source: 'deload',
    }
  }

  const last = history[0]
  const verdict = judge(
    workSets(last.entry.sets).map((s) => s.reps),
    last.entry.targetRepRange ?? range,
  )
  if (verdict === 'advance') {
    return { deltaLb: incrementLb(exercise, settings), multiplier: 1, source: 'progression' }
  }
  return flat
}

/** Applies an adjustment and snaps the result to something you can actually load. */
export function applyAdjustment(
  weightLb: number,
  adj: Adjustment,
  exercise: Exercise,
  settings: Settings,
): number {
  const raw = weightLb * adj.multiplier + adj.deltaLb
  if (raw <= 0) return 0
  if (exercise.usesBar) {
    return nearestLoadableLb(raw, settings.barWeightLb, settings.platesLb)
  }
  return snapLb(raw, settings.units)
}
