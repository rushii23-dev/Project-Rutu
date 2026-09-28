/**
 * How old a mandi price is, so the app never calls an old price "today's".
 *
 * Mandis shut on Sundays and holidays, so a price a day or two old is the
 * normal state of things. Past that, something upstream is wrong — data.gov.in
 * has gone down for a day at a time — and the farmer should see the price is
 * old before he carries his crop to market on it.
 */
export const STALE_PRICE_DAYS = 2

/**
 * Whole days between the price's date and today, or null when it has none.
 * Agmarknet dates arrive as 'DD/MM/YYYY'; the state fallback carries the
 * file's ISO fetch date, 'YYYY-MM-DD'. Both are read as local calendar days.
 */
export function priceAgeDays(price, now = new Date()) {
  const s = price?.date
  if (!s) return null
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  const day = dmy ? new Date(+dmy[3], +dmy[2] - 1, +dmy[1]) : new Date(s + 'T00:00:00')
  if (isNaN(day)) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today - day) / 86400000)
}

export function isPriceStale(price, now = new Date()) {
  const age = priceAgeDays(price, now)
  return age !== null && age > STALE_PRICE_DAYS
}
