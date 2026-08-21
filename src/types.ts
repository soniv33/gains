/**
 * Every persisted record carries `id` (ULID), `updatedAt`, and `deletedAt`.
 * Nothing is hard-deleted. That is the whole cost of keeping cloud sync a
 * later, additive change rather than a data migration.
 */
export interface Meta {
  id: string
  updatedAt: number
  deletedAt?: number
}

export type Muscle =
  | 'chest'
  | 'lats'
  | 'upper back'
  | 'lower back'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'adductors'
  | 'abductors'
  | 'neck'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'kettlebell'
  | 'bands'
  | 'ez bar'
  | 'bodyweight'
  | 'other'

export type Mechanic = 'compound' | 'isolation'
export type Force = 'push' | 'pull' | 'static'
export type Level = 'beginner' | 'intermediate' | 'expert'

/** Drives default rest, progression increment and warmup ramps. */
export type Pattern =
  | 'squat'
  | 'hinge'
  | 'horizontal push'
  | 'vertical push'
  | 'horizontal pull'
  | 'vertical pull'
  | 'lunge'
  | 'carry'
  | 'isolation'
  | 'core'

export interface RepRange {
  min: number
  max: number
}

export interface Exercise {
  id: string
  name: string
  aliases?: string[]
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  equipment: Equipment
  mechanic: Mechanic
  force?: Force
  level: Level
  pattern: Pattern
  /** Lower-body lifts progress in bigger jumps than upper. */
  isLower: boolean
  isUnilateral: boolean
  /** True when the loaded weight is on a bar, so plate math applies. */
  usesBar: boolean
  defaultRepRange: RepRange
  defaultRestSec: number
  instructions: string[]
  /** Two vendored frames: start position and end position. */
  frames?: [string, string]
  /** Reserved: a real multi-frame demo, if we ever swap the loop for a GIF. */
  demoUrl?: string
  custom?: boolean
}

export type SetKind = 'warmup' | 'work'

export interface LoggedSet {
  weight: number
  reps: number
  rpe?: number
  kind: SetKind
  completedAt: number
}

export interface SessionEntry {
  exerciseId: string
  sets: LoggedSet[]
  note?: string
  /** Planned targets, copied from the routine when the session starts. */
  targetSets: number
  targetRepRange: RepRange
  restSec: number
  supersetGroup?: string
}

export interface Session extends Meta {
  routineId?: string
  dayId?: string
  name: string
  startedAt: number
  endedAt?: number
  entries: SessionEntry[]
  note?: string
}

export interface RoutineItem {
  exerciseId: string
  sets: number
  repRange: RepRange
  restSec: number
  supersetGroup?: string
  note?: string
}

export interface RoutineDay {
  id: string
  name: string
  items: RoutineItem[]
}

export interface Routine extends Meta {
  name: string
  source: 'template' | 'user'
  /** Stable key for bundled templates, so re-seeding does not duplicate them. */
  templateKey?: string
  description?: string
  days: RoutineDay[]
}

export interface BodyWeightLog extends Meta {
  /** YYYY-MM-DD, local. */
  date: string
  weight: number
}

export type Units = 'lb' | 'kg'
export type ThemePref = 'system' | 'light' | 'dark'

export interface ProgressionSettings {
  enabled: boolean
  /** Added when every work set hit the top of the rep range. */
  upperIncrementLb: number
  lowerIncrementLb: number
  /** Consecutive sessions under the rep target before a deload is suggested. */
  deloadAfterMisses: number
  deloadPct: number
}

export interface Settings {
  units: Units
  /** Canonical lb. Converted only at the display boundary. */
  barWeightLb: number
  /** Plate denominations available to you, per side, in lb. */
  platesLb: number[]
  defaultRestSec: number
  theme: ThemePref
  progression: ProgressionSettings
  activeRoutineId?: string
  /** Set once the bundled templates and exercises have been written. */
  seedVersion?: number
}

/** A set row in the session UI before it is committed. */
export interface PlannedSet {
  weight: number | null
  reps: number
  kind: SetKind
  /** Why the row is prefilled the way it is — surfaced as a one-word hint. */
  source: 'previous' | 'progression' | 'deload' | 'range' | 'warmup' | 'manual'
}

export interface ExportBundle {
  format: 'gains.export'
  version: number
  exportedAt: number
  settings: Settings
  routines: Routine[]
  sessions: Session[]
  bodyWeight: BodyWeightLog[]
  customExercises: Exercise[]
}
