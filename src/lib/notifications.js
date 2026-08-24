import { getMeta, setMeta } from '../db/repo'
import { daysUntil, formatDate } from './dates'
import { formatMoney } from './money'

/**
 * Payment reminders, 3 days ahead of a due date.
 *
 * Two mechanisms, best available first:
 *
 * 1. Notification Triggers (`TimestampTrigger`) — a genuinely scheduled
 *    notification that fires even if the app is closed. Chromium only.
 * 2. Catch-up on launch — every time the app opens (and it opens often while
 *    you're planning) we fire notifications for anything now inside the
 *    3-day window that hasn't been announced yet.
 *
 * There is no server, so there is no push: on iOS in particular a reminder
 * surfaces the next time the app is opened. The Settings copy says so rather
 * than implying a guarantee the platform doesn't give us.
 */

export const REMINDER_LEAD_DAYS = 3
const SEEN_KEY = 'notifiedInstallments'

// The app may be served from a subpath (GitHub Pages), so notification icons
// and deep links are built from the base rather than assumed to sit at root.
const BASE = import.meta.env.BASE_URL
const ICON = `${BASE}icons/icon-192.png`

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export function triggersSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'showTrigger' in Notification.prototype
}

/** Permission is only ever requested from the Settings toggle, never on load. */
export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

function reminderBody(row, currency) {
  const vendorName = row.vendor?.name || 'a vendor'
  const when = formatDate(row.dueDate, { day: 'numeric', month: 'long' })
  return `${formatMoney(row.amount, currency)} to ${vendorName} is due ${when}.`
}

/**
 * Reconcile scheduled reminders with the current payment schedule. Safe to
 * call on every launch and after any schedule edit.
 *
 * @returns {Promise<{fired: number, scheduled: number}>}
 */
export async function syncReminders(schedule, vendors, currency = 'USD') {
  if (!notificationsSupported() || Notification.permission !== 'granted') {
    return { fired: 0, scheduled: 0 }
  }
  const reg = await registration()
  if (!reg) return { fired: 0, scheduled: 0 }

  const byVendor = new Map(vendors.map((v) => [v.id, v]))
  const seen = (await getMeta(SEEN_KEY, {})) || {}
  const nextSeen = {}
  let fired = 0
  let scheduled = 0

  // Clear previously scheduled triggers so edited or paid installments don't
  // fire a stale reminder.
  if (triggersSupported()) {
    const existing = await reg.getNotifications({ includeTriggered: true, tag: undefined }).catch(() => [])
    for (const n of existing) {
      if (n.tag?.startsWith('installment:')) n.close()
    }
  }

  for (const row of schedule) {
    if (row.isPaid) continue
    const away = daysUntil(row.dueDate)
    if (away === null || away < 0) continue

    const withVendor = { ...row, vendor: byVendor.get(row.vendorId) }
    const tag = `installment:${row.id}`
    // Re-announce if the due date or amount changed since we last notified.
    const fingerprint = `${row.dueDate}|${row.amount}`
    nextSeen[row.id] = fingerprint

    if (away <= REMINDER_LEAD_DAYS) {
      if (seen[row.id] === fingerprint) continue
      await reg.showNotification('Payment due soon', {
        tag,
        body: reminderBody(withVendor, currency),
        icon: ICON,
        badge: ICON,
        data: { url: `${BASE}payments` },
      })
      fired += 1
      continue
    }

    if (triggersSupported()) {
      const fireAt = new Date(row.dueDate)
      fireAt.setHours(9, 0, 0, 0)
      fireAt.setDate(fireAt.getDate() - REMINDER_LEAD_DAYS)
      try {
        await reg.showNotification('Payment due soon', {
          tag,
          body: reminderBody(withVendor, currency),
          icon: ICON,
          badge: ICON,
          data: { url: `${BASE}payments` },
          // eslint-disable-next-line no-undef
          showTrigger: new TimestampTrigger(fireAt.getTime()),
        })
        scheduled += 1
      } catch {
        /* Trigger scheduling is best-effort; the launch catch-up covers it. */
      }
    }
  }

  await setMeta(SEEN_KEY, nextSeen)
  return { fired, scheduled }
}

/** Used by the Settings toggle to prove the permission works. */
export async function sendTestReminder() {
  const reg = await registration()
  if (!reg || Notification.permission !== 'granted') return false
  await reg.showNotification('Reminders are on', {
    body: "We'll nudge you 3 days before a payment is due.",
    icon: ICON,
    tag: 'aisle-ledger-test',
    data: { url: `${BASE}payments` },
  })
  return true
}

export async function clearAllReminders() {
  const reg = await registration()
  if (!reg) return
  const existing = await reg.getNotifications({ includeTriggered: true }).catch(() => [])
  for (const n of existing) n.close()
  await setMeta(SEEN_KEY, {})
}
