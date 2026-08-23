import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { rupees } from '../i18n/index.js'
import { SAMPLE_CROPS } from '../data/crops.js'
import { DISEASE_MODEL, DISEASES, MIN_CONFIDENCE, canDiagnose } from '../data/diseases.js'
import { costOf, diagnose, modelAvailable } from '../lib/diagnose.js'
import { Card, EyebrowLabel, RoundIconButton, SampleBadge } from '../components/ui.jsx'

/**
 * Leaf disease diagnosis.
 *
 * Three refusals are deliberate and each has its own screen state:
 *   no model deployed  -> says the model is not built yet
 *   crop not covered   -> says which crop it can read and which it cannot
 *   low confidence     -> says it is not sure, and shows what it was torn
 *                         between, rather than committing to a spray
 *
 * The photo is classified on the device and never uploaded.
 */
export default function Diagnose() {
  const { t, lang, acres } = useStore()
  const nav = useNavigate()
  const fileRef = useRef(null)
  const imgRef = useRef(null)

  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [hasModel, setHasModel] = useState(null) // null = still checking

  const crop = SAMPLE_CROPS.find((c) => c.id === DISEASE_MODEL.crop)

  useEffect(() => {
    modelAvailable().then(setHasModel)
  }, [])

  // an object URL per selected photo; release the previous one
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  function pick(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    setResult(null)
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(f)
    })
  }

  async function run() {
    if (!imgRef.current) return
    setBusy(true)
    try {
      setResult(await diagnose(imgRef.current))
    } finally {
      setBusy(false)
    }
  }

  const d = result?.ok ? DISEASES[result.id] : null
  const money = result?.ok && result.confident ? costOf(result.id, crop, acres) : null

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav('/home')} label="back">←</RoundIconButton>

      <h1 className="display mt-5 text-[34px] leading-tight text-ink">{t('dxTitle')}</h1>
      <p className="mt-1 text-[15px] leading-snug text-muted">
        {t('dxSub', { crop: crop.name[lang] })}
      </p>

      {/* Which crops this can and cannot read. Stated before the farmer
          photographs a cotton leaf and gets a maize answer. */}
      <div className="mt-4 rounded-[26px] bg-warn-l px-5 py-4">
        <EyebrowLabel tone="warn">{t('dxScope')}</EyebrowLabel>
        <p className="mt-1.5 text-[15px] leading-relaxed text-warn-d">
          {
            {
              mr: `हा तपासनीस फक्त ${crop.name.mr}ची पानं ओळखतो. सोयाबीन, कापूस, गहू, हरभरा, कांदा, बाजरी, भुईमूग आणि मूग यांच्यासाठी आमच्याकडे रोगाची प्रशिक्षित माहिती नाही, त्यामुळे त्यांचं निदान आम्ही करत नाही.`,
              hi: `यह जाँच सिर्फ़ ${crop.name.hi} की पत्तियाँ पहचानती है. सोयाबीन, कपास, गेहूँ, चना, प्याज़, बाजरा, मूँगफली और मूँग के लिए हमारे पास प्रशिक्षित रोग डेटा नहीं है, इसलिए उनका निदान हम नहीं करते.`,
              en: `This reads ${crop.name.en} leaves only. We have no trained disease data for soybean, cotton, wheat, gram, onion, bajra, groundnut or moong, so we do not diagnose them.`,
            }[lang]
          }
        </p>
      </div>

      {/* the model is not deployed: say so instead of guessing */}
      {hasModel === false ? (
        <Card className="mt-3 px-5 py-4">
          <div className="text-[17px] font-semibold text-ink">{t('dxNoModel')}</div>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">{t('dxNoModelBody')}</p>
        </Card>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={pick}
        className="hidden"
      />

      <button
        onClick={() => fileRef.current?.click()}
        className="mt-3 flex w-full items-center gap-4 rounded-[26px] bg-grow px-5 py-4 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5h3.5L8 6h8l1.5 2.5H21V19H3z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
        <span>
          <span className="block text-[17px] font-semibold text-white">{t('dxTake')}</span>
          <span className="block text-[14px] text-white/75">{t('dxTakeSub')}</span>
        </span>
      </button>

      {url ? (
        <>
          <div className="mt-3 overflow-hidden rounded-[26px] bg-card">
            <img
              ref={imgRef}
              src={url}
              alt=""
              className="block max-h-[320px] w-full object-contain"
            />
          </div>
          <button
            onClick={run}
            disabled={busy || hasModel === false}
            className={`mt-3 h-[58px] w-full rounded-[30px] text-[18px] font-semibold ${
              busy || hasModel === false ? 'bg-track text-faint' : 'bg-ink text-white'
            }`}
          >
            {busy ? t('dxWorking') : t('dxCheck')}
          </button>
        </>
      ) : null}

      {/* ---------------- result ---------------- */}
      {result && !result.ok ? (
        <Card className="mt-3 px-5 py-4">
          <div className="text-[17px] font-semibold text-ink">
            {result.reason === 'no-model' ? t('dxNoModel') : t('dxFailed')}
          </div>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">
            {result.reason === 'no-model' ? t('dxNoModelBody') : t('dxFailedBody')}
          </p>
        </Card>
      ) : null}

      {result?.ok && !result.confident ? (
        <Card className="mt-3 px-5 py-4">
          <div className="text-[17px] font-semibold text-ink">{t('dxUnsure')}</div>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">
            {t('dxUnsureBody', { pct: Math.round(MIN_CONFIDENCE * 100) })}
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {result.ranked.slice(0, 2).map((r) => (
              <div key={r.id} className="flex items-baseline justify-between">
                <span className="text-[15px] text-ink">{DISEASES[r.id].name[lang]}</span>
                <span className="num text-[14px] font-semibold text-faint">
                  {Math.round(r.p * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {result?.ok && result.confident && d ? (
        <>
          <div
            className={`mt-3 rounded-[28px] px-6 py-5 ${d.healthy ? 'bg-grow-l' : 'bg-warn-l'}`}
          >
            <EyebrowLabel tone={d.healthy ? 'faint' : 'warn'}>
              {t('dxResult')} · {Math.round(result.confidence * 100)}%
            </EyebrowLabel>
            <div
              className={`display mt-2 text-[30px] leading-tight ${
                d.healthy ? 'text-grow-d' : 'text-warn-d'
              }`}
            >
              {d.name[lang]}
            </div>
            <p
              className={`mt-2 text-[15px] leading-relaxed ${
                d.healthy ? 'text-grow' : 'text-warn-m'
              }`}
            >
              {d.looks[lang]}
            </p>
          </div>

          {/* the agronomy only matters once it is money */}
          {money ? (
            <div className="mt-3 rounded-[28px] bg-ink px-6 py-5">
              <div className="flex items-baseline justify-between">
                <EyebrowLabel tone="ghost">{t('dxAtRisk')}</EyebrowLabel>
                <SampleBadge>{t('sampleFlag')}</SampleBadge>
              </div>
              <div className="num mt-1.5 text-[34px] font-bold tracking-tight text-white">
                {rupees(money.atRisk)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-2xl bg-white/12 px-3.5 py-1.5 text-[14px] font-medium text-white">
                  {t('dxTreatCost')} {rupees(money.treatment)}
                </span>
                <span className="rounded-2xl bg-warn px-3.5 py-1.5 text-[14px] font-semibold text-white">
                  {t('dxActWithin', { n: money.days })}
                </span>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-hint">{d.treatment[lang]}</p>
            </div>
          ) : (
            <Card className="mt-3 px-5 py-4">
              <p className="text-[15px] leading-relaxed text-ink">{d.treatment[lang]}</p>
            </Card>
          )}
        </>
      ) : null}

      {/* the limits, on screen rather than only in the README */}
      <p className="mx-1 mt-4 text-[11px] leading-relaxed text-faint">
        {
          {
            mr: 'हे मॉडेल PlantVillage या प्रयोगशाळेतल्या फोटोंवर शिकवलं आहे — पांढऱ्या पार्श्वभूमीवर एक पान. खऱ्या शेतातल्या फोटोत माती, सावली आणि अनेक पानं असतात, तिथे अचूकता घटते. एक पान म्हणजे पूर्ण शेत नाही. फवारणीपूर्वी कृषी सहाय्यकाला विचारा. फोटो तुमच्या फोनमधून बाहेर जात नाही.',
            hi: 'यह मॉडल PlantVillage की प्रयोगशाला तस्वीरों पर सीखा है — सफ़ेद पृष्ठभूमि पर एक पत्ती. असली खेत की तस्वीर में मिट्टी, छाया और कई पत्तियाँ होती हैं, वहाँ सटीकता घटती है. एक पत्ती पूरा खेत नहीं. छिड़काव से पहले कृषि सहायक से पूछें. तस्वीर आपके फ़ोन से बाहर नहीं जाती.',
            en: 'Trained on PlantVillage, which is laboratory photographs — one leaf on a plain background. Real field photos carry soil, shadow and several leaves, and accuracy drops there. One leaf is not the whole field. Ask an extension officer before spraying. The photo never leaves your phone.',
          }[lang]
        }
      </p>
    </div>
  )
}
