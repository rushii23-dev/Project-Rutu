import { useEffect, useState } from 'react'
import { ageHours, fetchForecast, sampleWeek, SAMPLE_CURRENT, STALE_HOURS } from '../data/weather.js'
import { useToday } from './useToday.js'

/**
 * The live forecast, kept fresh while the app is open.
 *
 * Open-Meteo updates its current conditions every 15 minutes, so that is how
 * often an open app refetches — and immediately when the farmer comes back to
 * it or the signal returns, if the copy it holds is older than that. The cache
 * is shared by every screen and keyed by district and calendar day, so a
 * midnight rollover refetches against Open-Meteo's shifted 7-day window.
 */
const REFRESH_MS = 15 * 60 * 1000

const cache = new Map() // key -> { data, at }  (at = when we fetched it)
const inflight = new Set() // keys being fetched right now
const listeners = new Map() // key -> Set of setState functions

const loading = (districtId) => ({
  districtId, week: sampleWeek(), current: SAMPLE_CURRENT, isSample: true, loading: true,
})

function refresh(district, key) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < REFRESH_MS) return
  if (inflight.has(key)) return
  inflight.add(key)
  fetchForecast(district.lat, district.lon).then((res) => {
    inflight.delete(key)
    // A failed refresh must not throw away a real forecast and put the sample
    // week in its place. Keep the real one — its age is shown on screen once it
    // passes STALE_HOURS — and try again on the next tick.
    if (res.isSample && hit && !hit.data.isSample) return
    const entry = { data: { ...res, districtId: district.id, loading: false }, at: Date.now() }
    cache.set(key, entry)
    listeners.get(key)?.forEach((set) => set(entry.data))
  })
}

export function useForecast(district) {
  const today = useToday()
  const key = district.id + '|' + today
  const [data, setData] = useState(() => cache.get(key)?.data || loading(district.id))

  useEffect(() => {
    const subs = listeners.get(key) || new Set()
    listeners.set(key, subs)
    subs.add(setData)

    const hit = cache.get(key)
    // a new day keeps yesterday's forecast until today's lands (past days are
    // filtered below); a new district must never show the old district's weather
    if (hit) setData(hit.data)
    else setData((cur) => (cur.districtId === district.id ? cur : loading(district.id)))

    const tick = () => {
      if (document.visibilityState !== 'hidden') refresh(district, key)
    }
    tick()
    const timer = setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('online', tick)
    return () => {
      subs.delete(setData)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('online', tick)
    }
  }, [key, district.id, district.lat, district.lon])

  // Between the midnight rollover and the refetch landing, the cached week still
  // starts at yesterday. Never show a farmer a past day in a forecast.
  const week = (data.week || []).filter((d) => !d.iso || d.iso >= today)

  // A cached response is still a real forecast, but it is not a live one. The
  // service worker will serve yesterday's copy offline, so callers get the age
  // and decide whether to present it as current.
  const age = ageHours(data.fetchedAt)
  const stale = age !== null && age > STALE_HOURS

  return { ...data, week: week.length ? week : data.week, ageHours: age, stale }
}
