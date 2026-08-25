import { db, uid, nowIso, WEDDING_TABLES, SCHEMA_VERSION } from './db'
import { DEFAULT_CATEGORIES, DEFAULT_TASKS } from './seed'

/**
 * The only module that talks to Dexie directly.
 *
 * Screens call these functions and never touch `db` themselves, so adding a
 * cloud sync layer later means wrapping this file (queue a mutation, push it,
 * reconcile) rather than rewriting the UI.
 */

// ---------------------------------------------------------------- app meta

export async function getMeta(key, fallback = null) {
  const row = await db.meta.get(key)
  return row ? row.value : fallback
}

export async function setMeta(key, value) {
  await db.meta.put({ key, value })
  return value
}

// ---------------------------------------------------------------- weddings

/** Bump the wedding's updatedAt so "Saved ✓" and backups have a timestamp. */
async function touch(weddingId) {
  if (!weddingId) return
  await db.weddings.update(weddingId, { updatedAt: nowIso() })
}

export function listWeddings() {
  return db.weddings.orderBy('updatedAt').reverse().toArray()
}

export function getWedding(id) {
  return id ? db.weddings.get(id) : Promise.resolve(undefined)
}

/**
 * Create a wedding plus its starting categories and 12-month checklist.
 *
 * @param {object} details          coupleNames, weddingDate, targetBudget, guestCount, currency, theme
 * @param {Array}  categoryChoices  [{ name, percent, isPerHead }] — usually the
 *                                  onboarding form's edited copy of DEFAULT_CATEGORIES
 */
