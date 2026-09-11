import { useMemo, useState } from 'react'
import { useWedding, useWeddingTable } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState, SectionHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { TextArea, TextField } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import {
  addTimelineEntry,
  deleteTimelineEntry,
  listTimeline,
  seedDayTimeline,
  updateTimelineEntry,
} from '../../db/repo'
import { buildTimelineIcs } from '../../lib/ics'
import { shareTextFile } from '../../lib/share'
import { buildTimelineShare, encodeShare, isTooLong, shareLink, shareUrl } from '../../lib/sharelink'
import { formatLongDate } from '../../lib/dates'

export default function DayTimeline() {
  const { wedding, weddingId } = useWedding()
  const entries = useWeddingTable(listTimeline) ?? []
  const track = useTrackedAction()
  const [adding, setAdding] = useState(false)
  const [note, setNote] = useState('')

  const addToCalendar = async () => {
    try {
      const ics = buildTimelineIcs(wedding, entries)
      const slug = (wedding?.coupleNames || 'wedding')
        .replace(/[^\w]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
      const outcome = await shareTextFile(ics, `${slug || 'wedding'}-day.ics`, 'text/calendar')
      if (outcome !== 'cancelled') {
        setNote('Calendar file ready — open it to add the day to your calendar.')
      }
    } catch (err) {
      setNote(err.message)
    }
  }

  const sharePlan = async () => {
    const fragment = await encodeShare(buildTimelineShare(wedding, entries))
    const url = shareUrl(fragment)
    if (isTooLong(url)) {
      setNote('This timeline is too long to fit in a link. Export the calendar file instead.')
      return
    }
    const outcome = await shareLink(url, `${wedding?.coupleNames ?? 'Our'} wedding day`)
    if (outcome === 'copied') setNote('Link copied — paste it to whoever needs it.')
    else if (outcome === 'failed') setNote("Couldn't share the link on this device.")
  }

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
          body="Start from a typical running order and change the times to suit you, or build it from scratch."
          action={
            <div className="flex flex-col gap-2.5">
              <Button onClick={() => track(() => seedDayTimeline(weddingId))}>
                Start from a typical day
              </Button>
              <Button variant="secondary" onClick={() => setAdding(true)}>
                Add the first moment myself
              </Button>
            </div>
          }
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
                  <label className="inline-flex">
                    <span className="sr-only">Time for {entry.title}</span>
                    <input
                      type="time"
                      value={entry.time}
                      onChange={(e) =>
                        track(() => updateTimelineEntry(entry.id, { time: e.target.value }))
                      }
                      className="tap rounded-lg border border-line bg-surface px-2 py-1 font-serif text-lg tabular-nums text-primary-deep focus-ring"
                    />
                  </label>
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

      {ordered.length > 0 && (
        <section className="mt-7">
          <SectionHeader title="Share the day" hint="For the party, the vendors, anyone" />
          <div className="flex flex-col gap-2.5">
            <Button full variant="secondary" onClick={addToCalendar}>
              Add to calendar (.ics)
            </Button>
            <Button full variant="secondary" onClick={sharePlan}>
              Share as a link
            </Button>
          </div>
          {note && <p className="mt-2 text-center text-sm text-muted">{note}</p>}
          <p className="mt-3 text-center text-xs leading-relaxed text-muted">
            The calendar file adds every moment as an event. The link carries a read-only copy
            inside it — nothing is uploaded, but anyone with the link can open it.
          </p>
        </section>
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
