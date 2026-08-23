/**
 * Leaf disease reference for the diagnostic.
 *
 * ===================== SCOPE, STATED UP FRONT =========================
 * PlantVillage — the only free labelled leaf dataset we can train on — covers
 * 14 plants in 38 classes. RITU carries 9 crops. The overlap with any DISEASE
 * class is exactly one: maize.
 *
 *   maize  -> Corn_(maize)___ 4 classes. Real coverage, used here.
 *   soy    -> Soybean___healthy ONLY. There is no soybean disease class, so we
 *             cannot diagnose soybean and do not pretend to.
 *   bajra, cotton, wheat, gram, onion, groundnut, moong -> absent entirely.
 *
 * So the diagnostic is offered for maize and refused for everything else. The
 * interface says which, in the farmer's language. Widening it needs field-
 * collected Indian images for those crops, which is a data problem, not a
 * modelling one.
 * ======================================================================
 *
 * The rupee figures below are SAMPLE_ prefixed because they are not sourced.
 * Yield-loss fractions and spray costs vary by variety, growth stage and
 * local input prices, and we have not taken them from a state package of
 * practices. The interface badges them. The disease names, symptoms and
 * treatment classes are ordinary maize agronomy and are not invented.
 */

export const DISEASE_MODEL = {
  crop: 'maize',
  input: 224,
  url: '/model/maize/model.json',
  // order must match the training script's class ordering
  classes: ['gray_leaf_spot', 'common_rust', 'northern_leaf_blight', 'healthy'],
  source: 'PlantVillage (Corn/maize subset)',
}

/**
 * Below this the model is not confident enough to say anything useful, and the
 * screen shows "not sure" instead of a diagnosis. A wrong confident answer
 * costs a farmer a spray he did not need.
 */
export const MIN_CONFIDENCE = 0.6

export const DISEASES = {
  gray_leaf_spot: {
    healthy: false,
    name: {
      mr: 'करपा (ग्रे लीफ स्पॉट)',
      hi: 'ग्रे लीफ स्पॉट',
      en: 'Gray leaf spot',
    },
    looks: {
      mr: 'पानावर लांबट, राखाडी-तपकिरी पट्टे, शिरांच्या मधोमध सरळ रेषेत.',
      hi: 'पत्ती पर लंबे, स्लेटी-भूरे धब्बे, नसों के बीच सीधी रेखा में.',
      en: 'Long grey-brown rectangular lesions running straight between the leaf veins.',
    },
    treatment: {
      mr: 'बुरशीनाशक फवारणी. पुढच्या हंगामात फेरपालट करा आणि धसकटं जाळू नका, गाडा.',
      hi: 'फफूँदीनाशक छिड़काव. अगले मौसम में फ़सल चक्र अपनाएँ और ठूँठ जलाएँ नहीं, दबाएँ.',
      en: 'A fungicide spray. Rotate next season and bury the stubble rather than burning it.',
    },
    SAMPLE_lossFraction: 0.25,
    SAMPLE_treatmentPerAcre: 1100,
    actWithinDays: 4,
  },
  common_rust: {
    healthy: false,
    name: {
      mr: 'तांबेरा',
      hi: 'रस्ट (गेरुआ)',
      en: 'Common rust',
    },
    looks: {
      mr: 'पानाच्या दोन्ही बाजूंना तांबूस-तपकिरी फोड, बोटाने घासल्यास भुकटी लागते.',
      hi: 'पत्ती के दोनों ओर लाल-भूरे फफोले, उँगली से रगड़ने पर पाउडर लगता है.',
      en: 'Reddish-brown powdery pustules on both leaf surfaces that rub off on a finger.',
    },
    treatment: {
      mr: 'लवकर लक्षात आल्यास बुरशीनाशक पुरेसं. पुढच्या वर्षी प्रतिकारक वाण घ्या.',
      hi: 'जल्दी पकड़ में आए तो फफूँदीनाशक काफ़ी है. अगले साल प्रतिरोधी क़िस्म लें.',
      en: 'A fungicide is usually enough if caught early. Choose a resistant variety next year.',
    },
    SAMPLE_lossFraction: 0.15,
    SAMPLE_treatmentPerAcre: 850,
    actWithinDays: 7,
  },
  northern_leaf_blight: {
    healthy: false,
    name: {
      mr: 'उत्तरी करपा',
      hi: 'नॉर्दर्न लीफ ब्लाइट',
      en: 'Northern leaf blight',
    },
    looks: {
      mr: 'लांब, सिगारसारखे राखाडी-हिरवे डाग, खालच्या पानांपासून वर पसरतात.',
      hi: 'लंबे, सिगार जैसे स्लेटी-हरे धब्बे, नीचे की पत्तियों से ऊपर फैलते हैं.',
      en: 'Long cigar-shaped grey-green lesions, spreading upward from the lower leaves.',
    },
    treatment: {
      mr: 'तातडीने बुरशीनाशक. कणसं भरण्याच्या आधी पसरलं तर नुकसान मोठं होतं.',
      hi: 'तुरंत फफूँदीनाशक. दाना भरने से पहले फैल गया तो नुक़सान बड़ा होता है.',
      en: 'Spray promptly. If it spreads before grain fill the loss is much larger.',
    },
    SAMPLE_lossFraction: 0.3,
    SAMPLE_treatmentPerAcre: 1250,
    actWithinDays: 3,
  },
  healthy: {
    healthy: true,
    name: {
      mr: 'पान निरोगी दिसतं',
      hi: 'पत्ती स्वस्थ दिखती है',
      en: 'The leaf looks healthy',
    },
    looks: {
      mr: 'या पानावर रोगाची लक्षणं दिसत नाहीत.',
      hi: 'इस पत्ती पर रोग के लक्षण नहीं दिखते.',
      en: 'No disease symptoms are visible on this leaf.',
    },
    treatment: {
      mr: 'काही करायची गरज नाही. एक पान म्हणजे पूर्ण शेत नाही — आठवड्याने पुन्हा पहा.',
      hi: 'कुछ करने की ज़रूरत नहीं. एक पत्ती पूरा खेत नहीं — हफ़्ते बाद फिर देखें.',
      en: 'Nothing to do. One leaf is not the whole field — check again in a week.',
    },
    SAMPLE_lossFraction: 0,
    SAMPLE_treatmentPerAcre: 0,
    actWithinDays: 0,
  },
}

/** Crops we can and cannot diagnose, so the UI never has to guess. */
export function canDiagnose(cropId) {
  return cropId === DISEASE_MODEL.crop
}
