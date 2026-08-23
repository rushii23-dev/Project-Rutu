"""Train the maize leaf disease classifier and export it for the browser.

WHY ONLY MAIZE
PlantVillage is the only free labelled leaf dataset we can use, and it covers
14 plants in 38 classes. RITU carries 9 crops. The overlap with any *disease*
class is exactly one: maize (4 classes -- gray leaf spot, common rust, northern
leaf blight, healthy). Soybean appears only as "healthy"; bajra, cotton, wheat,
gram, onion, groundnut and moong are absent. So this trains maize, and the app
refuses every other crop rather than pretending.

ON THE ACCURACY NUMBER THIS PRINTS
PlantVillage images are laboratory photographs: one detached leaf, plain
background, even lighting. Models trained on it reach very high test accuracy
on a random split and then fall over on real field photos, which contain soil,
shadow, several overlapping leaves and a phone camera. Worse, the dataset's
images come from a small number of source plants, so a random split puts near
duplicate photographs of the SAME leaf in train and test, which inflates the
number further.

So the score below is an upper bound under laboratory conditions. It is not a
field accuracy and must never be quoted as one. That caveat is printed on the
diagnosis screen itself, not just here.

USAGE
  Colab (recommended -- free GPU, about ten minutes):
      !git clone --filter=blob:none --sparse https://github.com/spMohanty/PlantVillage-Dataset
      %cd PlantVillage-Dataset && !git sparse-checkout set raw/color && %cd ..
      !pip install tensorflowjs
      !python train_disease.py --data PlantVillage-Dataset/raw/color

  Then copy the exported folder to  public/model/maize/  in this repo.
"""
import argparse, json, os, shutil, sys

CLASSES = [
    ("gray_leaf_spot", "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot"),
    ("common_rust", "Corn_(maize)___Common_rust_"),
    ("northern_leaf_blight", "Corn_(maize)___Northern_Leaf_Blight"),
    ("healthy", "Corn_(maize)___healthy"),
]
SIZE = 224
SEED = 1337


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="PlantVillage raw/color directory")
    ap.add_argument("--out", default="public/model/maize")
    ap.add_argument("--epochs", type=int, default=6)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--limit", type=int, default=0,
                    help="cap images per class (0 = use all); lower it on CPU")
    args = ap.parse_args()

    import tensorflow as tf
    from tensorflow import keras

    # ---- assemble the file list ourselves, so class order is OURS and
    # matches DISEASE_MODEL.classes in src/data/diseases.js exactly.
    paths, labels = [], []
    for idx, (name, folder) in enumerate(CLASSES):
        d = os.path.join(args.data, folder)
        if not os.path.isdir(d):
            sys.exit(f"missing class directory:\n  {d}")
        fs = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".jpeg", ".png")))
        if args.limit:
            fs = fs[: args.limit]
        paths += [os.path.join(d, f) for f in fs]
        labels += [idx] * len(fs)
        print(f"  {name:22} {len(fs):5} images")
    print(f"  {'total':22} {len(paths):5}\n")

    ds = tf.data.Dataset.from_tensor_slices((paths, labels))
    ds = ds.shuffle(len(paths), seed=SEED, reshuffle_each_iteration=False)
    n_val = int(len(paths) * 0.2)
    val_raw, train_raw = ds.take(n_val), ds.skip(n_val)

    def load(p, y):
        img = tf.io.decode_image(tf.io.read_file(p), channels=3, expand_animations=False)
        img = tf.image.resize(img, [SIZE, SIZE])
        # MobileNetV2 preprocessing: [-1, 1]. src/lib/diagnose.js does the same
        # arithmetic in the browser; if one changes, both must.
        return (tf.cast(img, tf.float32) / 127.5) - 1.0, y

    aug = keras.Sequential([
        keras.layers.RandomFlip("horizontal"),
        keras.layers.RandomRotation(0.15),
        keras.layers.RandomZoom(0.15),
        keras.layers.RandomContrast(0.15),
    ], name="aug")

    AUTO = tf.data.AUTOTUNE
    train = (train_raw.map(load, num_parallel_calls=AUTO)
             .map(lambda x, y: (aug(x, training=True), y), num_parallel_calls=AUTO)
             .batch(args.batch).prefetch(AUTO))
    val = val_raw.map(load, num_parallel_calls=AUTO).batch(args.batch).prefetch(AUTO)

    base = keras.applications.MobileNetV2(
        input_shape=(SIZE, SIZE, 3), include_top=False, weights="imagenet")
    base.trainable = False                       # transfer learning only

    model = keras.Sequential([
        keras.layers.Input((SIZE, SIZE, 3)),
        base,
        keras.layers.GlobalAveragePooling2D(),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(len(CLASSES), activation="softmax"),
    ])
    model.compile(optimizer=keras.optimizers.Adam(1e-3),
                  loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train, validation_data=val, epochs=args.epochs, verbose=2)

    # ---- honest evaluation: per-class recall and a confusion matrix ------
    import numpy as np
    y_true = np.concatenate([y.numpy() for _, y in val])
    y_pred = np.argmax(model.predict(val, verbose=0), axis=1)
    acc = float((y_true == y_pred).mean())
    cm = tf.math.confusion_matrix(y_true, y_pred, num_classes=len(CLASSES)).numpy()

    print(f"\nheld-out accuracy: {acc:.4f}   (laboratory upper bound, NOT field accuracy)")
    print("\nconfusion matrix (rows = truth, cols = predicted)")
    names = [c[0] for c in CLASSES]
    print(f"{'':24}" + "".join(f"{n[:12]:>14}" for n in names))
    for i, n in enumerate(names):
        print(f"{n:24}" + "".join(f"{v:>14}" for v in cm[i]))
    print("\nper-class recall")
    for i, n in enumerate(names):
        tot = cm[i].sum()
        print(f"  {n:24} {cm[i][i] / tot:.3f}  (n={tot})")

    # ---- export for the browser ----------------------------------------
    out = os.path.abspath(args.out)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out, exist_ok=True)
    try:
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(model, out)
        print(f"\nexported TF.js model -> {out}")
    except ImportError:
        keras_path = out + ".keras"
        model.save(keras_path)
        print(f"\ntensorflowjs not installed. Saved {keras_path}")
        print("Convert it with:")
        print("  pip install tensorflowjs")
        print(f"  tensorflowjs_converter --input_format keras {keras_path} {out}")

    with open(os.path.join(out, "metrics.json"), "w") as f:
        json.dump({
            "classes": names,
            "heldOutAccuracy": round(acc, 4),
            "perClassRecall": {n: round(float(cm[i][i] / cm[i].sum()), 4)
                               for i, n in enumerate(names)},
            "confusionMatrix": cm.tolist(),
            "trainedOn": "PlantVillage Corn/maize subset (laboratory images)",
            "caveat": ("Random split of laboratory photographs. Overstates field "
                       "accuracy; not validated on Indian field images."),
        }, f, indent=1)
    print("wrote metrics.json beside the model")


if __name__ == "__main__":
    main()
