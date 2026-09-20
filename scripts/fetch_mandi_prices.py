"""Precompute real mandi prices into src/data/prices.json.

Runs on a developer machine, never in the browser: the data.gov.in key stays out
of the client bundle, the app keeps working offline on 2G, and there is no CORS
problem. Same pattern as the IMD download.

Prices are Agmarknet modal prices in rupees per quintal (100 kg).

Usage:  python fetch_prices.py
"""
import json, os, sys, time, urllib.parse, urllib.request, datetime, statistics, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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

# Agmarknet uses several pre-rename spellings. Map them onto our district ids.
FROM_AGMARK = {
    "Chhatrapati Sambhajinagar": "Ch.Sambhajinagar",
    "Chattrapati Sambhajinagar": "Ch.Sambhajinagar",
    "Amarawati": "Amravati",
    "Aurangabad": "Ch.Sambhajinagar",
    "Dharashiv(Usmanabad)": "Dharashiv",
    "Osmanabad": "Dharashiv",
    "Usmanabad": "Dharashiv",
    "Ahilyanagar": "Ahmednagar",
    "Mumbai": "Mumbai City",
    "Buldana": "Buldhana",
    "Gondiya": "Gondia",
}


def log(m):
    print(m, flush=True)


def key():
    """The data.gov.in key, from the environment first, then .env.local.

    CI passes it as a secret in the environment so the key never lands on a
    runner's disk; a developer keeps using the git-ignored .env.local file.
    """
    env = os.environ.get("DATA_GOV_KEY", "").strip()
    if env:
        return env
    path = os.path.join(ROOT, ".env.local")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            if line.startswith("DATA_GOV_KEY="):
                v = line.split("=", 1)[1].strip()
                if v:
                    return v
    raise SystemExit(
        "DATA_GOV_KEY not found. Set it in the environment, or copy "
        ".env.example to .env.local and paste your free key from data.gov.in"
    )


API_KEY = key()


def districts():
    d = json.load(open(os.path.join(ROOT, "src/data/districts.json"), encoding="utf-8"))
    return [x["en"] for x in d["districts"]]


def fetch_state(limit=5000):
    """One call for the whole state.

    Per-district queries are not just slower, they HANG: the API takes the full
    timeout to answer a filter that matches nothing, so the 6 districts with no
    arrivals on a given day cost a minute each. A single state-wide query returns
    every market in the state in about five seconds, and we group locally.
    """
    q = urllib.parse.urlencode({
        "api-key": API_KEY, "format": "json", "limit": limit,
        "filters[state]": "Maharashtra",
    })
    # A User-Agent is not optional here: without one the endpoint stalls until
    # the timeout instead of answering.
    req = urllib.request.Request(
        BASE + "?" + q,
        headers={"User-Agent": "Mozilla/5.0 (RITU data pipeline)", "Accept": "application/json"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                payload = json.loads(r.read())
                return payload.get("records", [])
        except Exception as e:
            log(f"  attempt {attempt+1}/3 failed: {type(e).__name__}")
            time.sleep(4 * (attempt + 1))
    return []


rows = []
records = fetch_state()
log(f"fetched {len(records)} market records for Maharashtra")

seen_districts = set()
for r in records:
    dist = (r.get("district") or "").strip()
    seen_districts.add(dist)
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
        "district": FROM_AGMARK.get(dist, dist), "crop": crop, "market": r.get("market", ""),
        "modal": modal,
        "min": float(r.get("min_price") or modal),
        "max": float(r.get("max_price") or modal),
        "date": r.get("arrival_date", ""),
    })

log(f"  {len(seen_districts)} districts reported arrivals, "
    f"{len(rows)} records match a crop we track")

# --- per district+crop summary ---------------------------------------------
by = collections.defaultdict(list)
for r in rows:
    by[(r["district"], r["crop"])].append(r)

def clean_market(name):
    """'Lasalgaon(Niphad) APMC' -> ('Lasalgaon', 'Niphad').

    Agmarknet market names carry the taluka in parentheses, which is the finest
    location the source actually publishes. We surface that rather than inventing
    a taluka lookup of our own.
    """
    n = (name or "").replace(" APMC", "").replace("APMC", "").strip()
    # a few markets are published in shouty full-form; title-case them
    if n.isupper() and len(n) > 12:
        n = n.title().replace("Agriculture Produce Market Comitee ", "")
        n = n.replace("Agriculture Produce Market Committee ", "")
    taluka = ""
    if "(" in n and ")" in n:
        taluka = n[n.index("(") + 1:n.index(")")].strip()
        n = n[:n.index("(")].strip()
    return n, taluka


per_district = collections.defaultdict(dict)
for (dist, crop), rs in by.items():
    modals = sorted(x["modal"] for x in rs)
    best = max(rs, key=lambda x: x["modal"])
    # one entry per market, best-paying first — this is the taluka-level view
    stalls = []
    seen = set()
    for r in sorted(rs, key=lambda x: -x["modal"]):
        mkt, taluka = clean_market(r["market"])
        if mkt in seen:
            continue
        seen.add(mkt)
        stalls.append({"m": mkt, "t": taluka, "p": round(r["modal"])})
    bm, bt = clean_market(best["market"])
    per_district[dist][crop] = {
        "modal": round(statistics.median(modals)),
        "low": round(min(x["min"] for x in rs)),
        "high": round(max(x["max"] for x in rs)),
        "markets": len(seen),
        "bestMarket": bm,
        "bestTaluka": bt,
        "bestPrice": round(best["modal"]),
        "stalls": stalls[:8],
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

# Mandis close on Sundays and holidays. Such a day returns real data, just very
# little of it, so the row guard above passes and a thin file replaces a full
# one. Refuse to shrink district coverage unless asked to.
FORCE = "--force" in sys.argv
if os.path.exists(OUT) and not FORCE:
    prev = json.load(open(OUT, encoding="utf-8")).get("districts", {})
    if prev and len(per_district) < 0.6 * len(prev):
        log("")
        log(f"ABORTED: {len(per_district)} districts now vs {len(prev)} already on disk.")
        log("  Markets are shut or barely trading today -- likely a Sunday or a holiday.")
        log(f"  {OUT} left untouched. Re-run on a trading day, or pass --force.")
        raise SystemExit(2)

payload = {
    "source": {
        "name": "Agmarknet daily mandi prices via data.gov.in",
        "resource": RESOURCE,
        "url": "https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
        "unit": "INR per quintal (100 kg)",
        "fetched": datetime.datetime.now().strftime("%Y-%m-%d"),
    },
    # The query is state-wide, so EVERY district was fetched. Districts absent
    # from `districts` had no arrivals today — which is a fact, not a gap.
    "coverage": districts(),
    "state": state,
    "districts": dict(per_district),
}
json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

log(f"\nwrote {OUT}")
log(f"  rows kept: {len(rows)} | districts with prices: {len(per_district)}")
missing = [d for d in districts() if d not in per_district]
log(f"  no arrivals today: {', '.join(missing) if missing else 'none'}")
log("  state medians: " + ", ".join(f"{k}={v['modal']}" for k, v in sorted(state.items())))
nsk = per_district.get("Nashik", {})
if nsk:
    log("\n  Nashik:")
    for c, v in sorted(nsk.items()):
        log(f"    {c:8} Rs {v['modal']:6}/qtl  ({v['markets']} mkts, best {v['bestMarket']} @ {v['bestPrice']})")
