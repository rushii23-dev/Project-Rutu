"""Verify the trend statistics in build_districts.py against outside references.

The claim "the monsoon has moved, significant at p < 0.05" is the load-bearing
one in this project. This script exists so that claim can be checked by anyone,
rather than trusted.

It does NOT re-implement the maths. It extracts theil_sen() and mk_p() from
build_districts.py by AST and runs the shipped functions against:

  1. scipy.stats.theilslopes  - an independent Theil-Sen
  2. scipy.stats.kendalltau   - an independent concordant/discordant count,
                                from which the Mann-Kendall S is recovered
  3. scipy.stats.norm         - the normal CDF, checking the erf() call in mk_p
  4. pymannkendall            - the community-standard MK implementation
                                (optional; skipped if not installed)
  5. a brute-force permutation test - ground truth that needs no library,
                                exact at n=8 and Monte Carlo at real n

It also recomputes every district from data/raw/onset_imd.json and diffs the
result against the shipped src/data/districts.json, so a hand-edited number
cannot survive.

    pip install scipy pymannkendall     # dev only, not runtime dependencies
    python scripts/verify_stats.py

Exits non-zero if anything disagrees.
"""
import ast, itertools, json, math, os, statistics, sys
from collections import Counter

try:
    import numpy as np
    from scipy import stats as sps
except ImportError:
    sys.exit("needs scipy and numpy:  pip install scipy")

try:
    import pymannkendall as pmk
except ImportError:
    pmk = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "build_districts.py")
ONS = os.path.join(ROOT, "data", "raw", "onset_imd.json")
OUT = os.path.join(ROOT, "src", "data", "districts.json")

# ---- load the real functions, not a copy of them ------------------------
_ns = {"statistics": statistics, "math": math, "Counter": Counter}
_want = {"sign", "theil_sen", "mk_p"}
for _node in ast.parse(open(SRC, encoding="utf-8").read()).body:
    if isinstance(_node, ast.FunctionDef) and _node.name in _want:
        exec(compile(ast.Module([_node], []), SRC, "exec"), _ns)
missing = _want - set(_ns)
if missing:
    sys.exit(f"could not extract {missing} from build_districts.py")
sign, theil_sen, mk_p = _ns["sign"], _ns["theil_sen"], _ns["mk_p"]

fails = []


def S_of(ys):
    n = len(ys)
    return sum(sign(ys[j] - ys[i]) for i in range(n - 1) for j in range(i + 1, n))


def mk_z(ys):
    n, S = len(ys), S_of(ys)
    var = (n * (n - 1) * (2 * n + 5)
           - sum(t * (t - 1) * (2 * t + 5) for t in Counter(ys).values())) / 18
    if var <= 0:
        return 0.0
    return (S - 1) / math.sqrt(var) if S > 0 else ((S + 1) / math.sqrt(var) if S < 0 else 0.0)


def report(n, label, ok, detail=""):
    print(f"{n}. {label}\n   {'PASS' if ok else 'FAIL'} {detail}\n")
    if not ok:
        fails.append(label)


rng = np.random.default_rng(7)

# ---- 1. Theil-Sen -------------------------------------------------------
worst = 0.0
for _ in range(300):
    n = int(rng.integers(6, 45))
    xs = sorted(rng.choice(np.arange(1980, 2026), size=n, replace=False).tolist())
    ys = (rng.normal(0, 6, n) + np.array(xs) * rng.uniform(-0.6, 0.6)).round(1).tolist()
    worst = max(worst, abs(theil_sen(xs, ys) - sps.theilslopes(ys, xs).slope))
report(1, "Theil-Sen vs scipy.stats.theilslopes (300 series, gapped x)",
       worst <= 1e-12, f"max |difference| = {worst:.3e}")

# ---- 2. Mann-Kendall S --------------------------------------------------
bad = 0
for _ in range(300):
    n = int(rng.integers(6, 40))
    ys = rng.integers(150, 200, n).tolist()          # integers, so ties are common
    tau_b = sps.kendalltau(list(range(n)), ys, variant="b").statistic
    n0 = n * (n - 1) / 2
    n2 = sum(t * (t - 1) / 2 for t in Counter(ys).values())
    if S_of(ys) != round(tau_b * math.sqrt(n0 * (n0 - n2))):
        bad += 1
report(2, "MK S statistic vs scipy.stats.kendalltau (300 tie-heavy series)",
       bad == 0, f"mismatches = {bad}")

# ---- 3. p-value ---------------------------------------------------------
worst_norm, worst_pmk = 0.0, 0.0
for _ in range(300):
    n = int(rng.integers(8, 45))
    ys = (rng.normal(170, 9, n) + np.arange(n) * rng.uniform(-0.5, 0.5)).round(1).tolist()
    worst_norm = max(worst_norm, abs(mk_p(ys) - 2 * sps.norm.sf(abs(mk_z(ys)))))
    if pmk:
        worst_pmk = max(worst_pmk, abs(mk_p(ys) - pmk.original_test(ys).p))
report(3, "MK p-value vs scipy normal CDF (checks the erf call)",
       worst_norm <= 1e-12, f"max |difference| = {worst_norm:.3e}")
