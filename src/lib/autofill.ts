import type { Exercise, PlannedSet, RepRange, Session, Settings } from '@/types'
import { lastPerformance } from './history'
import { workSets } from './prs'
import { adjustment, applyAdjustment } from './progression'

export interface AutofillArgs {
  exercise: Exercise
  sessions: Session[]
  targetSets: number
  repRange: RepRange
  settings: Settings
}

/**
 * The reason the app is worth using: every set row arrives already filled in,
 * so logging a set as prescribed costs exactly one tap.
 *
 * Prefills are matched **set for set** — your third set comes from last time's
 * third set, not your first. Straight-set lifters see no difference; anyone who
 * drops weight across sets gets a prefill that matches what they actually do.
 */
export function autofillSets({
  exercise,
  sessions,
  targetSets,
  repRange,
  settings,
}: AutofillArgs): PlannedSet[] {
  const previous = lastPerformance(sessions, exercise.id)
  const count = Math.max(1, targetSets)

  if (!previous) {
    // Never performed: we know the reps to aim for but cannot guess the weight.
    return Array.from({ length: count }, () => ({
      weight: null,
      reps: repRange.min,
      kind: 'work' as const,
      source: 'range' as const,
    }))
  }

  const prior = workSets(previous.entry.sets)
  const adj = adjustment(exercise, sessions, repRange, settings)

  return Array.from({ length: count }, (_, i) => {
    // Beyond what you did last time, carry the final set forward.
    const ref = prior[i] ?? prior[prior.length - 1]
    if (!ref) {
      return { weight: null, reps: repRange.min, kind: 'work' as const, source: 'range' as const }
    }
    const weight = applyAdjustment(ref.weight, adj, exercise, settings)
    return {
      weight,
      // On a bump, ask for the bottom of the range again at the new weight.
      reps: adj.source === 'previous' ? clampReps(ref.reps, repRange) : repRange.min,
      kind: 'work' as const,
      source: adj.source,
    }
  })
}

/**
 * Keep a prefill inside the prescribed range. Overshooting the top is kept as-is
 * only when it is what you genuinely did, so a strong day is not silently erased.
 */
function clampReps(reps: number, range: RepRange): number {
  if (reps <= 0) return range.min
  return Math.max(range.min, reps)
}

export const SOURCE_HINT: Record<PlannedSet['source'], string> = {
  previous: 'Same as last time',
  progression: 'Up from last time',
  deload: 'Backed off',
  range: 'Target reps',
  warmup: 'Warmup',
  manual: '',
}
