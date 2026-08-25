/**
 * CSV import/export for the guest list.
 *
 * Couples arrive with a list they've already built somewhere else — The Knot,
 * Zola, Joy, or just a spreadsheet — so the importer reads a plain CSV and
 * guesses the columns rather than demanding a specific template. Every guess
 * is shown and overridable before anything is written.
 */

/**
 * RFC 4180-ish parser: handles quoted fields, embedded commas and newlines,
 * doubled quotes as an escape, and both CRLF and LF line endings.
 */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '') // strip a BOM from Excel
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const char = src[i]

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\r') {
      // swallow; the \n that follows ends the row
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  // Whatever is left after the last newline is a final row.
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }

  const cleaned = rows.filter((r) => r.some((cell) => cell.trim() !== ''))
  if (!cleaned.length) return { headers: [], rows: [] }

  const headers = cleaned[0].map((h) => h.trim())
  const body = cleaned.slice(1).map((cells) => {
    const record = {}
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').trim()
    })
    return record
  })

  return { headers, rows: body }
}

export function toCsv(headers, rows) {
  const escape = (value) => {
    const str = value == null ? '' : String(value)
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\r\n')
}

/** Header aliases, lowercased. Longest/most specific first within each field. */
const ALIASES = {
  fullName: ['full name', 'guest name', 'name', 'guest', 'attendee'],
  firstName: ['guest first name', 'first name', 'firstname', 'first'],
  lastName: ['guest last name', 'last name', 'lastname', 'surname', 'last'],
  party: ['party name', 'household', 'party', 'group', 'family', 'invite group', 'grouping'],
  rsvp: ['rsvp status', 'rsvp', 'attending', 'status', 'response', 'attendance'],
  meal: ['meal choice', 'meal', 'entree', 'entrée', 'menu', 'dinner', 'food choice', 'meal preference'],
  table: ['table number', 'table name', 'table', 'seating', 'seat'],
  notes: ['notes', 'note', 'comments', 'comment'],
}

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Best-guess mapping from the file's headers onto our fields. Each header is
 * claimed by at most one field, so a sheet with both "Name" and "First Name"
 * doesn't map two of our fields onto the same column.
 */
export function detectMapping(headers) {
  const mapping = {}
  const taken = new Set()

  // First/last beat a single full-name column when both are present.
  const order = ['firstName', 'lastName', 'fullName', 'party', 'rsvp', 'meal', 'table', 'notes']

  for (const field of order) {
    for (const alias of ALIASES[field]) {
      const match = headers.find((h) => !taken.has(h) && norm(h) === alias)
      if (match) {
        mapping[field] = match
        taken.add(match)
        break
      }
    }
  }

  // A file with first+last doesn't need the full-name column mapped as well.
  if (mapping.firstName && mapping.lastName) delete mapping.fullName

  return mapping
}

const RSVP_VALUES = {
  yes: ['yes', 'y', 'attending', 'accepted', 'accept', 'coming', 'will attend', 'rsvp yes', 'confirmed', '1', 'true'],
  no: ['no', 'n', 'declined', 'decline', 'not attending', 'regrets', 'cannot attend', "can't attend", 'rsvp no', '0', 'false'],
  maybe: ['maybe', 'tentative', 'unsure', 'possibly'],
}

/** Anything unrecognised — including blank — becomes "pending". */
export function normaliseRsvp(value) {
  const v = norm(value)
  if (!v) return 'pending'
  for (const [status, options] of Object.entries(RSVP_VALUES)) {
    if (options.includes(v)) return status
  }
  if (v.startsWith('accept') || v.startsWith('attend')) return 'yes'
  if (v.startsWith('declin') || v.startsWith('regret')) return 'no'
  return 'pending'
}

/**
 * Turn parsed rows into guest records. Rows with no usable name are reported
 * as skipped rather than imported as "Guest".
 */
export function buildGuests(rows, mapping) {
  const guests = []
  let skipped = 0

  for (const row of rows) {
    const first = mapping.firstName ? row[mapping.firstName] : ''
    const last = mapping.lastName ? row[mapping.lastName] : ''
    const full = mapping.fullName ? row[mapping.fullName] : ''
    const name = (full || [first, last].filter(Boolean).join(' ')).trim()

    if (!name) {
      skipped += 1
      continue
    }

    guests.push({
      name,
      party: mapping.party ? row[mapping.party] : '',
      rsvp: normaliseRsvp(mapping.rsvp ? row[mapping.rsvp] : ''),
      mealChoice: mapping.meal ? row[mapping.meal] : '',
      notes: mapping.notes ? row[mapping.notes] : '',
      tableName: mapping.table ? row[mapping.table] : '',
    })
  }

  return { guests, skipped }
}

/** Field labels for the mapping UI, in display order. `name` is required. */
export const MAPPABLE_FIELDS = [
  { key: 'fullName', label: 'Full name' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'party', label: 'Party / household' },
  { key: 'rsvp', label: 'RSVP' },
  { key: 'meal', label: 'Meal choice' },
  { key: 'table', label: 'Table' },
  { key: 'notes', label: 'Notes' },
]

export function mappingIsUsable(mapping) {
  return !!(mapping.fullName || mapping.firstName || mapping.lastName)
}

export const GUEST_EXPORT_HEADERS = ['Name', 'Party', 'RSVP', 'Meal', 'Table', 'Notes']

const RSVP_LABELS = { yes: 'Attending', no: 'Declined', maybe: 'Maybe', pending: 'Pending' }

export function guestsToCsv(guests, tablesById = new Map()) {
  return toCsv(
    GUEST_EXPORT_HEADERS,
    guests.map((g) => ({
      Name: g.name,
      Party: g.party,
      RSVP: RSVP_LABELS[g.rsvp] ?? 'Pending',
      Meal: g.mealChoice,
      Table: g.tableId ? (tablesById.get(g.tableId)?.name ?? '') : '',
      Notes: g.notes ?? '',
    })),
  )
}
