const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK'])

const cache = new Map()

function formatter(currency, options) {
  const key = `${currency}|${JSON.stringify(options)}`
  if (!cache.has(key)) {
    cache.set(
      key,
      new Intl.NumberFormat(undefined, { style: 'currency', currency, ...options }),
    )
  }
  return cache.get(key)
}

/** Whole-unit currency, e.g. $12,400 — cents only when they exist. */
export function formatMoney(amount, currency = 'USD', { cents = false } = {}) {
  const value = Number(amount) || 0
  const zeroDecimal = ZERO_DECIMAL.has(currency)
  const digits = zeroDecimal ? 0 : cents || !Number.isInteger(value) ? 2 : 0
  try {
    return formatter(currency, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
  } catch {
    return `${currency} ${value.toFixed(digits)}`
  }
}

/** $12.4k — for tight spots like chart centres and stat tiles. */
export function formatCompact(amount, currency = 'USD') {
  const value = Number(amount) || 0
  if (Math.abs(value) < 10_000) return formatMoney(value, currency)
  try {
    return formatter(currency, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  } catch {
    return formatMoney(value, currency)
  }
}

export function currencySymbol(currency = 'USD') {
  try {
    return (
      formatter(currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

/** Strips grouping separators and stray symbols out of a typed amount. */
export function parseMoney(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0
  const cleaned = String(input ?? '').replace(/[^0-9.,-]/g, '')
  if (!cleaned) return 0
  // Treat the last separator as the decimal point when it looks like one.
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalised = cleaned
  if (lastComma > lastDot) {
    normalised = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalised = cleaned.replace(/,/g, '')
  }
  const value = Number.parseFloat(normalised)
  return Number.isFinite(value) ? value : 0
}

export function percent(part, whole) {
  const p = Number(part) || 0
  const w = Number(whole) || 0
  if (w <= 0) return p > 0 ? 100 : 0
  return (p / w) * 100
}

export function formatPercent(value, digits = 0) {
  const n = Number(value) || 0
  return `${n.toFixed(digits)}%`
}
