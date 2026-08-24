import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CURRENCIES, DEFAULT_CATEGORIES } from '../db/seed'
import { createWedding } from '../db/repo'
import { useWedding } from '../state/WeddingProvider'
import { useTrackedAction } from '../hooks/useAutosave'
import { Button } from '../components/ui/Button'
import { CurrencyField, SelectField, TextField, Toggle } from '../components/ui/Field'
import { formatMoney, parseMoney } from '../lib/money'
import { todayISO } from '../lib/dates'
import { RingsIcon } from '../components/nav/Icons'

const STEPS = ['Names', 'Date', 'Budget', 'Guests', 'Categories']

export default function Onboarding() {
  const navigate = useNavigate()
  const { hasAnyWedding } = useWedding()
  const track = useTrackedAction()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    coupleNames: '',
    weddingDate: '',
    targetBudget: '',
    guestCount: '',
    currency: 'USD',
  })
  const [categories, setCategories] = useState(() =>
    DEFAULT_CATEGORIES.map((c) => ({ ...c, enabled: true })),
  )

  const budget = parseMoney(form.targetBudget)
  const guests = Number(form.guestCount) || 0
  const enabled = categories.filter((c) => c.enabled)
  const totalPercent = enabled.reduce((t, c) => t + (Number(c.percent) || 0), 0)

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const canContinue = useMemo(() => {
    if (step === 0) return form.coupleNames.trim().length > 0
    if (step === 1) return !!form.weddingDate
    if (step === 2) return budget > 0
    if (step === 3) return guests > 0
    return enabled.length > 0
  }, [step, form, budget, guests, enabled.length])

  const finish = async () => {
    setSaving(true)
    try {
      await track(() =>
        createWedding(
          { ...form, targetBudget: budget, guestCount: guests },
          enabled.map(({ name, percent, isPerHead }) => ({ name, percent, isPerHead })),
        ),
      )
      navigate('/', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <RingsIcon width={26} height={26} />
          <span className="font-serif text-lg text-ink">Aisle Ledger</span>
        </div>
        {hasAnyWedding && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="tap text-sm text-muted focus-ring rounded-lg px-2"
          >
            Cancel
          </button>
        )}
      </div>

      <ol className="mt-5 flex gap-1.5" aria-label="Setup progress">
        {STEPS.map((label, index) => (
          <li key={label} className="h-1 flex-1 overflow-hidden rounded-full bg-sunken">
            <span
              className={`block h-full rounded-full transition-all duration-300 ${
                index <= step ? 'w-full bg-primary' : 'w-0'
              }`}
            />
            <span className="sr-only">
              {label}
              {index === step ? ' (current step)' : ''}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex-1 pt-8">
        {step === 0 && (
          <section>
            <h1 className="text-3xl leading-tight">Who's getting married?</h1>
            <p className="mt-2 text-muted">
              Everything you enter stays on this device — there's no account to make.
            </p>
            <TextField
              className="mt-7"
              label="Couple names"
              placeholder="Frankie &amp; Sam"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              value={form.coupleNames}
              onChange={(e) => set('coupleNames')(e.target.value)}
            />
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="text-3xl leading-tight">When's the big day?</h1>
            <p className="mt-2 text-muted">
              We'll build a countdown and a 12-month checklist from this date. You can change it later.
            </p>
            <TextField
              className="mt-7"
              label="Wedding date"
              type="date"
              min={todayISO()}
              value={form.weddingDate}
              onChange={(e) => set('weddingDate')(e.target.value)}
            />
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-3xl leading-tight">What's the target budget?</h1>
            <p className="mt-2 text-muted">
              A best guess is fine — every number in the app is editable.
            </p>
            <SelectField
              className="mt-7"
              label="Currency"
              value={form.currency}
              onChange={(e) => set('currency')(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </SelectField>
            <CurrencyField
              className="mt-5"
              label="Target budget"
              currency={form.currency}
              value={form.targetBudget}
              onChange={set('targetBudget')}
            />
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-3xl leading-tight">How many guests?</h1>
            <p className="mt-2 text-muted">
              Catering, stationery, favours and rentals are priced per head, so this number moves those
              budgets automatically.
            </p>
            <TextField
              className="mt-7"
              label="Guest count"
              inputMode="numeric"
              enterKeyHint="done"
              placeholder="120"
              value={form.guestCount}
              onChange={(e) => set('guestCount')(e.target.value.replace(/[^0-9]/g, ''))}
            />
            {budget > 0 && guests > 0 && (
              <p className="mt-4 rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
                That's{' '}
                <strong className="font-medium text-ink">
                  {formatMoney(Math.round(budget / guests), form.currency)}
                </strong>{' '}
                a guest across the whole budget.
              </p>
            )}
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="text-3xl leading-tight">Your starting split</h1>
            <p className="mt-2 text-muted">
              These are the usual percentages. Adjust anything now, or later on the Budget screen.
            </p>

            <div
              className={`mt-5 flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                Math.round(totalPercent) === 100 ? 'bg-primary-soft text-primary-deep' : 'bg-warn-soft text-warn'
              }`}
            >
              <span>{enabled.length} categories</span>
              <span className="tabular-nums">
                {totalPercent.toFixed(0)}% of {formatMoney(budget, form.currency)}
              </span>
            </div>

            <ul className="mt-4 space-y-2.5">
              {categories.map((c, index) => {
                const amount = Math.round((budget * (Number(c.percent) || 0)) / 100)
                return (
                  <li
                    key={c.name}
                    className={`card p-3 transition-opacity ${c.enabled ? '' : 'opacity-45'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={c.enabled}
                        aria-label={`Include ${c.name}`}
                        onChange={(e) =>
                          setCategories((list) =>
                            list.map((row, i) => (i === index ? { ...row, enabled: e.target.checked } : row)),
                          )
                        }
                        className="h-5 w-5 shrink-0 accent-[rgb(var(--c-primary))]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted tabular-nums">
                          {formatMoney(amount, form.currency)}
                          {c.isPerHead && guests > 0
                            ? ` · ${formatMoney(Math.round(amount / guests), form.currency)} a head`
                            : ''}
                        </p>
                      </div>
                      <div className="relative w-[74px] shrink-0">
                        <input
                          className="field py-2 pr-6 text-right tabular-nums"
                          inputMode="numeric"
                          aria-label={`${c.name} percentage of budget`}
                          value={c.percent}
                          onChange={(e) => {
                            const next = e.target.value.replace(/[^0-9.]/g, '')
                            setCategories((list) =>
                              list.map((row, i) => (i === index ? { ...row, percent: next } : row)),
                            )
                          }}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-muted">
                          %
                        </span>
                      </div>
                    </div>
                    {c.enabled && (
                      <div className="mt-3 border-t border-line pt-3">
                        <Toggle
                          label="Priced per guest"
                          description="Re-prices itself when the guest count changes"
                          checked={c.isPerHead}
                          onChange={(next) =>
                            setCategories((list) =>
                              list.map((row, i) => (i === index ? { ...row, isPerHead: next } : row)),
                            )
                          }
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 mt-6 flex gap-3 bg-canvas pb-1 pt-3">
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button size="lg" full disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
            Continue
          </Button>
        ) : (
          <Button size="lg" full disabled={!canContinue || saving} onClick={finish}>
            {saving ? 'Creating…' : 'Start planning'}
          </Button>
        )}
      </div>
    </div>
  )
}
