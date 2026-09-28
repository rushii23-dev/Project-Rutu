import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { fmtDoy, rupees } from '../i18n/index.js'
import { cropById } from '../data/crops.js'
import { priceFor } from '../lib/prices.js'
import { isPriceStale } from '../lib/priceAge.js'
import { lateSowingCost, TRIAL } from '../lib/lateCost.js'

/**
 * "The calendar, corrected" — the old date, the new date, and what the gap
 * costs in rupees.
 *
 * Every number on this card is sourced: the two dates from 40 years of IMD
 * rainfall, the loss rate from a published field trial, the price from the latest
 * Agmarknet arrivals. None of it is a sample figure, which is why it carries no
 * sample badge — and why the trial is named on the card itself.
 */
export default function LateCost({ detail = false }) {
  const { lang, acres, district, districtId, districtName, t } = useStore()
  const nav = useNavigate()
  const price = priceFor(TRIAL.crop, districtId)
  const c = lateSowingCost(district, acres, price)
  if (!c) return null
  // 'the latest price' is only true while it is recent; otherwise name its date
  const oldPrice = isPriceStale(price)

  const L = (o) => o[lang]
  const soyName = cropById(TRIAL.crop).name
  const soy = soyName[lang]
  const soyMid = lang === 'en' ? soyName.en.toLowerCase() : soy
  const oldD = fmtDoy(district.onset.fatherDoy, lang)
  const newD = fmtDoy(district.onset.todayDoy, lang)
  const qtl = c.direction === 'late' ? Math.round(c.kg / 10) / 10 : 0

  return (
    <section className={`${detail ? 'mt-7' : 'mt-3.5'} rounded-[28px] bg-ink p-6`}>
      <div className="text-[13px] font-semibold uppercase tracking-[1.6px] text-ghost">
        {L({ mr: 'दिनदर्शिका, दुरुस्त', hi: 'कैलेंडर, सुधारा हुआ', en: 'The calendar, corrected' })}
      </div>

      <div className="mt-3 flex items-end gap-4">
        <div>
          <div className="display text-[26px] leading-none text-ghost line-through decoration-2">{oldD}</div>
          <div className="mt-1.5 text-[12px] text-hint">
            {L({ mr: 'वडिलांची तारीख', hi: 'पिता जी की तारीख़', en: "your father's date" })}
          </div>
        </div>
        <div className="pb-5 text-[20px] text-ghost">→</div>
        <div>
          <div className="display text-[42px] leading-none text-white">{newD}</div>
          <div className="mt-1.5 text-[12px] text-hint">
            {L({ mr: 'मान्सून आता येतो', hi: 'मानसून अब आता है', en: 'monsoon arrives now' })}
          </div>
        </div>
      </div>

      {c.direction === 'late' ? (
        <>
          <p className="mt-4 text-[16px] leading-relaxed text-white/85">
            {L({
              mr: `${oldD}ला पेरलेलं ${soy} आता पाऊस आल्यानंतर ${c.days} दिवसांनी सुरू होतं.`,
              hi: `${oldD} को बोई ${soy} अब बारिश आने के ${c.days} दिन बाद शुरू होती है.`,
              en: `${soy} sown on ${oldD} now starts ${c.days} days after the rain does.`,
            })}
          </p>

          <div className="mt-4 rounded-[22px] bg-white/[0.07] px-5 py-4">
            <div className="text-[13px] font-medium text-hint">
              {L({
                mr: `तुमच्या ${acres} एकरवर जुन्या तारखेचा खर्च`,
                hi: `आपके ${acres} एकड़ पर पुरानी तारीख़ की क़ीमत`,
                en: `What the old date costs on your ${acres} acres`,
              })}
            </div>
            {c.rupees ? (
              <div className="num mt-1 text-[38px] font-bold leading-none tracking-tight text-warn-l">
                −{rupees(Math.round(c.rupees / 100) * 100)}
              </div>
            ) : null}
            <div className="num mt-2 text-[14px] text-white/70">
              {L({
                mr: `सुमारे ${qtl} क्विंटल ${soy} कमी`,
                hi: `लगभग ${qtl} क्विंटल ${soy} कम`,
                en: `about ${qtl} quintals less ${soyMid}`,
              })}
              {c.perQtl && oldPrice
                ? L({
                    mr: ` · ${price.date} चा बाजारभाव ₹${c.perQtl.toLocaleString('en-IN')}/क्विंटल`,
                    hi: ` · ${price.date} का मंडी भाव ₹${c.perQtl.toLocaleString('en-IN')}/क्विंटल`,
                    en: ` · at the ${price.date} mandi price, ₹${c.perQtl.toLocaleString('en-IN')}/qtl`,
                  })
                : c.perQtl
                  ? L({
                      mr: ` · ताजा बाजारभाव ₹${c.perQtl.toLocaleString('en-IN')}/क्विंटल`,
                      hi: ` · ताज़ा मंडी भाव ₹${c.perQtl.toLocaleString('en-IN')}/क्विंटल`,
                      en: ` · at the latest mandi price, ₹${c.perQtl.toLocaleString('en-IN')}/qtl`,
                    })
                  : ''}
              {c.priceScope === 'state'
                ? L({ mr: ' (राज्य सरासरी)', hi: ' (राज्य औसत)', en: ' (state average)' })
                : ''}
            </div>
          </div>

          <p className="mt-3.5 text-[12px] leading-relaxed text-hint">
            {L({
              mr: `डॉ. पंदेकृवि अकोला येथील शेत चाचणीत पेरणी प्रत्येक दिवस उशिरा झाल्यावर सोयाबीन ${TRIAL.kgPerHaPerDay} किलो/हेक्टर कमी आलं.`,
              hi: `डॉ. पंदेकृवि अकोला के खेत परीक्षण में बुवाई में हर दिन की देरी पर सोयाबीन ${TRIAL.kgPerHaPerDay} किलो/हेक्टेयर कम आई.`,
              en: `In a Dr. PDKV Akola field trial, soybean yielded ${TRIAL.kgPerHaPerDay} kg/ha less for every day sowing was delayed.`,
            })}{' '}
            {c.days > TRIAL.maxDays
              ? L({
                  mr: `चाचणी ${TRIAL.maxDays} दिवसांपर्यंतच होती, म्हणून तेवढेच मोजले.`,
                  hi: `परीक्षण ${TRIAL.maxDays} दिन तक ही था, इसलिए उतना ही गिना.`,
                  en: `The trial only spanned ${TRIAL.maxDays} days, so we count no more.`,
                })
              : ''}
          </p>
        </>
      ) : (
        <p className="mt-4 text-[16px] leading-relaxed text-white/85">
          {L({
            mr: `${districtName()}मध्ये मान्सून आता ${c.days} दिवस उशिरा येतो. जुन्या तारखेला पेरलं तर बी कोरड्या जमिनीत पडतं.`,
            hi: `${districtName()} में मानसून अब ${c.days} दिन देर से आता है. पुरानी तारीख़ पर बोएँ तो बीज सूखी ज़मीन में गिरता है.`,
            en: `In ${districtName()} the monsoon now arrives ${c.days} days later. Sow on the old date and the seed goes into dry soil.`,
          })}
        </p>
      )}

      {detail && c.direction === 'late' ? <TrialChart lang={lang} /> : null}

      {!detail ? (
        <button onClick={() => nav('/evidence')} className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-white">
          {t('whyShort')} <span className="text-[15px]">→</span>
        </button>
      ) : null}
    </section>
  )
}

