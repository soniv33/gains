import { beforeEach, describe, expect, it } from 'vitest'
import { bestsForExercise, e1rm, prsForSet } from './prs'
import { entry, resetClock, session, set } from './testing'

beforeEach(resetClock)

describe('e1rm', () => {
  it('returns the weight itself for a single', () => {
    expect(e1rm(315, 1)).toBe(315)
  })

  it('follows Epley for multi-rep sets', () => {
    expect(e1rm(225, 5)).toBeCloseTo(262.5, 6)
  })

  it('stops inflating past 12 reps, where the formula loses meaning', () => {
    expect(e1rm(100, 20)).toBe(e1rm(100, 12))
  })

  it('is zero for a set that was never performed', () => {
    expect(e1rm(0, 5)).toBe(0)
    expect(e1rm(225, 0)).toBe(0)
  })
})

describe('bestsForExercise', () => {
  it('takes the best of each kind across all history', () => {
    const sessions = [
      session([entry('bench', [set(185, 10), set(185, 10)])]),
      session([entry('bench', [set(245, 1)])]),
    ]
    const best = bestsForExercise(sessions, 'bench')
    expect(best.weightLb).toBe(245)
    expect(best.volumeLb).toBe(1850)
    expect(best.e1rmLb).toBeCloseTo(e1rm(185, 10), 6)
  })

  it('never counts a warmup as a record', () => {
    const sessions = [session([entry('bench', [set(500, 1, 'warmup'), set(135, 5)])])]
    expect(bestsForExercise(sessions, 'bench').weightLb).toBe(135)
  })

  it('can look at only the history before a point in time', () => {
    const first = session([entry('bench', [set(185, 5)])])
    const second = session([entry('bench', [set(225, 5)])])
    expect(bestsForExercise([first, second], 'bench', second.startedAt).weightLb).toBe(185)
  })
})

describe('prsForSet', () => {
  const prior = { weightLb: 225, e1rmLb: 262.5, volumeLb: 1125 }

  it('calls a heavier single a weight PR without claiming the others', () => {
    expect(prsForSet(set(235, 1), prior)).toEqual(['weight'])
  })

  it('recognises more reps at the same weight as a strength gain', () => {
    expect(prsForSet(set(225, 6), prior)).toEqual(['e1rm', 'volume'])
  })

  it('stays quiet on a set that beat nothing', () => {
    expect(prsForSet(set(185, 5), prior)).toEqual([])
  })

  it('never awards a PR to a warmup', () => {
    expect(prsForSet(set(400, 5, 'warmup'), prior)).toEqual([])
  })

  it('treats the very first set of a new lift as a record on all three counts', () => {
    expect(prsForSet(set(95, 5), { weightLb: 0, e1rmLb: 0, volumeLb: 0 })).toEqual([
      'weight',
      'e1rm',
      'volume',
    ])
  })
})
