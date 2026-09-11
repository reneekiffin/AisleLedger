import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Card, EmptyState, Pill, SectionHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { RingsIcon } from '../components/nav/Icons'
import { decodeShare } from '../lib/sharelink'
import { formatLongDate } from '../lib/dates'

/**
 * Read-only view of a shared link. Everything it renders came out of the URL
 * fragment — there is no lookup, no account and no network request, so this
 * page works for someone who has never opened the app before.
 */
export default function SharedView() {
  const location = useLocation()
  const [payload, setPayload] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    const fragment = location.hash || window.location.hash
    decodeShare(fragment).then(setPayload).catch((err) => {
      setError(err.message)
      setPayload(null)
    })
  }, [location.hash])

  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-lg flex-col px-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
      }}
    >
      <div className="flex items-center gap-2 text-primary">
        <RingsIcon width={24} height={24} />
        <span className="font-serif text-base text-ink">Aisle Ledger</span>
      </div>

      {payload === undefined && <p className="mt-8 text-sm text-muted">Opening…</p>}

      {error && (
        <div className="mt-8">
          <EmptyState
            title="We couldn't open this link"
            body={error}
            action={
              <Button as={Link} to="/">
                Go to the app
              </Button>
            }
          />
        </div>
      )}

      {payload && (
        <>
          <header className="mt-6">
            <h1 className="text-2xl leading-tight">{payload.couple}</h1>
            {payload.date && <p className="mt-1 text-muted">{formatLongDate(payload.date)}</p>}
          </header>

          {payload.kind === 'party' && (
            <>
              {payload.shops?.length > 0 && (
                <section className="mt-7">
                  <SectionHeader title="Where to buy" />
                  <ul className="space-y-2.5">
                    {payload.shops.map((shop, index) => (
                      <li key={`${shop.label}-${index}`}>
                        <Card className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">{shop.label}</p>
                              {shop.forRole && <Pill tone="considering">{shop.forRole}</Pill>}
                            </div>
                            {shop.note && <p className="mt-0.5 text-sm text-muted">{shop.note}</p>}
                          </div>
                          {shop.url && (
                            <Button
                              as="a"
                              href={shop.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              size="sm"
                              variant="soft"
                            >
                              Open
                            </Button>
                          )}
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-7">
                <SectionHeader title="The wedding party" />
                <ul className="space-y-2.5">
                  {payload.people.map((person, index) => (
                    <li key={`${person.name}-${index}`}>
                      <Card>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{person.name}</p>
                          <Pill>{person.role}</Pill>
                        </div>
                        {person.outfit && (
                          <p className="mt-1 text-sm text-muted">{person.outfit}</p>
                        )}
                        {(person.size || person.colour) && (
                          <p className="mt-0.5 text-sm text-muted">
                            {[person.size && `Size ${person.size}`, person.colour]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                        {person.outfitUrl && (
                          <Button
                            as="a"
                            href={person.outfitUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            size="sm"
                            variant="soft"
                            className="mt-3"
                          >
                            Buy the outfit
                          </Button>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {payload.kind === 'timeline' && (
            <section className="mt-7">
              <SectionHeader title="The day" />
              <ol className="relative space-y-3 border-l border-line pl-6">
                {payload.entries.map((entry, index) => (
                  <li key={`${entry.time}-${index}`} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[27px] top-4 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-primary"
                    />
                    <Card>
                      <p className="font-serif text-lg tabular-nums leading-none text-primary-deep">
                        {entry.time}
                      </p>
                      <p className="mt-1.5 font-medium">{entry.title}</p>
                      {entry.note && <p className="mt-1 text-sm text-muted">{entry.note}</p>}
                    </Card>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="mt-8 text-center text-xs leading-relaxed text-muted">
            This is a read-only snapshot shared with you. It travelled inside the link itself —
            nothing was uploaded, and there's no account to make.
          </p>
          <div className="mt-4 text-center">
            <Button as={Link} to="/" variant="secondary" size="sm">
              Plan your own wedding
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
