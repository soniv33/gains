import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/store/app'
import { TEMPLATES, materialize } from '@/data/templates'
import { getExercise } from '@/data/exercises'
import { Sheet } from '@/components/Sheet'

export function RoutinesScreen() {
  const navigate = useNavigate()
  const routines = useApp((s) => s.routines.filter((r) => !r.deletedAt))
  const activeId = useApp((s) => s.settings.activeRoutineId)
  const setActiveRoutine = useApp((s) => s.setActiveRoutine)
  const saveRoutine = useApp((s) => s.saveRoutine)
  const deleteRoutine = useApp((s) => s.deleteRoutine)
  const [preview, setPreview] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const template = TEMPLATES.find((t) => t.key === preview)
  const owned = new Set(routines.map((r) => r.templateKey))

  return (
    <div className="scroll with-tabs">
      <h1 className="h1">Routines</h1>

      <section className="stack">
        <span className="eyebrow">Your routines</span>
        {routines.length === 0 && (
          <div className="empty">
            <h3>Nothing here yet</h3>
            <p className="small">Add a template below, or build your own.</p>
          </div>
        )}
        {routines.map((r) => (
          <div key={r.id} className={`card routine${r.id === activeId ? ' active' : ''}`}>
            <div className="between">
              <div>
                <span className="h2 block">{r.name}</span>
                <span className="small faint">
                  {r.days.length} days · {r.days.reduce((n, d) => n + d.items.length, 0)} exercises
                </span>
              </div>
              {r.id === activeId && <span className="badge">Active</span>}
            </div>
            <div className="row wrap chips">
              {r.days.map((d) => (
                <span key={d.id} className="chip">
                  {d.name}
                </span>
              ))}
            </div>
            <div className="row">
              {r.id !== activeId && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveRoutine(r.id)}
                >
                  Use this
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate(`/routines/${r.id}`)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn-quiet danger"
                onClick={() => {
                  if (confirmDelete === r.id) {
                    deleteRoutine(r.id)
                    setConfirmDelete(null)
                  } else {
                    setConfirmDelete(r.id)
                  }
                }}
                onBlur={() => setConfirmDelete((id) => (id === r.id ? null : id))}
              >
                {confirmDelete === r.id ? 'Tap again to delete' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </section>

      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={() => navigate('/routines/new')}
      >
        Build my own
      </button>

      <section className="stack">
        <span className="eyebrow">Templates</span>
        {TEMPLATES.map((t) => (
          <button key={t.key} type="button" className="card template" onClick={() => setPreview(t.key)}>
            <div className="between">
              <span className="h2">{t.name}</span>
              {owned.has(t.key) && <span className="small faint">added</span>}
            </div>
            <span className="small dim">{t.frequency}</span>
          </button>
        ))}
      </section>

      <Sheet open={Boolean(template)} onClose={() => setPreview(null)} label={template?.name}>
        {template && (
          <div className="stack">
            <span className="h1">{template.name}</span>
            <p className="dim">{template.description}</p>
            <span className="small faint">{template.frequency}</span>
            {template.days.map((d) => (
              <div key={d.name} className="card">
                <span className="h2 block">{d.name}</span>
                <ul className="stack">
                  {d.items.map((it) => (
                    <li key={it.id} className="between small">
                      <span>{getExercise(it.id)?.name ?? it.id}</span>
                      <span className="num faint">
                        {it.sets} × {it.min}–{it.max}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                const routine = materialize(template)
                saveRoutine(routine)
                setActiveRoutine(routine.id)
                setPreview(null)
              }}
            >
              Use this routine
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
