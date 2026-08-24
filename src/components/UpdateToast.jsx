import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { Button } from './ui/Button'

/**
 * Registers the service worker (so the app shell is cached for offline use)
 * and offers a reload when a new version has been downloaded. `prompt` mode:
 * we never swap the app out from under someone mid-edit.
 */
export function UpdateToast() {
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState(null)

  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedsRefresh(true)
      },
    })
    setUpdateSW(() => update)
  }, [])

  if (!needsRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 z-50 mx-auto max-w-md rounded-2xl border border-line bg-surface p-3 shadow-lift"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-sm">A new version of Aisle Ledger is ready.</p>
        <Button size="sm" onClick={() => updateSW?.(true)}>
          Reload
        </Button>
      </div>
    </div>
  )
}