export async function createWedding(details, categoryChoices = DEFAULT_CATEGORIES) {
  const id = uid()
  const guestCount = Number(details.guestCount) || 0
  const targetBudget = Number(details.targetBudget) || 0

  const wedding = {
    id,
    schemaVersion: SCHEMA_VERSION,
    coupleNames: details.coupleNames?.trim() || 'Our wedding',
    weddingDate: details.weddingDate || '',
    targetBudget,
    guestCount,
    currency: details.currency || 'USD',
    theme: details.theme || 'sage',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  const categories = categoryChoices.map((c, index) => {
    const budgetAmount =
      c.budgetAmount != null
        ? Number(c.budgetAmount) || 0
        : Math.round((targetBudget * (Number(c.percent) || 0)) / 100)
    return {
      id: uid(),
      weddingId: id,
      name: c.name,
      budgetAmount,
      isPerHead: !!c.isPerHead,
      // Per-head categories keep the rate; the budget is re-derived whenever
      // the guest count moves.
      perHeadRate: c.isPerHead && guestCount > 0 ? round2(budgetAmount / guestCount) : 0,
      order: index,
    }
  })

  const tasks = DEFAULT_TASKS.map(([dueMonthOffset, title]) => ({
    id: uid(),
    weddingId: id,
    title,
    dueMonthOffset,
    // Left empty on purpose: with no explicit date the checklist derives one
    // from the wedding date, so moving the wedding re-flows the whole plan.
    // Editing a task's date fills this in and pins it.
    dueDate: '',
    done: false,
  }))

  await db.transaction('rw', db.weddings, db.categories, db.tasks, db.meta, async () => {
    await db.weddings.add(wedding)
    await db.categories.bulkAdd(categories)
    await db.tasks.bulkAdd(tasks)
    await db.meta.put({ key: 'activeWeddingId', value: id })
  })

  return id
}

export async function updateWedding(id, changes) {
  const patch = { ...changes, updatedAt: nowIso() }
  if ('targetBudget' in patch) patch.targetBudget = Number(patch.targetBudget) || 0
  if ('guestCount' in patch) patch.guestCount = Number(patch.guestCount) || 0
  await db.weddings.update(id, patch)
  // A new headcount re-prices every per-head category.
  if ('guestCount' in patch) await repricePerHeadCategories(id, patch.guestCount)
}

export async function deleteWedding(id) {
  await db.transaction('rw', db.weddings, ...WEDDING_TABLES.map((t) => db[t]), db.meta, async () => {
    for (const table of WEDDING_TABLES) {
      await db[table].where('weddingId').equals(id).delete()
    }
    await db.weddings.delete(id)
    const active = await db.meta.get('activeWeddingId')
    if (active?.value === id) {
      const next = await db.weddings.orderBy('updatedAt').reverse().first()
      await db.meta.put({ key: 'activeWeddingId', value: next?.id ?? null })
    }
  })
}

// -------------------------------------------------------------- categories

export function listCategories(weddingId) {
  return db.categories.where('[weddingId+order]').between([weddingId, -Infinity], [weddingId, Infinity]).toArray()
}

export async function addCategory(weddingId, { name, budgetAmount = 0, isPerHead = false }) {
  const existing = await db.categories.where('weddingId').equals(weddingId).count()
  const wedding = await getWedding(weddingId)
  const amount = Number(budgetAmount) || 0
  const id = uid()
  await db.categories.add({
    id,
    weddingId,
    name: name?.trim() || 'Untitled category',
    budgetAmount: amount,
    isPerHead,
    perHeadRate: isPerHead && wedding?.guestCount > 0 ? round2(amount / wedding.guestCount) : 0,
    order: existing,
  })
  await touch(weddingId)
  return id
}

/**
 * Keeps budgetAmount and perHeadRate consistent: edit either one and the other
 * follows from the current guest count.
 */
export async function updateCategory(id, changes) {
  const category = await db.categories.get(id)
  if (!category) return
  const wedding = await getWedding(category.weddingId)
  const guests = wedding?.guestCount || 0
  const patch = { ...changes }

  if ('budgetAmount' in patch) patch.budgetAmount = Number(patch.budgetAmount) || 0
  if ('perHeadRate' in patch) patch.perHeadRate = Number(patch.perHeadRate) || 0

  const isPerHead = 'isPerHead' in patch ? patch.isPerHead : category.isPerHead

  if (isPerHead) {
    if ('perHeadRate' in patch) {
      patch.budgetAmount = Math.round(patch.perHeadRate * guests)
    } else if ('budgetAmount' in patch || ('isPerHead' in patch && patch.isPerHead)) {
      const amount = patch.budgetAmount ?? category.budgetAmount
      patch.perHeadRate = guests > 0 ? round2(amount / guests) : 0
    }
  } else if ('isPerHead' in patch && !patch.isPerHead) {
    patch.perHeadRate = 0
  }

  await db.categories.update(id, patch)
  await touch(category.weddingId)
}

export async function deleteCategory(id) {
  const category = await db.categories.get(id)
  if (!category) return
  await db.transaction('rw', db.categories, db.vendors, async () => {
    await db.categories.delete(id)
    // Vendors survive their category; they just become uncategorised.
    await db.vendors.where('categoryId').equals(id).modify({ categoryId: null })
  })
  await touch(category.weddingId)
}

export async function reorderCategories(weddingId, orderedIds) {
  await db.transaction('rw', db.categories, async () => {
    await Promise.all(orderedIds.map((id, order) => db.categories.update(id, { order })))
  })
  await touch(weddingId)
}

/** Re-derive per-head budgets after a headcount change. */
export async function repricePerHeadCategories(weddingId, guestCount) {
  const rows = await db.categories.where('weddingId').equals(weddingId).toArray()
  const perHead = rows.filter((c) => c.isPerHead)
  if (!perHead.length) return
  await db.transaction('rw', db.categories, async () => {
    await Promise.all(
      perHead.map((c) =>
        db.categories.update(c.id, { budgetAmount: Math.round((c.perHeadRate || 0) * guestCount) }),
      ),
    )
  })
}

// ----------------------------------------------------------------- vendors

export function listVendors(weddingId) {
  return db.vendors.where('weddingId').equals(weddingId).toArray()
}

export function getVendor(id) {
  return id ? db.vendors.get(id) : Promise.resolve(undefined)
}

export async function addVendor(weddingId, vendor) {
  const id = uid()
  await db.vendors.add({
    id,
    weddingId,
    categoryId: vendor.categoryId || null,
    name: vendor.name?.trim() || 'Untitled vendor',
    contactName: vendor.contactName || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    notes: vendor.notes || '',
    quoteAmount: Number(vendor.quoteAmount) || 0,
    contractPrice: Number(vendor.contractPrice) || 0,
    status: vendor.status === 'booked' ? 'booked' : 'considering',
    contractLink: normaliseUrl(vendor.contractLink),
    createdAt: nowIso(),
  })
  await touch(weddingId)
  return id
}

export async function updateVendor(id, changes) {
  const vendor = await db.vendors.get(id)
  if (!vendor) return
  const patch = { ...changes }
  if ('quoteAmount' in patch) patch.quoteAmount = Number(patch.quoteAmount) || 0
  if ('contractPrice' in patch) patch.contractPrice = Number(patch.contractPrice) || 0
  // Without a scheme a pasted domain resolves inside the app and 404s.
  if ('contractLink' in patch) patch.contractLink = normaliseUrl(patch.contractLink)
  await db.vendors.update(id, patch)
  await touch(vendor.weddingId)
}

export async function deleteVendor(id) {
  const vendor = await db.vendors.get(id)
  if (!vendor) return
  await db.transaction('rw', db.vendors, db.payments, db.paymentSchedule, async () => {
    await db.vendors.delete(id)
    await db.payments.where('vendorId').equals(id).delete()
    await db.paymentSchedule.where('vendorId').equals(id).delete()
  })
  await touch(vendor.weddingId)
}

/**
 * Vendor comparison: book one vendor in a category and pull its quote through
 * as the contract price. Everyone else in that category stays "considering",
 * so the quotes remain on file for comparison.
 */
export async function chooseVendor(id) {
  const vendor = await db.vendors.get(id)
  if (!vendor) return
  await db.vendors.update(id, {
    status: 'booked',
    // Only adopt the quote if a contract price hasn't been negotiated already.
    contractPrice: vendor.contractPrice || vendor.quoteAmount || 0,
  })
  await touch(vendor.weddingId)
}

export async function unchooseVendor(id) {
  const vendor = await db.vendors.get(id)
  if (!vendor) return
  await db.vendors.update(id, { status: 'considering' })
  await touch(vendor.weddingId)
}

// ---------------------------------------------------------------- payments

export function listPayments(weddingId) {
  return db.payments.where('weddingId').equals(weddingId).toArray()
}

export async function logPayment(weddingId, { vendorId, amount, date, note = '', scheduleId = null }) {
  const id = uid()
  await db.payments.add({
    id,
    weddingId,
    vendorId,
    amount: Number(amount) || 0,
    date: date || today(),
    note,
    scheduleId,
    createdAt: nowIso(),
  })
  await touch(weddingId)
  return id
}

export async function updatePayment(id, changes) {
  const payment = await db.payments.get(id)
  if (!payment) return
  const patch = { ...changes }
  if ('amount' in patch) patch.amount = Number(patch.amount) || 0
  await db.payments.update(id, patch)
  await touch(payment.weddingId)
}

export async function deletePayment(id) {
  const payment = await db.payments.get(id)
  if (!payment) return
  await db.transaction('rw', db.payments, db.paymentSchedule, async () => {
    await db.payments.delete(id)
    // If this payment settled an installment, put that installment back to due.
    if (payment.scheduleId) {
      await db.paymentSchedule.update(payment.scheduleId, { isPaid: false, paidPaymentId: null })
    }
  })
  await touch(payment.weddingId)
}

// -------------------------------------------------------- payment schedule

export function listSchedule(weddingId) {
  return db.paymentSchedule.where('weddingId').equals(weddingId).toArray()
}

export async function addInstallment(weddingId, { vendorId, label = '', dueDate, amount }) {
  const id = uid()
  await db.paymentSchedule.add({
    id,
    weddingId,
    vendorId,
    label: label || 'Installment',
    dueDate: dueDate || today(),
    amount: Number(amount) || 0,
    isPaid: false,
    paidPaymentId: null,
  })
  await touch(weddingId)
  return id
}

export async function updateInstallment(id, changes) {
  const row = await db.paymentSchedule.get(id)
  if (!row) return
  const patch = { ...changes }
  if ('amount' in patch) patch.amount = Number(patch.amount) || 0
  await db.paymentSchedule.update(id, patch)
  await touch(row.weddingId)
}

export async function deleteInstallment(id) {
  const row = await db.paymentSchedule.get(id)
  if (!row) return
  await db.paymentSchedule.delete(id)
  await touch(row.weddingId)
}

/** Marking an installment paid writes a real payment record against the vendor. */
export async function markInstallmentPaid(id, { date = today(), amount } = {}) {
  const row = await db.paymentSchedule.get(id)
  if (!row || row.isPaid) return null
  const paymentId = uid()
  await db.transaction('rw', db.payments, db.paymentSchedule, async () => {
    await db.payments.add({
      id: paymentId,
      weddingId: row.weddingId,
      vendorId: row.vendorId,
      amount: Number(amount ?? row.amount) || 0,
      date,
      note: row.label || 'Scheduled payment',
      scheduleId: row.id,
      createdAt: nowIso(),
    })
    await db.paymentSchedule.update(id, { isPaid: true, paidPaymentId: paymentId })
  })
  await touch(row.weddingId)
  return paymentId
}

export async function markInstallmentUnpaid(id) {
  const row = await db.paymentSchedule.get(id)
  if (!row) return
  await db.transaction('rw', db.payments, db.paymentSchedule, async () => {
    if (row.paidPaymentId) await db.payments.delete(row.paidPaymentId)
    await db.paymentSchedule.update(id, { isPaid: false, paidPaymentId: null })
  })
  await touch(row.weddingId)
}

// ------------------------------------------------------------------- tasks

export function listTasks(weddingId) {
  return db.tasks.where('weddingId').equals(weddingId).toArray()
}

export async function toggleTask(id, done) {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, { done: done ?? !task.done })
  await touch(task.weddingId)
}

