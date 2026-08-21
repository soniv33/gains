import { useEffect, type ReactNode } from 'react'

/** Bottom sheet: everything secondary happens here, within thumb reach. */
export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-grip" />
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}
