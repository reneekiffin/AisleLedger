import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useWedding } from '../state/WeddingProvider'
import { useAutosaveField, useTrackedAction } from '../hooks/useAutosave'
import { Screen } from '../components/Screen'
import { Card, Pill, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ConfirmSheet, Sheet } from '../components/ui/Sheet'
import { CurrencyField, SelectField, TextField, Toggle } from '../components/ui/Field'
import { CheckIcon } from '../components/nav/Icons'
import { CURRENCIES, THEMES } from '../db/seed'
import { deleteWedding, getMeta, setMeta, updateWedding } from '../db/repo'
import { exportBackup, parseBackup, restoreBackup } from '../db/backup'
import { applyTheme } from '../state/theme'
import { formatDate, formatLongDate } from '../lib/dates'
import { parseMoney } from '../lib/money'
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  sendTestReminder,
  syncReminders,
  clearAllReminders,
  REMINDER_LEAD_DAYS,
} from '../lib/notifications'

function WeddingDetails({ wedding, weddingId }) {
  const track = useTrackedAction()
  const [names, setNames] = useAutosaveField(wedding.coupleNames, (v) =>
    updateWedding(weddingId, { coupleNames: v }),
  )
  const [date, setDate] = useAutosaveField(wedding.weddingDate, (v) =>
    updateWedding(weddingId, { weddingDate: v }),
  )
  const [budget, setBudget] = useAutosaveField(wedding.targetBudget, (v) =>
    updateWedding(weddingId, { targetBudget: parseMoney(v) }),
  )
  const [guests, setGuests] = useAutosaveField(String(wedding.guestCount), (v) =>
    updateWedding(weddingId, { guestCount: Number(v) || 0 }),
  )

  return (
    <Card className="space-y-5">
      <TextField
        label="Couple names"
        autoCapitalize="words"
        value={names}
        onChange={(e) => setNames(e.target.value)}
      />
      <TextField label="Wedding date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <CurrencyField
        label="Target budget"
        currency={wedding.currency}
        value={budget}
        onChange={setBudget}
      />
      <TextField
        label="Guest count"
        inputMode="numeric"
        value={guests}
        onChange={(e) => setGuests(e.target.value.replace(/[^0-9]/g, ''))}
        hint="Per-head categories re-price themselves when this changes"
      />
      <SelectField
        label="Currency"
        value={wedding.currency}
        onChange={(e) => track(() => updateWedding(weddingId, { currency: e.target.value }))}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.label}
          </option>
        ))}
      </SelectField>
    </Card>
  )
}

