import { beforeEach, describe, expect, it } from 'vitest'
import { autofillSets } from './autofill'
import { entry, resetClock, session, set, testExercise, testSettings } from './testing'

const bench = testExercise()
const squat = testExercise({ id: 'squat', name: 'Barbell Squat', isLower: true })
const range = { min: 5, max: 8 }
const base = { targetSets: 3, repRange: range, settings: testSettings() }

beforeEach(resetClock)

describe('autofillSets', () => {
  it('cannot guess a weight it has never seen, but still knows the reps', () => {
    const rows = autofillSets({ ...base, exercise: bench, sessions: [] })
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => r.weight === null)).toBe(true)
    expect(rows.every((r) => r.reps === 5)).toBe(true)
    expect(rows[0].source).toBe('range')
  })

  it('repeats last time exactly when the reps were mid-range', () => {
    const sessions = [session([entry('bench', [set(185, 6), set(185, 6), set(185, 5)])])]
    const rows = autofillSets({ ...base, exercise: bench, sessions })
    expect(rows.map((r) => [r.weight, r.reps])).toEqual([
      [185, 6],
      [185, 6],
      [185, 5],
    ])
    expect(rows[0].source).toBe('previous')
  })

  it('matches set for set, so a drop set is not prefilled as a straight set', () => {
    const sessions = [session([entry('bench', [set(225, 5), set(205, 6), set(185, 7)])])]
    const rows = autofillSets({ ...base, exercise: bench, sessions })
    expect(rows.map((r) => r.weight)).toEqual([225, 205, 185])
  })

  it('carries the final set forward when today prescribes more sets than last time', () => {
    const sessions = [session([entry('bench', [set(185, 6), set(185, 6)])])]
    const rows = autofillSets({ ...base, exercise: bench, sessions, targetSets: 4 })
    expect(rows.map((r) => r.weight)).toEqual([185, 185, 185, 185])
  })

  it('ignores warmups when reading last time', () => {
    const sessions = [
      session([entry('bench', [set(45, 8, 'warmup'), set(135, 5, 'warmup'), set(185, 6)])]),
    ]
    const rows = autofillSets({ ...base, exercise: bench, sessions })
    expect(rows[0].weight).toBe(185)
    expect(rows.every((r) => r.kind === 'work')).toBe(true)
  })

  it('bumps an upper-body lift by 5 lb once every set hit the top of the range', () => {
    const sessions = [session([entry('bench', [set(185, 8), set(185, 8), set(185, 8)])])]
    const rows = autofillSets({ ...base, exercise: bench, sessions })
    expect(rows.map((r) => r.weight)).toEqual([190, 190, 190])
    expect(rows[0].source).toBe('progression')
    // A bump resets the ask to the bottom of the range at the new weight.
    expect(rows.map((r) => r.reps)).toEqual([5, 5, 5])
  })

  it('bumps a lower-body lift by the larger increment', () => {
    const sessions = [session([entry('squat', [set(275, 8), set(275, 8), set(275, 8)])])]
    const rows = autofillSets({ ...base, exercise: squat, sessions })
    expect(rows[0].weight).toBe(285)
  })

  it('holds the weight when one set fell short of the top', () => {
    const sessions = [session([entry('bench', [set(185, 8), set(185, 8), set(185, 6)])])]
    const rows = autofillSets({ ...base, exercise: bench, sessions })
    expect(rows.map((r) => r.weight)).toEqual([185, 185, 185])
    expect(rows[0].source).toBe('previous')
  })

  it('backs off 10% after two straight sessions under the rep target', () => {
    const sessions = [
      session([entry('bench', [set(225, 4), set(225, 3), set(225, 3)])]),
      session([entry('bench', [set(225, 4), set(225, 3), set(225, 2)])]),
    ]
    const rows = autofillSets({ ...base, exercise: bench, sessions })
    // 225 * 0.9 = 202.5, which does not load on a 45 lb bar; 200 does.
    expect(rows[0].weight).toBe(200)
    expect(rows[0].source).toBe('deload')
  })

  it('does not back off after a single bad day', () => {
    const sessions = [
      session([entry('bench', [set(225, 6), set(225, 6), set(225, 6)])]),
      session([entry('bench', [set(225, 4), set(225, 3), set(225, 2)])]),
    ]
    expect(autofillSets({ ...base, exercise: bench, sessions })[0].weight).toBe(225)
  })

  it('reads the most recent session, not the first one it finds', () => {
    const sessions = [
      session([entry('bench', [set(155, 6)])]),
      session([entry('bench', [set(185, 6)])]),
    ]
    expect(autofillSets({ ...base, exercise: bench, sessions })[0].weight).toBe(185)
  })

  it('ignores a session still in progress', () => {
    const sessions = [
      session([entry('bench', [set(185, 6)])]),
      session([entry('bench', [set(999, 1)])], { endedAt: undefined }),
    ]
    expect(autofillSets({ ...base, exercise: bench, sessions })[0].weight).toBe(185)
  })

  it('ignores a deleted session', () => {
    const sessions = [
      session([entry('bench', [set(185, 6)])]),
      session([entry('bench', [set(999, 1)])], { deletedAt: Date.now() }),
    ]
    expect(autofillSets({ ...base, exercise: bench, sessions })[0].weight).toBe(185)
  })

  it('leaves everything alone when progression is switched off', () => {
    const settings = testSettings({
      progression: { ...testSettings().progression, enabled: false },
    })
    const sessions = [session([entry('bench', [set(185, 8), set(185, 8), set(185, 8)])])]
    const rows = autofillSets({ ...base, settings, exercise: bench, sessions })
    expect(rows[0].weight).toBe(185)
    expect(rows[0].source).toBe('previous')
  })

  it('snaps a bumped dumbbell lift to a real increment instead of a loadable bar', () => {
    const curl = testExercise({ id: 'curl', equipment: 'dumbbell', usesBar: false })
    const sessions = [session([entry('curl', [set(30, 8), set(30, 8), set(30, 8)])])]
    expect(autofillSets({ ...base, exercise: curl, sessions })[0].weight).toBe(35)
  })
})
