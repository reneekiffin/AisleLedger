const VARIANTS = {
  primary: 'bg-primary text-white border-primary active:bg-primary-deep active:border-primary-deep',
  secondary: 'bg-surface text-ink border-line active:bg-sunken',
  soft: 'bg-primary-soft text-primary-deep border-transparent active:bg-primary/25',
  ghost: 'bg-transparent text-primary-deep border-transparent active:bg-primary-soft',
  danger: 'bg-surface text-warn border-warn/40 active:bg-warn-soft',
}

const SIZES = {
  sm: 'px-3 py-2 text-sm rounded-lg min-h-[40px]',
  md: 'px-4 py-2.5 rounded-xl min-h-[48px]',
  lg: 'px-5 py-3.5 rounded-xl text-lg min-h-[54px]',
}

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  ...props
}) {
  return (
    <Tag
      className={[
        'inline-flex items-center justify-center gap-2 border font-medium transition-colors focus-ring',
        'disabled:opacity-45 disabled:pointer-events-none select-none',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        full ? 'w-full' : '',
        className,
      ].join(' ')}
      {...(Tag === 'button' ? { type: props.type ?? 'button' } : null)}
      {...props}
    />
  )
}
