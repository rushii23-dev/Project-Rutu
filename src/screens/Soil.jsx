import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store.jsx'
import { RoundIconButton } from '../components/ui.jsx'
import { pct, soilFor, soilSource } from '../lib/soil.js'

/**
 * The district's soil, from the national Soil Health Card scheme.
 *
 * Rubric item 5. What this screen can honestly say is the ODDS for a farmer's
 * field — "3 in 4 fields tested here are low in nitrogen" — not his field's
 * reading. It says that plainly, and the last thing on it is where to get his
 * own card tested, which is the only way to turn the odds into a measurement.
 */

const L3 = {
  n: { mr: 'नत्र (N)', hi: 'नाइट्रोजन (N)', en: 'Nitrogen (N)' },
  oc: { mr: 'सेंद्रिय कर्ब', hi: 'जैविक कार्बन', en: 'Organic carbon' },
  p: { mr: 'स्फुरद (P)', hi: 'फ़ॉस्फ़ोरस (P)', en: 'Phosphorus (P)' },
  k: { mr: 'पालाश (K)', hi: 'पोटाश (K)', en: 'Potassium (K)' },
}
const MICRO = {
  Zn: { mr: 'जस्त (Zn)', hi: 'ज़िंक (Zn)', en: 'Zinc (Zn)' },
  B: { mr: 'बोरॉन (B)', hi: 'बोरॉन (B)', en: 'Boron (B)' },
  S: { mr: 'गंधक (S)', hi: 'सल्फ़र (S)', en: 'Sulphur (S)' },
  Fe: { mr: 'लोह (Fe)', hi: 'आयरन (Fe)', en: 'Iron (Fe)' },
}

/** "3 in 4" style odds, which read faster than a percentage */
function odds(share, lang) {
  const tbl = [
    [0.9, { mr: '10 पैकी 9', hi: '10 में से 9', en: '9 in 10' }],
    [0.72, { mr: '4 पैकी 3', hi: '4 में से 3', en: '3 in 4' }],
    [0.62, { mr: '3 पैकी 2', hi: '3 में से 2', en: '2 in 3' }],
    [0.45, { mr: '2 पैकी 1', hi: '2 में से 1', en: '1 in 2' }],
    [0.3, { mr: '3 पैकी 1', hi: '3 में से 1', en: '1 in 3' }],
    [0.2, { mr: '4 पैकी 1', hi: '4 में से 1', en: '1 in 4' }],
  ]
  for (const [min, o] of tbl) if (share >= min) return o[lang]
  return { mr: 'थोडी', hi: 'कुछ', en: 'few' }[lang]
}

