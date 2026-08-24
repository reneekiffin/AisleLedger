import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useWedding } from '../state/WeddingProvider'
import { useTrackedAction } from '../hooks/useAutosave'
import { Screen } from '../components/Screen'
import { Card, EmptyState, Pill, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ChevronIcon } from '../components/nav/Icons'
import { VendorSheet } from './Vendors'
import { formatMoney } from '../lib/money'
import { addVendor, chooseVendor } from '../db/repo'

/**
 * Vendor comparison for one category: every quote side by side, with a
 * Choose button that books a vendor and pulls its quote through as the
 * contract price.
 */
export default function CategoryCompare() {
  const { categoryId } = useParams()
  const track = useTrackedAction()
  const { weddingId, currency, categories, vendors, allRollups } = useWedding()
  const [adding, setAdding] = useState(false)

  const category = categories.find((c) => c.id === categoryId)
  const rollup = allRollups.find((r) => r.category.id === categoryId)

  const options = useMemo(() => {
    const own = vendors.filter((v) => v.categoryId === categoryId)
    return own.slice().sort((a, b) => {
      if (a.status !== b.status) return a.status === 'booked' ? -1 : 1
      return (a.quoteAmount || Infinity) - (b.quoteAmount || Infinity)
    })
  }, [vendors, categoryId])

  const quotes = options.map((v) => v.quoteAmount).filter((q) => q > 0)
  const cheapest = quotes.length ? Math.min(...quotes) : 0
  const budget = category?.budgetAmount ?? 0

  if (!category) {
    return (
      <Screen title="Compare" back="/budget">
        <Card>
          <p className="text-sm text-muted">That category no longer exists.</p>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen title={category.name} eyebrow="Compare quotes" back="/budget">
      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="eyebrow">Budget</p>
            <p className="mt-1 font-serif text-2xl tabular-nums">{formatMoney(budget, currency)}</p>
          </div>
          {category.isPerHead && (
            <Pill tone="considering">{formatMoney(category.perHeadRate ?? 0, currency)} a head</Pill>
          )}
        </div>
        {rollup?.bookedCount > 0 && (
          <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
            {formatMoney(rollup.contract, currency)} contracted
            {rollup.overBudget ? ' — over budget' : ` · ${formatMoney(rollup.variance, currency)} left`}
          </p>
        )}
      </Card>

      <section className="mt-7">
        <SectionHeader
          title="Options"
          hint={options.length ? `${options.length} on the shortlist` : undefined}
          action={
            <Button size="sm" variant="soft" onClick={() => setAdding(true)}>
              Add
            </Button>
          }
        />

        {options.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            body={`Add the vendors you're considering for ${category.name} and compare their quotes here.`}
            action={<Button onClick={() => setAdding(true)}>Add a vendor</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {options.map((vendor) => {
              const booked = vendor.status === 'booked'
              const quote = vendor.quoteAmount || 0
              const overBudget = budget > 0 && quote > budget
              return (
                <li key={vendor.id}>
                  <Card className={booked ? 'border-primary/40 bg-primary-soft/25' : ''}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-medium">{vendor.name}</h3>
                          {booked && <Pill tone="booked">Booked</Pill>}
                          {!booked && quote > 0 && quote === cheapest && (
                            <Pill tone="good">Lowest quote</Pill>
                          )}
                        </div>
                        {vendor.contactName && (
                          <p className="mt-0.5 text-sm text-muted">{vendor.contactName}</p>
                        )}
                      </div>
                      <Link
                        to={`/vendors/${vendor.id}`}
                        aria-label={`Open ${vendor.name}`}
                        className="tap flex shrink-0 items-center rounded-lg text-muted focus-ring"
                      >
                        <ChevronIcon width={20} height={20} />
                      </Link>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 border-y border-line py-3">
                      <div>
                        <dt className="text-[11px] text-muted">Quote</dt>
                        <dd className={`mt-0.5 tabular-nums ${overBudget ? 'text-warn' : ''}`}>
                          {quote > 0 ? formatMoney(quote, currency) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted">vs budget</dt>
                        <dd className={`mt-0.5 tabular-nums ${overBudget ? 'text-warn' : 'text-muted'}`}>
                          {budget > 0 && quote > 0
                            ? `${quote > budget ? '+' : '−'}${formatMoney(Math.abs(quote - budget), currency)}`
                            : '—'}
                        </dd>
                      </div>
                    </dl>

                    {vendor.notes && <p className="mt-3 text-sm text-muted">{vendor.notes}</p>}

                    {!booked && (
                      <Button
                        full
                        className="mt-3"
                        onClick={() => track(() => chooseVendor(vendor.id))}
                        disabled={quote <= 0 && !vendor.contractPrice}
                      >
                        Choose {vendor.name}
                      </Button>
                    )}
                    {!booked && quote <= 0 && !vendor.contractPrice && (
                      <p className="mt-2 text-center text-xs text-muted">Add a quote before booking</p>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-sm text-muted">
        Choosing a vendor books them and copies their quote into the budget as the contract price.
      </p>

      <VendorSheet
        open={adding}
        onClose={() => setAdding(false)}
        categories={categories}
        currency={currency}
        defaultCategoryId={categoryId}
        onSubmit={(vendor) => track(() => addVendor(weddingId, vendor))}
      />
    </Screen>
  )
}
