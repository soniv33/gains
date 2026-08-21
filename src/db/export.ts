import type { ExportBundle } from '@/types'
import { loadAll } from './db'

export const EXPORT_VERSION = 1

/**
 * With no cloud, this file is the only thing between you and losing years of
 * training to a dropped phone. It is plain JSON on purpose — readable, diffable,
 * and restorable without this app.
 */
export async function buildExport(): Promise<ExportBundle> {
  const snap = await loadAll()
  return {
    format: 'gains.export',
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    settings: snap.settings,
    routines: snap.routines,
    sessions: snap.sessions,
    bodyWeight: snap.bodyWeight,
    customExercises: snap.customExercises,
  }
}

export function exportFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `gains-backup-${stamp}.json`
}

export async function downloadExport() {
  const bundle = await buildExport()
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function readImportFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text())
}
