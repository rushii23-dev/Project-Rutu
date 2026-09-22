"""Derive sell-timing evidence from 11 years of Agmarknet prices.

Input:  data/raw/mandi_monthly.json   (scripts/fetch_mandi_history.py)
Output: src/data/sellTiming.json

Two things per district x crop, both reproducible from the monthly table:

1. HOLDING RECORD -- the number the advice rests on. For a harvest month h and a
   wait of k months (1-4), look at every year that has a price in both h and
   h+k (within the same marketing year, so October -> January crosses the new
   year correctly). Report the median gain and in how many of those years
   waiting actually paid. This is what a farmer who waited would have got, in
   his own district, in real rupees -- inflation included, because inflation is
   real money to him; the app charges holding a monthly cost against it.

2. SEASONAL SHAPE -- only for drawing the 12-month chart. Classical
   ratio-to-moving-average: each month's price over the centred 2x12 moving
   average, median across years, normalised to average 1. The moving average
   removes the trend, so the chart shows the harvest dip and not inflation.

A district with too little history for a crop falls back to the state series
(all Maharashtra markets), and the app says it is showing the state.

Usage: python scripts/build_sell_timing.py
"""
import json, os, statistics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data/raw/mandi_monthly.json")
OUT = os.path.join(ROOT, "src/data/sellTiming.json")

MAX_WAIT = 4          # months; beyond this storage losses dominate for most crops
MIN_YEARS = 5         # a holding record needs at least this many years to be shown
MIN_ROWS = 3          # market-day rows behind a monthly median before we trust it

raw = json.load(open(SRC, encoding="utf-8"))


def ym_to_i(ym):
    y, m = ym.split("-")
    return int(y) * 12 + int(m) - 1


def i_to_ym(i):
    return i // 12, i % 12  # (year, month 0-11)


def series_from_cells(cells):
    """{'YYYY-MM': [median, n]} -> {month_index: price} keeping trusted months."""
    return {ym_to_i(ym): v[0] for ym, v in cells.items() if v[1] >= MIN_ROWS}


def state_series(crop):
    """Row-weighted mean of district medians, per month. Good enough to show a
    shape and a holding record where a district has too few markets."""
    acc = {}
    for dist, crops in raw["districts"].items():
        for ym, (price, n) in crops.get(crop, {}).items():
            a = acc.setdefault(ym_to_i(ym), [0.0, 0])
            a[0] += price * n
            a[1] += n
    return {i: s / n for i, (s, n) in acc.items() if n >= MIN_ROWS * 3}


def holding(series):
    """{ 'h': [[medianGainPct, wins, years], ...k=1..MAX_WAIT] } for each start month."""
    out = {}
    for h in range(12):
        row = []
        for k in range(1, MAX_WAIT + 1):
            gains = []
            for i, p in series.items():
                if i % 12 != h:
                    continue
                q = series.get(i + k)
                if q:
                    gains.append(q / p - 1)
            if len(gains) >= MIN_YEARS:
                row.append([round(statistics.median(gains) * 100, 1), sum(g > 0 for g in gains), len(gains)])
            else:
                row.append(None)
        out[str(h)] = row
    return out


def seasonal_index(series):
    """Ratio to a centred 2x12 moving average; median per calendar month."""
    if not series:
        return None
    lo, hi = min(series), max(series)
    ratios = {m: [] for m in range(12)}
    for t in range(lo + 6, hi - 5):
        if t not in series:
            continue
        num = den = 0.0
        for j in range(-6, 7):
            w = 0.5 if abs(j) == 6 else 1.0
            v = series.get(t + j)
            if v:
                num += w * v
                den += w
        # at least ~10 of the 13 months must be present or the average is a guess
        if den < 9.5:
            continue
        ratios[t % 12].append(series[t] / (num / den))
    if sum(1 for m in ratios if len(ratios[m]) >= 4) < 10:
        return None
    idx = [statistics.median(ratios[m]) if len(ratios[m]) >= 4 else None for m in range(12)]
    known = [v for v in idx if v]
    mean = sum(known) / len(known)
    return [round(v / mean, 3) if v else None for v in idx]


def years_covered(series):
    """Whole years the record spans. Counting calendar years touched would call
    June 2015 - September 2026 "12 years"; it is 11 and a bit."""
    if not series:
        return 0
    return (max(series) - min(series) + 1) // 12


crops = sorted({c for d in raw["districts"].values() for c in d})
result = {"state": {}, "districts": {}}

for crop in crops:
    s = state_series(crop)
    result["state"][crop] = {
        "index": seasonal_index(s),
        "hold": holding(s),
        "years": years_covered(s),
    }

for dist, dcrops in raw["districts"].items():
    for crop, cells in dcrops.items():
        s = series_from_cells(cells)
        idx = seasonal_index(s)
        hold = holding(s)
        # a district entry is only worth keeping if it can back an actual claim
        has_record = any(any(x for x in row) for row in hold.values())
        if not (idx and has_record):
            continue
        result["districts"].setdefault(dist, {})[crop] = {
            "index": idx,
            "hold": hold,
            "years": years_covered(s),
        }

payload = {
    "source": raw["source"],
    "method": {
        "hold": "For each year, the price k months after harvest divided by the harvest-month price, "
                "in the same district and marketing year. Median across years; wins = years it paid.",
        "index": "Ratio to a centred 2x12 moving average, median per calendar month, normalised to mean 1.",
        "maxWait": MAX_WAIT,
        "minYears": MIN_YEARS,
    },
    **result,
}
json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"wrote {OUT}")
print(f"  state series: {', '.join(c for c in crops if result['state'][c]['index'])}")
print(f"  district entries: {sum(len(v) for v in result['districts'].values())} across {len(result['districts'])} districts")

MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
for crop in ("soy", "onion", "cotton", "maize"):
    e = result["districts"].get("Nashik", {}).get(crop) or result["state"][crop]
    scope = "Nashik" if crop in result["districts"].get("Nashik", {}) else "state"
    print(f"\n  {crop} ({scope}, {e['years']} yrs)  index: " +
          " ".join(f"{MONTHS[m]}={v}" for m, v in enumerate(e["index"] or [])))
    for h in (9, 10, 2, 3, 4):
        row = e["hold"][str(h)]
        print(f"    harvest {MONTHS[h]}: " + "  ".join(
            f"+{k + 1}m {r[0]:+.1f}% ({r[1]}/{r[2]})" if r else f"+{k + 1}m --" for k, r in enumerate(row)))
