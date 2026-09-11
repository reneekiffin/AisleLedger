import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMeta, setMeta } from '../db/repo'
import { daysUntil } from '../lib/dates'
import { exportBackup } from '../db/backup'
import { useTrackedAction } from '../hooks/useAutosave'

const REMIND_AFTER_DAYS = 14
const SNOOZE_DAYS = 7

/**
 * The one nag this app makes, and it earns it: the data lives only on this
 * device, so an un-backed-up ledger is one cleared cache away from gone.
 *
 * Shows when there's never been a backup, or the last one is over a fortnight
 * old. "Later" snoozes for a week rather than dismissing forever — the risk
 * doesn't go away just because someone tapped it once.
 */
export function BackupReminder() {
  const navigate = useNavigate()
  const track = useTrackedAction()
  const [state, setState] = useState(null) // { lastBackupAt } | null
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getMeta('lastBackupAt', null), getMeta('backupSnoozedUntil', null)]).then(
      ([lastBackupAt, snoozedUntil]) => {
        if (!alive) return
        const snoozed = snoozedUntil && (daysUntil(snoozedUntil.slice(0, 10)) ?? -1) >= 0
        if (snoozed) return

        const daysSince =
          lastBackupAt === null
            ? Infinity
            : Math.abs(daysUntil(lastBackupAt.slice(0, 10)) ?? 0)

        if (daysSince >= REMIND_AFTER_DAYS) setState({ lastBackupAt, daysSince })
      },
    )
    return () => {
      alive = false
    }
  }, [])

  const snooze = async () => {
    const until = new Date()
    until.setDate(until.getDate() + SNOOZE_DAYS)
    await setMeta('backupSnoozedUntil', until.toISOString())
    setState(null)
  }

  const backUpNow = async () => {
    setBusy(true)
    try {
      const result = await track(() => exportBackup())
      if (result?.method !== 'cancelled') setState(null)
    } finally {
      setBusy(false)
    }
  }

  if (!state) return null

  const never = state.lastBackupAt === null

  return (
    <div className="mb-4 rounded-2xl border border-accent/35 bg-accent-soft/60 p-3.5">
      <p className="text-sm font-medium">
        {never ? "You haven't backed up yet" : `Your last backup was ${state.daysSince} days ago`}
      </p>
      <p className="mt-0.5 text-sm text-muted">
        Everything lives on this device only. If you lose the phone or clear your browser data, this
        goes with it.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={backUpNow}
          className="tap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white focus-ring disabled:opacity-50"
        >
          {busy ? 'Backing up…' : 'Back up now'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings#backups')}
          className="tap rounded-lg px-3 py-2 text-sm font-medium text-primary-deep focus-ring"
        >
          How it works
        </button>
        <button
          type="button"
          onClick={snooze}
          className="tap rounded-lg px-3 py-2 text-sm font-medium text-muted focus-ring"
        >
          Later
        </button>
      </div>
    </div>
  )
}
