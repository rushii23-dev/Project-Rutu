import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { pct, soilFor } from '../lib/soil.js'

/** Home-screen entry to /soil: the district's two headline soil odds. */
export default function SoilSummary() {
  const { lang, districtId, districtName } = useStore()
  const nav = useNavigate()
  const s = soilFor(districtId)
  if (!s) return null
  const L = (o) => o[lang]

  const rows = [
    { label: L({ mr: 'नत्र कमी', hi: 'नाइट्रोजन कम', en: 'Low nitrogen' }), v: s.n[0] },
    { label: L({ mr: 'सेंद्रिय कर्ब कमी', hi: 'जैविक कार्बन कम', en: 'Low organic carbon' }), v: s.oc[0] },
  ]

  return (
    <button onClick={() => nav('/soil')} className="mt-3.5 w-full rounded-[28px] bg-card px-6 py-5 text-left">
      <div className="flex items-baseline justify-between">
        <div className="text-[13px] font-semibold uppercase tracking-[1.6px] text-faint">
          {L({ mr: 'जिल्ह्याची माती', hi: 'ज़िले की मिट्टी', en: 'District soil' })}
        </div>
        <span className="text-[15px] font-semibold text-grow">→</span>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[16px] font-medium text-ink">{r.label}</span>
              <span className="num text-[20px] font-bold text-warn">{pct(r.v)}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-chip">
              <div className="h-full rounded-full bg-warn" style={{ width: `${r.v * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="num mt-3 text-[13px] text-muted">
        {L({
          mr: `${districtName()}मधील ${s.samples.toLocaleString('en-IN')} शेतांची मृदा आरोग्य पत्रिका, ${s.cycle}`,
          hi: `${districtName()} के ${s.samples.toLocaleString('en-IN')} खेतों का मृदा स्वास्थ्य कार्ड, ${s.cycle}`,
          en: `Soil Health Card tests on ${s.samples.toLocaleString('en-IN')} fields in ${districtName()}, ${s.cycle}`,
        })}
      </div>
    </button>
  )
}
