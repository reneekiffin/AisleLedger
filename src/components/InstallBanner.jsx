import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { getMeta, setMeta } from '../db/repo'

/**
 * One quiet nudge towards installing, shown once. Dismissing it is permanent
 * (the flag lives in IndexedDB with everything else) — the Install screen
 * under More is always there for anyone who changes their mind.
 */
export function InstallBanner() {
  const { installed, canPrompt, promptInstall, iosSafari } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    let alive = true
    getMeta('installBannerDismissed', false).then((value) => {
      if (alive) setDismissed(!!value)
    })
    return () => {
      alive = false
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    setMeta('installBannerDismissed', true)
  }

  if (installed || dismissed || (!canPrompt && !iosSafari)) return null

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary-soft/60 p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Keep Aisle Ledger on your home screen</p>
        <p className="mt-0.5 text-sm text-muted">
          {canPrompt
            ? 'Installs in a tap and works with no signal.'
            : 'Add it from the Share menu — it works with no signal.'}
        </p>
        <div className="mt-2.5 flex gap-2">
          {canPrompt ? (
            <button
              type="button"
              onClick={promptInstall}
              className="tap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white focus-ring"
            >
              Install
            </button>
          ) : (
            <Link
              to="/install"
              className="tap inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white focus-ring"
            >
              Show me how
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="tap rounded-lg px-3 py-2 text-sm font-medium text-muted focus-ring"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
