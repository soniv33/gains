import type { Exercise, Muscle, Equipment } from '@/types'
import { EXERCISES as BUILT_IN } from './exercises.generated'

let custom: Exercise[] = []
let index: Map<string, Exercise> = new Map(BUILT_IN.map((e) => [e.id, e]))

/** Custom exercises are merged in at boot and shadow a built-in of the same id. */
export function setCustomExercises(list: Exercise[]) {
  custom = list
  index = new Map([...BUILT_IN, ...custom].map((e) => [e.id, e]))
}

export function allExercises(): Exercise[] {
  return [...custom, ...BUILT_IN].sort((a, b) => a.name.localeCompare(b.name))
}

export function getExercise(id: string): Exercise | undefined {
  return index.get(id)
}

export interface ExerciseFilter {
  query?: string
  muscles?: Muscle[]
  equipment?: Equipment[]
}

/**
 * Matches on name and alias, tolerating word order so "press bench" still finds
 * the bench press — you are searching one-handed between sets, not typing carefully.
 */
export function searchExercises({ query, muscles, equipment }: ExerciseFilter): Exercise[] {
  const terms = (query ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  const muscleSet = new Set(muscles ?? [])
  const equipmentSet = new Set(equipment ?? [])

  return allExercises().filter((e) => {
    if (equipmentSet.size && !equipmentSet.has(e.equipment)) return false
    if (muscleSet.size) {
      const hit =
        e.primaryMuscles.some((m) => muscleSet.has(m)) ||
        e.secondaryMuscles.some((m) => muscleSet.has(m))
      if (!hit) return false
    }
    if (terms.length) {
      const hay = `${e.name} ${(e.aliases ?? []).join(' ')}`.toLowerCase()
      if (!terms.every((t) => hay.includes(t))) return false
    }
    return true
  })
}

/** Ranks a search so the most relevant lift is the first thing under your thumb. */
export function rankedSearch(filter: ExerciseFilter, limit = 60): Exercise[] {
  const query = (filter.query ?? '').toLowerCase().trim()
  const selected = new Set(filter.muscles ?? [])
  const results = searchExercises(filter)

  return results
    .slice()
    .sort(
      (a, b) =>
        // A lift that trains the muscle you tapped outranks one that merely
        // involves it, whatever else is true about either.
        primaryRank(a, selected) - primaryRank(b, selected) ||
        (query ? rank(a, query) - rank(b, query) : score(b) - score(a)) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit)
}

function primaryRank(e: Exercise, selected: Set<Muscle>): number {
  if (!selected.size) return 0
  return e.primaryMuscles.some((m) => selected.has(m)) ? 0 : 1
}

/** Compounds with free weights float to the top of an unfiltered list. */
function score(e: Exercise): number {
  let s = 0
  if (e.mechanic === 'compound') s += 3
  if (e.equipment === 'barbell' || e.equipment === 'dumbbell') s += 2
  if (e.level === 'beginner') s += 1
  return s
}

function rank(e: Exercise, query: string): number {
  const name = e.name.toLowerCase()
  if (name === query) return 0
  if (name.startsWith(query)) return 1
  if (name.includes(` ${query}`)) return 2
  return 3
}

/** Demo frame paths are derived from the id rather than stored 736 times over. */
export function demoFrames(exercise: Exercise): [string, string] | undefined {
  if (!exercise.hasDemo) return undefined
  return [`/ex/${exercise.id}/0.webp`, `/ex/${exercise.id}/1.webp`]
}

/**
 * Step-by-step instructions are half the dataset and only ever read on the
 * detail sheet, so they are fetched the first time one is opened and then kept.
 */
let instructions: Record<string, string[]> | undefined

export async function loadInstructions(): Promise<Record<string, string[]>> {
  instructions ??= (await import('./instructions.generated')).INSTRUCTIONS
  return instructions
}
