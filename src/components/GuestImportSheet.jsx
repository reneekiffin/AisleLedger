import { useMemo, useRef, useState } from 'react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { SelectField, Toggle } from './ui/Field'
import {
  MAPPABLE_FIELDS,
  buildGuests,
  detectMapping,
  mappingIsUsable,
  parseCsv,
} from '../lib/csv'

/**
 * Imports a guest list exported from somewhere else — The Knot, Zola, Joy, or
 * a spreadsheet someone built themselves.
 *
 * Three steps: give us the file, confirm which column is which (guessed for
 * you), then review what's about to be added. Nothing is written until the
 * last step, because an import that guesses wrong is miserable to undo.
 */
export function GuestImportSheet({ open, onClose, onImport }) {
  const fileInput = useRef(null)
  const [step, setStep] = useState('source')
  const [parsed, setParsed] = useState(null)
  const [mapping, setMapping] = useState({})
  const [pasted, setPasted] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setStep('source')
    setParsed(null)
    setMapping({})
    setPasted('')
    setError('')
    setBusy(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const ingest = (text) => {
    setError('')
    const result = parseCsv(text)
    if (!result.headers.length) {
      setError("That file looks empty — we couldn't find a header row.")
      return
    }
    if (!result.rows.length) {
      setError('That file has column headings but no guests underneath them.')
      return
    }
    setParsed(result)
    setMapping(detectMapping(result.headers))
    setStep('map')
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      ingest(await file.text())
    } catch {
      setError("We couldn't read that file. Try exporting it again as CSV.")
    }
  }

  const preview = useMemo(() => {
    if (!parsed || !mappingIsUsable(mapping)) return null
    return buildGuests(parsed.rows, mapping)
  }, [parsed, mapping])

  const runImport = async () => {
    setBusy(true)
    try {
      await onImport(preview.guests, { skipDuplicates })
      close()
    } catch (err) {
      setError(err?.message ?? 'Something went wrong part-way through the import.')
      setBusy(false)
    }
  }

  const titles = {
    source: 'Import a guest list',
    map: 'Check the columns',
    review: 'Ready to import',
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={titles[step]}
      description={
        step === 'source'
          ? 'From The Knot, Zola, Joy, or your own spreadsheet'
          : step === 'map'
            ? `${parsed?.rows.length ?? 0} rows found`
            : undefined
      }
      footer={
        step === 'source' ? null : (
          <div className="flex gap-3 pb-1">
            <Button
              variant="secondary"
              onClick={() => setStep(step === 'review' ? 'map' : 'source')}
            >
              Back
            </Button>
            {step === 'map' ? (
              <Button full disabled={!mappingIsUsable(mapping)} onClick={() => setStep('review')}>
                Review {preview ? `${preview.guests.length} guests` : ''}
              </Button>
            ) : (
              <Button full disabled={busy || !preview?.guests.length} onClick={runImport}>
                {busy ? 'Importing…' : `Import ${preview?.guests.length ?? 0} guests`}
              </Button>
            )}
          </div>
        )
      }
    >
      {step === 'source' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-sunken px-4 py-3 text-sm text-muted">
            In your other app, look for <strong className="font-medium text-ink">Export</strong> and
            choose <strong className="font-medium text-ink">CSV</strong>. You don't need to tidy it
            up first — we'll work out the columns.
          </div>

          <Button full size="lg" onClick={() => fileInput.current?.click()}>
            Choose a CSV file
          </Button>

          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            aria-label="Choose a CSV file"
            onChange={onFile}
          />

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-line" />
            or paste it
            <span className="h-px flex-1 bg-line" />
          </div>

          <label className="block">
            <span className="field-label">Paste your list</span>
            <textarea
              className="field font-mono text-sm"
              rows={5}
              placeholder={'Name,Party,RSVP\nJoan Alvarez,Alvarez Family,Yes'}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
          </label>
          <Button full variant="secondary" disabled={!pasted.trim()} onClick={() => ingest(pasted)}>
            Use pasted list
          </Button>

          {error && <p className="text-sm text-warn">{error}</p>}
        </div>
      )}

      {step === 'map' && parsed && (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            We've guessed these from your headings. Change anything that looks wrong.
          </p>

          {MAPPABLE_FIELDS.map((field) => (
            <SelectField
              key={field.key}
              label={field.label}
              value={mapping[field.key] ?? ''}
              onChange={(e) =>
                setMapping((current) => {
                  const next = { ...current }
                  if (e.target.value) next[field.key] = e.target.value
                  else delete next[field.key]
                  return next
                })
              }
            >
              <option value="">— not in my file —</option>
              {parsed.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </SelectField>
          ))}

          {!mappingIsUsable(mapping) && (
            <p className="text-sm text-warn">
              Pick at least a full name, or a first and last name — we can't import guests without
              names.
            </p>
          )}
        </div>
      )}

      {step === 'review' && preview && (
        <div className="space-y-5">
          <div className="rounded-xl bg-primary-soft/60 px-4 py-3">
            <p className="font-medium">
              {preview.guests.length} {preview.guests.length === 1 ? 'guest' : 'guests'} ready
            </p>
            {preview.skipped > 0 && (
              <p className="mt-0.5 text-sm text-muted">
                {preview.skipped} {preview.skipped === 1 ? 'row has' : 'rows have'} no name and will
                be skipped.
              </p>
            )}
          </div>

          <Toggle
            label="Skip anyone already on the list"
            description="Matches on name, ignoring capitals"
            checked={skipDuplicates}
            onChange={setSkipDuplicates}
          />

          <div>
            <span className="field-label">First few</span>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {preview.guests.slice(0, 6).map((guest, index) => (
                <li key={`${guest.name}-${index}`} className="px-3 py-2.5">
                  <p className="truncate text-sm font-medium">{guest.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[
                      guest.party,
                      { yes: 'Attending', no: 'Declined', maybe: 'Maybe', pending: 'Pending' }[
                        guest.rsvp
                      ],
                      guest.mealChoice,
                      guest.tableName && `Table: ${guest.tableName}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
            {preview.guests.length > 6 && (
              <p className="mt-2 text-xs text-muted">
                …and {preview.guests.length - 6} more.
              </p>
            )}
          </div>

          <p className="text-xs text-muted">
            Tables named in your file are created automatically if they don't exist yet.
          </p>

          {error && <p className="text-sm text-warn">{error}</p>}
        </div>
      )}
    </Sheet>
  )
}
