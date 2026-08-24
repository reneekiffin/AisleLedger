import { useState } from 'react'
import { Screen } from '../components/Screen'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { RingsIcon, ShareIcon } from '../components/nav/Icons'

/** The iOS share-sheet walkthrough, drawn rather than screenshotted. */
function IosIllustration() {
  return (
    <svg
      viewBox="0 0 260 200"
      className="w-full max-w-[280px]"
      role="img"
      aria-label="An iPhone share sheet with the Add to Home Screen row highlighted"
    >
      {/* phone */}
      <rect x="46" y="6" width="168" height="188" rx="20" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-line))" strokeWidth="2" />
      <rect x="102" y="12" width="56" height="7" rx="3.5" fill="rgb(var(--c-line))" />

      {/* share sheet */}
      <rect x="56" y="52" width="148" height="132" rx="14" fill="rgb(var(--c-canvas))" stroke="rgb(var(--c-line))" strokeWidth="1.5" />
      <rect x="118" y="59" width="24" height="4" rx="2" fill="rgb(var(--c-line))" />

      <g fill="rgb(var(--c-muted))" fontSize="9" fontFamily="system-ui, sans-serif">
        <text x="80" y="83">Copy</text>
        <text x="80" y="107">Add to Reading List</text>
      </g>
      <rect x="66" y="72" width="12" height="12" rx="3" fill="rgb(var(--c-line))" />
      <rect x="66" y="96" width="12" height="12" rx="3" fill="rgb(var(--c-line))" />

      {/* highlighted row */}
      <rect x="62" y="114" width="136" height="30" rx="9" fill="rgb(var(--c-primary-soft))" stroke="rgb(var(--c-primary))" strokeWidth="1.5" />
      <rect x="68" y="123" width="12" height="12" rx="3" fill="rgb(var(--c-primary))" />
      <text x="88" y="133" fill="rgb(var(--c-primary-deep))" fontSize="9.5" fontWeight="600" fontFamily="system-ui, sans-serif">
        Add to Home Screen
      </text>

      <g fill="rgb(var(--c-muted))" fontSize="9" fontFamily="system-ui, sans-serif">
        <text x="80" y="164">Markup</text>
      </g>
      <rect x="66" y="153" width="12" height="12" rx="3" fill="rgb(var(--c-line))" />

      {/* share button on the browser bar */}
      <circle cx="30" cy="150" r="17" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-line))" strokeWidth="1.5" />
      <g transform="translate(18 138)" stroke="rgb(var(--c-primary-deep))" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V5m0 0L9 8m3-3 3 3" />
        <path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" />
      </g>
      <path d="M40 148c4-6 8-6 12-4" stroke="rgb(var(--c-primary))" strokeWidth="1.6" fill="none" strokeDasharray="3 3" />
    </svg>
  )
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft font-serif text-sm text-primary-deep">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

export default function Install() {
  const { canPrompt, promptInstall, installed, ios, iosSafari } = useInstallPrompt()
  const [outcome, setOutcome] = useState(null)

  if (installed) {
    return (
      <Screen title="Install" back>
        <Card className="text-center">
          <RingsIcon width={34} height={34} className="mx-auto text-primary" />
          <h2 className="mt-3 text-xl">You're all set</h2>
          <p className="mt-1.5 text-sm text-muted">
            Aisle Ledger is running from your home screen and works with no signal.
          </p>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen title="Install" back>
      <Card>
        <h2 className="text-xl">Keep it on your home screen</h2>
        <p className="mt-1.5 text-sm text-muted">
          Installed, Aisle Ledger opens full-screen like any other app, loads instantly and works
          with no signal at all — handy at a venue with no reception.
        </p>
      </Card>

      {canPrompt && (
        <Card className="mt-4">
          <h3 className="text-lg">One tap</h3>
          <p className="mt-1.5 text-sm text-muted">Your browser can install it directly.</p>
          <Button
            full
            size="lg"
            className="mt-4"
            onClick={async () => setOutcome(await promptInstall())}
          >
            Install Aisle Ledger
          </Button>
          {outcome === 'dismissed' && (
            <p className="mt-2.5 text-center text-sm text-muted">
              No problem — the option stays here whenever you want it.
            </p>
          )}
        </Card>
      )}

      {ios && (
        <Card className="mt-4">
          <h3 className="text-lg">On iPhone and iPad</h3>
          {iosSafari ? (
            <>
              <p className="mt-1.5 text-sm text-muted">
                iOS doesn't offer an install button, so it's three taps in Safari:
              </p>
              <div className="mt-4 flex justify-center">
                <IosIllustration />
              </div>
              <ol className="mt-4 space-y-3 text-sm">
                <Step n={1}>
                  Tap the <ShareIcon width={16} height={16} className="inline align-text-bottom" />{' '}
                  <strong className="font-medium">Share</strong> button in Safari's toolbar.
                </Step>
                <Step n={2}>
                  Scroll down and choose <strong className="font-medium">Add to Home Screen</strong>.
                </Step>
                <Step n={3}>
                  Tap <strong className="font-medium">Add</strong> — the rings icon appears on your home
                  screen.
                </Step>
              </ol>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-muted">
              On iOS, only Safari can add an app to the home screen. Open{' '}
              <strong className="font-medium">this page in Safari</strong>, then use Share → Add to Home
              Screen.
            </p>
          )}
        </Card>
      )}

      {!ios && !canPrompt && (
        <Card className="mt-4">
          <h3 className="text-lg">On Android and desktop</h3>
          <p className="mt-1.5 text-sm text-muted">
            Open your browser's menu and look for <strong className="font-medium">Install app</strong> or{' '}
            <strong className="font-medium">Add to Home screen</strong>. If you don't see it, the browser
            may need a moment after your first visit — or it may not support installing.
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <h3 className="text-lg">Before you install</h3>
        <p className="mt-1.5 text-sm text-muted">
          The installed app gets its own storage. If you've already entered data in the browser and it
          doesn't appear after installing, export a backup here first and import it in the installed
          app.
        </p>
      </Card>
    </Screen>
  )
}
