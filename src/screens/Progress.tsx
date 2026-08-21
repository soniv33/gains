import { useMemo, useState } from 'react'
import type { Muscle, Units } from '@/types'
import { useApp } from '@/store/app'
import { getExercise } from '@/data/exercises'
import { MUSCLE_LABEL } from '@/data/muscles'
import { BodyMap } from '@/components/BodyMap'
import { LineChart } from '@/components/Chart'
import { ExerciseSheet } from './ExerciseDetail'
import { completedSessions } from '@/lib/history'
import { bestsForExercise, e1rm, workSets } from '@/lib/prs'
import { formatWeight, fromDisplay } from '@/lib/units'
import { localDateKey } from '@/lib/rotation'

const FOUR_WEEKS = 28 * 86_400_000

export function ProgressScreen() {
  const sessions = useApp((s) => s.sessions)
  const bodyWeight = useApp((s) => s.bodyWeight.filter((b) => !b.deletedAt))
  const units = useApp((s) => s.settings.units)
  const logBodyWeight = useApp((s) => s.logBodyWeight)
  const [open, setOpen] = useState<string | null>(null)

  const history = useMemo(() => completedSessions(sessions), [sessions])

  /** Working sets per muscle over the last four weeks — the standard volume unit. */
  const volume = useMemo(() => {
    const since = Date.now() - FOUR_WEEKS
    const counts: Partial<Record<Muscle, number>> = {}
    for (const session of history) {
      if (session.startedAt < since) continue
      for (const entry of session.entries) {
        const ex = getExercise(entry.exerciseId)
        if (!ex) continue
        const n = workSets(entry.sets).length
        for (const m of ex.primaryMuscles) counts[m] = (counts[m] ?? 0) + n
        for (const m of ex.secondaryMuscles) counts[m] = (counts[m] ?? 0) + n * 0.5
      }
    }
    return counts
  }, [history])

  const peakVolume = Math.max(1, ...Object.values(volume))
  const intensity = Object.fromEntries(
    Object.entries(volume).map(([m, v]) => [m, Math.min(1, (v as number) / peakVolume)]),
  ) as Partial<Record<Muscle, number>>

  /** The lifts you train most, which are the ones worth charting. */
  const topLifts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const session of history) {
      for (const entry of session.entries) {
        counts.set(entry.exerciseId, (counts.get(entry.exerciseId) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)
  }, [history])

  const bwPoints = bodyWeight
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({ x: new Date(b.date).getTime(), y: b.weight }))

  const lean = Object.keys(MUSCLE_LABEL)
    .filter((m) => !volume[m as Muscle])
    .slice(0, 4) as Muscle[]

  if (!history.length) {
    return (
      <div className="scroll with-tabs">
        <h1 className="h1">Progress</h1>
        <div className="empty">
          <h3>Nothing to show yet</h3>
          <p className="small">Finish a workout and your numbers start here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="scroll with-tabs">
      <h1 className="h1">Progress</h1>

      <section className="stack">
        <span className="eyebrow">Last 4 weeks</span>
        <div className="card">
          <div className="stat-row">
            <Stat label="Workouts" value={String(history.filter((s) => s.startedAt > Date.now() - FOUR_WEEKS).length)} />
            <Stat
              label="Sets"
              value={String(
                history
                  .filter((s) => s.startedAt > Date.now() - FOUR_WEEKS)
                  .reduce((n, s) => n + s.entries.reduce((m, e) => m + workSets(e.sets).length, 0), 0),
              )}
            />
            <Stat
              label="Volume"
              value={`${Math.round(
                history
                  .filter((s) => s.startedAt > Date.now() - FOUR_WEEKS)
                  .reduce(
                    (n, s) =>
                      n +
                      s.entries.reduce(
                        (m, e) => m + workSets(e.sets).reduce((v, x) => v + x.weight * x.reps, 0),
                        0,
                      ),
                    0,
                  ) / 1000,
              )}k`}
            />
          </div>
          <BodyMap intensity={intensity} size={150} />
          {lean.length > 0 && (
            <p className="small faint centre">
              Untrained lately: {lean.map((m) => MUSCLE_LABEL[m]).join(', ')}
            </p>
          )}
        </div>
      </section>

      {topLifts.length > 0 && (
        <section className="stack">
          <span className="eyebrow">Strength</span>
          {topLifts.map((id) => {
            const ex = getExercise(id)
            if (!ex) return null
            const bests = bestsForExercise(sessions, id)
            const points = history
              .slice()
              .reverse()
              .flatMap((s) =>
                s.entries
                  .filter((e) => e.exerciseId === id)
                  .map((e) => ({
                    x: s.startedAt,
                    y: Math.max(0, ...workSets(e.sets).map((x) => e1rm(x.weight, x.reps))),
                  })),
              )
              .filter((p) => p.y > 0)

            return (
              <button key={id} type="button" className="card lift-card" onClick={() => setOpen(id)}>
                <div className="between">
                  <span className="h2">{ex.name}</span>
                  <span className="num dim small">
                    {formatWeight(bests.e1rmLb, units, 0)} {units} 1RM
                  </span>
                </div>
                <LineChart points={points} height={80} format={(n) => formatWeight(n, units, 0)} />
              </button>
            )
          })}
        </section>
      )}

      <section className="stack">
        <span className="eyebrow">Body weight</span>
        <div className="card">
          <LineChart points={bwPoints} format={(n) => formatWeight(n, units, 1)} />
          <BodyWeightEntry
            onLog={logBodyWeight}
            units={units}
            todayLb={bodyWeight.find((b) => b.date === localDateKey(new Date()))?.weight}
          />
        </div>
      </section>

      <section className="stack">
        <span className="eyebrow">History</span>
        <ul className="stack">
          {history.slice(0, 20).map((s) => (
            <li key={s.id} className="card history-card">
              <div className="between">
                <span className="h2">{s.name}</span>
                <span className="small faint">
                  {new Date(s.startedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <span className="small dim">
                {s.entries.reduce((n, e) => n + workSets(e.sets).length, 0)} sets ·{' '}
                {s.entries.length} exercises
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ExerciseSheet id={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value num">{value}</span>
      <span className="eyebrow">{label}</span>
    </div>
  )
}

function BodyWeightEntry({
  onLog,
  units,
  todayLb,
}: {
  onLog: (lb: number) => void
  units: Units
  todayLb?: number
}) {
  const [value, setValue] = useState('')
  return (
    <form
      className="row bw-entry"
      onSubmit={(e) => {
        e.preventDefault()
        const n = Number(value)
        if (Number.isFinite(n) && n > 0) {
          onLog(fromDisplay(n, units))
          setValue('')
        }
      }}
    >
      <input
        className="search"
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder={
          todayLb ? `Today: ${formatWeight(todayLb, units)} ${units}` : `Weigh in (${units})`
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Body weight"
      />
      <button type="submit" className="btn btn-ghost" disabled={!value}>
        Log
      </button>
    </form>
  )
}
