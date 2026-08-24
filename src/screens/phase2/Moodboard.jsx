import { useMemo, useRef, useState } from 'react'
import { useWedding, useWeddingTable } from '../../state/WeddingProvider'
import { useTrackedAction } from '../../hooks/useAutosave'
import { Screen } from '../../components/Screen'
import { Card, EmptyState, SectionHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { TextField } from '../../components/ui/Field'
import { PlusIcon } from '../../components/nav/Icons'
import { addMoodboardItem, deleteMoodboardItem, listMoodboard } from '../../db/repo'

const FONT_STACKS = {
  Serif: "'Iowan Old Style', Palatino, Georgia, serif",
  Sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  Script: "'Snell Roundhand', 'Brush Script MT', cursive",
  Mono: "ui-monospace, 'SF Mono', Menlo, monospace",
}

/** Downscales a photo before it goes into IndexedDB — phone shots are huge. */
function fileToDataUrl(file, maxEdge = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That file is not an image we can read.'))
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/** Composes the board onto a canvas and hands it to the share sheet. */
async function shareBoard(items, title) {
  const width = 1080
  const cols = 3
  const cell = width / cols
  const colours = items.filter((i) => i.kind === 'colour')
  const images = items.filter((i) => i.kind === 'image')
  const fonts = items.filter((i) => i.kind === 'font')
  const imageRows = Math.ceil(images.length / cols)
  const height = 200 + imageRows * cell + (colours.length ? 180 : 0) + fonts.length * 70 + 60

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#F7F5EF'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#2E3229'
  ctx.font = '600 46px Georgia, serif'
  ctx.fillText(title, 48, 96)
  ctx.fillStyle = '#6E7268'
  ctx.font = '24px system-ui, sans-serif'
  ctx.fillText('Aisle Ledger moodboard', 48, 140)

  let y = 190
  await Promise.all(
    images.map(
      (item, index) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            const x = (index % cols) * cell
            const row = Math.floor(index / cols)
            const size = Math.min(img.width, img.height)
            ctx.drawImage(
              img,
              (img.width - size) / 2,
              (img.height - size) / 2,
              size,
              size,
              x + 8,
              y + row * cell + 8,
              cell - 16,
              cell - 16,
            )
            resolve()
          }
          img.onerror = resolve
          img.src = item.value
        }),
    ),
  )
  y += imageRows * cell + 20

  if (colours.length) {
    const swatch = (width - 96) / colours.length
    colours.forEach((item, index) => {
      ctx.fillStyle = item.value
      ctx.fillRect(48 + index * swatch, y, swatch - 8, 120)
    })
    y += 160
  }

  fonts.forEach((item) => {
    ctx.fillStyle = '#2E3229'
    ctx.font = `34px ${FONT_STACKS[item.value] ?? 'serif'}`
    ctx.fillText(item.label || item.value, 48, y + 40)
    y += 70
  })

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const file = new File([blob], 'moodboard.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'moodboard.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export default function Moodboard() {
  const { wedding, weddingId } = useWedding()
  const items = useWeddingTable(listMoodboard) ?? []
  const track = useTrackedAction()
  const fileInput = useRef(null)
  const [adding, setAdding] = useState(null) // 'colour' | 'font' | null
  const [error, setError] = useState('')

  const colours = useMemo(() => items.filter((i) => i.kind === 'colour'), [items])
  const fonts = useMemo(() => items.filter((i) => i.kind === 'font'), [items])
  const images = useMemo(() => items.filter((i) => i.kind === 'image'), [items])

  const onFiles = async (event) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    setError('')
    for (const file of files) {
      try {
        const value = await fileToDataUrl(file)
        await track(() => addMoodboardItem(weddingId, { kind: 'image', value, label: file.name }))
      } catch (err) {
        setError(err.message)
      }
    }
  }

  return (
    <Screen
      title="Moodboard"
      back="/more"
      action={
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label="Add photo"
          className="tap flex items-center justify-center rounded-full bg-primary text-white focus-ring"
        >
          <PlusIcon width={20} height={20} />
        </button>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Add inspiration photos"
        onChange={onFiles}
      />

      {items.length === 0 && (
        <EmptyState
          title="Start the look"
          body="Pull in a colour palette, the fonts you like, and photos that capture the feeling."
          action={<Button onClick={() => fileInput.current?.click()}>Add a photo</Button>}
        />
      )}

      <section className="mt-2">
        <SectionHeader
          title="Palette"
          action={
            <Button size="sm" variant="soft" onClick={() => setAdding('colour')}>
              Add colour
            </Button>
          }
        />
        {colours.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No colours yet.</p>
          </Card>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {colours.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => track(() => deleteMoodboardItem(item.id))}
                  className="flex flex-col items-center gap-1.5 focus-ring rounded-xl p-1"
                >
                  <span
                    className="block h-16 w-16 rounded-xl border border-line"
                    style={{ background: item.value }}
                  />
                  <span className="text-[11px] tabular-nums text-muted">{item.value}</span>
                  <span className="sr-only">Remove {item.value}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Fonts"
          action={
            <Button size="sm" variant="soft" onClick={() => setAdding('font')}>
              Add font
            </Button>
          }
        />
        {fonts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No fonts chosen yet.</p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {fonts.map((item) => (
              <li key={item.id}>
                <Card className="flex items-center gap-3">
                  <p
                    className="min-w-0 flex-1 truncate text-xl"
                    style={{ fontFamily: FONT_STACKS[item.value] ?? 'serif' }}
                  >
                    {item.label || 'Frankie & Sam'}
                  </p>
                  <span className="shrink-0 text-xs text-muted">{item.value}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.value}`}
                    onClick={() => track(() => deleteMoodboardItem(item.id))}
                    className="tap shrink-0 rounded-lg text-muted focus-ring"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader title="Inspiration" hint={images.length ? `${images.length} photos` : undefined} />
        {images.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No photos yet — they're stored on this device only.</p>
          </Card>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {images.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => track(() => deleteMoodboardItem(item.id))}
                  className="block w-full overflow-hidden rounded-xl border border-line focus-ring"
                >
                  <img
                    src={item.value}
                    alt={item.label || 'Inspiration'}
                    className="aspect-square w-full object-cover"
                  />
                  <span className="sr-only">Remove photo</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="mt-4 text-sm text-warn">{error}</p>}

      {items.length > 0 && (
        <Button
          full
          variant="secondary"
          className="mt-7"
          onClick={() => shareBoard(items, wedding?.coupleNames ?? 'Our wedding')}
        >
          Share as image
        </Button>
      )}

      <Sheet
        open={!!adding}
        onClose={() => setAdding(null)}
        title={adding === 'colour' ? 'Add a colour' : 'Add a font'}
      >
        {adding === 'colour' ? (
          <ColourForm
            onSubmit={(value) => {
              track(() => addMoodboardItem(weddingId, { kind: 'colour', value }))
              setAdding(null)
            }}
          />
        ) : (
          <FontForm
            onSubmit={(value, label) => {
              track(() => addMoodboardItem(weddingId, { kind: 'font', value, label }))
              setAdding(null)
            }}
          />
        )}
      </Sheet>
    </Screen>
  )
}

function ColourForm({ onSubmit }) {
  const [value, setValue] = useState('#7C8B72')
  return (
    <div className="space-y-5">
      <label className="block">
        <span className="field-label">Colour</span>
        <input
          type="color"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-16 w-full cursor-pointer rounded-xl border border-line bg-surface p-1"
        />
      </label>
      <TextField label="Hex" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button full onClick={() => onSubmit(value)}>
        Add to palette
      </Button>
    </div>
  )
}

function FontForm({ onSubmit }) {
  const [family, setFamily] = useState('Serif')
  const [label, setLabel] = useState('Frankie & Sam')
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {Object.keys(FONT_STACKS).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={family === name}
            onClick={() => setFamily(name)}
            className={`card p-3 text-center focus-ring ${family === name ? 'ring-2 ring-primary' : ''}`}
          >
            <span className="block text-lg" style={{ fontFamily: FONT_STACKS[name] }}>
              Aa
            </span>
            <span className="mt-1 block text-xs text-muted">{name}</span>
          </button>
        ))}
      </div>
      <TextField label="Sample text" value={label} onChange={(e) => setLabel(e.target.value)} />
      <Button full onClick={() => onSubmit(family, label)}>
        Add font
      </Button>
    </div>
  )
}
