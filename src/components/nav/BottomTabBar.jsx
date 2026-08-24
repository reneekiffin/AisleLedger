import { NavLink } from 'react-router-dom'
import { BudgetIcon, DashboardIcon, MoreIcon, PaymentsIcon, VendorsIcon } from './Icons'

const TABS = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/budget', label: 'Budget', Icon: BudgetIcon },
  { to: '/vendors', label: 'Vendors', Icon: VendorsIcon },
  { to: '/payments', label: 'Payments', Icon: PaymentsIcon },
  { to: '/more', label: 'More', Icon: MoreIcon },
]

export function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur transition-transform duration-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pb-1 pt-2 text-[11px] font-medium transition-colors focus-ring',
                  isActive ? 'text-primary-deep' : 'text-muted',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon width={22} height={22} strokeWidth={isActive ? 1.9 : 1.5} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
