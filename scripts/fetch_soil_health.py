"""Precompute district soil status from the national Soil Health Card system.

The Soil Health Card portal (soilhealth.dac.gov.in) publishes, per district and
per testing cycle, how many field samples tested Low / Medium / High for each
nutrient. It is served by a public GraphQL endpoint that the portal's own
Nutrient Dashboard calls; no key is needed.

These are COUNTS OF SAMPLES, not an average. "74% low in nitrogen" means 74% of
the fields tested in that district in that cycle came back low. It says nothing
about any one farmer's field, and the app says so -- it is the odds his field is
low, and the reason to go and get his own card tested.

Each cycle samples different fields, so a change between cycles is a change in
what was tested as much as in the soil. The app shows cycles side by side and
does not call the difference a trend.

Output: src/data/soil.json
Usage:  python scripts/fetch_soil_health.py      (about a minute, no key)
"""
import datetime, json, os, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src/data/soil.json")
EP = "https://soilhealth4.dac.gov.in"
SCHEME = "660f941a5c8405ca8375c7c6"  # "Soil Health Card RKVY", the portal's default
CYCLES = ["2023-24", "2024-25", "2025-26"]

# Portal spellings -> our district ids
TO_OURS = {
    "AHILYANAGAR": "Ahmednagar",
    "Chhatrapati Sambhajinagar": "Ch.Sambhajinagar",
    "DHARASHIV": "Dharashiv",
    "MUMBAI SUBURBAN": "Mumbai Suburban",
    "Mumbai": "Mumbai City",
}


def gql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(EP, data=body, headers={
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (RITU data pipeline)",
        "Origin": "https://soilhealth.dac.gov.in",
        "Referer": "https://soilhealth.dac.gov.in/",
    })
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())["data"]
        except Exception as e:
            print(f"  retry {attempt + 1}: {type(e).__name__}", flush=True)
            time.sleep(3 * (attempt + 1))
    raise SystemExit("Soil Health Card endpoint unreachable")


ours = {d["id"] for d in json.load(open(os.path.join(ROOT, "src/data/districts.json"), encoding="utf-8"))["districts"]}

states = gql("query { getState }")["getState"]
mh = next(s for s in states if s["name"] == "MAHARASHTRA")
dists = gql(
    "query Q($state: ID, $subdistrict: Boolean) { getdistrictAndSubdistrictBystate(state: $state, subdistrict: $subdistrict) }",
    {"state": mh["_id"], "subdistrict": False},
)["getdistrictAndSubdistrictBystate"]

NUTRIENT_Q = (
    "query Q($state: ID, $district: ID, $cycle: String, $count: Boolean, $scheme: String) {"
    " getNutrientDashboardForPortal(state: $state, district: $district, cycle: $cycle, count: $count, scheme: $scheme) }"
)

# Keep what the app uses. Macro nutrients and carbon are Low/Medium/High;
# sulphur and the micronutrients are Sufficient/Deficient.
KEEP = {
    "n": ("Low", "Medium", "High"),
    "p": ("Low", "Medium", "High"),
    "k": ("Low", "Medium", "High"),
    "OC": ("Low", "Medium", "High"),
    "S": ("Deficient", "Sufficient"),
    "Zn": ("Deficient", "Sufficient"),
    "B": ("Deficient", "Sufficient"),
    "Fe": ("Deficient", "Sufficient"),
}

out = {}
for d in dists:
    did = TO_OURS.get(d["name"], d["name"].title())
    if did not in ours:
        print(f"  skip unmapped district {d['name']!r}")
        continue
    cycles = {}
    for cyc in CYCLES:
        rows = gql(NUTRIENT_Q, {"state": mh["_id"], "district": d["_id"], "cycle": cyc, "count": True, "scheme": SCHEME})
        rows = rows["getNutrientDashboardForPortal"] or []
        if not rows:
            continue
        res = rows[0].get("results") or {}
        entry = {}
        for key, labels in KEEP.items():
            counts = res.get(key) or {}
            entry[key] = [int(counts.get(l, 0)) for l in labels]
        n = sum(entry["n"])
        if n < 50:  # too few tests to say anything about a district
            continue
        entry["samples"] = n
        cycles[cyc] = entry
    if cycles:
        out[did] = cycles
    latest = cycles.get(CYCLES[-1])
    if latest:
        low_n = latest["n"][0] / latest["samples"]
        low_oc = latest["OC"][0] / sum(latest["OC"])
        print(f"  {did:18} {latest['samples']:>6} tests  N low {low_n:4.0%}  OC low {low_oc:4.0%}", flush=True)
    else:
        print(f"  {did:18} no usable cycle", flush=True)

payload = {
    "source": {
        "name": "Soil Health Card scheme, Nutrient Dashboard",
        "url": "https://soilhealth.dac.gov.in/nutrient-dashboard",
        "scheme": "Soil Health Card RKVY",
        "cycles": CYCLES,
        "fetched": datetime.date.today().isoformat(),
    },
    # Standard SHC rating limits, printed so a reader can see what "low" means.
    "ratings": {
        "OC": "Low < 0.5%, Medium 0.5-0.75%, High > 0.75% organic carbon",
        "n": "Low < 280, Medium 280-560, High > 560 kg/ha available N",
        "p": "Low < 10, Medium 10-25, High > 25 kg/ha available P",
        "k": "Low < 110, Medium 110-280, High > 280 kg/ha available K",
    },
    "note": "Counts of field samples per rating, in the order the labels are listed under 'labels'.",
    "labels": {k: list(v) for k, v in KEEP.items()},
    "districts": dict(sorted(out.items())),
}
json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"\nwrote {OUT}: {len(out)} districts")
missing = sorted(ours - set(out))
print("no data:", ", ".join(missing) if missing else "none")
