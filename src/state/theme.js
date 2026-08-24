export const THEME_STORAGE_KEY = 'aisle-ledger:theme'
export const VALID_THEMES = ['sage', 'blush', 'ivory']

const META_COLOURS = { sage: '#7C8B72', blush: '#B57A72', ivory: '#94805C' }

/**
 * The theme id is the one piece of state kept in localStorage: it has to be
 * readable synchronously on the very first paint, and IndexedDB is async.
 * All *app data* lives in IndexedDB only.
 */
export function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return VALID_THEMES.includes(stored) ? stored : 'sage'
  } catch {
    return 'sage'
  }
}

export function applyTheme(theme) {
  const id = VALID_THEMES.includes(theme) ? theme : 'sage'
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    /* Private mode with storage blocked — the theme just won't persist. */
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', META_COLOURS[id] ?? META_COLOURS.sage)
  return id
}
