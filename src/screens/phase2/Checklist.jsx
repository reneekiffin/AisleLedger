import { useMemo, useState } from 'react'
import { useWedding } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState, SectionHeader } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { SelectField, TextField } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import { addTask, deleteTask, resetTaskDates, toggleTask, updateTask } from '../../db/repo'
import {
  formatDate,
  formatMonth,
  monthDiff,
  monthOffsetForDate,
  offsetToMonth,
  relativeDays,
  taskDueDate,
  todayISO,
  toISODate,
} from '../../lib/dates'

/**
 * The checklist is generated from the wedding date, so it re-flows the moment
 * the date moves — nothing stores a fixed month.
 */
export default function Checklist() {
  const { wedding, weddingId, tasks } = useWedding()
  const track = useTrackedAction()
  const [adding, setAdding] = useState(false)

  const currentOffset = useMemo(
    () => (wedding?.weddingDate ? -(monthDiff(todayISO(), wedding.weddingDate) ?? 0) : 0),
    [wedding?.weddingDate],
  )

  // Group by the month a task actually lands in — a pinned date can move a
  // task out of the month its template offset put it in.
  const grouped = useMemo(() => {
    const groups = new Map()
    for (const task of tasks) {
      const due = taskDueDate(wedding?.weddingDate, task)
      const offset = task.dueDate
        ? monthOffsetForDate(wedding?.weddingDate, task.dueDate)
        : task.dueMonthOffset
      if (!groups.has(offset)) groups.set(offset, [])
      groups.get(offset).push({ ...task, due })
    }
    for (const rows of groups.values()) {
      rows.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))
    }
    return [...groups.entries()].sort(([a], [b]) => a - b)
  }, [tasks, wedding?.weddingDate])

  const pinned = useMemo(() => tasks.filter((t) => t.dueDate).length, [tasks])

  const done = tasks.filter((t) => t.done).length

  if (!wedding) return null

  return (
    <Screen
      title="Checklist"
      eyebrow="12 months to the day"
      back="/more"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add task"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      <Card>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="eyebrow">Progress</span>
          <span className="text-sm tabular-nums">
            {done} / {tasks.length}
          </span>
        </div>
        <ProgressBar
          value={tasks.length ? (done / tasks.length) * 100 : 0}
          label="Checklist progress"
        />
        <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
          Dates are worked out from your wedding day, so moving the date moves the whole plan. Tap
          any date to change just that one.
        </p>
        {pinned > 0 && (
          <button
            type="button"
            onClick={() => track(() => resetTaskDates(weddingId))}
            className="tap mt-1 rounded-lg text-sm font-medium text-primary-deep focus-ring"
          >
            Reset {pinned} changed {pinned === 1 ? 'date' : 'dates'} to the suggested schedule
          </button>
        )}
      </Card>

      {tasks.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="Nothing on the list"
            body="Add what you need to remember, month by month."
            action={<Button onClick={() => setAdding(true)}>Add a task</Button>}
          />
        </div>
      ) : (
        <div className="mt-7 space-y-6">
          {grouped.map(([offset, rows]) => {
            const month = offsetToMonth(wedding.weddingDate, offset)
            const isNow = offset === currentOffset
            const isPast = offset < currentOffset
            return (
              <section key={offset}>
                <SectionHeader
                  title={month ? formatMonth(toISODate(month)) : `${Math.abs(offset)} months out`}
                  hint={
                    isNow
                      ? 'This month'
                      : offset === 0
                        ? 'Wedding month'
                        : offset > 0
                          ? 'After the wedding'
                          : `${Math.abs(offset)} months before`
                  }
                />
                <ul className={`space-y-2 ${isPast ? 'opacity-70' : ''}`}>
                  {rows.map((task) => (
                    <li key={task.id}>
                      <Card
                        className={`flex items-start gap-3 p-3.5 ${
                          isNow ? 'border-primary/35 bg-primary-soft/25' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!task.done}
                          onChange={(e) => track(() => toggleTask(task.id, e.target.checked))}
                          aria-label={task.title}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-primary))]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={task.done ? 'text-muted line-through' : ''}>
                            {task.title}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2">
                            <label className="relative inline-flex">
                              <span className="sr-only">Due date for {task.title}</span>
                              <input
                                type="date"
                                value={task.due}
                                onChange={(e) =>
                                  track(() =>
                                    updateTask(task.id, {
                                      dueDate: e.target.value,
                                      dueMonthOffset: e.target.value
                                        ? monthOffsetForDate(wedding.weddingDate, e.target.value)
                                        : task.dueMonthOffset,
                                    }),
                                  )
                                }
                                className="tap rounded-lg border border-line bg-surface px-2 py-1 text-xs tabular-nums focus-ring"
                              />
                            </label>
                            {!task.done && task.due && (
                              <span className="text-xs text-muted">{relativeDays(task.due)}</span>
                            )}
                            {task.dueDate && (
                              <span className="text-[11px] text-muted">changed</span>
                            )}
                          </span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Delete ${task.title}`}
                          onClick={() => track(() => deleteTask(task.id))}
                          className="tap shrink-0 rounded-lg text-muted focus-ring"
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <AddTaskSheet
        open={adding}
        onClose={() => setAdding(false)}
        weddingDate={wedding.weddingDate}
        currentOffset={currentOffset}
        onSubmit={(values) => track(() => addTask(weddingId, values))}
      />
    </Screen>
  )
}

function AddTaskSheet({ open, onClose, weddingDate, currentOffset, onSubmit }) {
  const [title, setTitle] = useState('')
  const [offset, setOffset] = useState(String(currentOffset))
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setTitle('')
    setOffset(String(currentOffset))
  }
  if (!open && seeded) setSeeded(false)

  const options = []
  for (let i = -12; i <= 2; i += 1) options.push(i)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a task"
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={!title.trim()}
            onClick={() => {
              onSubmit({ title, dueMonthOffset: Number(offset) })
              onClose()
            }}
          >
            Add task
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField label="Task" value={title} onChange={(e) => setTitle(e.target.value)} />
        <SelectField label="Month" value={offset} onChange={(e) => setOffset(e.target.value)}>
          {options.map((o) => {
            const month = offsetToMonth(weddingDate, o)
            return (
              <option key={o} value={o}>
                {month ? formatMonth(toISODate(month)) : `${Math.abs(o)} months out`}
                {o === 0 ? ' — wedding month' : ''}
              </option>
            )
          })}
        </SelectField>
      </div>
    </Sheet>
  )
}
