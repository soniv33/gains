import type { Exercise, LoggedSet, RepRange, Session, SessionEntry, Settings } from '@/types'
import { DEFAULT_BAR_LB, DEFAULT_PLATES_LB } from './units'

export const testSettings = (over: Partial<Settings> = {}): Settings => ({
  units: 'lb',
  barWeightLb: DEFAULT_BAR_LB,
  platesLb: DEFAULT_PLATES_LB,
  defaultRestSec: 120,
  theme: 'system',
  progression: {
    enabled: true,
    upperIncrementLb: 5,
    lowerIncrementLb: 10,
    deloadAfterMisses: 2,
    deloadPct: 0.1,
  },
  ...over,
})

export const testExercise = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'bench',
  name: 'Barbell Bench Press',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  mechanic: 'compound',
  level: 'intermediate',
  pattern: 'horizontal push',
  isLower: false,
  isUnilateral: false,
  usesBar: true,
  defaultRepRange: { min: 5, max: 8 },
  defaultRestSec: 150,
  ...over,
})

export const set = (
  weight: number,
  reps: number,
  kind: LoggedSet['kind'] = 'work',
): LoggedSet => ({ weight, reps, kind, completedAt: 0 })

export const entry = (
  exerciseId: string,
  sets: LoggedSet[],
  targetRepRange: RepRange = { min: 5, max: 8 },
): SessionEntry => ({
  exerciseId,
  sets,
  targetSets: sets.filter((s) => s.kind === 'work').length,
  targetRepRange,
  restSec: 120,
})

let clock = 1_700_000_000_000

/** Sessions are created oldest-first; each call advances a day. */
export const session = (entries: SessionEntry[], over: Partial<Session> = {}): Session => {
  clock += 86_400_000
  return {
    id: `s${clock}`,
    updatedAt: clock,
    name: 'Test',
    startedAt: clock,
    endedAt: clock + 3_600_000,
    entries,
    ...over,
  }
}

export const resetClock = () => {
  clock = 1_700_000_000_000
}
