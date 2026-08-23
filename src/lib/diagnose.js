import { DISEASE_MODEL, DISEASES, MIN_CONFIDENCE } from '../data/diseases.js'

/**
 * Leaf disease inference, in the browser.
 *
 * Runs entirely on the phone: the photo never leaves it. That is not a
 * performance choice, it is the same privacy line the rest of the app holds —
 * a farmer's field photo is his, and the federation model says models cross
 * borders while records do not.
 *
 * TensorFlow.js is LAZY-LOADED. It is roughly a megabyte, and the app claims
 * to work on 2G, so it must not sit in the initial bundle for the farmers who
 * never open this screen. It downloads the first time a photo is diagnosed and
 * the service worker caches it after that.
 *
 * If the model file is absent — which it is until someone runs
 * scripts/train_disease.py and drops the export into public/model/maize — every
 * entry point here returns { ok: false, reason: 'no-model' } and the screen
 * says so. It never falls back to a guess.
 */

let tfPromise = null
let modelPromise = null

async function getTf() {
  if (!tfPromise) tfPromise = import('@tensorflow/tfjs')
  return tfPromise
}

/**
 * Is a trained model actually deployed?
 *
 * Checking `res.ok` is NOT enough. A single-page app serves index.html for any
 * unknown path, so a missing model file comes back as 200 text/html and a
 * status check reports the model as present. The screen would then claim it can
 * diagnose and fail later with a parser error instead of saying the model is
 * not built. So we parse it and require it to look like a Keras manifest.
 */
let presence = null
export async function modelAvailable() {
  if (presence !== null) return presence
  try {
    const res = await fetch(DISEASE_MODEL.url)
    if (!res.ok) throw new Error('http ' + res.status)
    const j = await res.json() // throws on the HTML fallback
    presence = Boolean(j && (j.modelTopology || j.weightsManifest))
  } catch {
    presence = false
  }
  return presence
}

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await getTf()
      // A GRAPH model, not a layers model. The Keras-3 -> TF.js layers path
      // needs the tf_keras compatibility stack, so train_disease.py exports a
      // SavedModel and converts that instead. loadLayersModel cannot read it.
      return tf.loadGraphModel(DISEASE_MODEL.url)
    })()
  }
  return modelPromise
}

/**
 * Draw the image into a square canvas at the model's input size.
 * Centre-cropped, because a leaf photographed on a phone is usually centred and
 * squashing the aspect ratio distorts lesion shape, which is the feature that
 * separates a rust pustule from a blight lesion.
 */
function toSquareCanvas(img, size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const side = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height)
  const sx = ((img.naturalWidth || img.width) - side) / 2
  const sy = ((img.naturalHeight || img.height) - side) / 2
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  return canvas
}

/**
 * Classify one already-loaded <img>.
 * Returns { ok, id, confidence, ranked } or { ok: false, reason }.
 */
export async function diagnose(img) {
  if (!(await modelAvailable())) return { ok: false, reason: 'no-model' }

  let tf
  try {
    tf = await getTf()
  } catch {
    return { ok: false, reason: 'no-runtime' }
  }

  try {
    const model = await getModel()
    const canvas = toSquareCanvas(img, DISEASE_MODEL.input)

    // MobileNetV2 preprocessing: scale to [-1, 1]. Must match the training
    // script exactly or every prediction is quietly wrong.
    const x = tf.tidy(() =>
      tf.browser.fromPixels(canvas).toFloat().div(127.5).sub(1).expandDims(0),
    )
    const out = model.predict(x)
    const probs = await out.data()
    x.dispose()
    out.dispose()

    const ranked = Array.from(probs)
      .map((p, i) => ({ id: DISEASE_MODEL.classes[i], p }))
      .sort((a, b) => b.p - a.p)

    const top = ranked[0]
    return {
      ok: true,
      id: top.id,
      confidence: top.p,
      confident: top.p >= MIN_CONFIDENCE,
      ranked,
    }
  } catch (e) {
    return { ok: false, reason: 'failed', detail: String(e && e.message) }
  }
}

/**
 * Turn a diagnosis into money, which is the only form a farmer will act on.
 * Returns null for a healthy leaf — there is nothing at risk to report.
 */
export function costOf(id, crop, acres) {
  const d = DISEASES[id]
  if (!d || d.healthy) return null
  return {
    atRisk: Math.round(crop.SAMPLE_goodPerAcre * acres * d.SAMPLE_lossFraction),
    treatment: Math.round(d.SAMPLE_treatmentPerAcre * acres),
    days: d.actWithinDays,
  }
}
