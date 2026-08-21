import os, sys, json, time, datetime, urllib.request, urllib.parse
import numpy as np
from scipy.io import netcdf_file

OUT = r"D:/Project RITU/data/raw"
TMP = os.path.dirname(os.path.abspath(__file__))
URL = "https://www.imdpune.gov.in/cmpg/Griddata/RF25.php"

DISTRICTS = [
 ("Mumbai City",18.94,72.83,"Konkan"),("Mumbai Suburban",19.15,72.85,"Konkan"),
 ("Thane",19.22,72.98,"Konkan"),("Palghar",19.70,72.77,"Konkan"),
 ("Raigad",18.51,73.18,"Konkan"),("Ratnagiri",16.99,73.30,"Konkan"),
 ("Sindhudurg",16.13,73.66,"Konkan"),("Nashik",20.00,73.79,"Nashik"),
 ("Dhule",20.90,74.77,"Nashik"),("Nandurbar",21.37,74.24,"Nashik"),
 ("Jalgaon",21.01,75.56,"Nashik"),("Ahmednagar",19.10,74.75,"Nashik"),
 ("Pune",18.52,73.86,"Pune"),("Satara",17.69,74.00,"Pune"),
 ("Sangli",16.85,74.58,"Pune"),("Solapur",17.66,75.91,"Pune"),
 ("Kolhapur",16.70,74.24,"Pune"),("Ch.Sambhajinagar",19.88,75.34,"Marathwada"),
 ("Jalna",19.84,75.88,"Marathwada"),("Beed",18.99,75.76,"Marathwada"),
 ("Latur",18.40,76.57,"Marathwada"),("Dharashiv",18.19,76.04,"Marathwada"),
 ("Nanded",19.15,77.32,"Marathwada"),("Parbhani",19.27,76.78,"Marathwada"),
 ("Hingoli",19.72,77.15,"Marathwada"),("Amravati",20.93,77.75,"Amravati"),
 ("Akola",20.71,77.00,"Amravati"),("Washim",20.11,77.13,"Amravati"),
 ("Buldhana",20.53,76.18,"Amravati"),("Yavatmal",20.39,78.13,"Amravati"),
 ("Nagpur",21.15,79.09,"Nagpur"),("Wardha",20.75,78.60,"Nagpur"),
 ("Bhandara",21.17,79.65,"Nagpur"),("Gondia",21.46,80.20,"Nagpur"),
 ("Chandrapur",19.95,79.30,"Nagpur"),("Gadchiroli",20.18,80.00,"Nagpur"),
]

def log(m):
    print(f"[{datetime.datetime.now():%H:%M:%S}] {m}", flush=True)

def grab(year, path):
    data = urllib.parse.urlencode({"RF25": str(year)}).encode()
    req = urllib.request.Request(URL, data=data, headers={
        "User-Agent":"Mozilla/5.0","Referer":"https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html"})
    for a in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as r, open(path,"wb") as f:
                f.write(r.read())
            if os.path.getsize(path) > 1_000_000 and open(path,"rb").read(3)==b"CDF":
                return True
            log(f"  {year}: bad payload ({os.path.getsize(path)}b), retry")
        except Exception as e:
            log(f"  {year}: {type(e).__name__} {e}, retry {a+1}/5")
        time.sleep(6*(a+1))
    return False

series = {n: {} for n,_,_,_ in DISTRICTS}
idx = None
years = list(range(1985, 2026))
done = []
for y in years:
    nc = os.path.join(TMP, f"imd_{y}.nc")
    if not (os.path.exists(nc) and os.path.getsize(nc)>1_000_000):
        if not grab(y, nc):
            log(f"{y}: FAILED — skipping"); continue
    try:
        f = netcdf_file(nc,"r",mmap=False)
    except Exception as e:
        log(f"{y}: unreadable {e}"); continue
    lat = f.variables["LATITUDE"][:].astype(float)
    lon = f.variables["LONGITUDE"][:].astype(float)
    if idx is None:
        idx = {n:(int(np.abs(lat-la).argmin()), int(np.abs(lon-lo).argmin())) for n,la,lo,_ in DISTRICTS}
    rain = f.variables["RAINFALL"][:]
    t = f.variables["TIME"][:].astype(float)
    base = datetime.date(1900,12,31)
    dates = [(base+datetime.timedelta(days=int(d))).isoformat() for d in t]
    for n,(i,j) in idx.items():
        v = rain[:, i, j].astype(float)
        v = np.where(v < -90, np.nan, v)
        series[n][str(y)] = [None if np.isnan(x) else round(float(x),2) for x in v]
    f.close()
    series.setdefault("_dates", {})[str(y)] = dates
    done.append(y)
    log(f"{y}: ok  days={len(dates)}  sample Yavatmal JJAS={np.nansum(rain[151:273, *idx['Yavatmal']]):.0f}mm")
    os.remove(nc)

meta = {"source":"IMD Pune 0.25x0.25 gridded daily rainfall",
        "url":"https://www.imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html",
        "years":done, "districts":[{"name":n,"lat":la,"lon":lo,"division":d} for n,la,lo,d in DISTRICTS],
        "grid_index":{k:list(v) for k,v in idx.items()} if idx else {}}
with open(os.path.join(OUT,"imd_rainfall_maharashtra.json"),"w") as f:
    json.dump({"meta":meta,"dates":series.pop("_dates"),"rainfall_mm":series}, f)
log(f"WROTE {OUT}/imd_rainfall_maharashtra.json  years={len(done)} ({min(done)}-{max(done)})")
