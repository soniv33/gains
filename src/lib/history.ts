import type { Session, SessionEntry } from '@/types'

export interface Performance {
  session: Session
  entry: SessionEntry
}

/** Completed, undeleted sessions, most recent first. */
export function completedSessions(sessions: Session[]): Session[] {
  return sessions
    .filter((s) => !s.deletedAt && s.endedAt)
    .sort((a, b) => b.startedAt - a.startedAt)
}

/** Every time you have performed a lift, most recent first. */
export function performances(sessions: Session[], exerciseId: string): Performance[] {
  const out: Performance[] = []
  for (const session of completedSessions(sessions)) {
    for (const entry of session.entries) {
      if (entry.exerciseId !== exerciseId) continue
      if (entry.sets.some((s) => s.kind === 'work')) out.push({ session, entry })
    }
  }
  return out
}

export function lastPerformance(
  sessions: Session[],
  exerciseId: string,
): Performance | undefined {
  return performances(sessions, exerciseId)[0]
}
