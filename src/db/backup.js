import { db, uid, nowIso, WEDDING_TABLES, SCHEMA_VERSION } from './db'
import { setMeta } from './repo'

/**
 * JSON backup / restore.
 *
 * This is the fallback for moving data between devices or recovering after a
 * browser clears site storage — not the primary UX. It lives under Settings.
 */

export const BACKUP_FORMAT = 'aisle-ledger-backup'

export async function buildBackup() {
  const payload = {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    weddings: await db.weddings.toArray(),
  }
  for (const table of WEDDING_TABLES) {
    payload[table] = await db[table].toArray()
  }
  return payload
}

export function backupFilename(weddings = []) {
  const stamp = new Date().toISOString().slice(0, 10)
  const name =
    weddings.length === 1
      ? weddings[0].coupleNames.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
      : 'all-weddings'
  return `aisle-ledger-${name || 'backup'}-${stamp}.json`
}

/**
 * Hands the backup to the OS: the iOS/Android share sheet when files can be
 * shared, otherwise a plain download. Records the backup date either way.
 */
export async function exportBackup() {
  const payload = await buildBackup()
  const json = JSON.stringify(payload, null, 2)
  const filename = backupFilename(payload.weddings)
  const file = new File([json], filename, { type: 'application/json' })

  let method = 'download'
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Aisle Ledger backup' })
      method = 'share'
    } catch (err) {
      // The user dismissing the share sheet is not a failure — but it also
      // isn't a backup, so bail out without recording a date.
      if (err?.name === 'AbortError') return { method: 'cancelled' }
      method = 'download'
    }
  }

  if (method === 'download') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  const at = nowIso()
  await setMeta('lastBackupAt', at)
  return { method, filename, at }
}

/**
 * v1 backups carry the seating store under its old name. Nothing was ever
 * written to it (the name collided with a Dexie built-in, so every write
 * threw), but remap it rather than silently dropping the key.
 */
function upgradeBackup(data) {
  if ('tables' in data && !('seatingTables' in data)) {
    data.seatingTables = data.tables
    delete data.tables
  }
  return data
}

export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (data?.format !== BACKUP_FORMAT || !Array.isArray(data.weddings)) {
    throw new Error("That doesn't look like an Aisle Ledger backup.")
  }
  if (Number(data.schemaVersion) > SCHEMA_VERSION) {
    throw new Error('That backup was made by a newer version of Aisle Ledger. Update the app first.')
  }
  return upgradeBackup(data)
}

/**
 * @param {object} data  a parsed backup
 * @param {'replace'|'merge'} mode
 *   replace — wipe everything on this device and restore the file as-is.
 *   merge   — bring the file's weddings in alongside what's already here,
 *             under fresh ids so nothing collides or overwrites.
 */
export async function restoreBackup(data, mode = 'merge') {
  const tables = [db.weddings, ...WEDDING_TABLES.map((t) => db[t]), db.meta]

  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      await Promise.all([db.weddings.clear(), ...WEDDING_TABLES.map((t) => db[t].clear())])
      await db.weddings.bulkAdd(data.weddings)
      for (const table of WEDDING_TABLES) {
        if (Array.isArray(data[table]) && data[table].length) await db[table].bulkAdd(data[table])
      }
      await db.meta.put({ key: 'activeWeddingId', value: data.weddings[0]?.id ?? null })
      return
    }

    // Merge: remap every id so an imported wedding can sit next to a wedding
    // it was originally copied from.
    const idMap = new Map()
    const remap = (oldId) => {
      if (oldId == null) return null
      if (!idMap.has(oldId)) idMap.set(oldId, uid())
      return idMap.get(oldId)
    }

    const weddings = data.weddings.map((w) => ({
      ...w,
      id: remap(w.id),
      coupleNames: `${w.coupleNames} (imported)`,
      updatedAt: nowIso(),
    }))
    await db.weddings.bulkAdd(weddings)

    for (const table of WEDDING_TABLES) {
      const rows = Array.isArray(data[table]) ? data[table] : []
      if (!rows.length) continue
      await db[table].bulkAdd(
        rows.map((row) => {
          const next = { ...row, id: remap(row.id), weddingId: remap(row.weddingId) }
          for (const key of ['categoryId', 'vendorId', 'tableId', 'scheduleId', 'paidPaymentId']) {
            if (key in next) next[key] = remap(next[key])
          }
          return next
        }),
      )
    }

    if (weddings[0]) await db.meta.put({ key: 'activeWeddingId', value: weddings[0].id })
  })

  return { weddings: data.weddings.length, mode }
}
