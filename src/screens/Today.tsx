import { useNavigate } from 'react-router-dom'
import { useApp, selectActiveRoutine } from '@/store/app'
import { getExercise } from '@/data/exercises'
import { nextDay, streak } from '@/lib/rotation'
import { completedSessions } from '@/lib/history'
import { workSets } from '@/lib/prs'
import { formatWeight } from '@/lib/units'

/**
 * The home screen does one job: get you into the workout. Everything else is one
 * level down, because the moment you open this app you are already at the rack.
 */
export function TodayScreen() {
  const navigate = useNavigate()
  const routine = useApp(selectActiveRoutine)
  const sessions = useApp((s) => s.sessions)
  const active = useApp((s) => s.active)
  const units = useApp((s) => s.settings.units)
  const startSession = useApp((s) => s.startSession)

  const day = routine ? nextDay(routine, sessions) : undefined
  const history = completedSessions(sessions)
  const last = history[0]
  const days = streak(sessions)

  const begin = () => {
    if (!active) startSession(routine, day?.id)
    navigate('/session')
  }

  return (
    <div className="scroll with-tabs today">
      <header className="today-head">
        <span className="eyebrow">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
        <h1 className="h1">{active ? 'Workout in progress' : 'Ready'}</h1>
      </header>

      {routine && day ? (
        <div className="card next-card">
          <div className="between">
            <div>
              <span className="eyebrow">{active ? 'Resume' : 'Up next'}</span>
              <span className="h2 block">{active ? active.name : day.name}</span>
              <span className="small faint">{routine.name}</span>
            </div>
            {days > 0 && (
              <div className="streak">
                <span className="streak-n num">{days}</span>
                <span className="eyebrow">day{days === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>

          <ul className="plan">
            {(active
              ? active.entries.map((e) => ({
                  exerciseId: e.exerciseId,
                  sets: e.targetSets,
                  repRange: e.targetRepRange,
                  done: e.sets.filter((s) => s.kind === 'work').length,
                }))
              : day.items.map((it) => ({
                  exerciseId: it.exerciseId,
                  sets: it.sets,
                  repRange: it.repRange,
                  done: 0,
                }))
            ).map((item, i) => {
              const ex = getExercise(item.exerciseId)
              return (
                <li key={`${item.exerciseId}-${i}`} className="between plan-row">
                  <span className={item.done >= item.sets ? 'dim strike' : ''}>
                    {ex?.name ?? 'Unknown exercise'}
                  </span>
                  <span className="small faint num">
                    {item.sets} × {item.repRange.min}–{item.repRange.max}
                  </span>
                </li>
              )
            })}
          </ul>

          <button type="button" className="btn btn-primary btn-block" onClick={begin}>
            {active ? 'Resume workout' : 'Start workout'}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="empty">
            <h3>No routine yet</h3>
            <p className="small">Pick a template — it takes one tap.</p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => navigate('/routines')}
          >
            Choose a routine
          </button>
        </div>
      )}

      {!active && (
        <button type="button" className="btn-quiet freestyle" onClick={begin}>
          Start an empty workout
        </button>
      )}

      {last && (
        <section className="stack last-card">
          <span className="eyebrow">Last workout</span>
          <div className="card">
            <div className="between">
              <span className="h2">{last.name}</span>
              <span className="small faint">
                {new Date(last.startedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <ul className="stack last-list">
              {last.entries.slice(0, 6).map((e, i) => {
                const ex = getExercise(e.exerciseId)
                const sets = workSets(e.sets)
                const top = sets.reduce((m, s) => Math.max(m, s.weight), 0)
                return (
                  <li key={i} className="between small">
                    <span className="dim">{ex?.name ?? e.exerciseId}</span>
                    <span className="num faint">
                      {sets.length} × {formatWeight(top, units)} {units}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
