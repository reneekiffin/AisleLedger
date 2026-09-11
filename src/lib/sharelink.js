/**
 * Share links with no server behind them.
 *
 * The shared data is compressed and packed into the URL's *fragment* — the
 * part after the `#`. Browsers never send a fragment to the server, so the
 * content of a shared list is never transmitted to GitHub, to us, or to
 * anyone but the person you send the link to. Nothing is stored anywhere.
 *
 * The trade-off is honest and worth stating in the UI: the link *is* the data.
 * Anyone who gets it can read it, and it can't be revoked — but it also can't
 * leak from a database that doesn't exist.
 */

const MAX_URL_LENGTH = 8000 // comfortably under what messaging apps mangle

const toBase64Url = (bytes) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

const canCompress = () => typeof CompressionStream !== 'undefined'

async function compress(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function decompress(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** @returns {Promise<string>} the fragment payload, prefixed z (deflated) or p (plain) */
export async function encodeShare(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  if (canCompress()) {
    try {
      return `z${toBase64Url(await compress(bytes))}`
    } catch {
      /* fall through to plain */
    }
  }
  return `p${toBase64Url(bytes)}`
}

export async function decodeShare(fragment) {
  const text = String(fragment ?? '').replace(/^#/, '')
  if (!text) throw new Error('This link has no content in it.')
  const mode = text[0]
  const body = text.slice(1)
  let bytes
  try {
    bytes = fromBase64Url(body)
    if (mode === 'z') bytes = await decompress(bytes)
    else if (mode !== 'p') throw new Error('unknown mode')
  } catch {
    throw new Error("This link looks damaged — it may have been cut short when it was sent.")
  }
  const payload = JSON.parse(new TextDecoder().decode(bytes))
  if (!payload || payload.v !== 1) throw new Error('This link was made by a different version of the app.')
  return payload
}

export function shareUrl(fragment) {
  const { origin } = window.location
  const base = import.meta.env.BASE_URL || '/'
  return `${origin}${base}shared#${fragment}`
}

export function isTooLong(url) {
  return url.length > MAX_URL_LENGTH
}

/**
 * Shareable views. Each strips anything personal that the recipient has no
 * business seeing — a bridesmaid needs the dress link and her size, not
 * everyone's phone number or what the couple is paying.
 */
export function buildPartyShare(wedding, party, shops) {
  return {
    v: 1,
    kind: 'party',
    couple: wedding?.coupleNames ?? 'Our wedding',
    date: wedding?.weddingDate ?? '',
    generatedAt: new Date().toISOString(),
    shops: shops
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(({ label, url, forRole, note }) => ({ label, url, forRole, note })),
    people: party
      .slice()
      .sort((a, b) => a.order - b.order)
      // Deliberately omits phone, email, cost, paidBy and notes.
      .map(({ name, role, outfit, outfitUrl, size, colour }) => ({
        name,
        role,
        outfit,
        outfitUrl,
        size,
        colour,
      })),
  }
}

export function buildTimelineShare(wedding, entries) {
  return {
    v: 1,
    kind: 'timeline',
    couple: wedding?.coupleNames ?? 'Our wedding',
    date: wedding?.weddingDate ?? '',
    generatedAt: new Date().toISOString(),
    entries: entries
      .slice()
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
      .map(({ time, title, note }) => ({ time, title, note })),
  }
}

/** Hands a link to the share sheet, falling back to the clipboard. */
export async function shareLink(url, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
