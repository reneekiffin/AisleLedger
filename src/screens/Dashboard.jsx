import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useWedding } from '../state/WeddingProvider'
import { useTrackedAction } from '../hooks/useAutosave'
import { Screen } from '../components/Screen'
import { Card, EmptyState, Pill, SectionHeader, StatTile } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Donut } from '../components/ui/Donut'
import { Button } from '../components/ui/Button'
import { InstallBanner } from '../components/InstallBanner'
import { BackupReminder } from '../components/BackupReminder'
import { ChevronIcon } from '../components/nav/Icons'
import { formatMoney } from '../lib/money'
import { countdown, formatLongDate, monthDiff, relativeDays, todayISO } from '../lib/dates'
import { upcomingInstallments } from '../lib/calc'
import { markInstallmentPaid } from '../db/repo'
import { syncReminders } from '../lib/notifications'

function Countdown({ wedding }) {
  const value = countdown(wedding.weddingDate)

  if (!value) {
    return (
      <Card className="text-center">
        <p className="text-sm text-muted">Add a wedding date in Settings to start the countdown.</p>
      </Card>
    )
  }

  const units = [
    { label: value.years === 1 ? 'year' : 'years', n: value.years },
    { label: value.months === 1 ? 'month' : 'months', n: value.months },
    { label: value.days === 1 ? 'day' : 'days', n: value.days },
  ].filter((u, i) => u.n > 0 || i === 2)

  return (
    <Card className="bg-primary-soft/50 text-center">
      <p className="eyebrow">{wedding.coupleNames}</p>
      <p className="mt-1 text-sm text-muted">{formatLongDate(wedding.weddingDate)}</p>
      {value.past ? (
        <p className="mt-3 font-serif text-2xl">Congratulations — the day has been and gone ♥</p>
      ) : value.isToday ? (
        <p className="mt-3 font-serif text-2xl">Today's the day ♥</p>
      ) : (
        <div className="mt-3 flex items-end justify-center gap-5">
          {units.map((u) => (
            <div key={u.label}>
              <p className="font-serif text-3xl leading-none tabular-nums text-primary-deep">{u.n}</p>
              <p className="mt-1 text-xs text-muted">{u.label}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { wedding, currency, allRollups, totals, schedule, vendors, tasks } = useWedding()
  const track = useTrackedAction()

  const upcoming = useMemo(
    () => upcomingInstallments(schedule, vendors, { days: 30 }),
    [schedule, vendors],
  )

  const thisMonthTasks = useMemo(() => {
    if (!wedding?.weddingDate) return []
    // dueMonthOffset is months relative to the wedding, so "this month" is the
    // offset that lands on the current calendar month.
    const offsetNow = -(monthDiff(todayISO(), wedding.weddingDate) ?? 0)
    return tasks.filter((t) => t.dueMonthOffset === offsetNow)
  }, [tasks, wedding?.weddingDate])

  const donutData = useMemo(
    () =>
      allRollups
        .filter((r) => r.contract > 0)
        .map((r) => ({ id: r.category.id ?? '__none', name: r.category.name, value: r.contract })),
    [allRollups],
  )

  // Catch-up reminders: anything now inside the 3-day window fires on launch.
  useEffect(() => {
    if (schedule.length) syncReminders(schedule, vendors, currency)
  }, [schedule, vendors, currency])

  if (!wedding) return null

  const openTasks = thisMonthTasks.filter((t) => !t.done)

  return (
    <Screen title="Dashboard" eyebrow="Aisle Ledger">
      <InstallBanner />
      <BackupReminder />

      <Countdown wedding={wedding} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label="Target budget" value={formatMoney(totals.targetBudget, currency)} />
        <StatTile
          label="Contract price"
          value={formatMoney(totals.contract, currency)}
          sub={`${Math.round(totals.pctCommitted)}% of target committed`}
          tone={totals.overTarget ? 'warn' : 'default'}
        />
        <StatTile
          label="Total paid"
          value={formatMoney(totals.paid, currency)}
          sub={`${formatMoney(totals.outstanding, currency)} still owed`}
          tone="primary"
        />
        <StatTile
          label={totals.leftToSpend < 0 ? 'Over target' : 'Left to spend'}
          value={formatMoney(Math.abs(totals.leftToSpend), currency)}
          sub={totals.leftToSpend < 0 ? 'Contracts exceed the target' : 'Uncommitted budget'}
          tone={totals.leftToSpend < 0 ? 'warn' : 'default'}
        />
      </div>

      <Card className="mt-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="eyebrow">Paid against contracts</span>
          <span className="text-sm tabular-nums">{Math.round(totals.pctPaid)}%</span>
        </div>
        <ProgressBar value={totals.pctPaid} tone="accent" label="Percent of contracted spend paid" />
      </Card>

      <section className="mt-7">
        <SectionHeader
          title="Where the money's going"
          hint="Contract prices for booked vendors"
          action={
            <Link to="/budget" className="tap flex items-center text-sm font-medium text-primary-deep focus-ring rounded-lg">
              Budget <ChevronIcon width={18} height={18} />
            </Link>
          }
        />
        <Card>
          <Donut data={donutData} currency={currency} centreLabel="Committed" />
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Due in the next 30 days"
          action={
            upcoming.length > 0 && (
              <Link to="/payments" className="tap flex items-center text-sm font-medium text-primary-deep focus-ring rounded-lg">
                All <ChevronIcon width={18} height={18} />
              </Link>
            )
          }
        />
        {upcoming.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              Nothing due in the next month. Add installments on the Payments screen to see them here.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {upcoming.slice(0, 5).map((row) => (
              <li key={row.id}>
                <Card className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.vendor?.name ?? 'Vendor'}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {row.label} · {relativeDays(row.dueDate)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular-nums">{formatMoney(row.amount, currency)}</p>
                    {row.daysAway < 0 && (
                      <Pill tone="warn" className="mt-1">
                        Overdue
                      </Pill>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => track(() => markInstallmentPaid(row.id))}
                  >
                    Paid
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader
          title="This month"
          action={
            <Link to="/checklist" className="tap flex items-center text-sm font-medium text-primary-deep focus-ring rounded-lg">
              Checklist <ChevronIcon width={18} height={18} />
            </Link>
          }
        />
        {thisMonthTasks.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nothing scheduled for this month.</p>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted">
              {openTasks.length === 0
                ? `All ${thisMonthTasks.length} done for this month.`
                : `${openTasks.length} of ${thisMonthTasks.length} still to do.`}
            </p>
            <ul className="mt-3 space-y-2">
              {thisMonthTasks.slice(0, 4).map((task) => (
                <li key={task.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      task.done ? 'bg-primary' : 'bg-accent'
                    }`}
                  />
                  <span className={task.done ? 'text-muted line-through' : ''}>{task.title}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {vendors.length === 0 && (
        <div className="mt-7">
          <EmptyState
            title="No vendors yet"
            body="Add the venue, the photographer, whoever you're talking to — quotes and contracts flow into these numbers."
            action={
              <Button as={Link} to="/vendors">
                Add your first vendor
              </Button>
            }
          />
        </div>
      )}
    </Screen>
  )
}
