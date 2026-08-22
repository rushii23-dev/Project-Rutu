import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { SAMPLE_CROPS } from '../data/crops.js'
import { priceFor } from '../lib/prices.js'
import { Card, EyebrowLabel } from './ui.jsx'

/**
 * Where today's money is, in this district.
 *
 * Every crop that actually traded, ranked by the best-paying market, with the
 * market named. This is the one thing on the profile a farmer might act on the
 * same morning — and it is entirely real Agmarknet data, not an estimate, so it
 * carries no sample badge.
 */
export default function BestPrices() {
  const { t, lang, districtId, districtName } = useStore()
  const nav = useNavigate()

  const rows = SAMPLE_CROPS.map((c) => ({ crop: c, price: priceFor(c.id, districtId) }))
    .filter((r) => r.price && r.price.scope === 'district' && r.price.bestPrice)
    .sort((a, b) => b.price.bestPrice - a.price.bestPrice)
    .slice(0, 4)

  return (
    <Card className="mt-3 px-5 py-5">
      <EyebrowLabel>{t('bestToday')}</EyebrowLabel>
      <p className="mt-1 text-[13px] text-faint">
        {t('bestTodaySub', { d: districtName() })}
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-[15px] font-medium text-warn-m">{t('noPricesToday')}</p>
      ) : (
        <div className="mt-3 flex flex-col">
          {rows.map((r, i) => (
            <button
              key={r.crop.id}
              onClick={() => nav('/crops/' + r.crop.id)}
              className={`flex items-center justify-between py-3 text-left ${
                i === rows.length - 1 ? '' : 'border-b border-hair'
              }`}
            >
              <span className="min-w-0 pr-3">
                <span className="block truncate text-[17px] font-semibold text-ink">
                  {r.crop.name[lang]}
                </span>
                <span className="block truncate text-[13px] text-faint">
                  {r.price.market}
                  {r.price.bestTaluka ? ` · ${r.price.bestTaluka}` : ''}
                </span>
              </span>
              <span className="num flex-none text-[19px] font-bold tracking-tight text-grow">
                ₹{r.price.bestPrice.toLocaleString('en-IN')}
              </span>
            </button>
          ))}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="num mt-2 text-[11px] text-faint">Agmarknet · {rows[0].price.date}</div>
      ) : null}
    </Card>
  )
}
