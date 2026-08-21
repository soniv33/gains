import type { LoggedSet, Session } from '@/types'

export interface ExerciseBests {
  /** Heaviest weight moved for at least one rep. */
  weightLb: number
  /** Best estimated one-rep max. */
  e1rmLb: number
  /** Most weight × reps in a single set. */
  volumeLb: number
}

export type PRKind = 'weight' | 'e1rm' | 'volume'

export const EMPTY_BESTS: ExerciseBests = { weightLb: 0, e1rmLb: 0, volumeLb: 0 }

/** Epley. Above ~12 reps this stops meaning much, so we cap its input. */
export function e1rm(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) return 0
  if (reps === 1) return weightLb
  return weightLb * (1 + Math.min(reps, 12) / 30)
}

export function setVolume(set: LoggedSet): number {
  return set.weight * set.reps
}

/** Warmups are excluded everywhere; they are not performances. */
export function workSets(sets: LoggedSet[]): LoggedSet[] {
  return sets.filter((s) => s.kind === 'work' && s.reps > 0)
}

export function bestsFromSets(sets: LoggedSet[]): ExerciseBests {
  return workSets(sets).reduce<ExerciseBests>(
    (best, s) => ({
      weightLb: Math.max(best.weightLb, s.weight),
      e1rmLb: Math.max(best.e1rmLb, e1rm(s.weight, s.reps)),
      volumeLb: Math.max(best.volumeLb, setVolume(s)),
    }),
    { ...EMPTY_BESTS },
  )
}

/** Career bests for one lift, across every completed session. */
export function bestsForExercise(
  sessions: Session[],
  exerciseId: string,
  before = Infinity,
): ExerciseBests {
  const sets: LoggedSet[] = []
  for (const session of sessions) {
    if (session.deletedAt || !session.endedAt) continue
    if (session.startedAt >= before) continue
    for (const entry of session.entries) {
      if (entry.exerciseId === exerciseId) sets.push(...entry.sets)
    }
  }
  return bestsFromSets(sets)
}

/**
 * Which records a single set just broke. Called at log time so the badge
 * appears inline — there is no "records" screen you have to remember to check.
 */
export function prsForSet(set: LoggedSet, priorBests: ExerciseBests): PRKind[] {
  if (set.kind !== 'work' || set.reps <= 0 || set.weight <= 0) return []
  const hits: PRKind[] = []
  if (set.weight > priorBests.weightLb) hits.push('weight')
  if (e1rm(set.weight, set.reps) > priorBests.e1rmLb) hits.push('e1rm')
  if (setVolume(set) > priorBests.volumeLb) hits.push('volume')
  return hits
}

export function updateBests(bests: ExerciseBests, set: LoggedSet): ExerciseBests {
  if (set.kind !== 'work') return bests
  return {
    weightLb: Math.max(bests.weightLb, set.weight),
    e1rmLb: Math.max(bests.e1rmLb, e1rm(set.weight, set.reps)),
    volumeLb: Math.max(bests.volumeLb, setVolume(set)),
  }
}

export const PR_LABEL: Record<PRKind, string> = {
  weight: 'Heaviest',
  e1rm: 'Best 1RM',
  volume: 'Best set',
}
