"""Precompute a MODIS NDVI seasonal profile and two hero images for Nashik.

Source: NASA GIBS (Global Imagery Browse Services) — public, no API key, no
account. Layer MODIS_Terra_NDVI_8Day, served over WMS.

Per the project's scope rules this is PRECOMPUTED, not live: the app ships two
static images and a small JSON series, so it still works offline on 2G.

An honest limitation, measured rather than assumed: MODIS is an optical sensor
and cannot see through monsoon cloud. The script records the cloud/no-data
fraction for every date so the interface can say which readings are obscured
instead of quietly plotting them.

Usage:  python scripts/fetch_satellite_ndvi.py
"""
import datetime, json, os, shutil, sys, urllib.request, urllib.parse
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "public/satellite")
OUT_JSON = os.path.join(ROOT, "src/data/ndvi.json")

WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
LAYER = "MODIS_Terra_NDVI_8Day"

# Nashik district bounding box (lon_min, lat_min, lon_max, lat_max)
BBOX = "73.0,19.4,74.9,20.9"


def rolling_dates(today, days=365, lag=16):
    """Fortnightly composite dates covering the last year, oldest first.

    MODIS 8-day composites start on day-of-year 1, 9, 17, ... every year; every
    second one gives a fortnightly series. A composite is only published some
    days after its 8-day period closes, so the newest `lag` days are skipped
    rather than recorded as missing.
    """
    out = []
    for year in (today.year - 1, today.year):
        for doy in range(1, 366, 16):
            d = datetime.date(year, 1, 1) + datetime.timedelta(days=doy - 1)
            if today - datetime.timedelta(days=days) <= d <= today - datetime.timedelta(days=lag):
                out.append(d.isoformat())
    return out


# a rolling cropping year, so a weekly run always shows the latest one
DATES = rolling_dates(datetime.date.today())

# The two frames shown side by side are CHOSEN FROM THE DATA: the barest clear
# reading before the monsoon and the greenest after it. Hand-picked dates went
# stale, and once showed a 9 May image beside 25 May's greenness figure.
# The dry frame is labelled "before sowing", so it is never taken from June:
# in an early-onset district June can already be sown.
DRY_MONTHS = (3, 4, 5)
PEAK_MONTHS = (8, 9, 10, 11, 12)
MIN_USABLE = 8  # fewer clear readings than this and the year is not worth shipping


def fetch(date, width, height, path):
    q = urllib.parse.urlencode({
        "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap",
        "LAYERS": LAYER, "STYLES": "", "SRS": "EPSG:4326",
        "BBOX": BBOX, "WIDTH": width, "HEIGHT": height,
        "FORMAT": "image/png", "TIME": date,
    })
    urllib.request.urlretrieve(WMS + "?" + q, path)
    return path


def measure(path):
    """Greenness index and obscured fraction for one NDVI composite.

    The GIBS NDVI palette runs tan (bare soil) through to deep green (dense
    vegetation), so green-minus-red tracks NDVI monotonically.

    Two things are excluded, and the distinction matters:
      - TRANSPARENT pixels mean GIBS has no composite for that date at all.
        A frame that is entirely transparent is not a reading of zero
        greenness, it is the absence of a reading, and returns None.
      - Grey/near-white opaque pixels are cloud in the composite.
    """
    a = np.asarray(Image.open(path).convert("RGBA")).astype(float)
    r, g, b, alpha = a[..., 0], a[..., 1], a[..., 2], a[..., 3]

    present = alpha > 200
    if present.mean() < 0.05:
        return None, 1.0, 0.0  # no composite published for this date

    cloud = present & (abs(r - g) < 12) & (abs(g - b) < 12) & (r > 150)
    usable = present & ~cloud
    idx = float((g - r)[usable].mean()) if usable.any() else None
    # cloud as a share of the area GIBS actually published
    obscured = float(cloud.sum() / max(present.sum(), 1))
    return idx, obscured, float(present.mean())


