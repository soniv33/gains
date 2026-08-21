import { beforeEach, describe, expect, it } from 'vitest'
import { nextDay, streak } from './rotation'
import { entry, resetClock, session, set } from './testing'
import type { Routine } from '@/types'

const routine: Routine = {
  id: 'r1',
  updatedAt: 0,
  name: 'PPL',
  source: 'template',
  days: [
    { id: 'push', name: 'Push', items: [] },
    { id: 'pull', name: 'Pull', items: [] },
    { id: 'legs', name: 'Legs', items: [] },
  ],
}

beforeEach(resetClock)

describe('nextDay', () => {
  it('starts at the first day when there is no history', () => {
    expect(nextDay(routine, []).id).toBe('push')
  })

  it('advances to the day after the one you last finished', () => {
    const sessions = [session([], { routineId: 'r1', dayId: 'push' })]
    expect(nextDay(routine, sessions).id).toBe('pull')
  })

  it('wraps around at the end of the split', () => {
    const sessions = [session([], { routineId: 'r1', dayId: 'legs' })]
    expect(nextDay(routine, sessions).id).toBe('push')
  })

  it('picks up where you left off rather than where the calendar says', () => {
    const sessions = [
      session([], { routineId: 'r1', dayId: 'push', startedAt: 1 }),
      session([], { routineId: 'r1', dayId: 'pull', startedAt: 2 }),
    ]
    // Three weeks off does not restart the split.
    expect(nextDay(routine, sessions).id).toBe('legs')
  })

  it('ignores sessions from a different routine', () => {
    const sessions = [session([], { routineId: 'other', dayId: 'legs' })]
    expect(nextDay(routine, sessions).id).toBe('push')
  })

  it('ignores a workout that was never finished', () => {
    const sessions = [session([], { routineId: 'r1', dayId: 'push', endedAt: undefined })]
    expect(nextDay(routine, sessions).id).toBe('push')
  })
})

describe('streak', () => {
  const day = 86_400_000
  const at = (now: number, daysAgo: number) =>
    session([entry('bench', [set(135, 5)])], { startedAt: now - daysAgo * day })

  it('is zero with no history', () => {
    expect(streak([], Date.now())).toBe(0)
  })

  it('counts consecutive training days ending today', () => {
    const now = Date.now()
    expect(streak([at(now, 0), at(now, 1), at(now, 2)], now)).toBe(3)
  })

  it('survives a rest day today, because the streak is not broken until tomorrow', () => {
    const now = Date.now()
    expect(streak([at(now, 1), at(now, 2)], now)).toBe(2)
  })

  it('breaks after two days off', () => {
    const now = Date.now()
    expect(streak([at(now, 2), at(now, 3)], now)).toBe(0)
  })

  it('counts two sessions in one day only once', () => {
    const now = Date.now()
    expect(streak([at(now, 0), at(now, 0)], now)).toBe(1)
  })
})