if pmk:
    report("3b", "MK p-value vs pymannkendall.original_test",
           worst_pmk <= 1e-12, f"max |difference| = {worst_pmk:.3e}")
else:
    print("3b. pymannkendall not installed - skipped\n")

# ---- 4. tie handling ----------------------------------------------------
ties_ok = True
for ys in ([5, 5, 5, 5, 6, 6, 6, 7, 7, 8], [1] * 9 + [2], [3] * 12,
           [170, 170, 165, 165, 165, 180, 180, 172, 172, 168, 168, 168]):
    ref = pmk.original_test(ys).p if pmk else 2 * sps.norm.sf(abs(mk_z(ys)))
    ties_ok &= abs(mk_p(ys) - ref) <= 1e-12
report(4, "variance tie-correction, incl. the all-identical degenerate case", ties_ok)

# ---- 5. exact permutation null at n=8 -----------------------------------
print("5. Normal approximation vs the EXACT permutation null (n=8, 40320 perms)")
for ys in ([1, 2, 3, 4, 5, 6, 7, 8], [3, 1, 4, 1, 5, 9, 2, 6],
           [170, 168, 172, 169, 175, 171, 178, 174]):
    obs = abs(S_of(ys))
    dist = [abs(S_of(list(p))) for p in itertools.permutations(ys)]
    ex = sum(1 for d in dist if d >= obs) / len(dist)
    print(f"   {str(ys):40} exact={ex:.5f}  approx={mk_p(ys):.5f}")
print("   (close, not identical - MK is defined to use the normal approximation)\n")

# ---- 6. shipped JSON must reproduce from raw ----------------------------
ons_all = json.load(open(ONS))
shipped = {d["id"]: d for d in json.load(open(OUT, encoding="utf-8"))["districts"]}
diffs, checked = [], 0
for name, rec in ons_all.items():
    if name not in shipped:
        continue
    ons = rec["onset_doy"]
    yrs = sorted(int(y) for y in ons)
    ys = [ons[str(y)] for y in yrs]
    if len(yrs) < 25:
        continue
    checked += 1
    s = shipped[name]["onset"]
    slope, p = theil_sen(yrs, ys), mk_p(ys)
    if (round(slope * 10, 2) != s["slopePerDecade"] or round(p, 4) != s["p"]
            or bool(p < 0.05) != s["significant"]):
        diffs.append(name)
    if abs(sps.theilslopes(ys, yrs).slope - slope) > 1e-12:
        diffs.append(name + " (scipy)")
report(6, f"shipped districts.json reproduces from raw onsets ({checked} districts)",
       not diffs, f"disagreements = {len(diffs)} {diffs if diffs else ''}")

# ---- 7. Monte Carlo permutation test at the real sample sizes -----------
print("7. Monte Carlo permutation test on the districts that matter (50k shuffles)")


def S_rows(M):
    i, j = np.triu_indices(M.shape[1], 1)
    out = np.zeros(M.shape[0], np.int32)
    for a in range(0, M.shape[0], 20000):
        b = M[a:a + 20000]
        out[a:a + 20000] = np.sign(b[:, j] - b[:, i]).sum(axis=1).astype(np.int32)
    return out


mc_ok, N = True, 50_000
for name in ("Dhule", "Nashik", "Solapur", "Ahmednagar"):
    if name not in shipped:
        continue
    ons = ons_all[name]["onset_doy"]
    yrs = sorted(int(y) for y in ons)
    ys = np.array([ons[str(y)] for y in yrs], np.float32)
    obs = abs(int(S_rows(ys[None, :])[0]))
    M = np.empty((N, len(ys)), np.float32)
    for k in range(N):
        M[k] = rng.permutation(ys)
    p_mc = (int(np.count_nonzero(np.abs(S_rows(M)) >= obs)) + 1) / (N + 1)
    p_app = shipped[name]["onset"]["p"]
    agree = (p_mc < 0.05) == (p_app < 0.05)
    mc_ok &= agree
    print(f"   {name:12} n={len(ys):2} app p={p_app:.4f}  permutation p={p_mc:.4f}  "
          f"{'agree' if agree else 'DISAGREE'}")
report(7, "permutation p agrees with the reported p on the significance call", mc_ok)

# ---- 8. how close are the calls to the threshold ------------------------
print("8. Every district by p-value (the 0.05 line is applied without exception)")
rows = []
for name, rec in ons_all.items():
    if name not in shipped:
        continue
    ons = rec["onset_doy"]
    yrs = sorted(int(y) for y in ons)
    if len(yrs) < 25:
        continue
    ys = [ons[str(y)] for y in yrs]
    rows.append((mk_p(ys), name, theil_sen(yrs, ys) * 10, len(ys)))
for p, name, sl, n in sorted(rows)[:6]:
    tag = "  <-- significant" if p < 0.05 else ("  <-- just misses" if p < 0.10 else "")
    print(f"   p={p:.4f}  {name:18} {sl:+6.2f}/decade  n={n:2}{tag}")
print(f"   ... {len(rows) - 6} more, all p >= {sorted(rows)[6][0]:.3f}\n")

print("=" * 60)
print("ALL CHECKS PASSED" if not fails else "FAILED:\n  " + "\n  ".join(map(str, fails)))
print("=" * 60)
sys.exit(1 if fails else 0)