export async function addTask(weddingId, { title, dueMonthOffset = 0, dueDate = '' }) {
  const id = uid()
  await db.tasks.add({
    id,
    weddingId,
    title: title?.trim() || 'Untitled task',
    dueMonthOffset,
    dueDate,
    done: false,
  })
  await touch(weddingId)
  return id
}

export async function updateTask(id, changes) {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, changes)
  await touch(task.weddingId)
}

/** Drops every pinned date, putting the whole checklist back on the schedule
 *  derived from the wedding date. */
export async function resetTaskDates(weddingId) {
  await db.tasks.where('weddingId').equals(weddingId).modify({ dueDate: '' })
  await touch(weddingId)
}

export async function deleteTask(id) {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.delete(id)
  await touch(task.weddingId)
}

// ------------------------------------------------- phase 2: guests, tables

export function listGuests(weddingId) {
  return db.guests.where('weddingId').equals(weddingId).toArray()
}

export async function addGuest(weddingId, guest) {
  const id = uid()
  await db.guests.add({
    id,
    weddingId,
    name: guest.name?.trim() || 'Guest',
    party: guest.party || '',
    rsvp: guest.rsvp || 'pending',
    mealChoice: guest.mealChoice || '',
    tableId: guest.tableId || null,
    notes: guest.notes || '',
  })
  await touch(weddingId)
  return id
}

