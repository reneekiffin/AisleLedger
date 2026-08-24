import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWedding } from '../state/WeddingProvider'
import { useTrackedAction } from '../hooks/useAutosave'
import { Screen } from '../components/Screen'
import { Card, EmptyState, Pill, SectionHeader, StatTile } from '../components/ui/Card'
import { DualProgress, ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { Sheet, ConfirmSheet } from '../components/ui/Sheet'
import { CurrencyField, TextField, Toggle } from '../components/ui/Field'
import { ChevronIcon, PlusIcon } from '../components/nav/Icons'
import { formatMoney, parseMoney } from '../lib/money'
import { addCategory, deleteCategory, updateCategory, updateWedding } from '../db/repo'

function CategoryEditor({ open, onClose, category, currency, guestCount, onSubmit, onDelete }) {
  const editing = !!category
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState('')
  const [isPerHead, setIsPerHead] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [seeded, setSeeded] = useState(null)

  // Re-seed the form whenever the sheet opens on a different category.
  const key = category?.id ?? '__new'
  if (open && seeded !== key) {
    setSeeded(key)
    setName(category?.name ?? '')
    setAmount(category ? String(category.budgetAmount) : '')
    setRate(category?.perHeadRate ? String(category.perHeadRate) : '')
    setIsPerHead(!!category?.isPerHead)
  }
  if (!open && seeded !== null) setSeeded(null)

  const derivedAmount = isPerHead && rate !== '' ? Math.round(parseMoney(rate) * guestCount) : parseMoney(amount)

  const submit = () => {
    onSubmit({
      name,
      isPerHead,
      // For per-head categories the rate is the source of truth; the repo
      // derives the budget from it.
      ...(isPerHead ? { perHeadRate: parseMoney(rate) } : { budgetAmount: parseMoney(amount) }),
    })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={editing ? 'Edit category' : 'New category'}
        footer={
          <div className="flex gap-3 pb-1">
            {editing && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button full disabled={!name.trim()} onClick={submit}>
              {editing ? 'Save changes' : 'Add category'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <TextField
            label="Category name"
            placeholder="Photography"
            autoCapitalize="words"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Toggle
            label="Priced per guest"
            description={`Budget = rate × ${guestCount} guests, recalculated whenever the headcount changes`}
            checked={isPerHead}
            onChange={setIsPerHead}
          />

          {isPerHead ? (
            <>
              <CurrencyField
                label="Rate per guest"
                currency={currency}
                value={rate}
                onChange={setRate}
                suffix="a head"
              />
              <p className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
                Budget for {guestCount} guests:{' '}
                <strong className="font-medium text-ink">{formatMoney(derivedAmount, currency)}</strong>
              </p>
            </>
          ) : (
            <CurrencyField label="Budget" currency={currency} value={amount} onChange={setAmount} />
          )}
        </div>
      </Sheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete()
          onClose()
        }}
        title={`Delete ${category?.name}?`}
        body="Vendors in this category are kept — they just become uncategorised. Payments are untouched."
      />
    </>
  )
}

function GuestCountSheet({ open, onClose, wedding, currency, perHeadCount, onSave }) {
  const [value, setValue] = useState(String(wedding?.guestCount ?? ''))
  const [seeded, setSeeded] = useState(false)

  if (open && !seeded) {
    setSeeded(true)
    setValue(String(wedding?.guestCount ?? ''))
  }
  if (!open && seeded) setSeeded(false)

  const next = Number(value) || 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Guest count"
      description={`${perHeadCount} ${perHeadCount === 1 ? 'category is' : 'categories are'} priced per head`}
      footer={
        <div className="pb-1">
          <Button
            full
            onClick={() => {
              onSave(next)
              onClose()
            }}
          >
            Update headcount
          </Button>
        </div>
      }
    >
      <TextField
        label="Guests"
        inputMode="numeric"
        enterKeyHint="done"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
      />
      <p className="mt-4 text-sm text-muted">
        Per-head budgets keep their rate and re-price to the new headcount. Everything else stays put.
      </p>
      {wedding?.targetBudget > 0 && next > 0 && (
        <p className="mt-3 rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
          {formatMoney(Math.round(wedding.targetBudget / next), currency)} a guest across the whole budget.
        </p>
      )}
    </Sheet>
  )
}

export default function Budget() {
  const { wedding, weddingId, currency, allRollups, totals, categories } = useWedding()
  const track = useTrackedAction()
  const [editing, setEditing] = useState(null) // category | '__new' | null
  const [guestSheet, setGuestSheet] = useState(false)

  const perHeadCount = useMemo(() => categories.filter((c) => c.isPerHead).length, [categories])
  const overBudget = allRollups.filter((r) => r.overBudget)

  if (!wedding) return null

  const editorOpen = editing !== null
  const editingCategory = editing === '__new' ? null : editing

  return (
    <Screen
      title="Budget"
      eyebrow={wedding.coupleNames}
      action={
        <button
          type="button"
          onClick={() => setEditing('__new')}
          aria-label="Add category"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Allocated"
          value={formatMoney(totals.allocated, currency)}
          sub={
            totals.unallocated >= 0
              ? `${formatMoney(totals.unallocated, currency)} unallocated`
              : `${formatMoney(-totals.unallocated, currency)} over target`
          }
          tone={totals.unallocated < 0 ? 'warn' : 'default'}
        />
        <StatTile
          label="Contracted"
          value={formatMoney(totals.contract, currency)}
          sub={`${formatMoney(totals.paid, currency)} paid`}
          tone={totals.overTarget ? 'warn' : 'default'}
        />
      </div>

      <button
        type="button"
        onClick={() => setGuestSheet(true)}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-card focus-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Guest count</p>
          <p className="mt-1 font-serif text-xl tabular-nums">{wedding.guestCount}</p>
        </div>
        <p className="max-w-[10rem] text-right text-xs text-muted">
          Drives {perHeadCount} per-head {perHeadCount === 1 ? 'category' : 'categories'}
        </p>
        <ChevronIcon width={18} height={18} className="shrink-0 text-muted" />
      </button>

      {overBudget.length > 0 && (
        <div className="mt-3 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3">
          <p className="text-sm font-medium text-warn">
            {overBudget.length} {overBudget.length === 1 ? 'category is' : 'categories are'} over budget
          </p>
          <p className="mt-0.5 text-sm text-warn/80">
            {overBudget.map((r) => r.category.name).join(', ')}
          </p>
        </div>
      )}

      <section className="mt-7">
        <SectionHeader title="By category" hint="Budget vs contract vs paid" />

        {allRollups.length === 0 ? (
          <EmptyState
            title="No categories yet"
            body="Categories are how the budget gets divided up — venue, catering, flowers, and so on."
            action={<Button onClick={() => setEditing('__new')}>Add your first category</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {allRollups.map((rollup) => {
              const { category } = rollup
              return (
                <li key={category.id ?? '__none'}>
                  <Card className={rollup.overBudget ? 'border-warn/40 bg-warn-soft/30' : ''}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-medium">{category.name}</h3>
                          {category.isPerHead && (
                            <Pill tone="considering">
                              {formatMoney(category.perHeadRate ?? 0, currency)} a head
                            </Pill>
                          )}
                          {rollup.overBudget && <Pill tone="warn">Over budget</Pill>}
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {rollup.bookedCount} booked
                          {rollup.consideringCount > 0 ? ` · ${rollup.consideringCount} considering` : ''}
                        </p>
                      </div>
                      {category.id && (
                        <button
                          type="button"
                          onClick={() => setEditing(category)}
                          className="tap shrink-0 rounded-lg px-2 text-sm font-medium text-primary-deep focus-ring"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    <dl className="mt-3.5 grid grid-cols-3 gap-2 border-y border-line py-3 text-center">
                      <div>
                        <dt className="text-[11px] text-muted">Budget</dt>
                        <dd className="mt-0.5 tabular-nums">{formatMoney(rollup.budget, currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted">Contract</dt>
                        <dd
                          className={`mt-0.5 tabular-nums ${rollup.overBudget ? 'font-medium text-warn' : ''}`}
                        >
                          {formatMoney(rollup.contract, currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted">Paid</dt>
                        <dd className="mt-0.5 tabular-nums">{formatMoney(rollup.paid, currency)}</dd>
                      </div>
                    </dl>

                    <div className="mt-3.5">
                      <DualProgress
                        paidPct={rollup.pctOfContractPaid}
                        usedPct={rollup.pctOfBudgetUsed}
                        over={rollup.overBudget}
                      />
                    </div>

                    <div className="mt-3.5 flex items-center justify-between gap-3">
                      <p className="text-sm text-muted">
                        {rollup.variance >= 0
                          ? `${formatMoney(rollup.variance, currency)} left in this category`
                          : `${formatMoney(-rollup.variance, currency)} over`}
                      </p>
                      {category.id && (
                        <Link
                          to={`/categories/${category.id}/compare`}
                          className="tap flex items-center rounded-lg text-sm font-medium text-primary-deep focus-ring"
                        >
                          Compare <ChevronIcon width={18} height={18} />
                        </Link>
                      )}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <Card className="mt-6">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="eyebrow">Target budget</span>
          <span className="text-sm tabular-nums">
            {formatMoney(totals.contract, currency)} / {formatMoney(totals.targetBudget, currency)}
          </span>
        </div>
        <ProgressBar
          value={totals.pctCommitted}
          tone={totals.overTarget ? 'warn' : 'primary'}
          label="Percent of the target budget committed"
        />
      </Card>

      <CategoryEditor
        open={editorOpen}
        onClose={() => setEditing(null)}
        category={editingCategory}
        currency={currency}
        guestCount={wedding.guestCount}
        onSubmit={(values) =>
          track(() =>
            editingCategory
              ? updateCategory(editingCategory.id, values)
              : addCategory(weddingId, {
                  ...values,
                  budgetAmount: values.budgetAmount ?? (values.perHeadRate ?? 0) * wedding.guestCount,
                }),
          )
        }
        onDelete={() => editingCategory && track(() => deleteCategory(editingCategory.id))}
      />

      <GuestCountSheet
        open={guestSheet}
        onClose={() => setGuestSheet(false)}
        wedding={wedding}
        currency={currency}
        perHeadCount={perHeadCount}
        onSave={(count) => track(() => updateWedding(weddingId, { guestCount: count }))}
      />
    </Screen>
  )
}
