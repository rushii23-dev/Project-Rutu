<div align="center">

# ऋतु · RUTU

### The calendar, corrected.

**A farmer's inherited knowledge has an expiry date, and nobody told him it expired.**

`मौसम बदल गया. आता माहितीही बदलेल.`

**Live: [rutu-one.vercel.app](https://rutu-one.vercel.app)**

[![Licence: MIT](https://img.shields.io/badge/licence-MIT-2E6B3F.svg)](LICENSE)
[![Data: IMD Pune](https://img.shields.io/badge/rainfall-IMD%20Pune%201985--2025-17150F.svg)](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html)
[![Forecast: Open-Meteo](https://img.shields.io/badge/forecast-Open--Meteo-5B7C86.svg)](https://open-meteo.com)
[![Prices: Agmarknet](https://img.shields.io/badge/prices-Agmarknet-C1531B.svg)](https://data.gov.in)

</div>

---

## The idea

A farmer sows on the date his father sowed. That date was right for fifty years. The climate moved underneath it and nobody told him.

Most advisories recommend a crop. RITU corrects the **calendar** — it measures when the monsoon actually arrives in *your* block now, and moves the sowing window to match.

## What the data says

We computed monsoon onset for every district-year from 41 years of IMD daily rainfall, and tested every trend for significance.

**Nashik's monsoon arrives 14 days earlier than it did in 1985** — 27 June → 14 June, −5.2 days per decade, p = 0.018. Dhule the same. It also rains more, on more days, with shorter dry spells.

Onset across Maharashtra spans **38 days**, from 3 June in Ratnagiri to 11 July in Ahmednagar — which is why one statewide sowing date is wrong almost everywhere.

**In 34 of 36 districts we found no significant shift, and the app says so** rather than drawing a trend line that isn't there.

**Sowing on the old date costs a Nashik farmer about ₹15,000 on 3 acres of soybean.** That is 14 days × the loss rate measured in a published field trial (14.86 kg/ha per day of delay, Dr. PDKV Akola) × the latest Agmarknet price. No sample figures go into it.

## What it does

**Farmer view** (`/`) — phone-sized, Marathi first, everything in rupees.

- **Corrected sowing window**, counted from your district's own onset — and a *Why this date* screen explaining how it was derived, and what we do **not** claim
- **What the old date costs, in rupees** — from a published field trial and the day's mandi price, with the trial's measured yields on screen
- **The farming year, not just sowing** — once the crop is in, the home screen follows it: estimated stage, and this week's forecast turned into field warnings (rain at harvest, heavy rain, heat at flowering, frost, a dry week, whether to spray today)
- **When to sell** — 11 years of real Agmarknet prices per district: sell at harvest, or hold, and in how many years holding actually paid
- **District soil** — Soil Health Card results for 926,596 field tests across 34 districts (2025-26 cycle), shown as the odds for *your* field, with what to do about them
- **Which crop, and why not the others** — every crop of the season ranked side by side, each one given its own reason for losing, priced in rupees, with the ranking model printed on the screen
- **Climate-resilience score** per crop, from that district's rainfall record
- **Regenerative rotation** — three seasons, with the soil-nitrogen trajectory
- **Leaf disease diagnosis** from a photo, run on the phone, never uploaded
- Live weather with sowing advice · real mandi prices · satellite vegetation
- **Ask** — typed questions in Marathi, Hindi or English (sowing, selling, soil, prices, rain), answered from data we hold, never generated
- Installs as a PWA and works offline

**State view** (`/policy`) — laptop-sized. All 36 districts mapped by onset shift and significance, plus the federation model: *models cross borders, farmer records do not.*

## What's real and what isn't

The app labels its own limits on screen, not just here.

| Real | Sample / limited |
|---|---|
| Onset, trends, significance (IMD, 1985–2025) | Per-acre income — placeholder, badged in the UI |
| Rainfall stats: rain days, totals, dry spells | Crop water needs — agronomic rules of thumb |
| Live forecast (Open-Meteo) | Disease loss and treatment costs — unsourced |
| Mandi prices, all 36 districts (Agmarknet) | Satellite layer — Nashik only |
| 11 years of mandi prices behind *when to sell* (Agmarknet, 2015–2026) | The 1%-a-month cost of holding a crop — our stated assumption |
| Soil Health Card results, 34 districts, 3 cycles | Soil is the district's odds, not the farmer's field — the screen says so |
| Late-sowing loss rate (published field trial) | That trial is one season at Akola, applied to Nashik — labelled an estimate |
| Disease model, maize, 86.7% on held-out lab images | Disease covers **1 of 9 crops** — PlantVillage has no disease class for the rest |
| | Crop stage is estimated from the corrected sowing window, not observed |

The disease model declines to answer below 60% confidence, and warns when the answer is one of the two classes it genuinely confuses.

The statistics are verified against scipy, pymannkendall and a permutation test — run `python scripts/verify_stats.py`.

## Run it

```bash
npm install
npm run dev
```

```bash
npm run check
```

`check` lints and builds. Everything in `src/data/` is regenerated by the scripts in `scripts/` — nothing is hand-written.

Deploys to Vercel as-is: import the repo, no settings to change. `vercel.json` rewrites deep links to `index.html` so `/policy` and `/crops/soy` resolve on a first visit, and leaves the model and assets to be served as files.

## Data sources

| Source | Use | Key |
|---|---|---|
| [IMD Pune](https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html) | 0.25° daily rainfall, 1985–2025 | no |
| [Open-Meteo](https://open-meteo.com) | live conditions + 7-day forecast | no |
| [Agmarknet](https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi) | daily mandi prices, refreshed twice a day by CI | free |
| [NASA GIBS](https://gibs.earthdata.nasa.gov) | MODIS NDVI imagery | no |
| [PlantVillage](https://github.com/spMohanty/PlantVillage-Dataset) | leaf disease training images | no |
| [Agmarknet history](https://data.gov.in/resource/variety-wise-daily-market-prices-data-commodity) | 1.3M daily market prices, 2015–2026, for *when to sell* | free |
| [Soil Health Card](https://soilhealth.dac.gov.in/nutrient-dashboard) | district nutrient status, 2023-24 to 2025-26 | no |
| Nath et al. 2017, *J. Appl. Nat. Sci.* 9(1):544–550 | soybean yield lost per day of late sowing | — |

Total cost: **₹0**.

Prices refresh themselves: `.github/workflows/refresh-prices.yml` runs twice a day, commits `src/data/prices.json` when it changes, and the commit redeploys. The key lives in the `DATA_GOV_KEY` repository secret and never enters the bundle. A Sunday or holiday returns a thin day, so the script refuses to shrink district coverage and leaves the fuller file alone.

## Stack

React 19 · Vite 8 · Tailwind 4 · TensorFlow.js (lazy-loaded, kept out of the first paint)

The onset chart is hand-written SVG. Recharts intermittently measured 0×0 and rendered an empty chart *with no error* — not a failure mode a live demo can afford.

## Digital public good

Assessed against all nine DPG Standard indicators in **[DPG.md](DPG.md)**. MIT licensed, open JSON schema, every derived file reproducible from a script.

The export is the **method**, not the app. Any region with a rainfall archive and a crop calendar can run this — adding a district is one row.

---

<div align="center">

**RITU — the calendar, corrected.**

</div>