function ThemePicker({ wedding, weddingId }) {
  const track = useTrackedAction()
  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map((theme) => {
        const active = wedding.theme === theme.id
        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={active}
            onClick={() => {
              applyTheme(theme.id) // instant feedback; the write follows
              track(() => updateWedding(weddingId, { theme: theme.id }))
            }}
            className={`card flex flex-col items-center gap-2.5 p-3 transition-all focus-ring ${
              active ? 'ring-2 ring-primary' : ''
            }`}
          >
            <span className="flex -space-x-1.5">
              {theme.swatch.map((colour) => (
                <span
                  key={colour}
                  aria-hidden="true"
                  className="h-6 w-6 rounded-full border border-line"
                  style={{ background: colour }}
                />
              ))}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium">
              {theme.label}
              {active && <CheckIcon width={14} height={14} className="text-primary" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Reminders({ schedule, vendors, currency }) {
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState(() => notificationPermission())
  const [message, setMessage] = useState('')

  useEffect(() => {
    getMeta('remindersEnabled', false).then((v) => setEnabled(!!v))
  }, [])

  const supported = notificationsSupported()

  const toggle = async (next) => {
    if (!next) {
      setEnabled(false)
      await setMeta('remindersEnabled', false)
      await clearAllReminders()
      setMessage('Reminders off.')
      return
    }
    // Permission is only ever asked for here, on an explicit opt-in.
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result !== 'granted') {
      setMessage(
        result === 'denied'
          ? 'Your browser blocked notifications. Allow them for this site in its settings, then try again.'
          : 'Notifications were not enabled.',
      )
      return
    }
    setEnabled(true)
    await setMeta('remindersEnabled', true)
    const { fired, scheduled } = await syncReminders(schedule, vendors, currency)
    await sendTestReminder()
    setMessage(
      scheduled > 0
        ? `On. ${scheduled} reminder${scheduled === 1 ? '' : 's'} scheduled.`
        : fired > 0
          ? `On. ${fired} payment${fired === 1 ? ' is' : 's are'} already due soon.`
          : 'On.',
    )
  }

  if (!supported) {
    return (
      <Card>
        <p className="text-sm text-muted">
          This browser doesn't support notifications. Upcoming payments are still on the Dashboard and
          the Payments screen.
        </p>
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <Toggle
        label="Payment reminders"
        description={`A nudge ${REMINDER_LEAD_DAYS} days before each installment is due`}
        checked={enabled && permission === 'granted'}
        onChange={toggle}
      />
      {message && <p className="text-sm text-muted">{message}</p>}
      <p className="text-xs leading-relaxed text-muted">
        Reminders are created on this device — nothing is sent to a server. Browsers that don't support
        scheduled notifications (Safari and iOS among them) will show a pending reminder the next time
        you open the app.
      </p>
    </Card>
  )
}

function BackupSection() {
  const track = useTrackedAction()
  const fileInput = useRef(null)
  const [pending, setPending] = useState(null) // parsed backup awaiting Replace/Merge
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const lastBackupAt = useLiveQuery(() => getMeta('lastBackupAt', null), [], undefined)

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be picked twice
    if (!file) return
    setError('')
    try {
      setPending(parseBackup(await file.text()))
    } catch (err) {
      setError(err.message)
    }
  }

  const restore = (mode) =>
    track(async () => {
      const result = await restoreBackup(pending, mode)
      setPending(null)
      setNote(
        mode === 'replace'
          ? `Replaced everything with ${result.weddings} wedding${result.weddings === 1 ? '' : 's'} from the backup.`
          : `Merged in ${result.weddings} wedding${result.weddings === 1 ? '' : 's'}.`,
      )
    })

  return (
    <>
      <Card className="space-y-4">
        <div>
          <p className="font-medium">Your data lives on this device</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Aisle Ledger has no account and no server. Everything is stored in this browser's own
            storage. Clearing site data, uninstalling the app or losing the device loses the ledger with
            it — so export a backup every so often and keep it somewhere safe.
          </p>
        </div>

        <div className="rounded-xl bg-sunken px-4 py-3">
          <p className="text-sm">
            <span className="text-muted">Last backup: </span>
            {lastBackupAt ? (
              <strong className="font-medium">{formatDate(lastBackupAt.slice(0, 10))}</strong>
            ) : (
              <strong className="font-medium text-warn">never</strong>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            full
            variant="secondary"
            onClick={() =>
              track(async () => {
                const result = await exportBackup()
                if (result.method !== 'cancelled') setNote('Backup created.')
              })
            }
          >
            Export backup
          </Button>
          <Button full variant="secondary" onClick={() => fileInput.current?.click()}>
            Import backup
          </Button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose a backup file"
          onChange={onFile}
        />

        {error && <p className="text-sm text-warn">{error}</p>}
        {note && <p className="text-sm text-muted">{note}</p>}
      </Card>

      <Sheet
        open={!!pending}
        onClose={() => setPending(null)}
        title="Import backup"
        description={
          pending
            ? `${pending.weddings.length} wedding${pending.weddings.length === 1 ? '' : 's'}, exported ${formatDate(
                pending.exportedAt?.slice(0, 10),
              )}`
            : ''
        }
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => restore('merge')}
            className="card w-full p-4 text-left focus-ring active:bg-sunken"
          >
            <p className="font-medium">Merge</p>
            <p className="mt-1 text-sm text-muted">
              Add the backup's weddings alongside what's already here. Nothing on this device is
              touched.
            </p>
          </button>
          <button
            type="button"
            onClick={() => restore('replace')}
            className="card w-full border-warn/40 p-4 text-left focus-ring active:bg-warn-soft"
          >
            <p className="font-medium text-warn">Replace</p>
            <p className="mt-1 text-sm text-muted">
              Delete everything on this device and restore the backup exactly as it was. This can't be
              undone.
            </p>
          </button>
        </div>
      </Sheet>
    </>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const track = useTrackedAction()
  const { wedding, weddingId, weddings, switchWedding, schedule, vendors, currency } = useWedding()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!wedding) return null

  return (
    <Screen title="Settings" back="/more">
      <SectionHeader title="Wedding details" />
      <WeddingDetails wedding={wedding} weddingId={weddingId} />

      <section className="mt-7">
        <SectionHeader title="Theme" hint="Applies across the app" />
        <ThemePicker wedding={wedding} weddingId={weddingId} />
      </section>

      <section className="mt-7">
        <SectionHeader title="Reminders" />
        <Reminders schedule={schedule} vendors={vendors} currency={currency} />
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Weddings"
          hint="Planning more than one? Keep them side by side."
          action={
            <Button size="sm" variant="soft" onClick={() => navigate('/onboarding')}>
              Add
            </Button>
          }
        />
        <div className="card divide-y divide-line overflow-hidden p-0">
          {weddings.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => switchWedding(w.id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-ring active:bg-sunken"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{w.coupleNames}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {w.weddingDate ? formatLongDate(w.weddingDate) : 'No date yet'}
                </p>
              </div>
              {w.id === weddingId && <Pill tone="booked">Active</Pill>}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7" id="backups">
        <SectionHeader title="Backups" />
        <BackupSection />
      </section>

      <section className="mt-7">
        <SectionHeader title="Danger zone" />
        <Button variant="danger" full onClick={() => setConfirmDelete(true)}>
          Delete this wedding
        </Button>
      </section>

      <p className="mt-8 text-center text-xs text-muted">Aisle Ledger · schema v1</p>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          track(async () => {
            await deleteWedding(weddingId)
            navigate('/', { replace: true })
          })
        }
        title={`Delete ${wedding.coupleNames}?`}
        body="Every category, vendor, payment, guest and task for this wedding is deleted from this device. Export a backup first if you might want it back."
      />
    </Screen>
  )
}
