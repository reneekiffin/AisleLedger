export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`card p-4 ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function SectionHeader({ title, action, hint }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg leading-tight">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/**
 * A single headline number. Per the "is it even a chart?" test, four of these
 * beat one four-series chart for the dashboard's top-line figures.
 */
export function StatTile({ label, value, sub, tone = 'default', className = '' }) {
  const tones = {
    default: 'text-ink',
    primary: 'text-primary-deep',
    warn: 'text-warn',
    muted: 'text-muted',
  }
  return (
    <div className={`card p-3.5 ${className}`}>
      <p className="eyebrow">{label}</p>
      <p className={`mt-1.5 font-serif text-2xl leading-none tabular-nums ${tones[tone] ?? tones.default}`}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </div>
  )
}

export function EmptyState({ title, body, action, icon = '✦' }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span aria-hidden="true" className="mb-3 text-2xl text-primary/50">
        {icon}
      </span>
      <h3 className="text-lg">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Pill({ tone = 'neutral', children, className = '' }) {
  const tones = {
    neutral: 'bg-sunken text-muted',
    booked: 'bg-primary-soft text-primary-deep',
    considering: 'bg-accent-soft text-ink/70',
    warn: 'bg-warn-soft text-warn',
    good: 'bg-primary-soft text-primary-deep',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${
        tones[tone] ?? tones.neutral
      } ${className}`}
    >
      {children}
    </span>
  )
}
