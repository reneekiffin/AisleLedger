import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly

/**
 * Registers the service worker (so the app shell is cached for offline use)
 * and keeps it current.
 *
 * An installed PWA can stay open for days, so waiting for a natural page load
 * to notice a new build isn't enough — we ask the browser to re-check on a
 * timer and whenever the app comes back to the foreground.
 */
export function UpdateToast() {
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    if (import.meta.env.VITE_STATIC_PREVIEW) return undefined

    let timer
    let registration

    registerSW({
      immediate: true,
      onRegisteredSW(_url, reg) {
        if (!reg) return
        registration = reg
        timer = setInterval(() => reg.update().catch(() => {}), CHECK_INTERVAL_MS)
      },
      onNeedRefresh() {
        // With autoUpdate the worker takes over on its own; this only drives
        // the confirmation so the change isn't silent.
        setUpdated(true)
      },
    })

    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!updated) return undefined
    const timer = setTimeout(() => setUpdated(false), 5000)
    return () => clearTimeout(timer)
  }, [updated])

  if (!updated) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 z-50 mx-auto max-w-md rounded-2xl border border-line bg-surface p-3 shadow-lift"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <p className="text-center text-sm">Updated to the latest version ✓</p>
    </div>
  )
}
