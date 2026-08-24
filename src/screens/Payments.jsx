import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWedding } from '../state/WeddingProvider'
import { useTrackedAction } from '../hooks/useAutosave'
import { Screen } from '../components/Screen'
import { Card, EmptyState, Pill, SectionHeader, StatTile } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { CurrencyField, SelectField, TextField } from '../components/ui/Field'
import { ChevronIcon, PlusIcon } from '../components/nav/Icons'
import { formatMoney, parseMoney } from '../lib/money'
import { formatDate, formatMonth, relativeDays, todayISO } from '../lib/dates'
import { isOverdue, scheduleTimeline } from '../lib/calc'
import { addInstallment, markInstallmentPaid, markInstallmentUnpaid } from '../db/repo'

function AddInstallmentSheet({ open, onClose, vendors, currency, onSubmit }) {
  const [form, setForm] = useState({ vendorId: '', label: 'Deposit', amount: '', dueDate: todayISO() })
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setForm({ vendorId: vendors[0]?.id ?? '', label: 'Deposit', amount: '', dueDate: todayISO() })
  }
  if (!open && seeded) setSeeded(false)

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add an installment"
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={!form.vendorId || parseMoney(form.amount) <= 0}
            onClick={() => {
              onSubmit({ ...form, amount: parseMoney(form.amount) })
              onClose()
            }}
          >
            Add installment
          </Button>
        </div>
      }
    >
      {vendors.length === 0 ? (
        <p className="text-sm text-muted">
          Add a vendor first — installments belong to whoever you're paying.
        </p>
      ) : (
        <div className="space-y-5">
          <SelectField label="Vendor" value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)}>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Which payment" value={form.label} onChange={(e) => set('label', e.target.value)}>
            <option>Deposit</option>
            <option>Mid-payment</option>
            <option>Final payment</option>
            <option>Other</option>
          </SelectField>
          <CurrencyField
            label="Amount"
            currency={currency}
            value={form.amount}
            onChange={(value) => set('amount', value)}
          />
          <TextField
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </div>
      )}
    </Sheet>
  )
}

function InstallmentCard({ row, currency, onToggle }) {
  const overdue = isOverdue(row)
  return (
    <Card className={overdue ? 'border-warn/40 bg-warn-soft/30' : ''}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/vendors/${row.vendorId}`}
            className="truncate font-medium hover:underline focus-ring rounded"
          >
            {row.vendor?.name ?? 'Vendor'}
          </Link>
          <p className="mt-0.5 text-sm text-muted">
            {row.label} · {formatDate(row.dueDate)}
            {!row.isPaid && ` · ${relativeDays(row.dueDate)}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums">{formatMoney(row.amount, currency)}</p>
          {overdue && <Pill tone="warn" className="mt-1">Overdue</Pill>}
        </div>
        {row.isPaid ? (
          <button
            type="button"
            onClick={() => onToggle(row, false)}
            className="tap shrink-0 rounded-lg px-2 text-sm text-muted focus-ring"
          >
            Undo
          </button>
        ) : (
          <Button size="sm" variant="soft" onClick={() => onToggle(row, true)}>
            Mark paid
          </Button>
        )}
      </div>
    </Card>
  )
}

export default function Payments() {
  const { currency, vendors, schedule, payments, totals, weddingId } = useWedding()
  const track = useTrackedAction()
  const [adding, setAdding] = useState(false)

  const timeline = useMemo(() => scheduleTimeline(schedule, vendors), [schedule, vendors])
  const outstanding = timeline.filter((r) => !r.isPaid)
  const settled = timeline.filter((r) => r.isPaid).reverse()

  // Group the outstanding installments by the month they're due.
  const byMonth = useMemo(() => {
    const groups = new Map()
    for (const row of outstanding) {
      const key = row.dueDate.slice(0, 7)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(row)
    }
    return [...groups.entries()]
  }, [outstanding])

  const dueSoon = outstanding.filter((r) => r.daysAway !== null && r.daysAway <= 30)
  const scheduledTotal = outstanding.reduce((t, r) => t + r.amount, 0)

  const toggle = (row, paid) =>
    track(() => (paid ? markInstallmentPaid(row.id) : markInstallmentUnpaid(row.id)))

  return (
    <Screen
      title="Payments"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add installment"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Paid so far" value={formatMoney(totals.paid, currency)} tone="primary" />
        <StatTile
          label="Still owed"
          value={formatMoney(totals.outstanding, currency)}
          sub={`${formatMoney(scheduledTotal, currency)} scheduled`}
        />
      </div>

      {dueSoon.length > 0 && (
        <div className="mt-3 rounded-2xl border border-accent/30 bg-accent-soft/60 px-4 py-3">
          <p className="text-sm font-medium">
            {dueSoon.length} {dueSoon.length === 1 ? 'payment' : 'payments'} due in the next 30 days
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {formatMoney(dueSoon.reduce((t, r) => t + r.amount, 0), currency)} in total
          </p>
        </div>
      )}

      <section className="mt-7">
        <SectionHeader title="Upcoming" hint="Every installment, oldest due date first" />
        {outstanding.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            body="Break a contract into a deposit, a mid-payment and a final balance so you always know what's next."
            action={
              vendors.length ? (
                <Button onClick={() => setAdding(true)}>Add an installment</Button>
              ) : (
                <Button as={Link} to="/vendors">
                  Add a vendor first
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-6">
            {byMonth.map(([month, rows]) => (
              <div key={month}>
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium">{formatMonth(`${month}-01`)}</h3>
                  <span className="text-sm tabular-nums text-muted">
                    {formatMoney(rows.reduce((t, r) => t + r.amount, 0), currency)}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <InstallmentCard row={row} currency={currency} onToggle={toggle} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {settled.length > 0 && (
        <section className="mt-7">
          <SectionHeader title="Settled" hint={`${settled.length} paid`} />
          <ul className="space-y-2.5">
            {settled.slice(0, 12).map((row) => (
              <li key={row.id}>
                <InstallmentCard row={row} currency={currency} onToggle={toggle} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {payments.length > 0 && (
        <section className="mt-7">
          <SectionHeader
            title="Payment history"
            hint={`${payments.length} logged`}
            action={
              <Link
                to="/vendors"
                className="tap flex items-center rounded-lg text-sm font-medium text-primary-deep focus-ring"
              >
                Vendors <ChevronIcon width={18} height={18} />
              </Link>
            }
          />
          <Card>
            <ul className="divide-y divide-line">
              {payments
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .slice(0, 15)
                .map((payment) => {
                  const vendor = vendors.find((v) => v.id === payment.vendorId)
                  return (
                    <li key={payment.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{vendor?.name ?? 'Deleted vendor'}</p>
                        <p className="text-xs text-muted">
                          {formatDate(payment.date)}
                          {payment.note ? ` · ${payment.note}` : ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums">
                        {formatMoney(payment.amount, currency)}
                      </p>
                    </li>
                  )
                })}
            </ul>
          </Card>
        </section>
      )}

      <AddInstallmentSheet
        open={adding}
        onClose={() => setAdding(false)}
        vendors={vendors}
        currency={currency}
        onSubmit={(values) => track(() => addInstallment(weddingId, values))}
      />
    </Screen>
  )
}
