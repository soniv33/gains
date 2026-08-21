import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BodyWeightLog, Exercise, Routine, Session, Settings } from '@/types'
import { DEFAULT_BAR_LB, DEFAULT_PLATES_LB } from '@/lib/units'

interface GainsDB extends DBSchema {
  sessions: { key: string; value: Session }
  routines: { key: string; value: Routine }
  bodyWeight: { key: string; value: BodyWeightLog }
  customExercises: { key: string; value: Exercise }
  kv: { key: string; value: unknown }
}

const DB_NAME = 'gains'
const DB_VERSION = 1

let handle: Promise<IDBPDatabase<GainsDB>> | undefined

export function db(): Promise<IDBPDatabase<GainsDB>> {
  handle ??= openDB<GainsDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore('sessions', { keyPath: 'id' })
      database.createObjectStore('routines', { keyPath: 'id' })
      database.createObjectStore('bodyWeight', { keyPath: 'id' })
      database.createObjectStore('customExercises', { keyPath: 'id' })
      database.createObjectStore('kv')
    },
  })
  return handle
}

export const DEFAULT_SETTINGS: Settings = {
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
}

export interface Snapshot {
  settings: Settings
  routines: Routine[]
  sessions: Session[]
  bodyWeight: BodyWeightLog[]
  customExercises: Exercise[]
  active?: Session
}

/**
 * The entire dataset is read into memory at boot. Years of training is on the
 * order of a megabyte, and holding it in memory is what lets autofill, PR
 * detection and the charts stay synchronous and instant.
 */
export async function loadAll(): Promise<Snapshot> {
  const d = await db()
  const [settings, routines, sessions, bodyWeight, customExercises, active] = await Promise.all([
    d.get('kv', 'settings') as Promise<Settings | undefined>,
    d.getAll('routines'),
    d.getAll('sessions'),
    d.getAll('bodyWeight'),
    d.getAll('customExercises'),
    d.get('kv', 'activeSession') as Promise<Session | undefined>,
  ])
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    routines,
    sessions,
    bodyWeight,
    customExercises,
    active,
  }
}

export async function putSettings(settings: Settings) {
  ;(await db()).put('kv', settings, 'settings')
}

/** The in-progress workout is stored separately so a reload never loses a set. */
export async function putActive(session: Session | undefined) {
  const d = await db()
  if (session) await d.put('kv', session, 'activeSession')
  else await d.delete('kv', 'activeSession')
}

export async function putSession(session: Session) {
  ;(await db()).put('sessions', session)
}

export async function putRoutine(routine: Routine) {
  ;(await db()).put('routines', routine)
}

export async function putBodyWeight(log: BodyWeightLog) {
  ;(await db()).put('bodyWeight', log)
}

export async function putCustomExercise(exercise: Exercise) {
  ;(await db()).put('customExercises', exercise)
}

export async function replaceAll(snapshot: Omit<Snapshot, 'active'>) {
  const d = await db()
  const tx = d.transaction(
    ['sessions', 'routines', 'bodyWeight', 'customExercises', 'kv'],
    'readwrite',
  )
  await Promise.all([
    tx.objectStore('sessions').clear(),
    tx.objectStore('routines').clear(),
    tx.objectStore('bodyWeight').clear(),
    tx.objectStore('customExercises').clear(),
  ])
  await Promise.all([
    ...snapshot.sessions.map((s) => tx.objectStore('sessions').put(s)),
    ...snapshot.routines.map((r) => tx.objectStore('routines').put(r)),
    ...snapshot.bodyWeight.map((b) => tx.objectStore('bodyWeight').put(b)),
    ...snapshot.customExercises.map((e) => tx.objectStore('customExercises').put(e)),
    tx.objectStore('kv').put(snapshot.settings, 'settings'),
  ])
  await tx.done
}
