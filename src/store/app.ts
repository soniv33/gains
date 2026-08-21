import { create } from 'zustand'
import type {
  BodyWeightLog,
  Exercise,
  PlannedSet,
  Routine,
  Session,
  SessionEntry,
  Settings,
} from '@/types'
import {
  DEFAULT_SETTINGS,
  loadAll,
  putActive,
  putBodyWeight,
  putCustomExercise,
  putRoutine,
  putSession,
  putSettings,
  replaceAll,
} from '@/db/db'
import { ulid } from '@/db/ulid'
import { getExercise, setCustomExercises } from '@/data/exercises'
import { TEMPLATES, materialize } from '@/data/templates'
import { autofillSets } from '@/lib/autofill'
import { localDateKey } from '@/lib/rotation'

const SEED_VERSION = 1

interface AppState {
  ready: boolean
  settings: Settings
  routines: Routine[]
  sessions: Session[]
  bodyWeight: BodyWeightLog[]
  customExercises: Exercise[]
  /** The workout in progress. Persisted on every change so a reload loses nothing. */
  active?: Session

  hydrate: () => Promise<void>
  updateSettings: (patch: Partial<Settings>) => void
  saveRoutine: (routine: Routine) => void
  deleteRoutine: (id: string) => void
  setActiveRoutine: (id: string | undefined) => void
  addCustomExercise: (exercise: Exercise) => void
  logBodyWeight: (weightLb: number, date?: string) => void

  startSession: (routine: Routine | undefined, dayId: string | undefined) => void
  updateActive: (mutate: (draft: Session) => void) => void
  finishSession: () => void
  discardSession: () => void
  deleteSession: (id: string) => void

  importBundle: (raw: unknown) => Promise<void>
}

