import { useMemo, useState } from 'react'
import { useWedding, useWeddingTable } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState, SectionHeader, StatTile } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { SelectField, TextField } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import { addGuest, deleteGuest, importGuests, listGuests, listTables, updateGuest } from '../../db/repo'
import { GuestImportSheet } from '../../components/GuestImportSheet'
import { guestsToCsv } from '../../lib/csv'
import { shareTextFile } from '../../lib/share'

const RSVP = [
  { value: 'pending', label: 'Pending' },
  { value: 'yes', label: 'Coming' },
  { value: 'no', label: 'Declined' },
  { value: 'maybe', label: 'Maybe' },
]

function GuestSheet({ open, onClose, onSubmit, parties }) {
  const [form, setForm] = useState({ name: '', party: '', rsvp: 'pending', mealChoice: '' })
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setForm({ name: '', party: '', rsvp: 'pending', mealChoice: '' })
  }
  if (!open && seeded) setSeeded(false)

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a guest"
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={!form.name.trim()}
            onClick={() => {
              onSubmit(form)
              onClose()
            }}
          >
            Add guest
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField
          label="Name"
          autoCapitalize="words"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <TextField
          label="Party"
          placeholder="The Alvarez family"
          list="party-suggestions"
          autoCapitalize="words"
          value={form.party}
          onChange={(e) => set('party', e.target.value)}
          hint="Group people who are invited and seated together"
        />
        <datalist id="party-suggestions">
          {parties.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <SelectField label="RSVP" value={form.rsvp} onChange={(e) => set('rsvp', e.target.value)}>
          {RSVP.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Meal choice"
          placeholder="Vegetarian"
          value={form.mealChoice}
          onChange={(e) => set('mealChoice', e.target.value)}
        />
      </div>
    </Sheet>
  )
}

export default function Guests() {
  const { wedding, weddingId } = useWedding()
  const guests = useWeddingTable(listGuests) ?? []
  const tables = useWeddingTable(listTables) ?? []
  const track = useTrackedAction()
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState('')

  const exportCsv = async () => {
    const tablesById = new Map(tables.map((t) => [t.id, t]))
    const slug = (wedding?.coupleNames || 'guest-list')
      .replace(/[^\w]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
    const outcome = await shareTextFile(
      guestsToCsv(guests, tablesById),
      `${slug || 'guest-list'}-guests.csv`,
      'text/csv',
    )
    if (outcome !== 'cancelled') setResult(`Exported ${guests.length} guests.`)
  }

  const parties = useMemo(
    () => [...new Set(guests.map((g) => g.party).filter(Boolean))].sort(),
    [guests],
  )

  const grouped = useMemo(() => {
    const groups = new Map()
    for (const guest of guests) {
      const key = guest.party || 'No party'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(guest)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [guests])

  const counts = useMemo(
    () => ({
      yes: guests.filter((g) => g.rsvp === 'yes').length,
      pending: guests.filter((g) => g.rsvp === 'pending').length,
    }),
    [guests],
  )

  return (
    <Screen
      title="Guest list"
      back="/more"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add guest"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Invited" value={guests.length} />
        <StatTile label="Coming" value={counts.yes} tone="primary" />
        <StatTile label="Awaiting" value={counts.pending} tone="muted" />
      </div>

      <div className="mt-3 flex gap-3">
        <Button full variant="secondary" onClick={() => setImporting(true)}>
          Import list
        </Button>
        <Button full variant="secondary" disabled={!guests.length} onClick={exportCsv}>
          Export CSV
        </Button>
      </div>
      {result && <p className="mt-2 text-center text-sm text-muted">{result}</p>}

      {guests.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="No guests yet"
            body="Already have a list in The Knot, Zola or a spreadsheet? Import it. Otherwise add people as you invite them — parties keep families and couples together for seating."
            action={
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button onClick={() => setImporting(true)}>Import a guest list</Button>
                <Button variant="secondary" onClick={() => setAdding(true)}>
                  Add one by hand
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-7 space-y-6">
          {grouped.map(([party, members]) => (
            <section key={party}>
              <SectionHeader title={party} hint={`${members.length} ${members.length === 1 ? 'guest' : 'guests'}`} />
              <ul className="space-y-2.5">
                {members.map((guest) => (
                  <li key={guest.id}>
                    <Card className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{guest.name}</p>
                        {guest.mealChoice && (
                          <p className="mt-0.5 text-sm text-muted">{guest.mealChoice}</p>
                        )}
                      </div>
                      <select
                        aria-label={`RSVP for ${guest.name}`}
                        value={guest.rsvp}
                        onChange={(e) => track(() => updateGuest(guest.id, { rsvp: e.target.value }))}
                        className="tap rounded-lg border border-line bg-surface px-2 py-1.5 text-sm focus-ring"
                      >
                        {RSVP.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label={`Remove ${guest.name}`}
                        onClick={() => track(() => deleteGuest(guest.id))}
                        className="tap shrink-0 rounded-lg text-muted focus-ring"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <GuestImportSheet
        open={importing}
        onClose={() => setImporting(false)}
        onImport={async (records, options) => {
          const outcome = await track(() => importGuests(weddingId, records, options))
          setResult(
            `Imported ${outcome.imported} guests` +
              (outcome.duplicates ? `, skipped ${outcome.duplicates} already on the list` : '') +
              (outcome.tablesCreated ? `, created ${outcome.tablesCreated} tables` : '') +
              '.',
          )
        }}
      />

      <GuestSheet
        open={adding}
        onClose={() => setAdding(false)}
        parties={parties}
        onSubmit={(guest) => track(() => addGuest(weddingId, guest))}
      />
    </Screen>
  )
}
