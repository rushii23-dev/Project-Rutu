<div align="center">

# ऋतु · RITU

### The calendar, corrected.

**A farmer's inherited knowledge has an expiry date, and nobody told him it expired.**

`मौसम बदल गया. आता माहितीही बदलेल.`

[![Licence: MIT](https://img.shields.io/badge/licence-MIT-2E6B3F.svg)](LICENSE)
[![Data: IMD Pune](https://img.shields.io/badge/rainfall-IMD%20Pune%201985--2025-17150F.svg)](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html)
[![Forecast: Open-Meteo](https://img.shields.io/badge/forecast-Open--Meteo-5B7C86.svg)](https://open-meteo.com)
[![Prices: Agmarknet](https://img.shields.io/badge/prices-Agmarknet-C1531B.svg)](https://data.gov.in)

</div>

---

## The problem

For generations, Indian farming knowledge passed down orally — and it worked, because the climate was stable. A farmer's father sowed when the monsoon arrived. That rule was correct for fifty years.

It is not correct anymore.

So the farmer follows the rule his father gave him, **and the crop fails.** Not from ignorance. Because the ground rules moved underneath him and he had no instrument to detect it.

**Traditional knowledge is not wrong. It is outdated.** RITU is the instrument that measures the difference.

---

## What we found

We pulled **41 years of daily gridded rainfall** from the India Meteorological Department for all **36 districts of Maharashtra**, computed the agricultural monsoon onset for every district-year, and tested every trend for statistical significance.

The result was not what we expected, and we kept it anyway.

### Nashik — the monsoon arrives 14 days earlier than it did in 1985

| Measure | 1985–1994 | 2016–2025 | Trend | p |
|---|---|---|---|---|
| Monsoon onset | **27 Jun** | **14 Jun** | −5.2 d/decade | **0.018** |
| Rain days (JJAS) | 41.6 | 54.1 | +4.3 d/decade | 0.002 |
| Seasonal rainfall | 546 mm | 800 mm | +85 mm/decade | 0.005 |
| Longest dry spell | 19.0 d | 13.8 d | −1.8 d/decade | 0.016 |

Nashik's monsoon starts two weeks earlier, delivers **47% more water** across **12 more rainy days**, and breaks for five fewer days. A sowing date inherited from the 1980s is now a fortnight late.

### And in 34 of 36 districts, we found nothing — so we say nothing

Only **Nashik** (p = 0.018) and **Dhule** (p = 0.009) show a statistically significant onset trend at p < 0.05.

For every other district the app states plainly:

> *"Across 41 years, Latur shows no measurable shift in the monsoon date. We will not pretend otherwise."*

and the trend line renders **dashed and grey** instead of confident orange.

**This is the most important design decision in the project.** An advisory that admits what it cannot measure is one a farmer can trust about everything else.

---

## The app

Mobile-first PWA, Marathi-first, four buttons, one answer per screen.

| Screen | What it does |
|---|---|
| **Welcome** | Language choice before anything else — it gates comprehension |
| **Onboarding** | Name, district, village, acreage — four questions, one per screen |
| **Dashboard** | Live weather warning, the corrected sowing window, 7-day forecast, crops for the current season |
| **Crops** | Every crop by season, with real mandi prices |
| **Crop detail** | Why this crop, expected income for *your* acreage, sowing window |
| **Weather** | Live conditions, dated 7-day forecast, and what to actually do about it |
| **Evidence** | The 41-year onset chart, supporting shifts, and full data provenance |
| **`/policy`** | State surface: all 36 districts mapped by onset shift and significance, plus the federation model |
| **Ask** | Voice or typed questions in any of the three languages, answered from verified data |
| **Profile** | Edit details in place, switch district, the cropping year with today marked, and today's best-paying markets |

### Details that matter

**The dashboard knows what day it is.** The season is computed from the date, not hardcoded. On 21 August it does not tell a farmer to sow in a window that closed in June — it shows the *next* actionable window and says the kharif one has passed.

**It rolls over at midnight.** Three independent triggers — an exact-midnight timeout, a 30-second interval, and wake/visibility events — because on a phone no single one is reliable. Past days are filtered out of the forecast.

**The background reads the sky.** Season plus live weather select an atmosphere: drifting rain, monsoon-break haze, low summer sun. Cards stay white and ink stays near-black, so sunlight contrast is untouched. All motion respects `prefers-reduced-motion`.

**Three languages.** Marathi, Hindi, English — every string, including crop copy and agronomic reasoning.

**Ask it out loud.** Speech recognition and synthesis come from the browser's Web Speech API — free, keyless, and no audio leaves the device. Answers are **retrieved, never generated**: every reply is composed from the IMD series, the live forecast, real mandi prices or the rotation rules, and carries the source on screen. A model that hallucinates a sowing date would cause the exact failure this project exists to prevent. Crop names are matched on oblique forms too, because a farmer says *कांद्याचा*, not *कांदा*.

**Installable.** Service worker precaches the shell, the data and the satellite frames, so it opens offline on 2G.

---

## Real vs sample — stated on screen, not buried

We label our own limits. Every unsourced figure carries a **`नमुना आकडे` / sample figures** badge in the interface itself.

| Data | Status | Source |
|---|---|---|
| Monsoon onset, trends, significance | ✅ **real** | IMD Pune, 0.25° grid, 1985–2025 |
| Rain days, seasonal rainfall, dry spells | ✅ **real** | IMD Pune |
| Current conditions + 7-day forecast | ✅ **live** | Open-Meteo |
| Mandi prices, all 36 districts + market level | ✅ **real** | Agmarknet via data.gov.in |
| Satellite vegetation (NDVI) | ✅ **real** | MODIS Terra via NASA GIBS |
| Season and sowing windows | ✅ computed | date + crop calendar |
| Per-acre yield, cost, income | ⚠️ **sample** | placeholder — needs CACP tables |
| Crop water requirement, duration | ⚠️ **sample** | plausible, unsourced |

Income = yield × price − cost. **Price is real; yield and cost are not yet.** So income figures stay badged until sourced.

---

## How the numbers are computed

Every figure in the app can be defended, because none of it is a black box.

**Agricultural monsoon onset** — the first day on or after 1 June where the next 7 days accumulate ≥ 25 mm, with no dry spell longer than 7 consecutive days (< 2.5 mm daily) in the following 30 days. This rejects a false start that would germinate seed and then kill it.

**Trend** — [Theil–Sen](https://en.wikipedia.org/wiki/Theil%E2%80%93Sen_estimator) slope, which is robust to the outlier years that a least-squares fit would chase.

**Significance** — [Mann–Kendall](https://en.wikipedia.org/wiki/Mann%E2%80%93Kendall_test) with tie correction. Trends at p ≥ 0.05 are reported as *not significant* and drawn accordingly.

**Years we cannot plot honestly, we name.** Nashik 1995 (28 Aug) and 2000 (6 Aug) fall outside the chart window and are pinned to the top edge with a caption. **2015 has no point at all** — the monsoon never met the onset criteria that year, which is correct: 2015 was a severe drought.

### A note on data provenance

We began with ERA5 reanalysis via Open-Meteo's archive and got a *different answer per district*. The literature is direct about why: ERA5 shows a post-2000 change point over India that likely reflects changes in assimilated observing systems rather than real precipitation, and reanalyses are considered unsuitable for Indian monsoon trend work without ground validation.

So we switched to IMD's ground-station gridded product. **Open-Meteo remains our live forecast; it is not our evidence base.**

---

## Data sources

| Source | Use | Key needed |
|---|---|---|
| [IMD Pune gridded rainfall](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html) | 0.25° daily rainfall, 1985–2025 | no |
| [Open-Meteo](https://open-meteo.com) | live conditions + 7-day forecast | no |
| [Agmarknet via data.gov.in](https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi) | daily mandi prices | free key |
| [NASA GIBS](https://gibs.earthdata.nasa.gov) | MODIS NDVI vegetation imagery | no |

Total cost: **₹0**. No paid APIs.

---

## Run it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. On a desktop it renders inside a phone bezel; on a phone it fills the screen.

### Reproduce the data

Everything in `src/data/` is generated by the scripts in `scripts/` — nothing is hand-written.

```bash
python scripts/fetch_imd_rainfall.py
```
Downloads 41 NetCDF files from IMD, extracts the nearest grid cell for all 36 districts, and deletes each 25 MB file after use. Requires `scipy` and `numpy` only — the files are NetCDF-3, so no `netCDF4` or `xarray` needed.

```bash
python scripts/build_districts.py
```
Computes onset, Theil–Sen slope and Mann–Kendall p-value per district → `src/data/districts.json`.

```bash
cp .env.example .env.local   # paste your data.gov.in key
python scripts/fetch_mandi_prices.py
```

```bash
python scripts/fetch_satellite_ndvi.py
```
Pulls MODIS NDVI composites from NASA GIBS for the district bounding box, measures
greenness across a cropping year, and writes two static frames plus `src/data/ndvi.json`.
Records the cloud fraction per date and distinguishes a cloud-obscured reading from a
date GIBS never published — an empty tile is not a measurement of zero.
Pulls daily mandi prices → `src/data/prices.json`.

> **Run the price script sparingly.** data.gov.in rate-limits aggressively and signals it with `HTTP 200` and the message `"No query was recieved."` rather than a `429`. The script is deliberately sequential.

The API key is read from `.env.local` at build time and **never enters the browser bundle** — which also means prices work offline on 2G.

---

## Stack

React 19 · Vite 8 · Tailwind 4 · React Router 7

No chart library. The onset chart is hand-written SVG — Recharts' `ResponsiveContainer` intermittently measured 0×0 and rendered an empty chart *with no error*, which is not a failure mode a live demo can afford. Removing it also cut the bundle by 220 KB.

Fonts: Tiro Devanagari Hindi (display), Anek Devanagari (UI), Inter (figures).

---

## Digital public good

Assessed against all nine indicators of the DPG Standard in **[DPG.md](DPG.md)**.

- **MIT licensed** — see [LICENSE](LICENSE)
- **Open data schema** — `src/data/districts.json` and `src/data/prices.json` are plain, documented JSON
- **Reproducible** — every derived file is regenerated by a script in `scripts/`
- **Portable method** — the export is the *method*, not the app. Any region with a rainfall archive and a crop calendar can run this. Adding a crop is one JSON object; adding a district is one row.
- **Sovereign by design** — states share models and methods, never farmer records

---

## Roadmap

- [ ] Climate-resilience score per crop, computed from each district's own 41-year record
- [ ] Leaf-photo disease diagnosis (PlantVillage transfer learning)
- [x] `/policy` — district map of onset shift and significance across Maharashtra
- [x] Regenerative three-season rotation with relative soil-nitrogen balance
- [ ] Soil Health Card N-P-K integration
- [ ] Source per-acre yield and cost from CACP tables, retiring the sample badges

---

<div align="center">

**RITU — the calendar, corrected.**

*"We call it RITU — season. The Sanskrit calendar divided the year into six ritus so farmers would know when to sow. That calendar worked for two thousand years. It stopped working twenty years ago, and nobody rewrote it. We did."*

</div>
