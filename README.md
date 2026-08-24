# Aisle Ledger

A mobile-first wedding budget planner that installs to your home screen, works
with no signal, and keeps every number on your own device.

No accounts. No server. No database. Everything lives in your browser's
IndexedDB, and nothing is ever transmitted.

---

## What's in it

**Phase 1 — complete**

| Screen | What it does |
|---|---|
| **Dashboard** | Countdown to the day, target budget / contract price / total paid / left to spend, spend-by-category donut, payments due in the next 30 days, this month's checklist |
| **Budget** | Every category as Budget vs Contract vs Paid, with "% of contract paid" and "% of budget used" side by side. Over-budget categories are flagged in the warning colour |
| **Vendors** | Grouped by category; each vendor has contact details, quote, contract price, notes, a contract link, and a one-tap **Log payment** |
| **Payments** | Per-vendor installments (deposit / mid / final) on one timeline, grouped by month, with overdue flagged. Marking one paid writes a real payment record |
| **Per-head costs** | Categories flagged "priced per guest" keep a rate and re-price themselves the moment the guest count changes |
| **Vendor comparison** | Line up every quote in a category; **Choose** books one and pulls its quote through as the contract price |

**Phase 2 — scaffolded, with a working basic UI**

Guest list (RSVP, meals, parties) · 12-month checklist generated from the
wedding date · seating chart · wedding-day timeline · moodboard with a
share-as-image export.

**Everywhere:** autosave ~500ms after you stop typing with a "Saved ✓"
indicator, multiple weddings with a switcher, three themes (Sage, Blush,
Ivory), JSON backup export/import, and payment reminders 3 days before a due
date.

---

## Running it locally

Requires Node 18+.

```bash
npm install
npm run icons     # generates public/icons/*.png (only needed once)
npm run dev       # http://localhost:5173
```

`npm run dev -- --host` exposes it on your LAN so you can open it on a phone.

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve dist/ locally, with the service worker active
```

The service worker is **disabled in dev** and only built for production — so
test offline behaviour against `npm run build && npm run preview`, not `npm run
dev`.

---

## Deploying — GitHub Pages, nothing else

The whole site is static files, so GitHub can host it. No hosting account, no
CI, no tokens, no third-party service.

```bash
npm run build:pages     # builds into docs/
git add docs && git commit -m "Deploy" && git push
```

Then, once only:

1. Repo → **Settings → Pages**
2. **Source: Deploy from a branch**
3. Branch: your default branch, folder: **/docs** → **Save**

A minute later it's live at
`https://<your-username>.github.io/AisleLedger/`.

Every later deploy is just the two commands above — build, commit, push.

### Why the build step exists

The app is React, CSS and HTML; the build turns it into plain static files a
dumb file server can hand out. Nothing needs a server: there's no API, no
database, no accounts. `docs/` is the finished website, committed into the repo
so GitHub can serve it directly.

### The two Pages-specific details

**The subpath.** A project repo is served from `/AisleLedger/`, not the domain
root, so `base` in `vite.config.js` is set to match, and the manifest scope,
service-worker scope and router basename all derive from it. If you rename the
repo, change that one constant. For any other host that serves from the root:

```bash
BASE_PATH=/ npm run build
```

**Deep links.** Pages has no rewrite rule, so `/AisleLedger/budget` isn't a real
file. `build:pages` writes a copy of `index.html` to `404.html`; Pages serves
that for unknown paths, the app boots and routes to the right screen. It comes
back with a 404 status code, which no one but a crawler will notice. Once the
service worker is installed, it serves those routes properly anyway.

HTTPS comes free with `github.io`, which matters: service workers, install
prompts and notifications all refuse to run without it.

## Generating icons

`npm run icons` runs `scripts/generate-icons.mjs`, a dependency-free generator
that draws the two-rings mark and writes real PNGs with a hand-rolled encoder —
no sharp, no ImageMagick, works on a clean checkout.

It produces:

| File | Size | Purpose |
|---|---|---|
| `icon-192.png` / `icon-512.png` | 192, 512 | Standard manifest icons |
| `maskable-192.png` / `maskable-512.png` | 192, 512 | Android adaptive icons — full-bleed, mark inside the 80% safe zone |
| `apple-touch-icon.png` | 180 | iOS home screen (iOS rounds the corners itself) |

**Using your own artwork instead:** nothing in the app depends on the
generator. Drop your own PNGs into `public/icons/` with those exact filenames
and sizes. Keep the maskable pair full-bleed with the artwork inside the centre
80%, or Android will crop into it. If you change the brand colours, update
`theme_color` / `background_color` in `vite.config.js` and the `theme-color`
meta tag in `index.html` to match.

To adjust the generated mark, edit the `PALETTE` and `TARGETS` tables at the
top and bottom of `scripts/generate-icons.mjs`.

---

## Testing it as a real installed PWA on an iPhone

iOS never shows an install prompt, so this is worth doing properly at least
once.