const touch = <T extends { updatedAt: number }>(record: T): T => ({
  ...record,
  updatedAt: Date.now(),
})

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  routines: [],
  sessions: [],
  bodyWeight: [],
  customExercises: [],

  async hydrate() {
    const snap = await loadAll()
    setCustomExercises(snap.customExercises)

    let routines = snap.routines
    let settings = snap.settings

    // First run: give the user something to start rather than an empty app.
    if (settings.seedVersion !== SEED_VERSION && !routines.length) {
      routines = TEMPLATES.map((t) => materialize(t))
      await Promise.all(routines.map(putRoutine))
      settings = {
        ...settings,
        seedVersion: SEED_VERSION,
        activeRoutineId: routines[0]?.id,
      }
      await putSettings(settings)
    }

    set({
      ready: true,
      settings,
      routines,
      sessions: snap.sessions,
      bodyWeight: snap.bodyWeight,
      customExercises: snap.customExercises,
      active: snap.active,
    })
  },

  updateSettings(patch) {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    void putSettings(settings)
  },

  saveRoutine(routine) {
    const next = touch(routine)
    set((s) => ({
      routines: s.routines.some((r) => r.id === next.id)
        ? s.routines.map((r) => (r.id === next.id ? next : r))
        : [...s.routines, next],
    }))
    void putRoutine(next)
  },

  deleteRoutine(id) {
    const routine = get().routines.find((r) => r.id === id)
    if (!routine) return
    const next = touch({ ...routine, deletedAt: Date.now() })
    set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }))
    void putRoutine(next)
    if (get().settings.activeRoutineId === id) get().setActiveRoutine(undefined)
  },

  setActiveRoutine(id) {
    get().updateSettings({ activeRoutineId: id })
  },

  addCustomExercise(exercise) {
    const next = { ...exercise, custom: true as const }
    const list = [...get().customExercises.filter((e) => e.id !== next.id), next]
    setCustomExercises(list)
    set({ customExercises: list })
    void putCustomExercise(next)
  },

  logBodyWeight(weightLb, date = localDateKey(new Date())) {
    const existing = get().bodyWeight.find((b) => b.date === date && !b.deletedAt)
    const log: BodyWeightLog = existing
      ? touch({ ...existing, weight: weightLb })
      : { id: ulid(), updatedAt: Date.now(), date, weight: weightLb }
    set((s) => ({
      bodyWeight: [...s.bodyWeight.filter((b) => b.id !== log.id), log],
    }))
    void putBodyWeight(log)
  },

  startSession(routine, dayId) {
    const { settings } = get()
    const day = routine?.days.find((d) => d.id === dayId) ?? routine?.days[0]

    const entries: SessionEntry[] = (day?.items ?? []).map((item) => {
      const exercise = getExercise(item.exerciseId)
      return {
        exerciseId: item.exerciseId,
        sets: [],
        targetSets: item.sets,
        targetRepRange: item.repRange,
        restSec: item.restSec || exercise?.defaultRestSec || settings.defaultRestSec,
        ...(item.supersetGroup ? { supersetGroup: item.supersetGroup } : {}),
        ...(item.note ? { note: item.note } : {}),
      }
    })

    const now = Date.now()
    const session: Session = {
      id: ulid(now),
      updatedAt: now,
      routineId: routine?.id,
      dayId: day?.id,
      name: day?.name ?? 'Workout',
      startedAt: now,
      entries,
    }
    set({ active: session })
    void putActive(session)
  },

  updateActive(mutate) {
    const current = get().active
    if (!current) return
    const draft: Session = {
      ...current,
      entries: current.entries.map((e) => ({ ...e, sets: [...e.sets] })),
    }
    mutate(draft)
    draft.updatedAt = Date.now()
    set({ active: draft })
    void putActive(draft)
  },

  finishSession() {
    const active = get().active
    if (!active) return
    // An entry you never touched should not appear in history as a workout you did.
    const entries = active.entries.filter((e) => e.sets.length > 0)
    const done: Session = { ...active, entries, endedAt: Date.now(), updatedAt: Date.now() }

    if (!entries.length) {
      get().discardSession()
      return
    }

    set((s) => ({ sessions: [...s.sessions, done], active: undefined }))
    void putSession(done)
    void putActive(undefined)
  },

  discardSession() {
    set({ active: undefined })
    void putActive(undefined)
  },

  deleteSession(id) {
    const session = get().sessions.find((s) => s.id === id)
    if (!session) return
    const next = touch({ ...session, deletedAt: Date.now() })
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? next : x)) }))
    void putSession(next)
  },

  async importBundle(raw) {
    const bundle = raw as {
      format?: string
      settings?: Settings
      routines?: Routine[]
      sessions?: Session[]
      bodyWeight?: BodyWeightLog[]
      customExercises?: Exercise[]
    }
    if (bundle?.format !== 'gains.export') {
      throw new Error('That file is not a Gains export.')
    }
    const snapshot = {
      settings: { ...DEFAULT_SETTINGS, ...bundle.settings },
      routines: bundle.routines ?? [],
      sessions: bundle.sessions ?? [],
      bodyWeight: bundle.bodyWeight ?? [],
      customExercises: bundle.customExercises ?? [],
    }
    await replaceAll(snapshot)
    await putActive(undefined)
    setCustomExercises(snapshot.customExercises)
    set({ ...snapshot, active: undefined })
  },
}))

/** Completed sessions only — what every history and autofill calculation reads. */
export const selectHistory = (s: AppState): Session[] => s.sessions

export const selectActiveRoutine = (s: AppState): Routine | undefined =>
  s.routines.find((r) => r.id === s.settings.activeRoutineId && !r.deletedAt)

/**
 * What the next set row should be prefilled with, for one exercise in the live
 * session. This is the single number the whole app exists to get right.
 */
export function nextSetFor(
  { sessions, settings }: Pick<AppState, 'sessions' | 'settings'>,
  entry: SessionEntry,
): { weight: number | null; reps: number; source: PlannedSet['source'] } | undefined {
  const exercise = getExercise(entry.exerciseId)
  if (!exercise) return undefined

  const work = entry.sets.filter((s) => s.kind === 'work')
  const planned = autofillSets({
    exercise,
    sessions,
    targetSets: Math.max(entry.targetSets, work.length + 1),
    repRange: entry.targetRepRange,
    settings,
  })

  const row = planned[work.length]
  if (!row) return undefined

  const last = work[work.length - 1]
  const plannedForLast = planned[work.length - 1]

  // If you took the weight the app suggested, keep following the plan — that is
  // what preserves a deliberate descending scheme across sets. If you overrode
  // it, the override is the better guide for what comes next.
  const followedPlan =
    !last ||
    (plannedForLast?.weight != null && Math.abs(plannedForLast.weight - last.weight) < 1e-6)

  if (followedPlan) return { weight: row.weight, reps: row.reps, source: row.source }
  return { weight: last.weight, reps: last.reps, source: 'manual' }
}
