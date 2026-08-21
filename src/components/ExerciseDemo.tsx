import { useEffect, useState } from 'react'
import type { Exercise } from '@/types'
import { demoFrames } from '@/data/exercises'

/**
 * The vendored dataset gives two frames per lift — the start and end of the
 * movement. Cross-fading between them reads as the movement itself, and unlike a
 * hosted GIF it works with no signal.
 */
export function ExerciseDemo({
  exercise,
  playing = true,
  intervalMs = 900,
}: {
  exercise: Exercise
  playing?: boolean
  intervalMs?: number
}) {
  const [frame, setFrame] = useState(0)
  const frames = demoFrames(exercise)

  useEffect(() => {
    if (!playing || !frames) return
    const id = setInterval(() => setFrame((f) => 1 - f), intervalMs)
    return () => clearInterval(id)
  }, [playing, intervalMs, frames])

  if (!frames) {
    return (
      <div className="demo demo-empty">
        <span className="faint small">No demo for this lift</span>
      </div>
    )
  }

  return (
    <div className="demo">
      {frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`${exercise.name}, ${i === 0 ? 'start' : 'end'} position`}
          loading="lazy"
          decoding="async"
          style={{ opacity: frame === i ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