/** The four measured points the loss rate is fitted to — shown, not just cited. */
function TrialChart({ lang }) {
  const max = TRIAL.points[0].kg
  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-hint">
        {{ mr: 'चाचणीतील उत्पादन', hi: 'परीक्षण में उपज', en: 'Measured yield in the trial' }[lang]}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {TRIAL.points.map((p) => (
          <div key={p.date} className="flex items-center gap-3">
            <span className="num w-[52px] flex-none text-[13px] text-white/70">{p.date}</span>
            <div className="h-5 flex-1 rounded-md bg-white/[0.06]">
              <div className="h-5 rounded-md bg-grow" style={{ width: `${(p.kg / max) * 100}%` }} />
            </div>
            <span className="num w-[70px] flex-none text-right text-[13px] font-semibold text-white">
              {p.kg} kg/ha
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-hint">
        {TRIAL.cite}.{' '}
        {{
          mr: 'एका हंगामाची, अकोल्यातील चाचणी — तुमच्या शेताचा अंदाज, मोजमाप नव्हे.',
          hi: 'एक मौसम का, अकोला का परीक्षण — आपके खेत का अनुमान, नाप नहीं.',
          en: 'One season, at Akola — an estimate for your field, not a measurement of it.',
        }[lang]}
      </p>
    </div>
  )
}
