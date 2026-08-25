import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * HSL colour wheel: hue around the circumference, saturation from the centre
 * out, with lightness on a separate slider.
 *
 * Drawn to a canvas rather than hand-authored as SVG gradients — a real
 * radial hue sweep needs per-pixel colour, and canvas is both simpler and
 * sharper than stacking conic gradients.
 */

const SIZE = 220

function hslToHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function hexToHsl(hex) {
  const clean = String(hex ?? '').replace('#', '')
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function isValidHex(value) {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value ?? '').trim())
}

export function ColourWheel({ value, onChange }) {
  const canvas = useRef(null)
  const dragging = useRef(false)
  const [hsl, setHsl] = useState(() => hexToHsl(value || '#7C8B72'))

  // Follow the value when it's changed elsewhere (hex field, swatch preset),
  // but never while the user is dragging on the wheel.
  useEffect(() => {
    if (!dragging.current && isValidHex(value)) {
      const next = hexToHsl(value)
      setHsl((current) =>
        current.h === next.h && current.s === next.s && current.l === next.l ? current : next,
      )
    }
  }, [value])

  // Repaint only when lightness changes — hue and saturation are positional.
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    el.width = SIZE * dpr
    el.height = SIZE * dpr
    ctx.scale(dpr, dpr)

    const image = ctx.createImageData(SIZE * dpr, SIZE * dpr)
    const radius = (SIZE * dpr) / 2

    for (let y = 0; y < SIZE * dpr; y++) {
      for (let x = 0; x < SIZE * dpr; x++) {
        const dx = x - radius
        const dy = y - radius
        const distance = Math.sqrt(dx * dx + dy * dy)
        const index = (y * SIZE * dpr + x) * 4

        if (distance > radius) {
          image.data[index + 3] = 0
          continue
        }

        const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
        const saturation = Math.min(100, (distance / radius) * 100)
        const hex = hslToHex(hue, saturation, hsl.l)
        image.data[index] = parseInt(hex.slice(1, 3), 16)
        image.data[index + 1] = parseInt(hex.slice(3, 5), 16)
        image.data[index + 2] = parseInt(hex.slice(5, 7), 16)
        // Feather the last pixel so the rim isn't jagged.
        image.data[index + 3] = distance > radius - 1 ? 255 * (radius - distance) : 255
      }
    }
    ctx.putImageData(image, 0, 0)
  }, [hsl.l])

  const pick = useCallback(
    (clientX, clientY) => {
      const rect = canvas.current.getBoundingClientRect()
      const dx = clientX - rect.left - rect.width / 2
      const dy = clientY - rect.top - rect.height / 2
      const radius = rect.width / 2
      const distance = Math.min(Math.sqrt(dx * dx + dy * dy), radius)
      const hue = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360)
      const saturation = Math.round((distance / radius) * 100)
      setHsl((current) => {
        const next = { ...current, h: hue, s: saturation }
        onChange(hslToHex(next.h, next.s, next.l))
        return next
      })
    },
    [onChange],
  )

  const setLightness = (l) => {
    setHsl((current) => {
      const next = { ...current, l }
      onChange(hslToHex(next.h, next.s, next.l))
      return next
    })
  }

  // Keyboard equivalents, so the wheel isn't pointer-only.
  const onKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 2
    const moves = {
      ArrowLeft: { h: -step },
      ArrowRight: { h: step },
      ArrowUp: { s: step },
      ArrowDown: { s: -step },
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    setHsl((current) => {
      const next = {
        ...current,
        h: (((current.h + (move.h ?? 0)) % 360) + 360) % 360,
        s: Math.max(0, Math.min(100, current.s + (move.s ?? 0))),
      }
      onChange(hslToHex(next.h, next.s, next.l))
      return next
    })
  }

  const angle = (hsl.h * Math.PI) / 180
  const markerRadius = (hsl.s / 100) * (SIZE / 2)
  const markerX = SIZE / 2 + Math.cos(angle) * markerRadius
  const markerY = SIZE / 2 + Math.sin(angle) * markerRadius

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <canvas
          ref={canvas}
          role="application"
          aria-label={`Colour wheel. Hue ${hsl.h} degrees, saturation ${hsl.s} percent. Arrow keys adjust.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="cursor-crosshair rounded-full shadow-card focus-ring touch-none"
          style={{ width: SIZE, height: SIZE }}
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            pick(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => dragging.current && pick(e.clientX, e.clientY)}
          onPointerUp={() => {
            dragging.current = false
          }}
          onPointerCancel={() => {
            dragging.current = false
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: markerX, top: markerY, background: value }}
        />
      </div>

      <label className="w-full">
        <span className="field-label">Lightness</span>
        <input
          type="range"
          min="5"
          max="95"
          value={hsl.l}
          onChange={(e) => setLightness(Number(e.target.value))}
          className="h-9 w-full accent-[rgb(var(--c-primary))]"
          style={{
            background: `linear-gradient(to right, ${hslToHex(hsl.h, hsl.s, 10)}, ${hslToHex(
              hsl.h,
              hsl.s,
              50,
            )}, ${hslToHex(hsl.h, hsl.s, 90)})`,
            borderRadius: 9999,
          }}
        />
      </label>
    </div>
  )
}