os.makedirs(IMG_DIR, exist_ok=True)
tmp = os.path.join(IMG_DIR, "_probe.png")

series = []
for d in DATES:
    try:
        fetch(d, 420, 340, tmp)
        idx, cloud, coverage = measure(tmp)
    except Exception as e:
        print(f"  {d}: {type(e).__name__} — skipped")
        continue
    if idx is None:
        series.append({"date": d, "index": None, "cloud": None,
                       "coverage": round(coverage * 100, 1), "reliable": False,
                       "status": "no-composite"})
        print(f"  {d}  NO COMPOSITE PUBLISHED — excluded")
        continue

    reliable = cloud < 0.33
    series.append({
        "date": d,
        "index": round(idx, 1),
        "cloud": round(cloud * 100, 1),
        "coverage": round(coverage * 100, 1),
        # a reading more than a third obscured is not evidence of anything
        "reliable": reliable,
        "status": "ok" if reliable else "cloudy",
    })
    flag = "" if reliable else "   <- obscured by cloud"
    print(f"  {d}  index={idx:6.1f}  cloud={cloud*100:5.1f}%{flag}")

if os.path.exists(tmp):
    os.remove(tmp)

valid = [s for s in series if s["reliable"] and s["index"] is not None]


def pick(months, best):
    """The extreme clear reading inside the given months, else across the year."""
    inside = [s for s in valid if int(s["date"][5:7]) in months]
    return best(inside or valid, key=lambda s: s["index"])


# Guard before touching anything on disk: GIBS outages come back as blank
# tiles, which would otherwise replace a good year with an empty one.
if len(valid) < MIN_USABLE and "--force" not in sys.argv:
    print(f"\nABORTED: only {len(valid)} clear readings (need {MIN_USABLE}). {OUT_JSON} and images left untouched.")
    raise SystemExit(2)

lo = pick(DRY_MONTHS, min)
hi = pick(PEAK_MONTHS, max)
HERO = {"dry": lo["date"], "peak": hi["date"]}

# hero frames, larger and optimised for shipping. Written to a temporary name
# first, so a failed download cannot leave a half-written image in the app.
for key, date in HERO.items():
    path = os.path.join(IMG_DIR, f"nashik_{key}.png")
    part = path + ".part"
    fetch(date, 560, 440, part)
    im = Image.open(part).convert("P", palette=Image.ADAPTIVE, colors=64)
    im.save(part, format="PNG", optimize=True)
    shutil.move(part, path)
    print(f"  hero {key:5} {date}  {os.path.getsize(path)//1024} KB")

payload = {
    "source": {
        "name": "MODIS Terra NDVI 8-day via NASA GIBS",
        "layer": LAYER,
        "url": "https://gibs.earthdata.nasa.gov",
        "bbox": BBOX,
        "district": "Nashik",
        "note": "Precomputed weekly by a scheduled job over the last 12 months. "
                "MODIS is optical and cannot see through monsoon cloud; obscured "
                "dates are flagged and excluded from the summary.",
        "fetched": datetime.date.today().isoformat(),
    },
    "hero": {
        "dry": {"date": HERO["dry"], "img": "/satellite/nashik_dry.png"},
        "peak": {"date": HERO["peak"], "img": "/satellite/nashik_peak.png"},
    },
    "extremes": {"low": lo, "high": hi},
    "series": series,
}
json.dump(payload, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

print(f"\nwrote {OUT_JSON}")
nodata = [s for s in series if s.get("status") == "no-composite"]
cloudy = [s for s in series if s.get("status") == "cloudy"]
print(f"  {len(series)} dates, {len(valid)} usable, "
      f"{len(cloudy)} cloud-obscured, {len(nodata)} with no composite")
print(f"  lowest  {lo['date']}  index {lo['index']}")
print(f"  highest {hi['date']}  index {hi['index']}")
