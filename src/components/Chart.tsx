/**
 * Hand-rolled SVG rather than a charting library: a few hundred bytes instead of
 * a few hundred kilobytes, and it inherits the app's own visual language.
 */
export interface Point {
  x: number
  y: number
}

export function LineChart({
  points,
  height = 120,
  format = (n: number) => String(Math.round(n)),
}: {
  points: Point[]
  height?: number
  format?: (n: number) => string
}) {
  if (points.length < 2) {
    return (
      <div className="chart-empty faint small">
        {points.length ? 'One session so far — a trend needs two.' : 'Nothing logged yet.'}
      </div>
    )
  }

  const W = 300
  const H = height
  const PAD = 10

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  // A flat line should sit mid-frame, not divide by zero.
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || Math.max(maxY, 1)

  const sx = (x: number) => PAD + ((x - minX) / spanX) * (W - PAD * 2)
  const sy = (y: number) => H - PAD - ((y - minY) / spanY) * (H - PAD * 2)

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')
  const area = `${line} L${sx(maxX).toFixed(1)} ${H - PAD} L${sx(minX).toFixed(1)} ${H - PAD} Z`
  const last = points[points.length - 1]

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Trend">
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" vectorEffect="non-scaling-stroke" />
        <circle cx={sx(last.x)} cy={sy(last.y)} r="3.5" className="chart-dot" />
      </svg>
      <div className="chart-axis small faint">
        <span className="num">{format(minY)}</span>
        <span className="num">{format(maxY)}</span>
      </div>
    </div>
  )
}
