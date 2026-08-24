import { Screen } from '../components/Screen'
import { Card } from '../components/ui/Card'

export default function Privacy() {
  return (
    <Screen title="Privacy" back tabBar={false}>
      <Card className="space-y-4 text-sm leading-relaxed">
        <p className="text-base font-medium">
          Aisle Ledger collects nothing and transmits nothing.
        </p>
        <p className="text-muted">
          There is no account, no server and no database behind this app. Everything you enter — your
          names, your date, your budget, your vendors, their contact details, what you've paid — is
          written to your browser's own storage (IndexedDB) on the device you're using, and it never
          leaves it.
        </p>
        <div>
          <h2 className="mb-1.5 text-base">What we don't do</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>No analytics, telemetry or crash reporting</li>
            <li>No cookies, tracking pixels or third-party scripts</li>
            <li>No advertising, and nothing sold or shared</li>
            <li>No network requests carrying your data — the app works with the plane in flight mode</li>
          </ul>
        </div>
        <div>
          <h2 className="mb-1.5 text-base">What that means for you</h2>
          <p className="text-muted">
            Because nobody else holds a copy, nobody else can lose it — but nobody else can restore it
            either. If you clear this browser's site data, uninstall the app, or lose the device, the
            data goes with it. Export a backup from Settings now and then and keep it somewhere safe.
          </p>
        </div>
        <div>
          <h2 className="mb-1.5 text-base">Notifications</h2>
          <p className="text-muted">
            If you turn on payment reminders, the notification is created by this app on your device.
            Nothing is sent to a push server, and the reminder text never leaves the phone.
          </p>
        </div>
        <div>
          <h2 className="mb-1.5 text-base">Hosting</h2>
          <p className="text-muted">
            The app itself is served as static files. Your host may keep ordinary web server logs of
            those file requests (an IP address, a timestamp) — the same as any website — but the
            contents of your ledger are never part of a request.
          </p>
        </div>
      </Card>
    </Screen>
  )
}
