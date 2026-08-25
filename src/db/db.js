import Dexie from 'dexie'

export const SCHEMA_VERSION = 2

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

/*
 * v2 renames the seating store from `tables` to `seatingTables`.
 *
 * `db.tables` is Dexie's own property — the array of every Table object in the
 * database — so a store called `tables` was shadowed by it and every
 * `db.tables.add(...)` threw "db.tables.add is not a function". Nothing was
 * ever written there, so there is no data to migrate; the old store is just
 * dropped.
 */
db.version(2).stores({
  tables: null,
  seatingTables: 'id, weddingId, [weddingId+order]',
  // The wedding party, and the shops people are buying their outfits from.
  weddingParty: 'id, weddingId, role, [weddingId+order]',
  shopLinks: 'id, weddingId, forRole, [weddingId+order]',
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
  'seatingTables',
  'weddingParty',
  'shopLinks',
  'timeline',
  'moodboard',
]

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const nowIso = () => new Date().toISOString()

/**
 * Guards against a store name that collides with something Dexie already
 * defines on the instance — `tables` did, and shadowed the real store so every
 * write threw at runtime instead of failing loudly here. Cheap to check once
 * at import; loud enough that the next collision can't hide.
 */
for (const name of ['weddings', ...WEDDING_TABLES, 'meta']) {
  if (typeof db[name]?.add !== 'function') {
    throw new Error(
      `[aisle-ledger] store "${name}" does not resolve to a Dexie table — ` +
        'the name probably collides with a built-in Dexie property. Rename it.',
    )
  }
}
