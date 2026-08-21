import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/store/app'
import { getExercise, loadInstructions } from '@/data/exercises'
import { MUSCLE_LABEL } from '@/data/muscles'
import { BodyMap, emphasis } from '@/components/BodyMap'
import { ExerciseDemo } from '@/components/ExerciseDemo'
import { Sheet } from '@/components/Sheet'
import { LineChart } from '@/components/Chart'
import { bestsForExercise, e1rm, workSets } from '@/lib/prs'
import { performances } from '@/lib/history'
import { formatWeight } from '@/lib/units'

/** The "how do I do this" sheet. Reachable from the library and mid-session. */
export function ExerciseSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const sessions = useApp((s) => s.sessions)
  const units = useApp((s) => s.settings.units)
  const exercise = id ? getExercise(id) : undefined
  const steps = useInstructions(id)

  const history = useMemo(
    () => (exercise ? performances(sessions, exercise.id) : []),
    [sessions, exercise],
  )

  const points = useMemo(
    () =>
      history
        .slice(0, 20)
        .reverse()
        .map(({ session, entry }) => ({
          x: session.startedAt,
          y: Math.max(0, ...workSets(entry.sets).map((s) => e1rm(s.weight, s.reps))),
        }))
        .filter((p) => p.y > 0),
    [history],
  )

  if (!exercise) return null
  const bests = bestsForExercise(sessions, exercise.id)

  return (
    <Sheet open={Boolean(id)} onClose={onClose} label={exercise.name}>
      <div className="stack detail">
        <div>
          <span className="h1">{exercise.name}</span>
          <div className="row wrap chips">
            <span className="chip">{exercise.equipment}</span>
            <span className="chip">{exercise.mechanic}</span>
            <span className="chip">{exercise.level}</span>
          </div>
        </div>

        <ExerciseDemo exercise={exercise} />

        <div className="detail-muscles">
          <BodyMap
            intensity={emphasis(exercise.primaryMuscles, exercise.secondaryMuscles)}
            size={130}
          />
          <div className="stack detail-muscle-list">
            <div>
              <span className="eyebrow">Trains</span>
              <div>{exercise.primaryMuscles.map((m) => MUSCLE_LABEL[m]).join(', ')}</div>
            </div>
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <span className="eyebrow">Also</span>
                <div className="dim">
                  {exercise.secondaryMuscles.map((m) => MUSCLE_LABEL[m]).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {steps.length > 0 && (
          <div>
            <span className="eyebrow">How to perform</span>
            <ol className="steps">
              {steps.map((line, i) => (
                <li key={i}>
                  <span className="step-n num">{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {bests.weightLb > 0 && (
          <div>
            <span className="eyebrow">Your records</span>
            <div className="records">
              <Record label="Heaviest" value={`${formatWeight(bests.weightLb, units)} ${units}`} />
              <Record label="Est. 1RM" value={`${formatWeight(bests.e1rmLb, units)} ${units}`} />
              <Record label="Best set" value={`${formatWeight(bests.volumeLb, units)} ${units}`} />
            </div>
            <LineChart points={points} format={(n) => formatWeight(n, units, 0)} />
          </div>
        )}

        {history.length > 0 && (
          <div>
            <span className="eyebrow">Recent sessions</span>
            <ul className="stack history-list">
              {history.slice(0, 8).map(({ session, entry }) => (
                <li key={session.id} className="between">
                  <span className="small dim">
                    {new Date(session.startedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="small num">
                    {workSets(entry.sets)
                      .map((s) => `${formatWeight(s.weight, units)}×${s.reps}`)
                      .join('  ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  )
}

/** Loaded on first open, then cached for the rest of the session. */
function useInstructions(id: string | null): string[] {
  const [steps, setSteps] = useState<string[]>([])
  useEffect(() => {
    if (!id) {
      setSteps([])
      return
    }
    let live = true
    void loadInstructions().then((all) => {
      if (live) setSteps(all[id] ?? [])
    })
    return () => {
      live = false
    }
  }, [id])
  return steps
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <div className="record">
      <span className="record-value num">{value}</span>
      <span className="eyebrow">{label}</span>
    </div>
  )
}