1. **Deploy first.** iOS will only add a site to the home screen over HTTPS, so
   publish to GitHub Pages (see above) and use the `github.io` URL. A
   `localhost` tunnel without HTTPS won't work.
2. **Open the URL in Safari.** Not Chrome, not Firefox, not the in-app browser
   inside Messages or Slack — on iOS only Safari has *Add to Home Screen*. The
   app detects this and tells you as much.
3. **Share → Add to Home Screen → Add.** The in-app Install screen
   (More → Install on your phone) walks through it with an illustration.
4. **Launch from the home screen icon.** You should get no Safari chrome at
   all — no URL bar, no toolbar. If you still see them, `display: standalone`
   didn't take; hard-refresh in Safari and re-add.
5. **Check the safe areas.** On a notched iPhone the header should clear the
   status bar and the tab bar should sit above the home indicator.
6. **Check the keyboard.** Tap a currency field: you should get the numeric
   keypad, the page should not zoom, and the bottom tab bar should slide out of
   the way rather than float over the keyboard.
7. **Test offline for real.** Put the phone in Airplane Mode and cold-launch
   the app from the home screen. It must open and show all your data. (Force-
   quit it first — swipe up from the app switcher — so you're testing a genuine
   cold start rather than a warm resume.)
8. **Test persistence.** Add a vendor, force-quit, reopen. It's still there.

### Things to know about iOS

- **Installed ≠ Safari.** The installed app gets its own storage bucket, so
  data you entered in Safari won't appear in it. Export a backup from Settings
  in Safari and import it in the installed app if you need to carry it over.
- **iOS can evict storage** from sites you haven't opened in a while. This is
  exactly why the Settings screen nags about backups and shows a "last backup"
  date.
- **Reminders are not push.** There's no server, and Safari doesn't support
  scheduled notifications, so a due-date reminder surfaces the next time the
  app is opened. Chromium browsers that support Notification Triggers get real
  scheduled reminders.

### On Android / Chrome

Chrome fires `beforeinstallprompt`, which the app captures — you get a real
one-tap **Install** button on the Install screen and in the first-visit banner.
DevTools → Application → Manifest is the quickest way to check the manifest and
icons resolve — worth a look after any change to the repo name or `base`.

---

## Project layout

```
src/
  db/
    db.js         Dexie instance + schema (v1)
    repo.js       the ONLY module that touches Dexie — every screen calls this
    seed.js       default categories with typical % splits, 12-month checklist
    backup.js     JSON export / import (replace or merge)
  state/
    WeddingProvider.jsx   active wedding + all its rows, as live queries
    SaveStatus.jsx        drives the "Saved ✓" indicator
    theme.js              the three themes
  lib/
    calc.js       every derived total, computed from raw rows — nothing cached
    money.js      currency formatting and parsing
    dates.js      local-time date handling and the countdown
    notifications.js  payment reminders
  hooks/          autosave, install prompt, iOS viewport height
  components/     ui primitives, bottom tab bar, screen frame
  screens/        one file per screen; phase2/ holds the scaffolded ones
scripts/
  generate-icons.mjs   dependency-free PNG icon generator
  build-pages.mjs      builds docs/ for GitHub Pages
docs/                  the built site GitHub Pages serves — generated, committed
```

### The data layer

`src/db/repo.js` is the only file that touches Dexie. Screens never import
`db` directly. That's deliberate: adding cloud sync later means wrapping this
one module — queue each mutation, push it, reconcile — rather than rewriting
the UI.

Every row carries a `weddingId`, so supporting several weddings (a planner
with several clients) is a filter, not a second database. Records carry
`schemaVersion: 1` so a future `db.version(2).upgrade()` has something to
migrate from.

**A note on the schema:** `isPaid` and `done` are deliberately *not* indexed.
IndexedDB has no boolean key type, and indexing one silently drops rows from
queries.

### Derived numbers

Nothing is precomputed into the database — no cached category totals, no stored
"amount paid". `src/lib/calc.js` derives every figure from the raw rows on each
render, so totals can't drift out of sync with the payments behind them.

---

## Privacy

There's a `/privacy` page in the app saying this, in full: Aisle Ledger
collects nothing, transmits nothing, and has no analytics, cookies, or
third-party scripts. Your data is written to this browser's IndexedDB on this
device and never leaves it.

The flip side is that nobody else holds a copy. Clear the browser's site data,
uninstall the app, or lose the phone, and the ledger goes with it — hence the
backup nudge in Settings.

The only thing kept outside IndexedDB is the theme name in `localStorage`,
because it has to be readable synchronously on the first paint to avoid a
flash of the wrong palette.

---

## Accessibility

Every input has a real label, the bottom sheet traps focus and closes on Esc,
tap targets are at least 44px, focus rings are visible throughout, and colour
is never the only carrier of meaning — the donut's legend names and values
every wedge, and status is always spelled out alongside its colour.

The spend-by-category chart uses a single-hue ordinal ramp (biggest spend =
darkest step) rather than categorical hues, validated for monotone lightness,
step separation and contrast against the surface. Past six categories the rest
fold into a neutral "Other" instead of inventing more colours.
