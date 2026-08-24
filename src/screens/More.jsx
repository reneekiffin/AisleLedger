import { Link } from 'react-router-dom'
import { useWedding } from '../state/WeddingProvider'
import { Screen } from '../components/Screen'
import { Card } from '../components/ui/Card'
import { ChevronIcon, RingsIcon } from '../components/nav/Icons'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { formatMoney } from '../lib/money'
import { countdown } from '../lib/dates'

const PHASE_TWO = [
  { to: '/guests', title: 'Guest list', body: 'RSVPs, meals and parties' },
  { to: '/checklist', title: '12-month checklist', body: 'Auto-built from your wedding date' },
  { to: '/seating', title: 'Seating chart', body: 'Tables, capacity and who sits where' },
  { to: '/timeline', title: 'Wedding-day timeline', body: 'Hour by hour on the day' },
  { to: '/moodboard', title: 'Moodboard', body: 'Colours, fonts and inspiration' },
]

const APP = [
  { to: '/settings', title: 'Settings', body: 'Wedding details, theme, reminders, backups' },
  { to: '/install', title: 'Install on your phone', body: 'Add Aisle Ledger to your home screen' },
  { to: '/privacy', title: 'Privacy', body: 'What we collect (nothing)' },
]

function LinkRow({ to, title, body }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors focus-ring active:bg-sunken"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{body}</p>
      </div>
      <ChevronIcon width={18} height={18} className="shrink-0 text-muted" />
    </Link>
  )
}

export default function More() {
  const { wedding, currency, totals, weddings } = useWedding()
  const { installed } = useInstallPrompt()
  const days = countdown(wedding?.weddingDate)

  return (
    <Screen title="More">
      <Card className="flex items-center gap-3 bg-primary-soft/40">
        <RingsIcon width={30} height={30} className="shrink-0 text-primary-deep" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{wedding?.coupleNames}</p>
          <p className="mt-0.5 text-sm text-muted">
            {days && !days.past ? `${days.totalDays} days to go · ` : ''}
            {formatMoney(totals.contract, currency)} of {formatMoney(totals.targetBudget, currency)}
          </p>
        </div>
      </Card>

      {weddings.length > 1 && (
        <p className="mt-2 px-1 text-sm text-muted">
          {weddings.length} weddings on this device — switch between them in Settings.
        </p>
      )}

      <section className="mt-7">
        <h2 className="mb-2.5 px-1 text-sm font-medium text-muted">Planning</h2>
        <div className="card divide-y divide-line overflow-hidden p-0">
          {PHASE_TWO.map((item) => (
            <LinkRow key={item.to} {...item} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-2.5 px-1 text-sm font-medium text-muted">App</h2>
        <div className="card divide-y divide-line overflow-hidden p-0">
          {APP.filter((item) => item.to !== '/install' || !installed).map((item) => (
            <LinkRow key={item.to} {...item} />
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        Aisle Ledger · everything stays on this device
      </p>
    </Screen>
  )
}
