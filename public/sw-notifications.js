/*
 * Imported into the generated Workbox service worker (see vite.config.js →
 * workbox.importScripts). Handles taps on payment reminders: focus an open
 * Aisle Ledger window if there is one, otherwise open the app.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/'

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target).catch(() => {})
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
