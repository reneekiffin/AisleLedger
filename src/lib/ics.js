/**
 * Builds an iCalendar (.ics) file from the wedding-day timeline.
 *
 * Opening the file on a phone offers "Add to Calendar", which is the point:
 * the couple, the party and the vendors all end up with the running order in
 * the app they already check.
 *
 * Times are written as *floating* local times — no Z, no TZID. A wedding at
 * 2pm is at 2pm wherever the guest's phone thinks it is, which is what people
 * expect and what every major calendar client handles correctly. Anchoring to
 * a timezone would risk shifting the whole day for someone travelling.
 */

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newlines are escaped. */
function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** RFC 5545 §3.1: content lines are folded at 75 octets. */
function fold(line) {
  if (line.length <= 75) return line
  const parts = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`)
    rest = rest.slice(74)
  }
  if (rest) parts.push(` ${rest}`)
  return parts.join('\r\n')
}

const pad = (n) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' + 'HH:MM' -> '20270612T140000' */
function localStamp(date, time, addMinutes = 0) {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number)
  const [hh, mm] = String(time || '00:00').split(':').map(Number)
  const at = new Date(y, m - 1, d, hh || 0, mm || 0)
  if (addMinutes) at.setMinutes(at.getMinutes() + addMinutes)
  return (
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}` +
    `T${pad(at.getHours())}${pad(at.getMinutes())}00`
  )
}

function utcStamp(date = new Date()) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/**
 * @param {object} wedding  needs weddingDate and coupleNames
 * @param {Array} entries   [{ id, time, title, note }]
 * @param {{ defaultMinutes?: number }} options  length of the final entry
 */
export function buildTimelineIcs(wedding, entries, { defaultMinutes = 60 } = {}) {
  const date = wedding?.weddingDate
  if (!date) throw new Error('Add a wedding date first — the calendar needs a day to put this on.')

  const ordered = entries
    .filter((e) => e.time)
    .slice()
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))

  if (!ordered.length) throw new Error('Add something to the timeline first.')

  const stamp = utcStamp()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aisle Ledger//Wedding Day Timeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`${wedding.coupleNames} — wedding day`)}`,
  ]

  ordered.forEach((entry, index) => {
    // Each moment runs until the next one starts, so the day reads as a solid
    // block rather than a column of arbitrary one-hour slots.
    const next = ordered[index + 1]
    const end = next
      ? localStamp(date, next.time)
      : localStamp(date, entry.time, defaultMinutes)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.id ?? `${index}-${entry.time}`}@aisle-ledger`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${localStamp(date, entry.time)}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(entry.title)}`,
    )
    if (entry.note) lines.push(`DESCRIPTION:${escapeText(entry.note)}`)
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n')
}
