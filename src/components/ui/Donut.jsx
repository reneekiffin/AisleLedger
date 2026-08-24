import { useMemo, useState } from 'react'
import { formatCompact, formatMoney } from '../../lib/money'

const MAX_SLICES = 6 // a 7th slot is reserved for "Other"
const GAP_PX = 2 // surface gap between wedges
const SIZE = 168
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Spend by category.
 *
 * The wedges are ranked, so this uses a single-hue ordinal ramp (biggest spend
 * = darkest step) rather than categorical hues — colour reinforces magnitude
 * instead of inventing eight identities. Anything past the sixth category
 * folds into a neutral "Other" rather than generating new colours, and the
 * legend beside the chart names and values every wedge, so identity never
 * rests on colour alone.
 */
export function Donut({ data, currency = 'USD', centreLabel = 'Committed', className = '' }) {
  const [active, setActive] = useState(null)

  const { slices, total } = useMemo(() => {
    const positive = data.filter((d) => (Number(d.value) || 0) > 0).sort((a, b) => b.value - a.value)
    const head = positive.slice(0, MAX_SLICES)
    const tail = positive.slice(MAX_SLICES)
    const list = head.map((d, i) => ({ ...d, colour: `var(--viz-${7 - i})` }))
    if (tail.length) {
      list.push({
        id: '__other',
        name: `Other (${tail.length})`,
        value: tail.reduce((t, d) => t + d.value, 0),
        colour: 'var(--viz-other)',
      })
    }
    return { slices: list, total: positive.reduce((t, d) => t + d.value, 0) }
  }, [data])

  const selected = slices.find((s) => s.id === active) ?? null

  if (!total) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="No spend recorded yet">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgb(var(--c-line))"
            strokeWidth={STROKE}
            strokeDasharray="3 9"
            strokeLinecap="round"
          />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-[rgb(var(--c-muted))] text-[13px]"
          >
            Nothing booked
          </text>
        </svg>
        <p className="mt-3 max-w-[16rem] text-center text-sm text-muted">
          Book a vendor and their contract price appears here.
        </p>
      </div>
    )
  }

  let offset = 0

  return (
    <div className={className}>
      <div className="flex flex-col items-center">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Spend by category. Total ${formatMoney(total, currency)}.`}
          className="shrink-0"
        >
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {slices.map((slice) => {
              const fraction = slice.value / total
              const length = Math.max(fraction * CIRCUMFERENCE - GAP_PX, 1)
              const dash = `${length} ${CIRCUMFERENCE - length}`
              const rotation = offset
              offset += fraction * CIRCUMFERENCE
              const dimmed = selected && selected.id !== slice.id
              return (
                <circle
                  key={slice.id}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={slice.colour}
                  strokeWidth={selected?.id === slice.id ? STROKE + 4 : STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={-rotation}
                  className="cursor-pointer transition-all duration-200"
                  style={{ opacity: dimmed ? 0.35 : 1 }}
                  onClick={() => setActive(active === slice.id ? null : slice.id)}
                />
              )
            })}
          </g>
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            className="fill-[rgb(var(--c-muted))] text-[10px] uppercase tracking-[0.14em]"
          >
            {selected ? 'Selected' : centreLabel}
          </text>
          <text
            x="50%"
            y="57%"
            textAnchor="middle"
            className="fill-[rgb(var(--c-ink))] font-serif text-[20px] tabular-nums"
          >
            {formatCompact(selected ? selected.value : total, currency)}
          </text>
        </svg>
        {selected && (
          <p className="mt-2 text-sm text-muted">
            {selected.name} · {Math.round((selected.value / total) * 100)}% of committed spend
          </p>
        )}
      </div>

      {/* The legend is also the table view: every wedge, named and valued. */}
      <ul className="mt-5 space-y-2">
        {slices.map((slice) => (
          <li key={slice.id}>
            <button
              type="button"
              onClick={() => setActive(active === slice.id ? null : slice.id)}
              aria-pressed={active === slice.id}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors focus-ring ${
                active === slice.id ? 'bg-sunken' : ''
              }`}
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: slice.colour }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{slice.name}</span>
              <span className="shrink-0 text-sm tabular-nums">{formatMoney(slice.value, currency)}</span>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
                {Math.round((slice.value / total) * 100)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
