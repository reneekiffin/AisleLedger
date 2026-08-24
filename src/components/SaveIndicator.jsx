import { useSaveStatus } from '../state/SaveStatus'

const COPY = {
  saving: 'Saving…',
  saved: 'Saved ✓',
  error: 'Not saved',
}

/** Sits in the header; announces politely so it isn't chatty for screen readers. */
export function SaveIndicator() {
  const { status } = useSaveStatus()
  const visible = status !== 'idle'

  return (
    <span
      role="status"
      aria-live="polite"
      className={`text-xs tabular-nums transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${status === 'error' ? 'text-warn' : 'text-muted'}`}
    >
      {COPY[status] ?? ''}
    </span>
  )
}