export async function updateGuest(id, changes) {
  const guest = await db.guests.get(id)
  if (!guest) return
  await db.guests.update(id, changes)
  await touch(guest.weddingId)
}

/**
 * Bulk import from a CSV.
 *
 * Tables named in the file are found or created, so an imported seating plan
 * lands intact instead of dropping the assignments on the floor.
 *
 * @param {Array} incoming  records from buildGuests()
 * @param {{ skipDuplicates?: boolean }} options  match on name, case-insensitive
 */
export async function importGuests(weddingId, incoming, { skipDuplicates = true } = {}) {
  const existing = await db.guests.where('weddingId').equals(weddingId).toArray()
  const seen = new Set(existing.map((g) => g.name.trim().toLowerCase()))

  const tables = await db.seatingTables.where('weddingId').equals(weddingId).toArray()
  const tablesByName = new Map(tables.map((t) => [t.name.trim().toLowerCase(), t]))
  let tableCount = tables.length

  const newTables = []
  const newGuests = []
  let duplicates = 0

  for (const record of incoming) {
    const key = record.name.trim().toLowerCase()
    if (skipDuplicates && seen.has(key)) {
      duplicates += 1
      continue
    }
    seen.add(key)

    let tableId = null
    const tableName = record.tableName?.trim()
    if (tableName) {
      const tableKey = tableName.toLowerCase()
      let table = tablesByName.get(tableKey)
      if (!table) {
        table = { id: uid(), weddingId, name: tableName, capacity: 8, order: tableCount++ }
        tablesByName.set(tableKey, table)
        newTables.push(table)
      }
      tableId = table.id
    }

    newGuests.push({
      id: uid(),
      weddingId,
      name: record.name.trim(),
      party: record.party || '',
      rsvp: record.rsvp || 'pending',
      mealChoice: record.mealChoice || '',
      tableId,
      notes: record.notes || '',
    })
  }

  await db.transaction('rw', db.guests, db.seatingTables, async () => {
    if (newTables.length) await db.seatingTables.bulkAdd(newTables)
    if (newGuests.length) await db.guests.bulkAdd(newGuests)
  })
  await touch(weddingId)

  return { imported: newGuests.length, duplicates, tablesCreated: newTables.length }
}

