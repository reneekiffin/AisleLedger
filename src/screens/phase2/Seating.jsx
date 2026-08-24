import { useMemo, useState } from 'react'
import { useWedding, useWeddingTable } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState, Pill, SectionHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { TextField } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import { addTable, deleteTable, listGuests, listTables, updateGuest } from '../../db/repo'

export default function Seating() {
  const { weddingId } = useWedding()
  const tables = useWeddingTable(listTables) ?? []
  const guests = useWeddingTable(listGuests) ?? []
  const track = useTrackedAction()
  const [adding, setAdding] = useState(false)
  const [assigning, setAssigning] = useState(null) // table being filled

  const attending = useMemo(() => guests.filter((g) => g.rsvp !== 'no'), [guests])
  const unseated = useMemo(() => attending.filter((g) => !g.tableId), [attending])
  const byTable = useMemo(() => {
    const map = new Map()
    for (const guest of attending) {
      if (!guest.tableId) continue
      if (!map.has(guest.tableId)) map.set(guest.tableId, [])
      map.get(guest.tableId).push(guest)
    }
    return map
  }, [attending])

  return (
    <Screen
      title="Seating"
      back="/more"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add table"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      {tables.length === 0 ? (
        <EmptyState
          title="No tables yet"
          body="Add tables with their capacity, then seat the guests who've said yes."
          action={<Button onClick={() => setAdding(true)}>Add a table</Button>}
        />
      ) : (
        <>
          {unseated.length > 0 && (
            <Card className="mb-5 bg-accent-soft/50">
              <p className="text-sm font-medium">
                {unseated.length} {unseated.length === 1 ? 'guest' : 'guests'} not seated yet
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {unseated.slice(0, 6).map((g) => g.name).join(', ')}
                {unseated.length > 6 ? '…' : ''}
              </p>
            </Card>
          )}

          <ul className="space-y-3">
            {tables
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((table) => {
                const seated = byTable.get(table.id) ?? []
                const full = seated.length >= table.capacity
                return (
                  <li key={table.id}>
                    <Card>
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-medium">{table.name}</h3>
                          <p className="mt-0.5 text-sm text-muted">
                            {seated.length} of {table.capacity} seats
                          </p>
                        </div>
                        {full && <Pill tone="booked">Full</Pill>}
                        <button
                          type="button"
                          aria-label={`Delete ${table.name}`}
                          onClick={() => track(() => deleteTable(table.id))}
                          className="tap shrink-0 rounded-lg text-muted focus-ring"
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </div>

                      {seated.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                          {seated.map((guest) => (
                            <li key={guest.id}>
                              <button
                                type="button"
                                onClick={() => track(() => updateGuest(guest.id, { tableId: null }))}
                                className="tap rounded-full bg-sunken px-3 py-1.5 text-sm focus-ring"
                              >
                                {guest.name} <span aria-hidden="true" className="text-muted">×</span>
                                <span className="sr-only">Remove from {table.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button
                        variant="soft"
                        full
                        className="mt-3"
                        disabled={unseated.length === 0}
                        onClick={() => setAssigning(table)}
                      >
                        {unseated.length === 0 ? 'Everyone is seated' : 'Seat guests here'}
                      </Button>
                    </Card>
                  </li>
                )
              })}
          </ul>
        </>
      )}

      <AddTableSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSubmit={(values) => track(() => addTable(weddingId, values))}
      />

      <Sheet
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={`Seat at ${assigning?.name ?? ''}`}
        description={`${unseated.length} guest${unseated.length === 1 ? '' : 's'} to place`}
      >
        <ul className="space-y-2">
          {unseated.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => track(() => updateGuest(guest.id, { tableId: assigning.id }))}
                className="card flex w-full items-center gap-3 p-3 text-left focus-ring active:bg-sunken"
              >
                <span className="min-w-0 flex-1 truncate">{guest.name}</span>
                {guest.party && <span className="shrink-0 text-sm text-muted">{guest.party}</span>}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </Screen>
  )
}

function AddTableSheet({ open, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('8')
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setName('')
    setCapacity('8')
  }
  if (!open && seeded) setSeeded(false)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a table"
      footer={
        <div className="pb-1">
          <Button
            full
            onClick={() => {
              onSubmit({ name, capacity: Number(capacity) || 8 })
              onClose()
            }}
          >
            Add table
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField
          label="Name"
          placeholder="Top table"
          autoCapitalize="words"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Capacity"
          inputMode="numeric"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </div>
    </Sheet>
  )
}
