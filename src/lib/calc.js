import { daysUntil, todayISO } from './dates'
import { percent } from './money'

/**
 * Every derived number in the app is computed here from the raw rows, so
 * totals can never drift out of sync with what's stored. Nothing is cached in
 * the database — one source of truth, recomputed on each render.
 */

export function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
}

/** Contract price counts only for vendors you've actually booked. */
export function vendorContract(vendor) {
  return vendor.status === 'booked' ? Number(vendor.contractPrice) || 0 : 0
}

export function paymentsByVendor(payments) {
  const map = new Map()
  for (const p of payments) {
    map.set(p.vendorId, (map.get(p.vendorId) || 0) + (Number(p.amount) || 0))
  }
  return map
}

/**
 * Per-category rollup: budget vs contracted vs paid, plus both progress
 * readings the Budget screen shows side by side.
 */
export function categoryRollups(categories, vendors, payments) {
  const paidMap = paymentsByVendor(payments)

  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const own = vendors.filter((v) => v.categoryId === category.id)
      const booked = own.filter((v) => v.status === 'booked')
      const contract = booked.reduce((t, v) => t + vendorContract(v), 0)
      const paid = own.reduce((t, v) => t + (paidMap.get(v.id) || 0), 0)
      const budget = Number(category.budgetAmount) || 0

      return {
        category,
        vendors: own,
        vendorCount: own.length,
        bookedCount: booked.length,
        consideringCount: own.length - booked.length,
        budget,
        contract,
        paid,
        outstanding: Math.max(contract - paid, 0),
        overBudget: contract > budget && budget > 0,
        variance: budget - contract,
        // Shown side by side on the Budget screen — no toggle.
        pctOfContractPaid: contract > 0 ? percent(paid, contract) : 0,
        pctOfBudgetUsed: budget > 0 ? percent(contract, budget) : contract > 0 ? 100 : 0,
      }
    })
}

/** Vendors with no category (their category was deleted) still need totalling. */
export function uncategorisedRollup(categories, vendors, payments) {
  const known = new Set(categories.map((c) => c.id))
  const orphans = vendors.filter((v) => !v.categoryId || !known.has(v.categoryId))
  if (!orphans.length) return null
  const paidMap = paymentsByVendor(payments)
  const contract = orphans.reduce((t, v) => t + vendorContract(v), 0)
  const paid = orphans.reduce((t, v) => t + (paidMap.get(v.id) || 0), 0)
  return {
    category: { id: null, name: 'Uncategorised', budgetAmount: 0, isPerHead: false, order: 999 },
    vendors: orphans,
    vendorCount: orphans.length,
    bookedCount: orphans.filter((v) => v.status === 'booked').length,
    consideringCount: orphans.filter((v) => v.status !== 'booked').length,
    budget: 0,
    contract,
    paid,
    outstanding: Math.max(contract - paid, 0),
    overBudget: false,
    variance: -contract,
    pctOfContractPaid: contract > 0 ? percent(paid, contract) : 0,
    pctOfBudgetUsed: contract > 0 ? 100 : 0,
  }
}

/** The four headline numbers on the Dashboard. */
export function weddingTotals(wedding, rollups) {
  const targetBudget = Number(wedding?.targetBudget) || 0
  const allocated = rollups.reduce((t, r) => t + r.budget, 0)
  const contract = rollups.reduce((t, r) => t + r.contract, 0)
  const paid = rollups.reduce((t, r) => t + r.paid, 0)

  return {
    targetBudget,
    allocated,
    unallocated: targetBudget - allocated,
    contract,
    paid,
    outstanding: Math.max(contract - paid, 0),
    // "Left to spend" is measured against the target, not against contracts:
    // it answers "how much of my money is still uncommitted?".
    leftToSpend: targetBudget - contract,
    overTarget: contract > targetBudget && targetBudget > 0,
    pctCommitted: targetBudget > 0 ? percent(contract, targetBudget) : 0,
    pctPaid: contract > 0 ? percent(paid, contract) : 0,
  }
}

export function vendorSummary(vendor, payments) {
  const own = payments.filter((p) => p.vendorId === vendor.id)
  const paid = sum(own, 'amount')
  const contract = Number(vendor.contractPrice) || 0
  return {
    payments: own.slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    paid,
    contract,
    remaining: Math.max(contract - paid, 0),
    pctPaid: contract > 0 ? percent(paid, contract) : 0,
    settled: contract > 0 && paid >= contract,
  }
}

/**
 * Installments due within `days`, oldest first, with anything already overdue
 * pulled to the front.
 */
export function upcomingInstallments(schedule, vendors, { days = 30, includeOverdue = true } = {}) {
  const byVendor = new Map(vendors.map((v) => [v.id, v]))
  return schedule
    .filter((row) => !row.isPaid)
    .map((row) => ({ ...row, vendor: byVendor.get(row.vendorId), daysAway: daysUntil(row.dueDate) }))
    .filter((row) => {
      if (row.daysAway === null) return false
      if (row.daysAway < 0) return includeOverdue
      return row.daysAway <= days
    })
    .sort((a, b) => a.daysAway - b.daysAway)
}

export function scheduleTimeline(schedule, vendors) {
  const byVendor = new Map(vendors.map((v) => [v.id, v]))
  return schedule
    .map((row) => ({ ...row, vendor: byVendor.get(row.vendorId), daysAway: daysUntil(row.dueDate) }))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
}

/** Installments that don't yet cover the whole contract, per vendor. */
export function scheduleGap(vendor, schedule) {
  const rows = schedule.filter((s) => s.vendorId === vendor.id)
  const scheduled = sum(rows, 'amount')
  const contract = Number(vendor.contractPrice) || 0
  return { scheduled, contract, gap: contract - scheduled }
}

export function isOverdue(row) {
  return !row.isPaid && row.dueDate < todayISO()
}