export async function deleteGuest(id) {
  const guest = await db.guests.get(id)
  if (!guest) return
  await db.guests.delete(id)
  await touch(guest.weddingId)
}

export function listTables(weddingId) {
  return db.seatingTables.where('weddingId').equals(weddingId).toArray()
}

export async function addTable(weddingId, { name, capacity = 8 }) {
  const existing = await db.seatingTables.where('weddingId').equals(weddingId).count()
  const id = uid()
  await db.seatingTables.add({
    id,
    weddingId,
    name: name?.trim() || `Table ${existing + 1}`,
    capacity: Number(capacity) || 8,
    order: existing,
  })
  await touch(weddingId)
  return id
}

export async function updateTable(id, changes) {
  const table = await db.seatingTables.get(id)
  if (!table) return
  const patch = { ...changes }
  if ('capacity' in patch) patch.capacity = Number(patch.capacity) || 0
  await db.seatingTables.update(id, patch)
  await touch(table.weddingId)
}

export async function deleteTable(id) {
  const table = await db.seatingTables.get(id)
  if (!table) return
  await db.transaction('rw', db.seatingTables, db.guests, async () => {
    await db.seatingTables.delete(id)
    await db.guests.where('tableId').equals(id).modify({ tableId: null })
  })
  await touch(table.weddingId)
}

// ------------------------------------------------ wedding party & shopping

/** The roles offered when adding someone, in the order they're listed. */
export const PARTY_ROLES = [
  'Maid of Honour',
  'Matron of Honour',
  'Best Man',
  'Bridesmaid',
  'Groomsman',
  'Bridesman',
  'Groomswoman',
  'Usher',
  'Flower Girl',
  'Ring Bearer',
  'Officiant',
  'Reader',
  'Other',
]

export function listParty(weddingId) {
  return db.weddingParty.where('weddingId').equals(weddingId).toArray()
}

