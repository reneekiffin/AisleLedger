import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Bottom sheet — the app's one modal pattern. Rises from the bottom so it
 * stays inside thumb reach, and its own scroll container keeps long forms
 * usable when the keyboard is up.
 */
export function Sheet({ open, onClose, title, description, children, footer }) {
  const panel = useRef(null)
  const restoreFocus = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    restoreFocus.current = document.activeElement

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      // Keep Tab inside the sheet while it's open.
      const focusable = panel.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus the first field so the keyboard opens straight away on mobile.
    const timer = setTimeout(() => {
      const target = panel.current?.querySelector('input, textarea, select, button')
      target?.focus({ preventScroll: true })
    }, 60)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      clearTimeout(timer)
      restoreFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[88svh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-surface shadow-lift
                   animate-[sheet-in_220ms_ease-out] sm:mb-6 sm:rounded-3xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="text-lg leading-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap -mr-2 -mt-1 flex items-center justify-center rounded-full text-muted focus-ring"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer && <div className="border-t border-line px-5 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmSheet({ open, onClose, onConfirm, title, body, confirmLabel = 'Delete', tone = 'danger' }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="tap flex-1 rounded-xl border border-line bg-surface px-4 py-3 font-medium focus-ring"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`tap flex-1 rounded-xl px-4 py-3 font-medium text-white focus-ring ${
              tone === 'danger' ? 'bg-warn' : 'bg-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-muted">{body}</p>
    </Sheet>
  )
}
