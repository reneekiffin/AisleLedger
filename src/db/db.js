import Dexie from 'dexie'

export const SCHEMA_VERSION = 1

/**
 * One IndexedDB database holds every wedding. Each row carries a `weddingId`,
 * so the wedding switcher is only ever a filter — never a second database.
 *
 * Booleans (`isPaid`, `done`) are deliberately NOT indexed: IndexedDB has no
 * boolean key type, so indexing them would silently drop rows from queries.
 */
export const db = new Dexie('aisle-ledger')

db.version(1).stores({
  weddings: 'id, updatedAt',
  categories: 'id, weddingId, [weddingId+order]',
  vendors: 'id, weddingId, categoryId, [weddingId+categoryId], [weddingId+status]',
  payments: 'id, weddingId, vendorId, date, [weddingId+date]',
  paymentSchedule: 'id, weddingId, vendorId, dueDate, [weddingId+dueDate]',
  guests: 'id, weddingId, party, rsvp, tableId, [weddingId+party]',
  tasks: 'id, weddingId, dueMonthOffset, [weddingId+dueMonthOffset]',
  tables: 'id, weddingId, [weddingId+order]',
  timeline: 'id, weddingId, [weddingId+time]',
  moodboard: 'id, weddingId, [weddingId+order]',
  meta: 'key',
})

/**
 * Every table that belongs to a wedding, in dependency order. Used by delete,
 * export and import so a new table only has to be added in one place.
 */
export const WEDDING_TABLES = [
  'categories',
  'vendors',
  'payments',
  'paymentSchedule',
  'guests',
  'tasks',
  'tables',
  'timeline',
  'moodboard',
]

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const nowIso = () => new Date().toISOString()
