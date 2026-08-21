import { useMemo, useState } from 'react'
import type { Equipment, Muscle } from '@/types'
import { rankedSearch } from '@/data/exercises'
import { BodyMap } from '@/components/BodyMap'
import { MUSCLE_LABEL } from '@/data/muscles'
import { ExerciseDemo } from '@/components/ExerciseDemo'
import { ExerciseSheet } from './ExerciseDetail'

const EQUIPMENT: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'bands',
  'ez bar',
]

/**
 * Filtering by muscle is a tap on the figure rather than a dropdown — faster,
 * and it answers "what do I have for rear delts?" the way you actually think it.
 */
export function LibraryScreen() {
  const [query, setQuery] = useState('')
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [open, setOpen] = useState<string | null>(null)

  const results = useMemo(
    () => rankedSearch({ query, muscles, equipment }, 120),
    [query, muscles, equipment],
  )

  const toggleMuscle = (m: Muscle) =>
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))

  const toggleEquipment = (e: Equipment) =>
    setEquipment((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]))

  const filtered = muscles.length > 0 || equipment.length > 0 || query.length > 0

  return (
    <div className="scroll with-tabs">
      <h1 className="h1">Library</h1>

      <input
        className="search"
        type="search"
        placeholder="Search 736 exercises"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search exercises"
      />

      <div className="filter-row">
        <BodyMap
          size={132}
          intensity={Object.fromEntries(muscles.map((m) => [m, 1]))}
          onSelect={toggleMuscle}
        />
        <div className="filter-hint stack">
          <span className="eyebrow">Filter by muscle</span>
          <span className="small dim">
            {muscles.length
              ? muscles.map((m) => MUSCLE_LABEL[m]).join(', ')
              : 'Tap the figure to narrow the list.'}
          </span>
        </div>
      </div>

      <div className="chip-scroll">
        {EQUIPMENT.map((e) => (
          <button
            key={e}
            type="button"
            className="chip"
            aria-pressed={equipment.includes(e)}
            onClick={() => toggleEquipment(e)}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="between results-head">
        <span className="eyebrow">{results.length} exercises</span>
        {filtered && (
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              setMuscles([])
              setEquipment([])
              setQuery('')
            }}
          >
            Clear
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <h3>Nothing matches</h3>
          <p className="small">Try clearing a filter or two.</p>
        </div>
      ) : (
        <ul className="stack">
          {results.map((e) => (
            <li key={e.id}>
              <button type="button" className="ex-row" onClick={() => setOpen(e.id)}>
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
      )}

      <ExerciseSheet id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
