"""Precompute real mandi prices into src/data/prices.json.

Runs on a developer machine, never in the browser: the data.gov.in key stays out
of the client bundle, the app keeps working offline on 2G, and there is no CORS
problem. Same pattern as the IMD download.

Prices are Agmarknet modal prices in rupees per quintal (100 kg).

Usage:  python fetch_prices.py
"""
import json, os, sys, time, urllib.parse, urllib.request, datetime, statistics, collections

ROOT = r"D:/Project RITU"
OUT = os.path.join(ROOT, "src/data/prices.json")
RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"
BASE = "https://api.data.gov.in/resource/" + RESOURCE

# Agmarknet's commodity spellings -> our crop ids. Grounded in what the API
# actually returned for Maharashtra, not guessed.
COMMODITY_TO_CROP = {
    "Soyabean": "soy",
    "Maize": "maize",
    "Bajra(Pearl Millet/Cumbu)": "bajra",
    "Cotton": "cotton",
    "Kapas": "cotton",
    "Wheat": "wheat",
    "Bengal Gram(Gram)(Whole)": "gram",
    "Bengal Gram Dal (Chana Dal)": "gram",
    "Onion": "onion",
    "Groundnut": "ground",
    "Groundnut (Split)": "ground",
    "Green Gram (Moong)(Whole)": "moong",
    "Green Gram Dal (Moong Dal)": "moong",
}

# Agmarknet still uses several pre-rename district spellings. Each of ours maps
# to the candidates worth trying, first hit wins.
ALIASES = {
    "Ch.Sambhajinagar": ["Chhatrapati Sambhajinagar", "Aurangabad"],
    "Dharashiv": ["Dharashiv(Usmanabad)", "Osmanabad", "Usmanabad"],
    "Ahmednagar": ["Ahmednagar", "Ahilyanagar"],
    "Mumbai City": ["Mumbai"],
    "Mumbai Suburban": ["Mumbai"],
    "Buldhana": ["Buldhana", "Buldana"],
    "Gondia": ["Gondia", "Gondiya"],
}


def log(m):
    print(m, flush=True)


def key():
    for line in open(os.path.join(ROOT, ".env.local"), encoding="utf-8"):
        if line.startswith("DATA_GOV_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("DATA_GOV_KEY missing from .env.local")


API_KEY = key()


def districts():
    d = json.load(open(os.path.join(ROOT, "src/data/districts.json"), encoding="utf-8"))
    return [x["en"] for x in d["districts"]]


def call(district_name, limit=500):
    q = urllib.parse.urlencode({
        "api-key": API_KEY, "format": "json", "limit": limit,
        "filters[state]": "Maharashtra", "filters[district]": district_name,
    })
    for attempt in range(2):
        try:
            with urllib.request.urlopen(BASE + "?" + q, timeout=15) as r:
                return json.loads(r.read()).get("records", [])
        except Exception:
            if attempt == 0:
                time.sleep(2)
    return None  # None = request failed, [] = genuinely no data


def fetch(ours):
    for candidate in ALIASES.get(ours, [ours]):
        recs = call(candidate)
        if recs:
            return ours, candidate, recs
    return ours, None, []


rows = []
names = districts()
failed, empty = [], []

for i, (ours, used, recs) in enumerate((fetch(n) for n in names), 1):
    kept = 0
    for r in recs:
        crop = COMMODITY_TO_CROP.get(r.get("commodity"))
        if not crop:
            continue
        try:
            modal = float(r["modal_price"])
        except (KeyError, TypeError, ValueError):
            continue
        if modal <= 0:
            continue
        rows.append({
            "district": ours, "crop": crop, "market": r.get("market", ""),
            "modal": modal,
            "min": float(r.get("min_price") or modal),
            "max": float(r.get("max_price") or modal),
            "date": r.get("arrival_date", ""),
        })
        kept += 1
    if not recs:
        empty.append(ours)
    log(f"[{i:2}/{len(names)}] {ours:18} as {str(used):26} {len(recs):4} recs, {kept:3} matched")

# --- per district+crop summary ---------------------------------------------
by = collections.defaultdict(list)
for r in rows:
    by[(r["district"], r["crop"])].append(r)

per_district = collections.defaultdict(dict)
for (dist, crop), rs in by.items():
    modals = sorted(x["modal"] for x in rs)
    best = max(rs, key=lambda x: x["modal"])
    per_district[dist][crop] = {
        "modal": round(statistics.median(modals)),
        "low": round(min(x["min"] for x in rs)),
        "high": round(max(x["max"] for x in rs)),
        "markets": len(rs),
        "bestMarket": best["market"],
        "bestPrice": round(best["modal"]),
        "date": rs[0]["date"],
    }

# --- state fallback for crops with no local arrivals ------------------------
by_crop = collections.defaultdict(list)
for r in rows:
    by_crop[r["crop"]].append(r["modal"])
state = {c: {"modal": round(statistics.median(sorted(v))), "markets": len(v)}
         for c, v in by_crop.items()}

# Guard: data.gov.in signals throttling with HTTP 200 and an empty result, so a
# blocked run looks like "no prices exist anywhere". Refuse to overwrite good
# data with that.
if len(rows) < 10:
    log("")
    log(f"ABORTED: only {len(rows)} rows returned across {len(names)} districts.")
    log("  That is the signature of a rate-limited key, not an empty market day.")
    log(f"  {OUT} left untouched. Try again later.")
    raise SystemExit(1)

payload = {
    "source": {
        "name": "Agmarknet daily mandi prices via data.gov.in",
        "resource": RESOURCE,
        "url": "https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
        "unit": "INR per quintal (100 kg)",
        "fetched": datetime.datetime.now().strftime("%Y-%m-%d"),
    },
    "coverage": sorted(per_district.keys()),
    "state": state,
    "districts": dict(per_district),
}
json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

log(f"\nwrote {OUT}")
log(f"  rows kept: {len(rows)} | districts with prices: {len(per_district)}")
log(f"  no arrivals / not found: {', '.join(empty) if empty else 'none'}")
log("  state medians: " + ", ".join(f"{k}={v['modal']}" for k, v in sorted(state.items())))
nsk = per_district.get("Nashik", {})
if nsk:
    log("\n  Nashik:")
    for c, v in sorted(nsk.items()):
        log(f"    {c:8} Rs {v['modal']:6}/qtl  ({v['markets']} mkts, best {v['bestMarket']} @ {v['bestPrice']})")
