import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { makeT } from '../i18n/index.js'
import districtData from '../data/districts.json'

const KEY = 'ritu.v1'

const DEFAULTS = {
  // Marathi on first run (Maharashtra is Marathi-first). A farmer switches to English or Hindi from Profile;
  // the interface is fully translated either way.
  lang: 'mr',
  onboarded: false,
  name: '',
  village: '',
  districtId: 'Nashik',
  acres: 3,
  // the crop the farmer says is in his field; null = let the app pick the
  // likeliest one from the season and the district's corrected calendar
  fieldCrop: null,
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private mode — the app still works, it just won't remember */
    }
  }, [state])

  const value = useMemo(() => {
    const district =
      districtData.districts.find((d) => d.id === state.districtId) ||
      districtData.districts.find((d) => d.id === 'Nashik')

    return {
      ...state,
      district,
      districts: districtData.districts,
      meta: { source: districtData.source, method: districtData.method },
      t: makeT(state.lang),
      /** district name in the active language — Devanagari for mr/hi, Latin for en */
      districtName: (d = district) => (state.lang === 'en' ? d.en : d.dev),
      set: (patch) => setState((s) => ({ ...s, ...patch })),
      reset: () => setState(DEFAULTS),
    }
  }, [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}
