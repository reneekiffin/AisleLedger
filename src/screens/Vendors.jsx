import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWedding } from '../state/WeddingProvider'
import { useTrackedAction } from '../hooks/useAutosave'
import { Screen } from '../components/Screen'
import { Card, EmptyState, Pill, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { CurrencyField, SelectField, TextField } from '../components/ui/Field'
import { ChevronIcon, PlusIcon } from '../components/nav/Icons'
import { formatMoney, parseMoney } from '../lib/money'
import { paymentsByVendor, vendorContract } from '../lib/calc'
import { addVendor } from '../db/repo'

export function VendorSheet({ open, onClose, categories, currency, defaultCategoryId, onSubmit }) {
  const [form, setForm] = useState({ name: '', categoryId: '', quoteAmount: '', status: 'considering' })
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setForm({
      name: '',
      categoryId: defaultCategoryId ?? categories[0]?.id ?? '',
      quoteAmount: '',
      status: 'considering',
    })
  }
  if (!open && seeded) setSeeded(false)

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New vendor"
      description="Contact details and notes come next, on the vendor's own screen."
      footer={
        <div className="pb-1">
          <Button
            full
            disabled={!form.name.trim()}
            onClick={() => {
              onSubmit({
                ...form,
                quoteAmount: parseMoney(form.quoteAmount),
                // Booking straight away adopts the quote as the contract price.
                contractPrice: form.status === 'booked' ? parseMoney(form.quoteAmount) : 0,
              })
              onClose()
            }}
          >
            Add vendor
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextField
          label="Vendor name"
          placeholder="Wildflower Studio"
          autoCapitalize="words"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <SelectField
          label="Category"
          value={form.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
        >
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <CurrencyField
          label="Quote"
          currency={currency}
          value={form.quoteAmount}
          onChange={(value) => set('quoteAmount', value)}
          hint="What they've quoted you, before you commit"
        />
        <SelectField label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
          <option value="considering">Considering</option>
          <option value="booked">Booked</option>
        </SelectField>
      </div>
    </Sheet>
  )
}

export function VendorRow({ vendor, paid, currency }) {
  const contract = vendorContract(vendor)
  return (
    <Link
      to={`/vendors/${vendor.id}`}
      className="card flex items-center gap-3 p-3.5 transition-colors focus-ring active:bg-sunken"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{vendor.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {vendor.status === 'booked'
            ? `${formatMoney(contract, currency)} contract · ${formatMoney(paid, currency)} paid`
            : `${formatMoney(vendor.quoteAmount, currency)} quoted`}
        </p>
      </div>
      <Pill tone={vendor.status === 'booked' ? 'booked' : 'considering'}>
        {vendor.status === 'booked' ? 'Booked' : 'Considering'}
      </Pill>
      <ChevronIcon width={18} height={18} className="shrink-0 text-muted" />
    </Link>
  )
}

export default function Vendors() {
  const { weddingId, currency, categories, vendors, payments, allRollups } = useWedding()
  const track = useTrackedAction()
  const [adding, setAdding] = useState(false)

  const paidMap = useMemo(() => paymentsByVendor(payments), [payments])

  return (
    <Screen
      title="Vendors"
      action={
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add vendor"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      {vendors.length === 0 ? (
        <EmptyState
          title="Add your first vendor"
          body="Track quotes while you're deciding, then book one and its price flows into the budget."
          action={<Button onClick={() => setAdding(true)}>Add a vendor</Button>}
        />
      ) : (
        <div className="space-y-7">
          {allRollups
            .filter((r) => r.vendorCount > 0)
            .map((rollup) => (
              <section key={rollup.category.id ?? '__none'}>
                <SectionHeader
                  title={rollup.category.name}
                  hint={`${formatMoney(rollup.contract, currency)} contracted of ${formatMoney(
                    rollup.budget,
                    currency,
                  )} budgeted`}
                  action={
                    rollup.category.id && rollup.consideringCount > 0 ? (
                      <Link
                        to={`/categories/${rollup.category.id}/compare`}
                        className="tap flex items-center rounded-lg text-sm font-medium text-primary-deep focus-ring"
                      >
                        Compare <ChevronIcon width={18} height={18} />
                      </Link>
                    ) : null
                  }
                />
                <ul className="space-y-2.5">
                  {rollup.vendors.map((vendor) => (
                    <li key={vendor.id}>
                      <VendorRow
                        vendor={vendor}
                        paid={paidMap.get(vendor.id) || 0}
                        currency={currency}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

          {categories.filter((c) => !vendors.some((v) => v.categoryId === c.id)).length > 0 && (
            <Card>
              <p className="text-sm text-muted">
                Still to fill:{' '}
                {categories
                  .filter((c) => !vendors.some((v) => v.categoryId === c.id))
                  .map((c) => c.name)
                  .join(', ')}
              </p>
            </Card>
          )}
        </div>
      )}

      <VendorSheet
        open={adding}
        onClose={() => setAdding(false)}
        categories={categories}
        currency={currency}
        onSubmit={(vendor) => track(() => addVendor(weddingId, vendor))}
      />
    </Screen>
  )
}
