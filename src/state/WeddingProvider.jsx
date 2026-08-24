import { createContext, useContext, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import * as repo from '../db/repo'
import { applyTheme } from './theme'
import { categoryRollups, uncategorisedRollup, weddingTotals } from '../lib/calc'

const WeddingContext = createContext(null)

/**
 * Loads the active wedding and everything attached to it as live queries, so
 * any write anywhere in the app re-renders every screen that shows the number.
 */
export function WeddingProvider({ children }) {
  const weddings = useLiveQuery(() => repo.listWeddings(), [], undefined)
  const activeId = useLiveQuery(() => repo.getMeta('activeWeddingId', null), [], undefined)

  // Fall back to the most recent wedding if the pointer is missing or stale.
  const weddingId = useMemo(() => {
    if (!weddings) return undefined
    if (activeId && weddings.some((w) => w.id === activeId)) return activeId
    return weddings[0]?.id ?? null
  }, [weddings, activeId])

  const wedding = useMemo(
    () => (weddingId ? weddings?.find((w) => w.id === weddingId) ?? null : null),
    [weddings, weddingId],
  )

  const data = useLiveQuery(
    async () => {
      if (!weddingId) return null
      const [categories, vendors, payments, schedule, tasks] = await Promise.all([
        repo.listCategories(weddingId),
        repo.listVendors(weddingId),
        repo.listPayments(weddingId),
        repo.listSchedule(weddingId),
        repo.listTasks(weddingId),
      ])
      return { categories, vendors, payments, schedule, tasks }
    },
    [weddingId],
    undefined,
  )

  useEffect(() => {
    if (wedding?.theme) applyTheme(wedding.theme)
  }, [wedding?.theme])

  // Keep the stored pointer honest after a delete or an import.
  useEffect(() => {
    if (weddingId !== undefined && weddingId !== activeId && weddings) {
      repo.setMeta('activeWeddingId', weddingId ?? null)
    }
  }, [weddingId, activeId, weddings])

  const value = useMemo(() => {
    const categories = data?.categories ?? []
    const vendors = data?.vendors ?? []
    const payments = data?.payments ?? []
    const schedule = data?.schedule ?? []
    const tasks = data?.tasks ?? []

    const rollups = categoryRollups(categories, vendors, payments)
    const orphans = uncategorisedRollup(categories, vendors, payments)
    const allRollups = orphans ? [...rollups, orphans] : rollups

    return {
      // `loading` stays true until Dexie has answered — screens must not flash
      // their empty state at a user who has data.
      loading: weddings === undefined || (weddingId != null && data === undefined),
      hasAnyWedding: (weddings?.length ?? 0) > 0,
      weddings: weddings ?? [],
      wedding,
      weddingId: weddingId ?? null,
      currency: wedding?.currency ?? 'USD',
      categories,
      vendors,
      payments,
      schedule,
      tasks,
      rollups,
      allRollups,
      totals: weddingTotals(wedding, allRollups),
      switchWedding: (id) => repo.setMeta('activeWeddingId', id),
    }
  }, [weddings, wedding, weddingId, data])

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>
}

export function useWedding() {
  const ctx = useContext(WeddingContext)
  if (!ctx) throw new Error('useWedding must be used inside <WeddingProvider>')
  return ctx
}

/** Direct access for the odd one-off query (guests, tables, moodboard). */
export function useWeddingTable(loader, deps = []) {
  const { weddingId } = useWedding()
  return useLiveQuery(() => (weddingId ? loader(weddingId) : []), [weddingId, ...deps], undefined)
}
