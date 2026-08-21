"""Emit src/data/districts.json — real IMD onset stats for all 36 districts.

Districts with no statistically significant trend are marked significant:false so
the UI can say so plainly instead of drawing a trend line that isn't there.
"""
import json, statistics, math, datetime
from collections import Counter

RAW = r"D:/Project RITU/data/raw/imd_rainfall_maharashtra.json"
ONS = r"D:/Project RITU/data/raw/onset_imd.json"
OUT = r"D:/Project RITU/src/data/districts.json"
PLOT = [150, 212]

DEV = {
 "Mumbai City":"मुंबई शहर","Mumbai Suburban":"मुंबई उपनगर","Thane":"ठाणे","Palghar":"पालघर",
 "Raigad":"रायगड","Ratnagiri":"रत्नागिरी","Sindhudurg":"सिंधुदुर्ग","Nashik":"नाशिक",
 "Dhule":"धुळे","Nandurbar":"नंदुरबार","Jalgaon":"जळगाव","Ahmednagar":"अहमदनगर",
 "Pune":"पुणे","Satara":"सातारा","Sangli":"सांगली","Solapur":"सोलापूर","Kolhapur":"कोल्हापूर",
 "Ch.Sambhajinagar":"छत्रपती संभाजीनगर","Jalna":"जालना","Beed":"बीड","Latur":"लातूर",
 "Dharashiv":"धाराशिव","Nanded":"नांदेड","Parbhani":"परभणी","Hingoli":"हिंगोली",
 "Amravati":"अमरावती","Akola":"अकोला","Washim":"वाशिम","Buldhana":"बुलढाणा",
 "Yavatmal":"यवतमाळ","Nagpur":"नागपूर","Wardha":"वर्धा","Bhandara":"भंडारा",
 "Gondia":"गोंदिया","Chandrapur":"चंद्रपूर","Gadchiroli":"गडचिरोली",
}

def sign(x): return (x > 0) - (x < 0)

def theil_sen(xs, ys):
    return statistics.median(
        [(ys[j]-ys[i])/(xs[j]-xs[i]) for i in range(len(xs)) for j in range(i+1, len(xs))])

def mk_p(ys):
    n = len(ys)
    S = sum(sign(ys[j]-ys[i]) for i in range(n-1) for j in range(i+1, n))
    var = (n*(n-1)*(2*n+5) - sum(t*(t-1)*(2*t+5) for t in Counter(ys).values()))/18
    if var <= 0: return 1.0
    z = (S-1)/math.sqrt(var) if S > 0 else ((S+1)/math.sqrt(var) if S < 0 else 0.0)
    return 2*(1 - 0.5*(1 + math.erf(abs(z)/math.sqrt(2))))

raw = json.load(open(RAW))
ons_all = json.load(open(ONS))
dates, rain, meta = raw["dates"], raw["rainfall_mm"], raw["meta"]
coords = {d["name"]: d for d in meta["districts"]}

def season_metrics(name, years):
    out = {}
    for key in ("rain_days", "seasonal", "dry"):
        out[key] = []
    for y in years:
        v = [x for a, x in zip(dates[str(y)], rain[name][str(y)])
             if 6 <= int(a[5:7]) <= 9 and x is not None]
        rd = [x for x in v if x >= 2.5]
        m = r = 0
        for x in v:
            r = r+1 if x < 2.5 else 0
            m = max(m, r)
        out["rain_days"].append(len(rd))
        out["seasonal"].append(sum(v))
        out["dry"].append(m)
    return out

districts = []
for name in sorted(rain):
    rec = ons_all.get(name)
    if not rec: continue
    ons = rec["onset_doy"]
    yrs = sorted(int(y) for y in ons)
    ys = [ons[str(y)] for y in yrs]
    if len(yrs) < 25: continue

    slope = theil_sen(yrs, ys)
    p = mk_p(ys)
    med_x, med_y = statistics.median(yrs), statistics.median(ys)

    early = [ons[str(y)] for y in yrs if y <= 1994]
    late = [ons[str(y)] for y in yrs if y >= 2016]

    all_years = list(range(min(yrs), 2026))
    no_onset = [y for y in all_years if str(y) not in ons]
    off = [y for y in yrs if ons[str(y)] > PLOT[1]]

    sm_e = season_metrics(name, [y for y in yrs if y <= 1994])
    sm_l = season_metrics(name, [y for y in yrs if y >= 2016])

    districts.append({
        "id": name,
        "en": name,
        "dev": DEV.get(name, name),
        "division": coords[name]["division"],
        "lat": coords[name]["lat"],
        "lon": coords[name]["lon"],
        "onset": {
            "slopePerDecade": round(slope*10, 2),
            "p": round(p, 4),
            "significant": bool(p < 0.05),
            "fatherDoy": round(statistics.mean(early), 1),
            "todayDoy": round(statistics.mean(late), 1),
            "shiftDays": round(statistics.mean(late) - statistics.mean(early), 1),
            "nYears": len(yrs),
            "yearFrom": min(yrs), "yearTo": max(yrs),
            "plotDomain": PLOT,
            "noOnsetYears": no_onset,
            "offScaleYears": off,
            "series": [{"y": y, "d": ons[str(y)],
                        "p": min(ons[str(y)], PLOT[1]),
                        "o": ons[str(y)] > PLOT[1],
                        "t": round(med_y + slope*(y-med_x), 2)} for y in yrs],
        },
        "supporting": {
            "rainDays": {"then": round(statistics.mean(sm_e["rain_days"]), 1),
                         "now": round(statistics.mean(sm_l["rain_days"]), 1)},
            "seasonal": {"then": round(statistics.mean(sm_e["seasonal"])),
                         "now": round(statistics.mean(sm_l["seasonal"]))},
            "dry": {"then": round(statistics.mean(sm_e["dry"]), 1),
                    "now": round(statistics.mean(sm_l["dry"]), 1)},
        },
    })

payload = {
    "source": {
        "name": "IMD Pune gridded daily rainfall 0.25 x 0.25 degree",
        "url": "https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html",
        "years": "1985-2025",
    },
    "method": {
        "onset": "First day from 1 June where the next 7 days accumulate >=25mm, "
                 "with no dry spell longer than 7 days in the following 30 days.",
        "trend": "Theil-Sen slope; significance by Mann-Kendall test (p<0.05).",
    },
    "districts": districts,
}
json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

sig = [d for d in districts if d["onset"]["significant"]]
print(f"wrote {OUT}")
print(f"  districts: {len(districts)}  significant: {len(sig)}")
for d in sorted(sig, key=lambda x: x["onset"]["slopePerDecade"]):
    print(f"    {d['en']:18} {d['onset']['slopePerDecade']:+6.1f} d/dec  p={d['onset']['p']}")
