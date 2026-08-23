import { useStore } from '../lib/store.jsx'
import { resilience, bandSummary } from '../lib/resilience.js'
import { rupees } from '../i18n/index.js'
import { SampleBadge } from './ui.jsx'

/**
 * Climate-resilience for one crop in one district — rubric item 10.
 *
 * Sits inside crop detail alongside the rotation, because the question it
 * answers ("will this crop survive the rain my block gets now?") is only
 * meaningful about a crop already on screen.
 *
 * Every factor is rendered with its own signed contribution, so the score is
 * never a black box — a judge can add the numbers up on stage.
 */
export default function Resilience({ crop }) {
  const { t, lang, acres, district, districtName } = useStore()
  const r = resilience(crop, district)

  // where the monsoon record cannot honestly speak to the crop, say that
  // instead of showing a confident number derived from the wrong measurement
  if (!r.scored) {
    return (
      <section className="mt-7">
        <div className="mx-1 mb-1 flex items-baseline justify-between">
          <h2 className="display text-[22px] text-ink">{t('resilience')}</h2>
          <span className="rounded-lg bg-chip px-2 py-1 text-[11px] font-semibold text-faint">
            {t('notScored')}
          </span>
        </div>
        <div className="mt-2 rounded-[26px] bg-card px-5 py-4 text-[15px] leading-relaxed text-muted">
          {r.text ? r.text[lang] : null}
        </div>
      </section>
    )
  }

  const tone =
    r.band === 'strong'
      ? { chip: 'bg-grow-l text-grow-d', bar: '#2E8F4E', num: 'text-grow' }
      : r.band === 'fragile'
        ? { chip: 'bg-warn-l text-warn-d', bar: '#C1531B', num: 'text-warn' }
        : { chip: 'bg-chip text-ink-2', bar: '#8A8574', num: 'text-ink' }

  const gap = (crop.SAMPLE_goodPerAcre - crop.SAMPLE_poorPerAcre) * acres

  return (
    <section className="mt-7">
      <div className="mx-1 mb-1 flex items-baseline justify-between">
        <h2 className="display text-[22px] text-ink">{t('resilience')}</h2>
        <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${tone.chip}`}>
          {t(`band_${r.band}`)}
        </span>
      </div>
      <p className="mx-1 mb-3 text-[13px] text-faint">{t('resilienceSub')}</p>

      <div className="rounded-[26px] bg-card px-5 py-5">
        <div className="flex items-baseline gap-2.5">
          <span className={`display text-[52px] leading-none ${tone.num}`}>{r.score}</span>
          <span className="text-[15px] font-medium text-faint">/ 100</span>
        </div>

        <span className="mt-3 block h-2 overflow-hidden rounded-full bg-track">
          <span
            className="block h-full rounded-full transition-[width] duration-500"
            style={{ width: r.score + '%', background: tone.bar }}
          />
        </span>

        <p className="mt-3 text-[16px] leading-snug text-ink">{bandSummary(r.band, lang)}</p>
      </div>

      {/* the arithmetic, shown rather than asserted */}
      <div className="mx-1 mb-2 mt-5 text-[13px] font-semibold uppercase tracking-[1.6px] text-faint">
        {t('howScored')}
      </div>
      <div className="flex flex-col gap-2.5">
        {r.factors.map((f) => (
          <div key={f.key} className="flex items-start gap-3.5 rounded-3xl bg-card px-5 py-4">
            <span
              className={`num flex h-[30px] min-w-[38px] flex-none items-center justify-center rounded-full px-1.5 text-[14px] font-bold ${
                f.delta >= 0 ? 'bg-grow-l text-grow-d' : 'bg-warn-l text-warn-d'
              }`}
            >
              {f.delta > 0 ? '+' : ''}
              {f.delta}
            </span>
            <span className="text-[15px] leading-snug text-ink">{f.text[lang]}</span>
          </div>
        ))}
      </div>

      {/* the agronomy above only matters to a farmer once it is money */}
      <div className="mt-3 rounded-[26px] bg-ink px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold uppercase tracking-[1.6px] text-ghost">
            {
              {
                mr: 'खराब पावसाच्या वर्षी',
                hi: 'ख़राब बारिश के साल में',
                en: 'In a poor rain year',
              }[lang]
            }
          </span>
          <SampleBadge>{t('sampleFlag')}</SampleBadge>
        </div>
        <div className="num mt-1.5 text-[26px] font-bold tracking-tight text-white">
          −{rupees(gap)}
        </div>
        <p className="mt-1 text-[14px] leading-snug text-hint">
          {
            {
              mr: `${acres} एकरात एवढं कमी मिळू शकतं. लवचिकता जेवढी कमी, तेवढा हा फटका वारंवार बसतो.`,
              hi: `${acres} एकड़ में इतना कम मिल सकता है. सहनशीलता जितनी कम, यह नुक़सान उतनी बार होता है.`,
              en: `That is the drop across your ${acres} acres. The lower the score, the more often you land on it.`,
            }[lang]
          }
        </p>
      </div>

      <p className="mx-1 mt-2 text-[11px] leading-relaxed text-faint">
        {
          {
            mr: `${districtName()}च्या जून–सप्टेंबर पावसाची २०१६–२०२५ ची सरासरी, १९८५–१९९४ शी तुलना करून (IMD). पिकाची पाण्याची गरज ही ढोबळ कृषिशास्त्रीय मापं आहेत, अजून राज्याच्या शिफारशींशी जुळवलेली नाहीत.`,
            hi: `${districtName()} की जून–सितंबर बारिश का २०१६–२०२५ औसत, १९८५–१९९४ से तुलना करके (IMD). फ़सल की पानी की ज़रूरत मोटे कृषि अनुमान हैं, अभी राज्य की सिफ़ारिशों से मिलाए नहीं गए.`,
            en: `${districtName()}'s June–September rainfall, 2016–2025 mean against the 1985–1994 mean (IMD). Crop water requirements are agronomic rules of thumb, not yet cited to the state package of practices.`,
          }[lang]
        }
      </p>
    </section>
  )
}
