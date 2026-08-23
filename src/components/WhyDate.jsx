import { useStore } from '../lib/store.jsx'
import { fmtDate, fmtWindow, fmtDoy, getSeasons, rupees } from '../i18n/index.js'
import { sowingStatus } from '../lib/season.js'
import { SAMPLE_CROPS } from '../data/crops.js'
import { SampleBadge } from './ui.jsx'

/**
 * "Why is the next sowing date what it says?"
 *
 * The home screen shows one date. Tapping Why used to land on the onset chart,
 * which explains that the monsoon moved but never explains THE DATE ON THE
 * CARD. This answers that specific question, and it answers it differently
 * depending on how the date was actually derived:
 *
 *   basis 'onset'    — kharif. Anchored to this district's own corrected
 *                      monsoon onset, computed from the IMD record.
 *   basis 'calendar' — rabi or summer. A fixed agronomic window. We say so
 *                      plainly rather than implying a correction we did not
 *                      make.
 *
 * The section on what we do NOT predict is not modesty, it is the honest
 * answer to the obvious judge question, and it is load-bearing: RITU does not
 * forecast this year's monsoon and must never be read as claiming to.
 */
export default function WhyDate() {
  const { t, lang, acres, district, districtName } = useStore()
  const st = sowingStatus(SAMPLE_CROPS, district)
  const seasons = getSeasons(lang)
  const onset = district.onset
  const onsetBased = st.basis === 'onset'

  // the crop that opens this window, for the money line
  const lead =
    SAMPLE_CROPS.filter((c) => c.season === st.season).sort(
      (a, b) => b.SAMPLE_goodPerAcre - a.SAMPLE_goodPerAcre,
    )[0] || SAMPLE_CROPS[0]
  const gap = (lead.SAMPLE_goodPerAcre - lead.SAMPLE_poorPerAcre) * acres

  const steps = onsetBased
    ? [
        {
          h: {
            mr: 'ही तारीख कॅलेंडरची नाही — तुमच्या भागाच्या पावसाची आहे',
            hi: 'यह तारीख़ कैलेंडर की नहीं — आपके इलाक़े की बारिश की है',
            en: 'This date is not from a calendar. It is your block’s rain.',
          },
          b: {
            mr: `${districtName()}मध्ये मान्सून आता सरासरी ${fmtDoy(onset.todayDoy, lang)}ला येतो. पेरणीची खिडकी त्या दिवसापासून मोजली जाते, कॅलेंडरवरच्या ठरलेल्या तारखेपासून नाही.`,
            hi: `${districtName()} में मानसून अब औसतन ${fmtDoy(onset.todayDoy, lang)} को आता है. बुवाई की खिड़की उसी दिन से गिनी जाती है, कैलेंडर की तय तारीख़ से नहीं.`,
            en: `In ${districtName()} the monsoon now arrives on average around ${fmtDoy(onset.todayDoy, lang)}. The sowing window is counted from that day, not from a fixed calendar date.`,
          },
        },
        {
          h: {
            mr: 'हा आकडा कसा काढला',
            hi: 'यह आँकड़ा कैसे निकला',
            en: 'How that day was worked out',
          },
          b: {
            mr: `भारतीय हवामान विभागाच्या ${onset.yearFrom}–${onset.yearTo} या रोजच्या पावसाच्या नोंदी. दरवर्षी 1 जूननंतरचा पहिला दिवस शोधला जिथे पुढच्या 7 दिवसांत 25 मिमी पाऊस पडतो आणि नंतरच्या 30 दिवसांत 7 दिवसांपेक्षा मोठा खंड पडत नाही. ${onset.nYears} वर्षांचे असे ${onset.nYears} दिवस — त्यांचा कल हीच तुमची सुधारित तारीख.`,
            hi: `भारतीय मौसम विभाग के ${onset.yearFrom}–${onset.yearTo} के रोज़ाना बारिश रिकॉर्ड. हर साल 1 जून के बाद वह पहला दिन खोजा जहाँ अगले 7 दिन में 25 मिमी बारिश हो और उसके बाद 30 दिन में 7 दिन से बड़ा खंड न पड़े. ${onset.nYears} साल के ऐसे ${onset.nYears} दिन — उनका रुझान ही आपकी सुधारी हुई तारीख़ है.`,
            en: `From IMD daily rainfall, ${onset.yearFrom}–${onset.yearTo}. For each year we find the first day after 1 June where the next 7 days bring 25 mm and no dry spell longer than 7 days follows in the next 30. That gives ${onset.nYears} onset days; their trend is your corrected date.`,
          },
        },
      ]
    : [
        {
          h: {
            mr: 'ही तारीख कॅलेंडरची आहे — आम्ही ती सरकवलेली नाही',
            hi: 'यह तारीख़ कैलेंडर की है — हमने इसे खिसकाया नहीं है',
            en: 'This one is a calendar window. We have not shifted it.',
          },
          b: {
            mr: `${seasons[st.season]} पेरणी पावसावर नाही, खरिपानंतर जमिनीत उरलेल्या ओलीवर आणि विहिरीच्या पाण्यावर होते. त्यामुळे ही खिडकी मान्सूनच्या तारखेवरून मोजलेली नाही. खरिपाची तारीख आम्ही तुमच्या भागाप्रमाणे दुरुस्त करतो — ही नाही, कारण तसं करायला आमच्याकडे पुरावा नाही.`,
            hi: `${seasons[st.season]} की बुवाई बारिश पर नहीं, खरीफ़ के बाद ज़मीन में बची नमी और कुएँ के पानी पर होती है. इसलिए यह खिड़की मानसून की तारीख़ से नहीं गिनी जाती. खरीफ़ की तारीख़ हम आपके इलाक़े के हिसाब से सुधारते हैं — यह नहीं, क्योंकि ऐसा करने का हमारे पास प्रमाण नहीं.`,
            en: `${seasons[st.season]} sowing does not follow the rain. It follows the moisture left in the soil after the kharif harvest, and well water. So this window is not counted from the monsoon date. We correct the kharif date to your block; we do not correct this one, because we have no evidence that would justify it.`,
          },
        },
        {
          h: {
            mr: 'मग ही तारीख कुठून आली',
            hi: 'तो यह तारीख़ कहाँ से आई',
            en: 'So where does this date come from',
          },
          b: {
            mr: `${seasons[st.season]} हंगामातल्या पिकांच्या पेरणीच्या खिडक्या एकत्र केल्या. त्यातली सर्वात लवकर उघडणारी खिडकी ${fmtDate(st.from, lang)}ला सुरू होते, म्हणून पुढची पेरणी तिथून. संपूर्ण खिडकी ${fmtWindow({ from: st.from, to: st.to }, lang)}.`,
            hi: `${seasons[st.season]} की फ़सलों की बुवाई खिड़कियाँ जोड़ी गईं. उनमें सबसे पहले खुलने वाली ${fmtDate(st.from, lang)} को शुरू होती है, इसलिए अगली बुवाई वहीं से. पूरी खिड़की ${fmtWindow({ from: st.from, to: st.to }, lang)}.`,
            en: `We take the sowing windows of every ${seasons[st.season]} crop we carry. The earliest of them opens on ${fmtDate(st.from, lang)}, so that is when the next sowing begins. The full window runs ${fmtWindow({ from: st.from, to: st.to }, lang)}.`,
          },
        },
      ]

  return (
    <section className="mt-6">
      <div className="rounded-[28px] bg-ink px-6 pb-5 pt-6">
        <div className="text-[13px] font-semibold uppercase tracking-[1.6px] text-ghost">
          {t('whyThisDate')}
        </div>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span className="display text-[52px] leading-none text-white">
            {fmtDate(st.from, lang)}
          </span>
          <span className="text-[15px] font-medium text-hint">{seasons[st.season]}</span>
        </div>
        <div className="mt-3 inline-block rounded-2xl bg-white/12 px-3 py-1.5 text-[13px] font-semibold text-white">
          {onsetBased ? t('basisOnset') : t('basisCalendar')}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <div key={i} className="rounded-[26px] bg-card px-5 py-4">
            <div className="flex items-start gap-3.5">
              <span className="num flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-grow-l text-[15px] font-semibold text-grow-d">
                {i + 1}
              </span>
              <div>
                <div className="text-[16px] font-semibold leading-snug text-ink">
                  {s.h[lang]}
                </div>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.b[lang]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* The question every judge asks, answered before they ask it. */}
      <div className="mt-3 rounded-[26px] bg-warn-l px-5 py-4">
        <div className="text-[13px] font-semibold uppercase tracking-[1.6px] text-warn-m">
          {t('notPredicting')}
        </div>
        <p className="mt-1.5 text-[15px] leading-relaxed text-warn-d">
          {
            {
              // the measured claim differs by district: two of 36 shifted
              // significantly, so this must not assert a shift everywhere
              mr: `यंदाचा मान्सून नेमका कधी येईल हे आम्ही सांगत नाही. तसं कोणीच खात्रीने सांगू शकत नाही. आम्ही एवढंच मोजतो की ${onset.nYears} वर्षांच्या नोंदींमध्ये तुमच्या भागाची सरासरी तारीख ${onset.significant ? 'सरकली आहे' : 'मोजता येण्याजोगी सरकलेली नाही'}. प्रत्यक्ष त्या आठवड्यात पेरायचं की नाही, हे ७ दिवसांच्या अंदाजावरून ठरतं — तो हवामान पानावर आहे.`,
              hi: `इस साल मानसून ठीक कब आएगा, यह हम नहीं बताते. कोई भी यक़ीन से नहीं बता सकता. हम सिर्फ़ यह मापते हैं कि ${onset.nYears} साल के रिकॉर्ड में आपके इलाक़े की औसत तारीख़ ${onset.significant ? 'खिसकी है' : 'मापने लायक नहीं खिसकी'}. उस हफ़्ते बोना है या नहीं, यह ७ दिन के अनुमान से तय होता है — वह मौसम पेज पर है.`,
              en: `We do not predict when this year’s monsoon will arrive. Nobody can do that reliably months ahead, and we do not claim to. What we measure is whether the average date for your block has moved across ${onset.nYears} years of record — here it ${onset.significant ? 'has' : 'has not, measurably'}. Whether to sow in a given week is decided by the 7-day forecast, on the weather screen.`,
            }[lang]
          }
        </p>
      </div>

      {/* what getting it wrong costs, which is the only reason any of this matters */}
      <div className="mt-3 rounded-[26px] bg-card px-5 py-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[13px] font-semibold uppercase tracking-[1.6px] text-faint">
            {t('whyItMatters')}
          </div>
          <SampleBadge>{t('sampleFlag')}</SampleBadge>
        </div>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
          {
            {
              // apposition again, not a possessive: "कांदा" + "मध्ये" gives
              // "कांदामध्ये" where correct Marathi is "कांद्यामध्ये"
              mr: `पाऊस येण्याआधी पेरलं तर बी कोरड्या जमिनीत सुकतं आणि दुबार पेरणी करावी लागते — बियाणं, मजुरी पुन्हा, आणि पीक उशिरा सुरू होतं. फार उशिरा पेरलं तर हंगाम संपेपर्यंत पीक तयार होत नाही. ${lead.name[lang]} — चांगलं वर्ष आणि वाईट वर्ष यातला फरक ${acres} एकरावर सुमारे ${rupees(gap)}.`,
              hi: `बारिश से पहले बो दिया तो बीज सूखी ज़मीन में मर जाता है और दोबारा बुवाई करनी पड़ती है — बीज, मज़दूरी फिर से, और फ़सल देर से शुरू होती है. बहुत देर से बोया तो मौसम ख़त्म होने तक फ़सल तैयार नहीं होती. ${lead.name[lang]} — अच्छे और ख़राब साल का अंतर ${acres} एकड़ पर लगभग ${rupees(gap)}.`,
              en: `Sow before the rain and the seed dies in dry soil — you resow, paying for seed and labour twice, and the crop starts weeks late. Sow far too late and it will not finish before the season ends. For ${lead.name[lang]}, the gap between a good year and a poor one on your ${acres} acres is about ${rupees(gap)}.`,
            }[lang]
          }
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          {
            {
              mr: 'हा रुपयांचा आकडा नमुना आहे — अजून CACP तक्त्यांवरून घेतलेला नाही. तारखेचं गणित मात्र खऱ्या IMD नोंदींवरून आहे.',
              hi: 'यह रुपये का आँकड़ा नमूना है — अभी CACP तालिकाओं से नहीं लिया गया. तारीख़ का हिसाब असली IMD रिकॉर्ड से है.',
              en: 'That rupee figure is a sample, not yet taken from CACP tables. The date arithmetic above is from the real IMD record.',
            }[lang]
          }
        </p>
      </div>
    </section>
  )
}
