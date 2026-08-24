/* Minimal 24px line icons — inline SVG keeps them offline and themeable. */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

export const DashboardIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z" />
  </svg>
)

export const BudgetIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 6h16M4 12h10M4 18h6" />
    <circle cx="18.5" cy="15.5" r="3.5" />
  </svg>
)

export const VendorsIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20v-1.5A3.5 3.5 0 0 1 7.5 15h2A3.5 3.5 0 0 1 13 18.5V20" />
    <circle cx="8.5" cy="8.5" r="3" />
    <path d="M16 20v-1.2a3.2 3.2 0 0 0-2-3M15 6.2a3 3 0 0 1 0 5.6" />
  </svg>
)

export const PaymentsIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M7 15h3" />
    <path d="M8 6V4M16 6V4" />
  </svg>
)

export const MoreIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </svg>
)

export const PlusIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const ChevronIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const BackIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const CheckIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
)

export const ShareIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
    <path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" />
  </svg>
)

export const BellIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 2.5h15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
)

export const RingsIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="9.5" cy="13" r="5.5" />
    <circle cx="15.5" cy="13" r="5.5" />
  </svg>
)
