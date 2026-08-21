import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LoggedSet, SessionEntry } from '@/types'
import { useApp, nextSetFor } from '@/store/app'
import { getExercise } from '@/data/exercises'
import { Stepper } from '@/components/Stepper'
import { NumberPad } from '@/components/NumberPad'
import { RestBar, formatClock, useRestTimer } from '@/components/RestTimer'
import { ExerciseDemo } from '@/components/ExerciseDemo'
import { ExerciseSheet } from './ExerciseDetail'
import { describeStack, solvePlates } from '@/lib/plates'
import { buildWarmup } from '@/lib/warmup'
import { bestsForExercise, PR_LABEL, prsForSet, type PRKind } from '@/lib/prs'
import { SOURCE_HINT } from '@/lib/autofill'
import { formatWeight, stepLb, toDisplay, fromDisplay } from '@/lib/units'
import { haptic, useWakeLock } from '@/lib/useWakeLock'

export function SessionScreen() {
  const navigate = useNavigate()
  const active = useApp((s) => s.active)
  const settings = useApp((s) => s.settings)
  const sessions = useApp((s) => s.sessions)
  const updateActive = useApp((s) => s.updateActive)
  const finishSession = useApp((s) => s.finishSession)
  const discardSession = useApp((s) => s.discardSession)

  const [index, setIndex] = useState(0)
  const [weight, setWeight] = useState<number | null>(null)
  const [reps, setReps] = useState(8)
  const [pad, setPad] = useState<'weight' | 'reps' | null>(null)
  const [prs, setPrs] = useState<PRKind[]>([])
  const [detail, setDetail] = useState<string | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)

  const entry = active?.entries[index]
  const exercise = entry ? getExercise(entry.exerciseId) : undefined
  const rest = useRestTimer(entry?.restSec ?? settings.defaultRestSec)

  useWakeLock(Boolean(active))

  const workSets = entry?.sets.filter((s) => s.kind === 'work') ?? []
  // Re-derived whenever a set lands, which is what keeps the next row prefilled.
  const suggestion = useMemo(
    () => (entry ? nextSetFor({ sessions, settings }, entry) : undefined),
    [entry, sessions, settings],
  )

  /**
   * Pull the prefill into the editable draft only when the set you are about to
   * do actually changes — a new exercise, or a set landed. Re-syncing on every
   * change to the entry would throw away a weight you had just dialled in the
   * moment you added warmups or removed a set.
   */
  const draftKey = `${index}:${workSets.length}`
  const suggestionRef = useRef(suggestion)
  suggestionRef.current = suggestion

  useEffect(() => {
    const next = suggestionRef.current
    if (!next) return
    setWeight(next.weight)
    setReps(next.reps)
  }, [draftKey])

  useEffect(() => {
    if (!active) navigate('/', { replace: true })
  }, [active, navigate])

  if (!active || !entry || !exercise) return null

  const priorBests = bestsForExercise(sessions, entry.exerciseId)
  const done = workSets.length
  const target = entry.targetSets
  const plates =
    exercise.usesBar && weight != null
      ? solvePlates(weight, settings.barWeightLb, settings.platesLb)
      : undefined

  const logSet = (kind: LoggedSet['kind'] = 'work') => {
    if (weight === null) {
      setPad('weight')
      return
    }
    const set: LoggedSet = { weight, reps, kind, completedAt: Date.now() }
    const hits = kind === 'work' ? prsForSet(set, priorBests) : []

    updateActive((draft) => {
      draft.entries[index].sets.push(set)
    })

    haptic(hits.length ? [14, 40, 14] : 12)
    setPrs(hits)
    if (hits.length) setTimeout(() => setPrs([]), 2600)

    if (kind === 'work') advance()
    else rest.start(45)
  }

  /**
   * Supersets alternate without rest and rest once the pair is done; straight
   * sets rest immediately. Either way this costs zero taps.
   */
  const advance = () => {
    const partner = findSupersetPartner(active.entries, index, entry)
    if (partner !== -1) {
      setIndex(partner)
      return
    }
    rest.start(entry.restSec)
    if (done + 1 >= target) {
      const next = findNextUnfinished(active.entries, index)
      if (next !== -1) setIndex(next)
    }
  }

  const warmup = buildWarmup(exercise, weight ?? 0, {
    barLb: settings.barWeightLb,
    platesLb: settings.platesLb,
  })

  const step = stepLb(settings.units)
  const allDone = active.entries.every(
    (e) => e.sets.filter((s) => s.kind === 'work').length >= e.targetSets,
  )

  return (
    <div className="app session">
      <header className="session-head">
        <button
          type="button"
          className="btn-quiet"
          onClick={() => navigate('/')}
          aria-label="Back, keep workout running"
        >
          ‹
        </button>
        <div className="session-title">
          <span className="h2">{active.name}</span>
          <Elapsed since={active.startedAt} />
        </div>
        <button
          type="button"
          className={`btn-quiet${allDone ? ' accent' : ''}`}
          onClick={() => setConfirmFinish(true)}
        >
          Finish
        </button>
      </header>

      <div className="scroll session-scroll">
        <div className="current card">
          <button type="button" className="current-head" onClick={() => setDetail(exercise.id)}>
            <div className="current-thumb">
              <ExerciseDemo exercise={exercise} playing={false} />
            </div>
            <div className="current-name">
              <span className="h2">{exercise.name}</span>
              <span className="small dim">
                Set {done + 1} of {target} · {entry.targetRepRange.min}–{entry.targetRepRange.max}{' '}
                reps
                {entry.supersetGroup ? ' · superset' : ''}
              </span>
            </div>
            <span className="faint" aria-hidden>
              ›
            </span>
          </button>

          {entry.sets.length > 0 && (
            <ul className="logged">
              {entry.sets.map((s, i) => (
                <li key={i} className={`logged-row${s.kind === 'warmup' ? ' warm' : ''}`}>
                  <span className="faint small">{s.kind === 'warmup' ? 'W' : setNumber(entry, i)}</span>
                  <span className="num">
                    {formatWeight(s.weight, settings.units)} {settings.units}
                  </span>
                  <span className="num dim">× {s.reps}</span>
                  <button
                    type="button"
                    className="btn-quiet undo"
                    aria-label="Remove this set"
                    onClick={() =>
                      updateActive((draft) => {
                        draft.entries[index].sets.splice(i, 1)
                      })
                    }
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="inputs">
            <Stepper
              label="Weight"
              value={weight === null ? null : Number(formatWeight(weight, settings.units))}
              onChange={(v) => setWeight(fromDisplay(v, settings.units))}
              onTapValue={() => setPad('weight')}
              step={toDisplay(step, settings.units)}
              suffix={settings.units}
              emphasis
            />
            <Stepper
              label="Reps"
              value={reps}
              onChange={setReps}
              onTapValue={() => setPad('reps')}
              step={1}
              min={1}
              emphasis
            />
          </div>

          <div className="meta-line small">
            {plates && (
              <span className={plates.exact ? 'dim' : 'warn'}>
                {describeStack(plates, settings.units)}
                {!plates.exact && !plates.belowBar ? ' (nearest)' : ''}
              </span>
            )}
            {suggestion && suggestion.source !== 'manual' && (
              <span className={suggestion.source === 'progression' ? 'accent' : 'faint'}>
                {SOURCE_HINT[suggestion.source]}
              </span>
            )}
          </div>

          {entry.sets.length === 0 && warmup.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost warmup-btn"
              onClick={() => {
                updateActive((draft) => {
                  for (const w of warmup) {
                    draft.entries[index].sets.push({
                      weight: w.weight ?? 0,
                      reps: w.reps,
                      kind: 'warmup',
                      completedAt: Date.now(),
                    })
                  }
                })
                haptic(12)
              }}
            >
              Add {warmup.length} warmup sets
            </button>
          )}
        </div>

        <ul className="queue">
          {active.entries.map((e, i) => {
            if (i === index) return null
            const ex = getExercise(e.exerciseId)
            if (!ex) return null
            const complete = e.sets.filter((s) => s.kind === 'work').length
            return (
              <li key={`${e.exerciseId}-${i}`}>
                <button type="button" className="queue-row" onClick={() => setIndex(i)}>
                  <span className={complete >= e.targetSets ? 'dim strike' : ''}>{ex.name}</span>
                  <span className="num faint small">
                    {complete}/{e.targetSets}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <footer className="session-foot">
        {rest.running && (
          <RestBar
            remaining={rest.remaining}
            total={entry.restSec}
            onSkip={rest.stop}
            onExtend={rest.extend}
          />
        )}
        {prs.length > 0 && (
          <div className="pr-toast" role="status">
            {prs.map((p) => (
              <span key={p} className="badge">
                {PR_LABEL[p]}
              </span>
            ))}
          </div>
        )}
        <button type="button" className="btn btn-primary btn-block log-btn" onClick={() => logSet()}>
          Log set
          <span className="log-hint num">
            {weight === null ? 'set a weight' : `${formatWeight(weight, settings.units)} × ${reps}`}
          </span>
        </button>
      </footer>

      <NumberPad
        open={pad === 'weight'}
        title={`Weight (${settings.units})`}
        initial={weight === null ? null : Number(formatWeight(weight, settings.units))}
        onCommit={(v) => setWeight(fromDisplay(v, settings.units))}
        onClose={() => setPad(null)}
      />
      <NumberPad
        open={pad === 'reps'}
        title="Reps"
        initial={reps}
        allowDecimal={false}
        onCommit={(v) => setReps(Math.max(1, Math.round(v)))}
        onClose={() => setPad(null)}
      />

      <ExerciseSheet id={detail} onClose={() => setDetail(null)} />

      {confirmFinish && (
        <div className="sheet-scrim" onClick={() => setConfirmFinish(false)}>
          <div className="confirm card" onClick={(e) => e.stopPropagation()}>
            <span className="h2">Finish this workout?</span>
            <p className="small dim">
              {countLogged(active.entries)} sets logged.
              {allDone ? '' : ' Some exercises are unfinished — they just will not be saved.'}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                finishSession()
                navigate('/', { replace: true })
              }}
            >
              Finish and save
            </button>
            <button
              type="button"
              className="btn btn-block btn-ghost"
              onClick={() => setConfirmFinish(false)}
            >
              Keep lifting
            </button>
            <button
              type="button"
              className="btn-quiet danger"
              onClick={() => {
                discardSession()
                navigate('/', { replace: true })
              }}
            >
              Discard workout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="small faint num">{formatClock(Math.floor((now - since) / 1000))}</span>
}

/** The next partner in a superset that is still behind on sets. */
function findSupersetPartner(entries: SessionEntry[], from: number, entry: SessionEntry): number {
  if (!entry.supersetGroup) return -1
  const done = entry.sets.filter((s) => s.kind === 'work').length + 1
  for (let step = 1; step < entries.length; step++) {
    const i = (from + step) % entries.length
    const candidate = entries[i]
    if (candidate.supersetGroup !== entry.supersetGroup) continue
    const theirs = candidate.sets.filter((s) => s.kind === 'work').length
    if (theirs < done && theirs < candidate.targetSets) return i
  }
  return -1
}

function findNextUnfinished(entries: SessionEntry[], from: number): number {
  for (let step = 1; step <= entries.length; step++) {
    const i = (from + step) % entries.length
    const e = entries[i]
    if (e.sets.filter((s) => s.kind === 'work').length < e.targetSets) return i
  }
  return -1
}

function setNumber(entry: SessionEntry, upTo: number): number {
  return entry.sets.slice(0, upTo + 1).filter((s) => s.kind === 'work').length
}

function countLogged(entries: SessionEntry[]): number {
  return entries.reduce((n, e) => n + e.sets.filter((s) => s.kind === 'work').length, 0)
}
