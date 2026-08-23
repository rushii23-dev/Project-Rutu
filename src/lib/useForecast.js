import { useEffect, useState } from 'react'
import { ageHours, fetchForecast, sampleWeek, SAMPLE_CURRENT, STALE_HOURS } from '../data/weather.js'
import { useToday } from './useToday.js'

/**
 * One fetch per district per calendar day. The cache key includes the day, so
 * when the clock rolls past midnight the entry misses and the forecast refetches
 * against Open-Meteo's shifted 7-day window.
 */
const cache = new Map()

export function useForecast(district) {
  const today = useToday()
  const key = district.id + '|' + today
  const [data, setData] = useState(
    () => cache.get(key) || { week: sampleWeek(), current: SAMPLE_CURRENT, isSample: true, loading: true }
  )

  useEffect(() => {
    let alive = true
    const hit = cache.get(key)
    if (hit) {
      setData(hit)
      return
    }
    fetchForecast(district.lat, district.lon).then((res) => {
      const withFlag = { ...res, loading: false }
      cache.set(key, withFlag)
      if (alive) setData(withFlag)
    })
    return () => {
      alive = false
    }
  }, [key, district.lat, district.lon])

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
