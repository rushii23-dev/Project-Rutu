/**
 * ============================ SAMPLE DATA =================================
 * SAMPLE_CROPS holds placeholder agronomy and economics carried over from the
 * design mock. The sowing windows are plausible for Nashik, but the rupee
 * figures are NOT sourced — they have not been checked against CACP cost-of-
 * cultivation tables, state yield reports, or Agmarknet prices.
 *
 * The UI surfaces this: any screen showing money renders a "sample figures"
 * marker. Do not present these numbers as findings until this file is replaced
 * with sourced data.
 *
 * TODO: replace with sourced per-acre cost, yield and mandi price for Nashik.
 * ==========================================================================
 */

export const SEASON_KEYS = ['kharif', 'rabi', 'summer']

export const SAMPLE_CROPS = [
  {
    id: 'soy',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['सोयाबीन', 'सोयाबिन', 'soyabean'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: true, n: +2, om: +1, note: 'fix' },
    season: 'kharif',
    water: 'mid',
    duration: [95, 105],
    sow: { d: 13, m: 5 },
    window: { from: { d: 13, m: 5 }, to: { d: 22, m: 5 } },
    SAMPLE_goodPerAcre: 35000,
    SAMPLE_poorPerAcre: 26000,
    name: { mr: 'सोयाबीन', hi: 'सोयाबीन', en: 'Soybean' },
    badge: { mr: 'सर्वोत्तम', hi: 'सर्वोत्तम', en: 'Best match' },
    reason: {
      mr: 'लवकर पेरणीला सर्वात चांगला प्रतिसाद.',
      hi: 'जल्दी बुवाई पर सबसे अच्छा नतीजा.',
      en: 'Responds best to the earlier sowing date.',
    },
    windowNote: {
      mr: 'पहिल्या 50 मिमी पावसानंतर पेरा.',
      hi: 'पहली 50 मिमी बारिश के बाद बोएँ.',
      en: 'Sow after the first 50 mm of rain.',
    },
    reasons: [
      {
        mr: 'नवीन मान्सून तारखेशी सर्वात जुळणारं पीक.',
        hi: 'नई मानसून तारीख़ से सबसे मेल खाती फ़सल.',
        en: 'Best aligned with the corrected monsoon date.',
      },
      {
        mr: 'तुमच्या भागातील काळ्या जमिनीत चांगलं येतं.',
        hi: 'आपके इलाक़े की काली मिट्टी में अच्छा होता है.',
        en: 'Suits the black soils in your area.',
      },
      {
        mr: 'हमीभाव स्थिर, विक्रीसाठी नाशिकमध्ये बाजार आहे.',
        hi: 'समर्थन मूल्य स्थिर, नाशिक में बाज़ार है.',
        en: 'Stable support price, with a market in Nashik.',
      },
    ],
  },
  {
    id: 'maize',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['मक्या', 'मक्क', 'मकय', 'makka'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: false, n: -1, om: +2, note: 'residue' },
    season: 'kharif',
    water: 'mid',
    duration: [100, 110],
    sow: { d: 15, m: 5 },
    window: { from: { d: 15, m: 5 }, to: { d: 25, m: 5 } },
    SAMPLE_goodPerAcre: 30500,
    SAMPLE_poorPerAcre: 22000,
    name: { mr: 'मका', hi: 'मक्का', en: 'Maize' },
    badge: { mr: 'खात्रीचं', hi: 'भरोसेमंद', en: 'Reliable' },
    reason: {
      mr: 'कमी पावसातही तग धरतं.',
      hi: 'कम बारिश में भी टिकता है.',
      en: 'Holds up even in a poor rain year.',
    },
    windowNote: {
      mr: 'जमिनीत ओल असल्यास लगेच पेरा.',
      hi: 'ज़मीन में नमी हो तो तुरंत बोएँ.',
      en: 'Sow immediately if the soil holds moisture.',
    },
    reasons: [
      {
        mr: 'पावसाचा खंड पडला तरी उत्पादन टिकतं.',
        hi: 'बारिश रुक जाए तब भी उपज बनी रहती है.',
        en: 'Yield survives a break in the rains.',
      },
      {
        mr: 'चारा म्हणूनही उपयोग, दुहेरी उत्पन्न.',
        hi: 'चारे के रूप में भी उपयोगी, दोहरी आमदनी.',
        en: 'Doubles as fodder — two income streams.',
      },
      {
        mr: 'ऑक्टोबरमध्ये काढणी, रब्बीला वेळ मिळतो.',
        hi: 'अक्तूबर में कटाई, रबी के लिए समय मिलता है.',
        en: 'Harvest in October leaves time for rabi.',
      },
    ],
  },
  {
    id: 'bajra',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['बाजरी', 'बाजरा', 'बाजऱ्या'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: false, n: -1, om: +1, note: 'residue' },
    season: 'kharif',
    water: 'low',
    duration: [80, 90],
    sow: { d: 18, m: 5 },
    window: { from: { d: 18, m: 5 }, to: { d: 30, m: 5 } },
    SAMPLE_goodPerAcre: 19500,
    SAMPLE_poorPerAcre: 14000,
    name: { mr: 'बाजरी', hi: 'बाजरा', en: 'Pearl millet' },
    badge: { mr: 'कमी पाणी', hi: 'कम पानी', en: 'Low water' },
    reason: {
      mr: 'पाणी कमी असल्यास सुरक्षित पर्याय.',
      hi: 'पानी कम हो तो सुरक्षित विकल्प.',
      en: 'The safe option when water is short.',
    },
    windowNote: {
      mr: 'उशिरा पेरणीलाही चालतं.',
      hi: 'देर से बुवाई पर भी चलता है.',
      en: 'Tolerates late sowing.',
    },
    reasons: [
      {
        mr: 'सर्वात कमी पाण्यात येणारं पीक.',
        hi: 'सबसे कम पानी में होने वाली फ़सल.',
        en: 'Needs the least water of any crop here.',
      },
      {
        mr: '80 दिवसांत तयार, धोका कमी.',
        hi: '80 दिन में तैयार, जोखिम कम.',
        en: 'Ready in 80 days, so less exposure.',
      },
      {
        mr: 'घरच्या वापरासाठी आणि विक्रीसाठी दोन्ही.',
        hi: 'घर के इस्तेमाल और बिक्री दोनों के लिए.',
        en: 'Good for both home use and sale.',
      },
    ],
  },
  {
    id: 'cotton',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['कापस', 'कापसा', 'कपास', 'कपास'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: false, n: -2, om: -1, note: 'heavy' },
    season: 'kharif',
    water: 'high',
    duration: [160, 180],
    sow: { d: 13, m: 5 },
    window: { from: { d: 13, m: 5 }, to: { d: 20, m: 5 } },
    SAMPLE_goodPerAcre: 46500,
    SAMPLE_poorPerAcre: 31500,
    name: { mr: 'कापूस', hi: 'कपास', en: 'Cotton' },
    badge: { mr: 'जास्त पाणी', hi: 'ज़्यादा पानी', en: 'High water' },
    reason: {
      mr: 'पाण्याची सोय असल्यास सर्वाधिक उत्पन्न.',
      hi: 'पानी की सुविधा हो तो सबसे ज़्यादा आमदनी.',
      en: 'Highest income if you have assured water.',
    },
    windowNote: {
      mr: 'पाण्याची खात्री असेल तरच पेरा.',
      hi: 'पानी की गारंटी हो तभी बोएँ.',
      en: 'Sow only if water is guaranteed.',
    },
    reasons: [
      {
        mr: 'तुमच्या जमिनीत सर्वाधिक उत्पन्नाची शक्यता.',
        hi: 'आपकी ज़मीन पर सबसे ज़्यादा आमदनी की संभावना.',
        en: 'The highest income potential on your land.',
      },
      {
        mr: 'लांब हंगाम — पाणी शेवटपर्यंत लागतं.',
        hi: 'लंबा मौसम — आख़िर तक पानी चाहिए.',
        en: 'Long season — needs water right to the end.',
      },
      {
        mr: 'बाजारभाव चढउतार होतो, धोका जास्त.',
        hi: 'बाज़ार भाव ऊपर-नीचे होता है, जोखिम ज़्यादा.',
        en: 'Prices swing, so the risk is higher.',
      },
    ],
  },
  {
    id: 'wheat',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['गव्ह', 'गव्हा', 'गेहूं', 'गेहू', 'गेहु'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: false, n: -1, om: +1, note: 'residue' },
    season: 'rabi',
    water: 'mid',
    duration: [110, 120],
    sow: { d: 5, m: 10 },
    window: { from: { d: 5, m: 10 }, to: { d: 20, m: 10 } },
    SAMPLE_goodPerAcre: 26500,
    SAMPLE_poorPerAcre: 19500,
    name: { mr: 'गहू', hi: 'गेहूँ', en: 'Wheat' },
    badge: { mr: 'खात्रीचं', hi: 'भरोसेमंद', en: 'Reliable' },
    reason: {
      mr: 'खरिपानंतर सुरक्षित दुसरं पीक.',
      hi: 'खरीफ़ के बाद सुरक्षित दूसरी फ़सल.',
      en: 'A safe second crop after kharif.',
    },
    windowNote: {
      mr: 'थंडी सुरू झाल्यावर पेरा.',
      hi: 'ठंड शुरू होने पर बोएँ.',
      en: 'Sow once the cold sets in.',
    },
    reasons: [
      {
        mr: 'खरीप काढणीनंतर जमीन तयार असते.',
        hi: 'खरीफ़ कटाई के बाद ज़मीन तैयार रहती है.',
        en: 'The land is ready after the kharif harvest.',
      },
      {
        mr: 'तीन पाण्यांत उत्पादन मिळतं.',
        hi: 'तीन सिंचाई में उपज मिल जाती है.',
        en: 'Produces on three irrigations.',
      },
      {
        mr: 'घरच्या धान्याची गरज भागते.',
        hi: 'घर के अनाज की ज़रूरत पूरी होती है.',
        en: 'Covers the household grain requirement.',
      },
    ],
  },
  {
    id: 'gram',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['हरभर', 'हरभऱ्या', 'चन्या', 'चने'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: true, n: +2, om: +1, note: 'fix' },
    season: 'rabi',
    water: 'low',
    duration: [95, 105],
    sow: { d: 10, m: 10 },
    window: { from: { d: 10, m: 10 }, to: { d: 25, m: 10 } },
    SAMPLE_goodPerAcre: 24500,
    SAMPLE_poorPerAcre: 17500,
    name: { mr: 'हरभरा', hi: 'चना', en: 'Chickpea' },
    badge: { mr: 'कमी पाणी', hi: 'कम पानी', en: 'Low water' },
    reason: {
      mr: 'ओलाव्यावर येणारं डाळवर्गीय पीक.',
      hi: 'नमी पर होने वाली दलहनी फ़सल.',
      en: 'A pulse that grows on residual moisture.',
    },
    windowNote: {
      mr: 'जमिनीतल्या ओलाव्यावर येतं.',
      hi: 'ज़मीन की नमी पर हो जाता है.',
      en: 'Grows on soil moisture alone.',
    },
    reasons: [
      {
        mr: 'फक्त एक-दोन पाण्यांत येतं.',
        hi: 'सिर्फ़ एक-दो सिंचाई में हो जाता है.',
        en: 'Needs only one or two irrigations.',
      },
      {
        mr: 'जमिनीचा कस वाढवतं.',
        hi: 'ज़मीन की उर्वरता बढ़ाता है.',
        en: 'Improves soil fertility for the next crop.',
      },
      {
        mr: 'डाळीचा भाव टिकून आहे.',
        hi: 'दाल का भाव टिका हुआ है.',
        en: 'Pulse prices have held steady.',
      },
    ],
  },
  {
    id: 'onion',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['कांद', 'कांद्या', 'प्याज', 'प्याज़', 'पयाज'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: false, n: -2, om: -1, note: 'heavy' },
    season: 'rabi',
    water: 'high',
    duration: [120, 130],
    sow: { d: 15, m: 10 },
    window: { from: { d: 15, m: 10 }, to: { d: 5, m: 11 } },
    SAMPLE_goodPerAcre: 53500,
    SAMPLE_poorPerAcre: 28500,
    name: { mr: 'कांदा', hi: 'प्याज़', en: 'Onion' },
    badge: { mr: 'नाशिकचं पीक', hi: 'नाशिक की फ़सल', en: "Nashik's crop" },
    reason: {
      mr: 'भाव चढउतार, पण नाशिकची बाजारपेठ जवळ.',
      hi: 'भाव ऊपर-नीचे, पर नाशिक की मंडी पास है.',
      en: 'Volatile prices, but the Nashik market is close.',
    },
    windowNote: {
      mr: 'रोपवाटिका ऑक्टोबरमध्ये टाका.',
      hi: 'नर्सरी अक्तूबर में डालें.',
      en: 'Start the nursery in October.',
    },
    reasons: [
      {
        mr: 'लासलगाव बाजार जवळ, वाहतूक कमी.',
        hi: 'लासलगाँव मंडी पास, ढुलाई कम.',
        en: 'Lasalgaon market is close — low transport cost.',
      },
      {
        mr: 'साठवणुकीची सोय असल्यास भाव मिळतो.',
        hi: 'भंडारण की सुविधा हो तो भाव मिलता है.',
        en: 'With storage, you can wait for a better price.',
      },
      {
        mr: 'पाणी आणि मजूर दोन्ही जास्त लागतात.',
        hi: 'पानी और मज़दूर दोनों ज़्यादा लगते हैं.',
        en: 'Demands both more water and more labour.',
      },
    ],
  },
  {
    id: 'ground',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['भुईमुग', 'भुईमुगा', 'भुइमूग', 'मूंगफली', 'मुंगफली'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: true, n: +2, om: +1, note: 'fix' },
    season: 'summer',
    water: 'mid',
    duration: [105, 115],
    sow: { d: 20, m: 0 },
    window: { from: { d: 20, m: 0 }, to: { d: 10, m: 1 } },
    SAMPLE_goodPerAcre: 23500,
    SAMPLE_poorPerAcre: 16000,
    name: { mr: 'भुईमूग', hi: 'मूँगफली', en: 'Groundnut' },
    badge: { mr: 'तेलबिया', hi: 'तिलहन', en: 'Oilseed' },
    reason: {
      mr: 'विहिरीला पाणी असल्यास तिसरं पीक.',
      hi: 'कुएँ में पानी हो तो तीसरी फ़सल.',
      en: 'A third crop if the well still has water.',
    },
    windowNote: {
      mr: 'विहिरीचं पाणी पुरेल तरच घ्या.',
      hi: 'कुएँ का पानी पर्याप्त हो तभी लें.',
      en: 'Only take it on if well water will last.',
    },
    reasons: [
      {
        mr: 'उन्हाळी हंगामात मोकळी जमीन वापरता येते.',
        hi: 'गर्मी में खाली ज़मीन का उपयोग हो जाता है.',
        en: 'Uses land that would otherwise sit idle.',
      },
      {
        mr: 'तेलबिया, घरच्या वापरासाठीही उपयोगी.',
        hi: 'तिलहन, घर के इस्तेमाल के लिए भी उपयोगी.',
        en: 'An oilseed, also useful at home.',
      },
      {
        mr: 'नत्र स्थिर करून पुढच्या पिकाला फायदा.',
        hi: 'नाइट्रोजन स्थिर कर अगली फ़सल को फ़ायदा.',
        en: 'Fixes nitrogen, benefiting the next crop.',
      },
    ],
  },
  {
    id: 'moong',
    // oblique/possessive forms — Devanagari changes the stem, not just
    // the ending, so these are matched explicitly. See lib/ask.js.
    aliases: ['मुगा', 'मुग', 'मूंग', 'मूग'],
    // soil effect: nitrogen balance and organic-matter contribution.
    // Crop-type agronomy, not a measurement -- see rotation.js.
    soil: { legume: true, n: +1, om: +1, note: 'fix' },
    season: 'summer',
    water: 'low',
    duration: [65, 75],
    sow: { d: 1, m: 1 },
    window: { from: { d: 1, m: 1 }, to: { d: 15, m: 1 } },
    SAMPLE_goodPerAcre: 13500,
    SAMPLE_poorPerAcre: 9500,
    name: { mr: 'मूग', hi: 'मूंग', en: 'Green gram' },
    badge: { mr: 'लवकर', hi: 'जल्दी', en: 'Quick' },
    reason: {
      mr: '70 दिवसांत तयार होणारं छोटं पीक.',
      hi: '70 दिन में तैयार होने वाली छोटी फ़सल.',
      en: 'A short crop, ready in 70 days.',
    },
    windowNote: {
      mr: 'उन्हाळा तीव्र होण्यापूर्वी काढणी.',
      hi: 'गर्मी तेज़ होने से पहले कटाई.',
      en: 'Harvest before the heat peaks.',
    },
    reasons: [
      {
        mr: 'सर्वात कमी कालावधीचं पीक.',
        hi: 'सबसे कम अवधि की फ़सल.',
        en: 'The shortest-duration crop available.',
      },
      {
        mr: 'दोन पाण्यांत निघतं.',
        hi: 'दो सिंचाई में निकल जाती है.',
        en: 'Comes through on two irrigations.',
      },
      {
        mr: 'जमीन खरिपासाठी वेळेत मोकळी होते.',
        hi: 'ज़मीन खरीफ़ के लिए समय पर खाली हो जाती है.',
        en: 'Frees the land in time for kharif.',
      },
    ],
  },
]

export function cropById(id) {
  return SAMPLE_CROPS.find((c) => c.id === id) || SAMPLE_CROPS[0]
}
