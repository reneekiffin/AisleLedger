#!/usr/bin/env node
/**
 * Aisle Ledger icon generator — zero dependencies.
 *
 * Draws the "two bands" mark (a pair of overlapping wedding rings) and writes
 * real PNGs with a hand-rolled encoder, so `npm run icons` works on a clean
 * checkout without installing sharp / canvas / imagemagick.
 *
 *   npm run icons
 *
 * Replace public/icons/*.png with your own artwork any time — nothing else in
 * the app depends on this script. See README ("Generating icons").
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons')

const PALETTE = {
  cream: [0xf7, 0xf5, 0xef],
  sage: [0x7c, 0x8b, 0x72],
  sageDeep: [0x5e, 0x6b, 0x55],
  blush: [0xd9, 0xa9, 0xa0],
}

// ---------- PNG encoding ----------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12 = compression, filter, interlace = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- drawing ----------

/** Signed distance to a ring (annulus) centred at cx,cy. Negative = inside. */
function ringDistance(x, y, cx, cy, radius, thickness) {
  const d = Math.hypot(x - cx, y - cy)
  return Math.abs(d - radius) - thickness / 2
}

function mix(base, layer, alpha) {
  return [
    Math.round(base[0] + (layer[0] - base[0]) * alpha),
    Math.round(base[1] + (layer[1] - base[1]) * alpha),
    Math.round(base[2] + (layer[2] - base[2]) * alpha),
  ]
}

/**
 * @param {number} size      pixel dimensions (square)
 * @param {number[]} bg      background rgb
 * @param {number[][]} inks  [leftRingColour, rightRingColour]
 * @param {number} scale     total mark WIDTH as a fraction of the canvas
 */
function drawIcon(size, bg, inks, scale) {
  const SS = 4 // supersampling factor, for clean anti-aliased curves
  const buf = Buffer.alloc(size * size * 4)
  const spread = 0.55 // ring centre offset, as a fraction of the radius
  // The two rings span (2 + 2 * spread) radii end to end; solve for the radius
  // that makes that span equal `scale` of the canvas.
  const radius = (size * scale) / (2 + 2 * spread)
  const thickness = radius * 0.22
  const offset = radius * spread
  const cy = size / 2
  const rings = [
    { cx: size / 2 - offset, colour: inks[0] },
    { cx: size / 2 + offset, colour: inks[1] },
  ]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = bg[0], g = bg[1], b = bg[2]

      for (const ring of rings) {
        let hits = 0
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const px = x + (sx + 0.5) / SS
            const py = y + (sy + 0.5) / SS
            if (ringDistance(px, py, ring.cx, cy, radius, thickness) <= 0) hits++
          }
        }
        if (hits > 0) {
          const [nr, ng, nb] = mix([r, g, b], ring.colour, hits / (SS * SS))
          r = nr; g = ng; b = nb
        }
      }

      const i = (y * size + x) * 4
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = 255
    }
  }
  return encodePng(size, size, buf)
}

// ---------- output ----------

const TARGETS = [
  // Standard icons: the mark on cream, generous breathing room.
  { file: 'icon-192.png', size: 192, bg: PALETTE.cream, inks: [PALETTE.sage, PALETTE.blush], scale: 0.76 },
  { file: 'icon-512.png', size: 512, bg: PALETTE.cream, inks: [PALETTE.sage, PALETTE.blush], scale: 0.76 },
  // Maskable: full-bleed sage, mark kept inside the 80% safe zone so Android
  // can crop it to a circle / squircle without clipping the rings.
  { file: 'maskable-192.png', size: 192, bg: PALETTE.sageDeep, inks: [PALETTE.cream, PALETTE.blush], scale: 0.6 },
  { file: 'maskable-512.png', size: 512, bg: PALETTE.sageDeep, inks: [PALETTE.cream, PALETTE.blush], scale: 0.6 },
  // iOS rounds the corners itself, so this one is a plain square.
  { file: 'apple-touch-icon.png', size: 180, bg: PALETTE.cream, inks: [PALETTE.sage, PALETTE.blush], scale: 0.76 },
]

mkdirSync(OUT_DIR, { recursive: true })
for (const t of TARGETS) {
  writeFileSync(resolve(OUT_DIR, t.file), drawIcon(t.size, t.bg, t.inks, t.scale))
  console.log(`wrote icons/${t.file} (${t.size}×${t.size})`)
}
