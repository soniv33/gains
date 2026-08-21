import { describe, expect, it } from 'vitest'
import { buildWarmup } from './warmup'
import { testExercise } from './testing'
import { DEFAULT_PLATES_LB } from './units'

const opts = { barLb: 45, platesLb: DEFAULT_PLATES_LB }
const bench = testExercise()
const db = testExercise({ id: 'db', equipment: 'dumbbell', usesBar: false })

describe('buildWarmup', () => {
  it('ramps from the empty bar with descending reps', () => {
    const ramp = buildWarmup(bench, 225, opts)
    expect(ramp[0]).toMatchObject({ weight: 45, reps: 8 })
    expect(ramp.map((s) => s.weight)).toEqual([45, 100, 145, 190])
    expect(ramp.map((s) => s.reps)).toEqual([8, 5, 3, 2])
  })

  it('marks every rung as a warmup so it stays out of volume and PRs', () => {
    expect(buildWarmup(bench, 225, opts).every((s) => s.kind === 'warmup')).toBe(true)
  })

  it('only prescribes weights that actually load on the bar', () => {
    for (const s of buildWarmup(bench, 317.5, opts)) {
      expect(((s.weight! - 45) / 2) % 2.5).toBeCloseTo(0, 6)
    }
  })

  it('does not ramp to a weight barely above the empty bar', () => {
    expect(buildWarmup(bench, 55, opts)).toEqual([])
  })

  it('never repeats a rung when two percentages round to the same load', () => {
    const weights = buildWarmup(bench, 95, opts).map((s) => s.weight)
    expect(new Set(weights).size).toBe(weights.length)
  })

  it('uses a shorter ramp for dumbbells, which have no bar to start from', () => {
    expect(buildWarmup(db, 80, opts).map((s) => [s.weight, s.reps])).toEqual([
      [40, 8],
      [60, 4],
    ])
  })

  it('skips the ramp entirely for a light isolation weight', () => {
    expect(buildWarmup(db, 15, opts)).toEqual([])
  })

  it('returns nothing when the working weight is unknown', () => {
    expect(buildWarmup(bench, 0, opts)).toEqual([])
  })
})
