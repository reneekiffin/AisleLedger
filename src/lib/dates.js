/**
 * Date helpers.
 *
 * Everything the app stores is a plain 'YYYY-MM-DD' string, parsed in LOCAL
 * time. `new Date('2026-06-13')` parses as UTC midnight, which lands on the
 * 12th for anyone west of Greenwich — hence the manual parse below.
 */

export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toISODate(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : parseDate(date)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function todayISO() {
  return toISODate(startOfToday())
}

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = parseDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(undefined, options).format(d)
}

export function formatLongDate(value) {
  return formatDate(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatMonth(value) {
  return formatDate(value, { month: 'long', year: 'numeric' })
}

export function daysBetween(from, to) {
  const a = parseDate(from)
  const b = parseDate(to)
  if (!a || !b) return null
  return Math.round((b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0)) / 86_400_000)
}

export function daysUntil(value) {
  return daysBetween(startOfToday(), value)
}

/**
 * Calendar countdown to the wedding: whole years, then whole months, then the
 * leftover days — the way people actually say it ("8 months, 3 days").
 */
export function countdown(weddingDate) {
  const target = parseDate(weddingDate)
  if (!target) return null
  const today = startOfToday()
  const totalDays = Math.round((target - today) / 86_400_000)
  if (totalDays < 0) return { past: true, totalDays, years: 0, months: 0, days: 0 }
  if (totalDays === 0) return { past: false, isToday: true, totalDays: 0, years: 0, months: 0, days: 0 }

  let years = target.getFullYear() - today.getFullYear()
  let months = target.getMonth() - today.getMonth()
  let days = target.getDate() - today.getDate()

  if (days < 0) {
    months -= 1
    // Days in the month preceding the target date.
    days += new Date(target.getFullYear(), target.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  return { past: false, isToday: false, totalDays, years, months, days }
}

export function addMonths(value, count) {
  const d = parseDate(value)
  if (!d) return null
  const target = new Date(d.getFullYear(), d.getMonth() + count, 1)
  // Clamp to the end of the shorter month (31 Jan + 1 month → 28/29 Feb).
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d.getDate(), lastDay))
  return target
}

/** Months from `from` to `to`, counted by calendar month, not by 30 days. */
export function monthDiff(from, to) {
  const a = parseDate(from)
  const b = parseDate(to)
  if (!a || !b) return null
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

/** The checklist month a dueMonthOffset lands in, relative to the wedding. */
export function offsetToMonth(weddingDate, offset) {
  const d = addMonths(weddingDate, offset)
  return d ? new Date(d.getFullYear(), d.getMonth(), 1) : null
}

export function isSameMonth(a, b) {
  const x = parseDate(a)
  const y = parseDate(b)
  if (!x || !y) return false
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth()
}

/** "in 6 days" / "3 days ago" / "today" */
export function relativeDays(value) {
  const diff = daysUntil(value)
  if (diff === null) return ''
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 0) return `in ${diff} days`
  return `${Math.abs(diff)} days ago`
}
