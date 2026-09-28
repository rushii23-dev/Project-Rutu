"""Detect the agricultural monsoon onset for every district and year.

Input:  data/raw/imd_rainfall_maharashtra.json   (scripts/fetch_imd_rainfall.py)
Output: data/raw/onset_imd.json                   (read by scripts/build_districts.py)

This is the step the whole project stands on: the onset dates behind the trend,
the p-value and the corrected sowing date. It was the one derived file with no
script in the repository, so the headline claim could not be reproduced from
source. Run with --check and it regenerates the file in memory and confirms it
matches the committed one, byte for byte.

THE RULE, for each district and year, on IMD 0.25-degree gridded daily rainfall:

  Onset is the first day D from 1 June to 31 August such that
    1. the 7 days D..D+6 accumulate at least 25 mm, and
    2. the 30 days after that window, D+7..D+36, contain no dry spell longer
       than 7 days, a dry day being one with under 2.5 mm (IMD's rainy-day
       threshold).

  Condition 2 is what separates a monsoon from a pre-monsoon shower: a burst of
  rain followed by two dry weeks is exactly the false start that makes a farmer
  sow and then re-sow. If no day qualifies by 31 August the year has no onset
  and is left out, rather than being given a late date that no farmer would
  have recognised as the monsoon arriving.

  Missing grid values are treated as no rain.

Also written per district, for reference (build_districts.py computes its own
Theil-Sen trend and Mann-Kendall p from the onset days, and ignores these):
  trend_days_per_decade  ordinary least-squares slope x 10
  mean_1985_1994, mean_2016_2025  mean onset day in the first and last decade

Usage:  python scripts/detect_onsets.py           (writes the file)
        python scripts/detect_onsets.py --check   (verifies it, writes nothing)
"""
import json, os, statistics, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data/raw/imd_rainfall_maharashtra.json")
OUT = os.path.join(ROOT, "data/raw/onset_imd.json")

ACCUMULATE_MM = 25.0   # over the first window
WINDOW_DAYS = 7
LOOKAHEAD_DAYS = 30    # checked for a dry spell after the window
DRY_DAY_MM = 2.5       # IMD rainy-day threshold
MAX_DRY_SPELL = 7      # a longer run of dry days in the look-ahead fails the day
SEARCH = ("06-01", "08-31")


def longest_dry_run(values):
    run = best = 0
    for x in values:
        run = run + 1 if x < DRY_DAY_MM else 0
        best = max(best, run)
    return best


def onset_day(rain, dates):
    """Day of year of the onset, or None if none qualifies by 31 August."""
    year = dates[0][:4]
    start = dates.index(f"{year}-{SEARCH[0]}")
    for d in range(start, len(rain) - WINDOW_DAYS):
        if dates[d][5:] > SEARCH[1]:
            break
        if sum(rain[d:d + WINDOW_DAYS]) < ACCUMULATE_MM:
            continue
        after = rain[d + WINDOW_DAYS:d + WINDOW_DAYS + LOOKAHEAD_DAYS]
        if longest_dry_run(after) > MAX_DRY_SPELL:
            continue
        return d + 1
    return None


def ols_slope(xs, ys):
    mx, my = statistics.mean(xs), statistics.mean(ys)
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)


def build(raw):
    dates, rainfall = raw["dates"], raw["rainfall_mm"]
    division = {d["name"]: d["division"] for d in raw["meta"]["districts"]}
    years = [str(y) for y in raw["meta"]["years"]]

    out = {}
    for name in sorted(rainfall, key=lambda n: (division[n], n)):
        onsets = {}
        for y in years:
            rain = [x if x is not None else 0.0 for x in rainfall[name][y]]
            d = onset_day(rain, dates[y])
            if d is not None:
                onsets[y] = d
        yrs = sorted(int(y) for y in onsets)
        doys = [onsets[str(y)] for y in yrs]
        out[name] = {
            "division": division[name],
            "onset_doy": onsets,
            "trend_days_per_decade": round(ols_slope(yrs, doys) * 10, 2),
            "mean_1985_1994": round(statistics.mean(onsets[str(y)] for y in yrs if y <= 1994), 1),
            "mean_2016_2025": round(statistics.mean(onsets[str(y)] for y in yrs if y >= 2016), 1),
        }
    return out


if __name__ == "__main__":
    result = build(json.load(open(SRC, encoding="utf-8")))
    text = json.dumps(result, indent=1)

    if "--check" in sys.argv:
        with open(OUT, encoding="utf-8") as f:
            committed = f.read()
        if committed.rstrip("\n") != text:
            sys.exit(f"MISMATCH: {OUT} does not match the rule in this script")
        n = sum(len(v["onset_doy"]) for v in result.values())
        print(f"OK: {len(result)} districts, {n} onsets reproduce {os.path.relpath(OUT, ROOT)} exactly")
    else:
        with open(OUT, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"wrote {OUT}: {len(result)} districts")
