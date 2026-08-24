import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWedding } from '../state/WeddingProvider'
import { useAutosaveField, useTrackedAction } from '../hooks/useAutosave'
import { Screen } from '../components/Screen'
import { Card, Pill, SectionHeader, StatTile } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { ConfirmSheet, Sheet } from '../components/ui/Sheet'
import { CurrencyField, SelectField, TextArea, TextField } from '../components/ui/Field'
import { formatMoney, parseMoney } from '../lib/money'
import { formatDate, relativeDays, todayISO } from '../lib/dates'
import { vendorSummary } from '../lib/calc'
import {
  addInstallment,
  chooseVendor,
  deleteInstallment,
  deletePayment,
  deleteVendor,
  logPayment,
  markInstallmentPaid,
  unchooseVendor,
  updateVendor,
} from '../db/repo'

/** A text/number field bound straight to the vendor record, autosaved. */
function VendorField({ vendor, name, label, ...props }) {
  const [value, setValue] = useAutosaveField(vendor[name] ?? '', (next) =>
    updateVendor(vendor.id, { [name]: next }),
  )
  return <TextField label={label} value={value} onChange={(e) => setValue(e.target.value)} {...props} />
}

function VendorMoneyField({ vendor, name, label, currency, hint }) {
  const [value, setValue] = useAutosaveField(vendor[name] ?? 0, (next) =>
    updateVendor(vendor.id, { [name]: parseMoney(next) }),
  )
  return (
    <CurrencyField label={label} currency={currency} value={value} onChange={setValue} hint={hint} />
  )
}

function LogPaymentSheet({ open, onClose, vendor, currency, remaining, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setAmount(remaining > 0 ? String(remaining) : '')
    setDate(todayISO())
    setNote('')
  }
  if (!open && seeded) setSeeded(false)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log a payment"
      description={vendor.name}
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={parseMoney(amount) <= 0}
            onClick={() => {
              onSubmit({ amount: parseMoney(amount), date, note })
              onClose()
            }}
          >
            Log {formatMoney(parseMoney(amount), currency)}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <CurrencyField
          label="Amount"
          currency={currency}
          value={amount}
          onChange={setAmount}
          hint={remaining > 0 ? `${formatMoney(remaining, currency)} outstanding` : undefined}
        />
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField
          label="Note (optional)"
          placeholder="Deposit"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Sheet>
  )
}

function InstallmentSheet({ open, onClose, currency, remaining, onSubmit }) {
  const [label, setLabel] = useState('Deposit')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setLabel('Deposit')
    setAmount(remaining > 0 ? String(remaining) : '')
    setDueDate(todayISO())
  }
  if (!open && seeded) setSeeded(false)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add an installment"
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={parseMoney(amount) <= 0}
            onClick={() => {
              onSubmit({ label, amount: parseMoney(amount), dueDate })
              onClose()
            }}
          >
            Add installment
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <SelectField label="Which payment" value={label} onChange={(e) => setLabel(e.target.value)}>
          <option>Deposit</option>
          <option>Mid-payment</option>
          <option>Final payment</option>
          <option>Other</option>
        </SelectField>
        <CurrencyField
          label="Amount"
          currency={currency}
          value={amount}
          onChange={setAmount}
          hint={remaining > 0 ? `${formatMoney(remaining, currency)} not yet scheduled` : undefined}
        />
        <TextField
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
    </Sheet>
  )
}

