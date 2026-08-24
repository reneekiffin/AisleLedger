import { useNavigate } from 'react-router-dom'
import { SaveIndicator } from './SaveIndicator'
import { BackIcon } from './nav/Icons'

/**
 * Every screen's frame: a sticky header that respects the iOS status-bar
 * inset, a scrolling body, and bottom padding that clears the tab bar.
 */
export function Screen({ title, eyebrow, back, action, children, wide = false, tabBar = true }) {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col">
      <header
        className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          {back && (
            <button
              type="button"
              onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
              className="tap -ml-2 flex items-center justify-center rounded-full text-ink focus-ring"
              aria-label="Go back"
            >
              <BackIcon />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="eyebrow truncate">{eyebrow}</p>}
            <h1 className="truncate text-xl leading-tight">{title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SaveIndicator />
            {action}
          </div>
        </div>
      </header>

      <main
        className={`flex-1 px-4 pt-4 ${wide ? '' : ''}`}
        style={{
          paddingBottom: tabBar
            ? 'calc(env(safe-area-inset-bottom) + 5.5rem)'
            : 'calc(env(safe-area-inset-bottom) + 1.5rem)',
        }}
      >
        {children}
      </main>
    </div>
  )
}
