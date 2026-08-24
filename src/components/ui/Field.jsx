import { useId } from 'react'
import { currencySymbol, parseMoney } from '../../lib/money'

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-warn">{error}</span>}
    </label>
  )
}

export function TextField({ label, hint, error, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      <input className="field" {...props} />
    </Field>
  )
}

export function TextArea({ label, hint, rows = 4, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <textarea className="field resize-y" rows={rows} {...props} />
    </Field>
  )
}

export function SelectField({ label, hint, children, className = '', ...props }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select className="field appearance-none pr-9 bg-[length:1rem] bg-no-repeat bg-[right_0.85rem_center]" {...props}>
        {children}
      </select>
    </Field>
  )
}

/**
 * Currency input.
 *
 * `inputMode="decimal"` gets the numeric keypad on iOS and Android without the
 * validation quirks of `type="number"` (which also rejects the grouped
 * separators people paste in).
 */
export function CurrencyField({
  label,
  hint,
  value,
  onChange,
  currency = 'USD',
  className = '',
  suffix,
  ...props
}) {
  const id = useId()
  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted"
        >
          {currencySymbol(currency)}
        </span>
        <input
          id={id}
          className="field pl-9 tabular-nums"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          value={value === 0 || value ? String(value) : ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(parseMoney(e.target.value))}
          placeholder="0"
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function Toggle({ label, description, checked, onChange, id }) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        id={inputId}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`tap mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors focus-ring ${
          checked ? 'bg-primary border-primary' : 'bg-sunken border-line'
        }`}
      >
        <span
          className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[21px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
        <span className="block font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </label>
    </div>
  )
}