export async function addPartyMember(weddingId, member) {
  const existing = await db.weddingParty.where('weddingId').equals(weddingId).count()
  const id = uid()
  await db.weddingParty.add({
    id,
    weddingId,
    name: member.name?.trim() || 'Someone lovely',
    role: member.role || 'Bridesmaid',
    phone: member.phone || '',
    email: member.email || '',
    // What they're wearing, and where it came from.
    outfit: member.outfit || '',
    outfitUrl: normaliseUrl(member.outfitUrl),
    size: member.size || '',
    colour: member.colour || '',
    cost: Number(member.cost) || 0,
    paidBy: member.paidBy || '',
    ordered: !!member.ordered,
    notes: member.notes || '',
    order: existing,
  })
  await touch(weddingId)
  return id
}

export async function updatePartyMember(id, changes) {
  const member = await db.weddingParty.get(id)
  if (!member) return
  const patch = { ...changes }
  if ('cost' in patch) patch.cost = Number(patch.cost) || 0
  if ('outfitUrl' in patch) patch.outfitUrl = normaliseUrl(patch.outfitUrl)
  await db.weddingParty.update(id, patch)
  await touch(member.weddingId)
}

export async function deletePartyMember(id) {
  const member = await db.weddingParty.get(id)
  if (!member) return
  await db.weddingParty.delete(id)
  await touch(member.weddingId)
}

export function listShopLinks(weddingId) {
  return db.shopLinks.where('weddingId').equals(weddingId).toArray()
}

/** A shop the party is buying from — e.g. bridesmaid dresses at Birdy Grey. */
export async function addShopLink(weddingId, link) {
  const existing = await db.shopLinks.where('weddingId').equals(weddingId).count()
  const id = uid()
  await db.shopLinks.add({
    id,
    weddingId,
    label: link.label?.trim() || 'Shop',
    url: normaliseUrl(link.url),
    forRole: link.forRole || 'Bridesmaid',
    note: link.note || '',
    order: existing,
  })
  await touch(weddingId)
  return id
}

export async function updateShopLink(id, changes) {
  const link = await db.shopLinks.get(id)
  if (!link) return
  const patch = { ...changes }
  if ('url' in patch) patch.url = normaliseUrl(patch.url)
  await db.shopLinks.update(id, patch)
  await touch(link.weddingId)
}

export async function deleteShopLink(id) {
  const link = await db.shopLinks.get(id)
  if (!link) return
  await db.shopLinks.delete(id)
  await touch(link.weddingId)
}

// ------------------------------------------- phase 2: timeline, moodboard

export function listTimeline(weddingId) {
  return db.timeline.where('weddingId').equals(weddingId).toArray()
}

export async function addTimelineEntry(weddingId, { time = '12:00', title, note = '' }) {
  const id = uid()
  await db.timeline.add({ id, weddingId, time, title: title?.trim() || 'Moment', note })
  await touch(weddingId)
  return id
}

export async function updateTimelineEntry(id, changes) {
  const row = await db.timeline.get(id)
  if (!row) return
  await db.timeline.update(id, changes)
  await touch(row.weddingId)
}

export async function deleteTimelineEntry(id) {
  const row = await db.timeline.get(id)
  if (!row) return
  await db.timeline.delete(id)
  await touch(row.weddingId)
}

export function listMoodboard(weddingId) {
  return db.moodboard.where('weddingId').equals(weddingId).toArray()
}

/** kind: 'colour' | 'font' | 'image'. Images are stored as data URLs. */
export async function addMoodboardItem(weddingId, item) {
  const existing = await db.moodboard.where('weddingId').equals(weddingId).count()
  const id = uid()
  await db.moodboard.add({
    id,
    weddingId,
    kind: item.kind || 'colour',
    value: item.value || '',
    label: item.label || '',
    order: existing,
  })
  await touch(weddingId)
  return id
}

export async function deleteMoodboardItem(id) {
  const row = await db.moodboard.get(id)
  if (!row) return
  await db.moodboard.delete(id)
  await touch(row.weddingId)
}

// ----------------------------------------------------------------- helpers

export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * People paste "birdygrey.com" as often as a full URL; without a scheme the
 * browser treats it as a relative path and the link 404s inside the app.
 */
export function normaliseUrl(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}
