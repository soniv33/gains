import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Routine, RoutineDay, RoutineItem } from '@/types'
import { useApp } from '@/store/app'
import { ulid } from '@/db/ulid'
import { getExercise, rankedSearch } from '@/data/exercises'
import { Sheet } from '@/components/Sheet'
import { ExerciseDemo } from '@/components/ExerciseDemo'

const blank = (): Routine => ({
  id: ulid(),
  updatedAt: Date.now(),
  name: 'My routine',
  source: 'user',
  days: [{ id: ulid(), name: 'Day 1', items: [] }],
})

export function RoutineBuilderScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = useApp((s) => s.routines.find((r) => r.id === id))
  const saveRoutine = useApp((s) => s.saveRoutine)
  const setActiveRoutine = useApp((s) => s.setActiveRoutine)

  const [routine, setRoutine] = useState<Routine>(() => existing ?? blank())
  const [dayIndex, setDayIndex] = useState(0)
  const [picking, setPicking] = useState(false)

  const day = routine.days[dayIndex]

  const patchDay = (mutate: (d: RoutineDay) => RoutineDay) =>
    setRoutine((r) => ({
      ...r,
      days: r.days.map((d, i) => (i === dayIndex ? mutate({ ...d, items: [...d.items] }) : d)),
    }))

  const patchItem = (index: number, patch: Partial<RoutineItem>) =>
    patchDay((d) => {
      d.items[index] = { ...d.items[index], ...patch }
      return d
    })

  const move = (index: number, delta: number) =>
    patchDay((d) => {
      const to = index + delta
      if (to < 0 || to >= d.items.length) return d
      const [item] = d.items.splice(index, 1)
      d.items.splice(to, 0, item)
      return d
    })

  const save = () => {
    const cleaned: Routine = {
      ...routine,
      days: routine.days.filter((d) => d.items.length > 0),
    }
    if (!cleaned.days.length) {
      navigate('/routines')
      return
    }
    saveRoutine(cleaned)
    if (!existing) setActiveRoutine(cleaned.id)
    navigate('/routines')
  }

  return (
    <div className="scroll with-tabs">
      <div className="between builder-head">
        <button type="button" className="btn-quiet" onClick={() => navigate('/routines')}>
          Cancel
        </button>
        <button type="button" className="btn-quiet accent" onClick={save}>
          Save
        </button>
      </div>

      <input
        className="title-input"
        value={routine.name}
        onChange={(e) => setRoutine((r) => ({ ...r, name: e.target.value }))}
        aria-label="Routine name"
      />

      <div className="row wrap chips">
        {routine.days.map((d, i) => (
          <button
            key={d.id}
            type="button"
            className="chip"
            aria-pressed={i === dayIndex}
            onClick={() => setDayIndex(i)}
          >
            {d.name}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() => {
            setRoutine((r) => ({
              ...r,
              days: [...r.days, { id: ulid(), name: `Day ${r.days.length + 1}`, items: [] }],
            }))
            setDayIndex(routine.days.length)
          }}
        >
          + Day
        </button>
      </div>

      {day && (
        <>
          <input
            className="search"
            value={day.name}
            onChange={(e) => patchDay((d) => ({ ...d, name: e.target.value }))}
            aria-label="Day name"
          />

          <ul className="stack">
            {day.items.map((item, i) => {
              const ex = getExercise(item.exerciseId)
              return (
                <li key={`${item.exerciseId}-${i}`} className="card builder-item">
                  <div className="between">
                    <span className="h2">{ex?.name ?? item.exerciseId}</span>
                    <div className="row">
                      <button type="button" className="btn-quiet" onClick={() => move(i, -1)} aria-label="Move up">
                        ↑
                      </button>
                      <button type="button" className="btn-quiet" onClick={() => move(i, 1)} aria-label="Move down">
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-quiet danger"
                        aria-label="Remove"
                        onClick={() =>
                          patchDay((d) => {
                            d.items.splice(i, 1)
                            return d
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="row wrap builder-fields">
                    <Field
                      label="Sets"
                      value={item.sets}
                      onChange={(v) => patchItem(i, { sets: clamp(v, 1, 12) })}
                    />
                    <Field
                      label="Min reps"
                      value={item.repRange.min}
                      onChange={(v) =>
                        patchItem(i, { repRange: { ...item.repRange, min: clamp(v, 1, 50) } })
                      }
                    />
                    <Field
                      label="Max reps"
                      value={item.repRange.max}
                      onChange={(v) =>
                        patchItem(i, { repRange: { ...item.repRange, max: clamp(v, 1, 50) } })
                      }
                    />
                    <Field
                      label="Rest (s)"
                      value={item.restSec}
                      step={15}
                      onChange={(v) => patchItem(i, { restSec: clamp(v, 0, 600) })}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          <button type="button" className="btn btn-ghost btn-block" onClick={() => setPicking(true)}>
            Add exercise
          </button>
        </>
      )}

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(exerciseId) => {
          const ex = getExercise(exerciseId)
          patchDay((d) => {
            d.items.push({
              exerciseId,
              sets: 3,
              repRange: ex?.defaultRepRange ?? { min: 8, max: 12 },
              restSec: ex?.defaultRestSec ?? 120,
            })
            return d
          })
          setPicking(false)
        }}
      />
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div className="field">
      <span className="eyebrow">{label}</span>
      <div className="row field-row">
        <button type="button" className="stepper-btn sm" onClick={() => onChange(value - step)}>
          −
        </button>
        <span className="num field-value">{value}</span>
        <button type="button" className="stepper-btn sm" onClick={() => onChange(value + step)}>
          +
        </button>
      </div>
    </div>
  )
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => rankedSearch({ query }, 40), [query])

  return (
    <Sheet open={open} onClose={onClose} label="Add exercise">
      <div className="stack">
        <input
          className="search"
          type="search"
          autoFocus
          placeholder="Search exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search exercises"
        />
        <ul className="stack">
          {results.map((e) => (
            <li key={e.id}>
              <button type="button" className="ex-row" onClick={() => onPick(e.id)}>
                <div className="ex-thumb">
                  <ExerciseDemo exercise={e} playing={false} />
                </div>
                <div className="ex-text">
                  <span className="ex-name">{e.name}</span>
                  <span className="small faint">
                    {e.primaryMuscles.join(', ')} · {e.equipment}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
