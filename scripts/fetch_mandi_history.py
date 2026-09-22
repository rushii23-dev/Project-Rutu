"""Pull ten years of Agmarknet mandi prices and condense them to monthly medians.

The daily-price resource the app already uses only ever holds today. Sell timing
needs the shape of a whole year -- when prices sag under the harvest glut and
when they recover -- so this reads the separate *historical* Agmarknet resource
on data.gov.in and keeps, per district x crop x month, the median modal price and
how many market-days fed it.

Raw daily rows are not stored: 1.3 million of them would bloat the repo for no
analytical gain. The monthly table is the reproducible artefact, and
build_sell_timing.py derives everything the app shows from it.

Output: data/raw/mandi_monthly.json
Usage:  python scripts/fetch_mandi_history.py        (about 10-15 minutes)
"""
import collections, datetime, json, os, statistics, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data/raw/mandi_monthly.json")
RESOURCE = "35985678-0d79-46b4-9ed6-6f13308a1d24"
BASE = "https://api.data.gov.in/resource/" + RESOURCE
SINCE = "2015-06-01"  # ten full marketing years plus the current one
PAGE = 10000

# Commodity spellings in the HISTORICAL resource, checked against its totals.
# (It has no "Kapas" rows; cotton is all under "Cotton".)
COMMODITIES = {
    "Soyabean": "soy",
    "Onion": "onion",
    "Cotton": "cotton",
    "Maize": "maize",
    "Wheat": "wheat",
    "Bajra(Pearl Millet/Cumbu)": "bajra",
    "Bengal Gram(Gram)(Whole)": "gram",
    "Groundnut": "ground",
    "Groundnut pods (raw)": "ground",
    "Green Gram (Moong)(Whole)": "moong",
}

# Old and new district spellings both occur across ten years of records.
FROM_AGMARK = {
    "Ahilyanagar": "Ahmednagar",
    "Chhatrapati Sambhajinagar": "Ch.Sambhajinagar",
    "Chattrapati Sambhajinagar": "Ch.Sambhajinagar",
    "Aurangabad": "Ch.Sambhajinagar",
    "Amarawati": "Amravati",
    "Dharashiv(Usmanabad)": "Dharashiv",
    "Osmanabad": "Dharashiv",
    "Usmanabad": "Dharashiv",
    "Mumbai": "Mumbai City",
    "Buldana": "Buldhana",
    "Gondiya": "Gondia",
    # older Agmarknet spellings, found in the dropped-rows report of the first run
    "Sholapur": "Solapur",
    "Vashim": "Washim",
    "Jalana": "Jalna",
    "Murum": "Dharashiv",  # a market town filed as if it were a district
}


def log(m):
    print(m, flush=True)


def key():
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
    raise SystemExit("DATA_GOV_KEY not found -- see .env.example")


API_KEY = key()


def page(commodity, offset):
    q = urllib.parse.urlencode({
        "api-key": API_KEY, "format": "json", "limit": PAGE, "offset": offset,
        "filters[State]": "Maharashtra",
        "filters[Commodity]": commodity,
        "range[Arrival_Date][gte]": SINCE,
        "sort[Arrival_Date]": "asc",
    })
    req = urllib.request.Request(
        BASE + "?" + q,
        headers={"User-Agent": "Mozilla/5.0 (RITU data pipeline)", "Accept": "application/json"},
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.loads(r.read())
            return d.get("records", []), int(d.get("total") or 0)
        except Exception as e:
            log(f"    retry {attempt + 1}/5 at offset {offset}: {type(e).__name__}")
            time.sleep(5 * (attempt + 1))
    raise SystemExit(f"gave up on {commodity} at offset {offset}")


def districts():
    d = json.load(open(os.path.join(ROOT, "src/data/districts.json"), encoding="utf-8"))
    return {x["id"] for x in d["districts"]}


KNOWN = districts()

# (district, crop, "YYYY-MM") -> list of modal prices, one per market-day row
cells = collections.defaultdict(list)
unmapped = collections.Counter()
last_day = {}

for commodity, crop in COMMODITIES.items():
    offset, total, kept = 0, None, 0
    t0 = time.time()
    while True:
        rows, total = page(commodity, offset)
        if not rows:
            break
        for r in rows:
            dist = (r.get("District") or "").strip()
            dist = FROM_AGMARK.get(dist, dist)
            if dist not in KNOWN:
                unmapped[dist] += 1
                continue
            try:
                modal = float(r["Modal_Price"])
                d, m, y = r["Arrival_Date"].split("/")
            except (KeyError, ValueError):
                continue
            # a handful of rows carry per-kg prices or typos; a quintal of any of
            # these crops never trades below Rs 100 or above Rs 100,000
            if not 100 <= modal <= 100000:
                continue
            cells[(dist, crop, f"{y}-{m}")].append(modal)
            iso = f"{y}-{m}-{d}"
            if iso > last_day.get(crop, ""):
                last_day[crop] = iso
            kept += 1
        offset += len(rows)
        log(f"  {commodity:28} {offset:>7}/{total}  ({time.time() - t0:.0f}s)")
        if offset >= total:
            break
    log(f"{commodity}: kept {kept} rows")

table = collections.defaultdict(lambda: collections.defaultdict(dict))
for (dist, crop, ym), vals in cells.items():
    table[dist][crop][ym] = [round(statistics.median(vals)), len(vals)]

payload = {
    "source": {
        "name": "Agmarknet historical daily mandi prices via data.gov.in",
        "resource": RESOURCE,
        "url": "https://data.gov.in/resource/variety-wise-daily-market-prices-data-commodity",
        "unit": "INR per quintal (100 kg), modal price",
        "since": SINCE,
        "lastDay": last_day,
        "fetched": datetime.date.today().isoformat(),
    },
    "note": "Each cell is [median modal price, market-day rows] for that district, crop and month.",
    "districts": {d: {c: dict(sorted(m.items())) for c, m in cs.items()} for d, cs in sorted(table.items())},
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
log(f"\nwrote {OUT}: {len(table)} districts, {len(cells)} district-crop-months")
if unmapped:
    log("unmapped district names (dropped): " + ", ".join(f"{k}={v}" for k, v in unmapped.most_common(10)))