export default function VendorDetail() {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const track = useTrackedAction()
  const { currency, categories, vendors, payments, schedule, weddingId } = useWedding()

  const [paying, setPaying] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const vendor = vendors.find((v) => v.id === vendorId)
  const summary = useMemo(() => (vendor ? vendorSummary(vendor, payments) : null), [vendor, payments])
  const installments = useMemo(
    () =>
      schedule
        .filter((s) => s.vendorId === vendorId)
        .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
    [schedule, vendorId],
  )
  const scheduled = installments.reduce((t, i) => t + i.amount, 0)

  const [notes, setNotes] = useAutosaveField(vendor?.notes ?? '', (next) =>
    updateVendor(vendorId, { notes: next }),
  )

  if (!vendor) {
    return (
      <Screen title="Vendor" back="/vendors">
        <Card>
          <p className="text-sm text-muted">That vendor no longer exists.</p>
        </Card>
      </Screen>
    )
  }

  const category = categories.find((c) => c.id === vendor.categoryId)
  const booked = vendor.status === 'booked'

  return (
    <Screen title={vendor.name} eyebrow={category?.name ?? 'Uncategorised'} back="/vendors">
      <div className="flex items-center gap-2">
        <Pill tone={booked ? 'booked' : 'considering'}>{booked ? 'Booked' : 'Considering'}</Pill>
        {booked ? (
          <button
            type="button"
            onClick={() => track(() => unchooseVendor(vendor.id))}
            className="tap rounded-lg px-2 text-sm text-muted focus-ring"
          >
            Move back to considering
          </button>
        ) : (
          <Button size="sm" variant="soft" onClick={() => track(() => chooseVendor(vendor.id))}>
            Choose this vendor
          </Button>
        )}
      </div>

      {booked && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatTile label="Contract" value={formatMoney(summary.contract, currency)} />
            <StatTile label="Paid" value={formatMoney(summary.paid, currency)} tone="primary" />
            <StatTile
              label="Owing"
              value={formatMoney(summary.remaining, currency)}
              tone={summary.remaining > 0 ? 'default' : 'muted'}
            />
          </div>
          <Card className="mt-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="eyebrow">Contract paid</span>
              <span className="text-sm tabular-nums">{Math.round(summary.pctPaid)}%</span>
            </div>
            <ProgressBar value={summary.pctPaid} tone="accent" label="Percent of this contract paid" />
          </Card>
        </>
      )}

      <div className="mt-4 flex gap-3">
        <Button full size="lg" onClick={() => setPaying(true)}>
          Log payment
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setScheduling(true)}>
          Schedule
        </Button>
      </div>

      <section className="mt-7">
        <SectionHeader title="Money" />
        <Card className="space-y-5">
          <VendorMoneyField vendor={vendor} name="quoteAmount" label="Quote" currency={currency} />
          <VendorMoneyField
            vendor={vendor}
            name="contractPrice"
            label="Contract price"
            currency={currency}
            hint={booked ? 'Counts towards the budget' : 'Counts once this vendor is booked'}
          />
          <SelectField
            label="Category"
            value={vendor.categoryId ?? ''}
            onChange={(e) => track(() => updateVendor(vendor.id, { categoryId: e.target.value || null }))}
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Contact" />
        <Card className="space-y-5">
          <VendorField vendor={vendor} name="contactName" label="Contact name" autoCapitalize="words" />
          <VendorField vendor={vendor} name="phone" label="Phone" type="tel" inputMode="tel" />
          <VendorField vendor={vendor} name="email" label="Email" type="email" inputMode="email" autoCapitalize="none" />
          <VendorField
            vendor={vendor}
            name="contractLink"
            label="Contract link"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            placeholder="https://"
          />
          {(vendor.phone || vendor.email) && (
            <div className="flex gap-3 pt-1">
              {vendor.phone && (
                <Button as="a" href={`tel:${vendor.phone}`} variant="secondary" size="sm" full>
                  Call
                </Button>
              )}
              {vendor.email && (
                <Button as="a" href={`mailto:${vendor.email}`} variant="secondary" size="sm" full>
                  Email
                </Button>
              )}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Notes" />
        <Card>
          <TextArea
            label="Notes"
            placeholder="What's included, who you met, what to chase…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Payment schedule"
          hint={
            vendor.contractPrice > 0
              ? `${formatMoney(scheduled, currency)} of ${formatMoney(vendor.contractPrice, currency)} scheduled`
              : undefined
          }
        />
        {installments.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              No installments yet. Add the deposit, mid-payment and final balance so they show up in your
              timeline and reminders.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {installments.map((row) => (
              <li key={row.id}>
                <Card className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.label}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatDate(row.dueDate)} · {relativeDays(row.dueDate)}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums">{formatMoney(row.amount, currency)}</p>
                  {row.isPaid ? (
                    <Pill tone="good">Paid</Pill>
                  ) : (
                    <Button size="sm" variant="soft" onClick={() => track(() => markInstallmentPaid(row.id))}>
                      Mark paid
                    </Button>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete ${row.label}`}
                    onClick={() => track(() => deleteInstallment(row.id))}
                    className="tap shrink-0 rounded-lg text-muted focus-ring"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader title="Payments logged" />
        {summary.payments.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nothing paid yet.</p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {summary.payments.map((payment) => (
              <li key={payment.id}>
                <Card className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="tabular-nums">{formatMoney(payment.amount, currency)}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {formatDate(payment.date)}
                      {payment.note ? ` · ${payment.note}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete payment"
                    onClick={() => track(() => deletePayment(payment.id))}
                    className="tap shrink-0 rounded-lg text-muted focus-ring"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8">
        <Button variant="danger" full onClick={() => setConfirmDelete(true)}>
          Delete vendor
        </Button>
      </div>

      <LogPaymentSheet
        open={paying}
        onClose={() => setPaying(false)}
        vendor={vendor}
        currency={currency}
        remaining={summary.remaining}
        onSubmit={(values) => track(() => logPayment(weddingId, { vendorId: vendor.id, ...values }))}
      />

      <InstallmentSheet
        open={scheduling}
        onClose={() => setScheduling(false)}
        currency={currency}
        remaining={Math.max((vendor.contractPrice || 0) - scheduled, 0)}
        onSubmit={(values) => track(() => addInstallment(weddingId, { vendorId: vendor.id, ...values }))}
      />

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          track(async () => {
            await deleteVendor(vendor.id)
            navigate('/vendors', { replace: true })
          })
        }
        title={`Delete ${vendor.name}?`}
        body="Their payments and scheduled installments are deleted too. This can't be undone."
      />
    </Screen>
  )
}