export default function Soil() {
  const { lang, districtId, districtName } = useStore()
  const nav = useNavigate()
  const s = soilFor(districtId)
  const L = (o) => o[lang]

  return (
    <div className="px-5 pb-[130px] pt-4">
      <RoundIconButton onClick={() => nav(-1)} label="back">←</RoundIconButton>

      <h1 className="display mt-5 text-[34px] leading-tight text-ink">
        {L({ mr: 'तुमच्या जिल्ह्याची माती', hi: 'आपके ज़िले की मिट्टी', en: "Your district's soil" })}
      </h1>

      {!s ? (
        <p className="mt-3 text-[17px] text-muted">
          {L({
            mr: `${districtName()}साठी मृदा आरोग्य पत्रिकेच्या चाचण्या उपलब्ध नाहीत.`,
            hi: `${districtName()} के लिए मृदा स्वास्थ्य कार्ड की जाँचें उपलब्ध नहीं हैं.`,
            en: `There are no Soil Health Card tests for ${districtName()}.`,
          })}
        </p>
      ) : (
        <>
          <p className="num mt-1 text-[15px] text-muted">
            {L({
              mr: `${s.samples.toLocaleString('en-IN')} शेतांच्या चाचण्या · मृदा आरोग्य पत्रिका`,
              hi: `${s.samples.toLocaleString('en-IN')} खेतों की जाँच · मृदा स्वास्थ्य कार्ड`,
              en: `${s.samples.toLocaleString('en-IN')} fields tested · Soil Health Card`,
            })}{' '}
            <span className="whitespace-nowrap">{s.cycle}</span>
          </p>

          {/* the headline — the odds, in words */}
          <div className="mt-5 rounded-[28px] bg-card px-6 pb-6 pt-6">
            <div className="display text-[44px] leading-none text-warn">{odds(s.n[0], lang)}</div>
            <p className="mt-2.5 text-[18px] leading-snug text-ink">
              {L({
                mr: `${districtName()}मध्ये तपासलेल्या शेतांत नत्र कमी आढळलं.`,
                hi: `${districtName()} में जाँचे गए खेतों में नाइट्रोजन कम मिली.`,
                en: `fields tested in ${districtName()} are low in nitrogen.`,
              })}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {L({
                mr: `तुमच्या शेताचं मोजमाप नाही — पण तुमचं शेतही तसंच असण्याची शक्यता ${pct(s.n[0])}% आहे.`,
                hi: `यह आपके खेत का नाप नहीं — पर आपका खेत भी ऐसा होने की संभावना ${pct(s.n[0])}% है.`,
                en: `That is not a reading of your field — but it is a ${pct(s.n[0])}% chance yours is too.`,
              })}
            </p>
          </div>

          <div className="mt-3 rounded-[28px] bg-card px-5 py-5">
            <div className="mb-3 flex items-center gap-3 text-[11px] font-medium text-faint">
              <Key cls="bg-warn" label={L({ mr: 'कमी', hi: 'कम', en: 'Low' })} />
              <Key cls="bg-track" label={L({ mr: 'मध्यम', hi: 'मध्यम', en: 'Medium' })} />
              <Key cls="bg-grow" label={L({ mr: 'जास्त', hi: 'ज़्यादा', en: 'High' })} />
            </div>
            <div className="flex flex-col gap-4">
              {['n', 'oc', 'p', 'k'].map((k) => (
                <Stack key={k} label={L(L3[k])} shares={s[k]} />
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-faint">
              {L({
                mr: 'सेंद्रिय कर्ब: कमी < 0.5%, मध्यम 0.5–0.75%, जास्त > 0.75% — मृदा आरोग्य पत्रिकेचे निकष.',
                hi: 'जैविक कार्बन: कम < 0.5%, मध्यम 0.5–0.75%, ज़्यादा > 0.75% — मृदा स्वास्थ्य कार्ड के मानक.',
                en: 'Organic carbon: low < 0.5%, medium 0.5–0.75%, high > 0.75% — the Soil Health Card ratings.',
              })}
            </p>
          </div>

          <h2 className="display mx-1 mb-3 mt-7 text-[22px] text-ink">
            {L({ mr: 'सूक्ष्म अन्नद्रव्यांची कमतरता', hi: 'सूक्ष्म पोषक तत्वों की कमी', en: 'Micronutrient shortfalls' })}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(MICRO).map(([k, lab]) => (
              <div key={k} className="rounded-3xl bg-card px-5 py-4">
                <div className="text-[14px] font-medium text-muted">{L(lab)}</div>
                <div className={`num mt-1 text-[28px] font-bold tracking-tight ${s.deficient[k] >= 0.4 ? 'text-warn' : 'text-ink'}`}>
                  {pct(s.deficient[k])}%
                </div>
                <div className="text-[12px] text-faint">{L({ mr: 'शेतांत कमतरता', hi: 'खेतों में कमी', en: 'of fields short' })}</div>
              </div>
            ))}
          </div>

          <h2 className="display mx-1 mb-3 mt-7 text-[22px] text-ink">
            {L({ mr: 'याचा अर्थ तुमच्यासाठी', hi: 'आपके लिए इसका मतलब', en: 'What it means for you' })}
          </h2>
          <div className="flex flex-col gap-2.5">
            {actions(s, lang).map((a, i) => (
              <div key={i} className="flex items-start gap-3.5 rounded-3xl bg-card px-5 py-4">
                <div className="num flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-grow-l text-[15px] font-semibold text-grow-d">
                  {i + 1}
                </div>
                <div>
                  <div className="text-[16px] font-semibold leading-snug text-ink">{a.title}</div>
                  <div className="mt-1 text-[15px] leading-snug text-muted">{a.body}</div>
                  {a.to ? (
                    <button onClick={() => nav(a.to)} className="mt-2 text-[15px] font-semibold text-grow">
                      {a.cta} →
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <h2 className="display mx-1 mb-3 mt-7 text-[22px] text-ink">
            {L({ mr: 'तीन चाचणी फेऱ्या', hi: 'तीन जाँच चक्र', en: 'Three testing cycles' })}
          </h2>
          <div className="rounded-[28px] bg-card px-5 py-4">
            <div className="grid grid-cols-4 gap-2 border-b border-hair pb-2 text-[12px] font-semibold text-faint">
              <span>{L({ mr: 'फेरी', hi: 'चक्र', en: 'Cycle' })}</span>
              <span className="text-right">{L({ mr: 'चाचण्या', hi: 'जाँच', en: 'Tests' })}</span>
              <span className="text-right">{L({ mr: 'N कमी', hi: 'N कम', en: 'N low' })}</span>
              <span className="text-right">{L({ mr: 'कर्ब कमी', hi: 'कार्बन कम', en: 'OC low' })}</span>
            </div>
            {s.history.map((h) => (
              <div key={h.cycle} className="num grid grid-cols-4 gap-2 py-2 text-[15px] text-ink">
                <span>{h.cycle}</span>
                <span className="text-right text-muted">{h.samples.toLocaleString('en-IN')}</span>
                <span className="text-right">{pct(h.nLow)}%</span>
                <span className="text-right">{pct(h.ocLow)}%</span>
              </div>
            ))}
            <p className="mt-2 text-[12px] leading-relaxed text-faint">
              {L({
                mr: 'प्रत्येक फेरीत वेगवेगळी शेतं तपासली जातात, त्यामुळे हा फरक मातीतील बदलाचा पुरावा नाही.',
                hi: 'हर चक्र में अलग खेत जाँचे जाते हैं, इसलिए यह अंतर मिट्टी में बदलाव का सबूत नहीं है.',
                en: 'Each cycle tests different fields, so the change between them is not evidence that the soil changed.',
              })}
            </p>
          </div>

          <div className="mt-3.5 rounded-[28px] bg-ink p-6">
            <div className="text-[18px] font-semibold text-white">
              {L({
                mr: 'तुमच्या शेताची स्वतःची पत्रिका काढा',
                hi: 'अपने खेत का अपना कार्ड बनवाएँ',
                en: "Get your own field's card",
              })}
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/75">
              {L({
                mr: 'मृदा आरोग्य पत्रिका योजनेअंतर्गत माती परीक्षण शेतकऱ्यांसाठी मोफत आहे. कृषी सहाय्यक किंवा जवळच्या कृषी विज्ञान केंद्राशी संपर्क करा.',
                hi: 'मृदा स्वास्थ्य कार्ड योजना में मिट्टी जाँच किसानों के लिए मुफ़्त है. कृषि सहायक या पास के कृषि विज्ञान केंद्र से संपर्क करें.',
                en: 'Soil testing is free for farmers under the Soil Health Card scheme. Ask your agriculture assistant or the nearest Krishi Vigyan Kendra.',
              })}
            </p>
            <a
              href={soilSource.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-[15px] font-semibold text-white underline"
            >
              soilhealth.dac.gov.in
            </a>
          </div>
        </>
      )}
    </div>
  )
}

function Key({ cls, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${cls}`} />
      {label}
    </span>
  )
}

function Stack({ label, shares }) {
  const [low, med, high] = shares
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[15px] font-medium text-ink">{label}</span>
        <span className="num text-[14px] font-semibold text-warn">{pct(low)}%</span>
      </div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-chip">
        <div className="bg-warn" style={{ width: `${low * 100}%` }} />
        <div className="bg-track" style={{ width: `${med * 100}%` }} />
        <div className="bg-grow" style={{ width: `${high * 100}%` }} />
      </div>
    </div>
  )
}

/**
 * Rule-based advice from the district odds. Every rule is a threshold on a
 * share a reader can see on the screen above it.
 */
function actions(s, lang) {
  const L = (o) => o[lang]
  const out = []
  if (s.n[0] >= 0.5) {
    out.push({
      title: L({
        mr: 'फेरपालटीत एक कडधान्य ठेवा',
        hi: 'फ़सल-चक्र में एक दलहन रखें',
        en: 'Put a legume in your rotation',
      }),
      body: L({
        mr: 'सोयाबीन, हरभरा, भुईमूग, मूग हवेतील नत्र जमिनीत आणतात — पुढच्या पिकाचं खत कमी लागतं.',
        hi: 'सोयाबीन, चना, मूँगफली, मूँग हवा की नाइट्रोजन मिट्टी में लाते हैं — अगली फ़सल को खाद कम लगती है.',
        en: 'Soybean, gram, groundnut and moong pull nitrogen from the air into the soil, so the next crop needs less fertiliser.',
      }),
      to: '/crops/soy#rotation',
      cta: L({ mr: 'फेरपालट पाहा', hi: 'फ़सल-चक्र देखें', en: 'See the rotation' }),
    })
  }
  if (s.oc[0] >= 0.35) {
    out.push({
      title: L({ mr: 'काडी-कचरा जाळू नका', hi: 'पराली न जलाएँ', en: "Don't burn the residue" }),
      body: L({
        mr: `इथे ${pct(s.oc[0])}% शेतांत सेंद्रिय कर्ब कमी आहे. पिकाचे अवशेष आणि शेणखत जमिनीत मिसळा — मातीची पाणी धरण्याची ताकद वाढते.`,
        hi: `यहाँ ${pct(s.oc[0])}% खेतों में जैविक कार्बन कम है. फ़सल अवशेष और गोबर खाद मिट्टी में मिलाएँ — मिट्टी की पानी रोकने की ताक़त बढ़ती है.`,
        en: `${pct(s.oc[0])}% of fields here are low in organic carbon. Work crop residue and farmyard manure back in — it helps the soil hold water through a dry spell.`,
      }),
    })
  }
  if (s.deficient.Zn >= 0.35) {
    out.push({
      title: L({ mr: 'जस्ताची तपासणी करा', hi: 'ज़िंक की जाँच कराएँ', en: 'Check for zinc' }),
      body: L({
        mr: `${pct(s.deficient.Zn)}% शेतांत जस्त कमी आहे. तुमच्या पत्रिकेत कमतरता दिसली तर झिंक सल्फेटची शिफारस मागा.`,
        hi: `${pct(s.deficient.Zn)}% खेतों में ज़िंक कम है. आपके कार्ड में कमी दिखे तो ज़िंक सल्फ़ेट की सिफ़ारिश माँगें.`,
        en: `${pct(s.deficient.Zn)}% of fields are short of zinc. If your own card shows it, ask for the zinc sulphate recommendation.`,
      }),
    })
  }
  if (s.k[2] >= 0.5) {
    out.push({
      title: L({ mr: 'पालाश आधी तपासा, मग टाका', hi: 'पोटाश पहले जाँचें, फिर डालें', en: 'Test before you buy potash' }),
      body: L({
        mr: `इथे ${pct(s.k[2])}% शेतांत पालाश आधीच जास्त आहे. पत्रिका न पाहता पालाश टाकणं बहुधा वाया जाणारा खर्च आहे.`,
        hi: `यहाँ ${pct(s.k[2])}% खेतों में पोटाश पहले से ज़्यादा है. कार्ड देखे बिना पोटाश डालना अक्सर बेकार ख़र्च है.`,
        en: `${pct(s.k[2])}% of fields here are already high in potassium. Buying potash without a test is often money spent for nothing.`,
      }),
    })
  }
  return out
}
