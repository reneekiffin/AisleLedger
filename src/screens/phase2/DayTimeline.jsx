import { useMemo, useState } from 'react'
import { useWedding, useWeddingTable } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { TextArea, TextField } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import { addTimelineEntry, deleteTimelineEntry, listTimeline } from '../../db/repo'
import { formatLongDate } from '../../lib/dates'

export default function DayTimeline() {
  const { wedding, weddingId } = useWedding()
  const entries = useWeddingTable(listTimeline) ?? []
  const track = useTrackedAction()
  const [adding, setAdding] = useState(false)

  const ordered = useMemo(
    () => entries.slice().sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0)),
    [entries],
  )

  return (
    <Screen
      title="Wedding day"
      eyebrow={wedding?.weddingDate ? formatLongDate(wedding.weddingDate) : undefined}
      back="/more"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add moment"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      {ordered.length === 0 ? (
        <EmptyState
          title="Plan the day hour by hour"
          body="Hair and make-up, first look, ceremony, speeches, last dance — everything in order."
          action={<Button onClick={() => setAdding(true)}>Add the first moment</Button>}
        />
      ) : (
        <ol className="relative space-y-3 border-l border-line pl-6">
          {ordered.map((entry) => (
            <li key={entry.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-4 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-primary"
              />
              <Card className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg tabular-nums leading-none text-primary-deep">
                    {entry.time}
                  </p>
                  <p className="mt-1.5 font-medium">{entry.title}</p>
                  {entry.note && <p className="mt-1 text-sm text-muted">{entry.note}</p>}
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${entry.title}`}
                  onClick={() => track(() => deleteTimelineEntry(entry.id))}
                  className="tap shrink-0 rounded-lg text-muted focus-ring"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <AddMomentSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSubmit={(values) => track(() => addTimelineEntry(weddingId, values))}
      />
    </Screen>
  )
}

function AddMomentSheet({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ time: '14:00', title: '', note: '' })
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setForm({ time: '14:00', title: '', note: '' })
  }
  if (!open && seeded) setSeeded(false)

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a moment"
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={!form.title.trim()}
            onClick={() => {
              onSubmit(form)
              onClose()
            }}
          >
            Add to the timeline
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField label="Time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
        <TextField
          label="What's happening"
          placeholder="Ceremony"
          autoCapitalize="sentences"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <TextArea
          label="Note (optional)"
          rows={3}
          placeholder="Who needs to be where"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>
    </Sheet>
  )
}
