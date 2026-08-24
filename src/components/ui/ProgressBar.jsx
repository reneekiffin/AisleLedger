/**
 * A thin bar with a 4px rounded data end anchored to the baseline.
 * `over` repaints it in the warning colour when a category is over budget.
 */
export function ProgressBar({ value, label, tone = 'primary', className = '', trackClass = '' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const tones = {
    primary: 'bg-primary',
    accent: 'bg-accent',
    warn: 'bg-warn',
    muted: 'bg-muted/50',
  }
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-sunken ${trackClass} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tones[tone] ?? tones.primary}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/**
 * The Budget screen's paired reading: % of contract paid and % of budget used,
 * side by side, always both — no toggle.
 */
export function DualProgress({ paidPct, usedPct, over }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-muted">Contract paid</span>
          <span className="text-xs font-medium tabular-nums">{Math.round(paidPct)}%</span>
        </div>
        <ProgressBar value={paidPct} tone="accent" label="Percent of contract paid" />
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-muted">Budget used</span>
          <span className={`text-xs font-medium tabular-nums ${over ? 'text-warn' : ''}`}>
            {Math.round(usedPct)}%
          </span>
        </div>
        <ProgressBar value={usedPct} tone={over ? 'warn' : 'primary'} label="Percent of budget used" />
      </div>
    </div>
  )
}
