#!/usr/bin/env python3
"""World-class seamless biome ground textures for Voidling.
FFT-based fractal noise is inherently periodic -> tiles seamlessly.
Outputs 2048x2048 PNGs matching the game's tex_*.png filenames."""
import numpy as np
from PIL import Image, ImageFilter
import sys, os

SIZE = 512
OUT = "/home/user/voidling/artifacts/3d-game/public/assets"

def _rng(seed): return np.random.default_rng(seed)

def tileable_noise(size, beta, seed, lowcut=0):
    """Periodic fractal noise in [0,1]. beta ~ 1.6-2.6 (higher = smoother/blobbier)."""
    rng = _rng(seed)
    white = rng.standard_normal((size, size))
    f = np.fft.fft2(white)
    fx = np.fft.fftfreq(size)[:, None]
    fy = np.fft.fftfreq(size)[None, :]
    radius = np.sqrt(fx**2 + fy**2)
    radius[0, 0] = 1.0
    filt = 1.0 / (radius ** beta)
    if lowcut:  # kill very-low frequencies to avoid big flat gradients
        filt[radius < lowcut] = 0
    out = np.fft.ifft2(f * filt).real
    out -= out.min(); out /= (out.max() + 1e-9)
    return out

def ramp(n, stops):
    """Map n in [0,1] through color stops [(t, (r,g,b)), ...]."""
    ts = np.array([s[0] for s in stops])
    cs = np.array([s[1] for s in stops], dtype=float)
    out = np.empty(n.shape + (3,), dtype=float)
    for c in range(3):
        out[..., c] = np.interp(n, ts, cs[:, c])
    return out

def hi(seed, size=SIZE, scale=1.0):
    """High-frequency stipple detail in [-1,1]."""
    rng = _rng(seed)
    w = rng.standard_normal((size, size))
    f = np.fft.fft2(w)
    fx = np.fft.fftfreq(size)[:, None]; fy = np.fft.fftfreq(size)[None, :]
    r = np.sqrt(fx**2 + fy**2); r[0,0]=1
    band = np.exp(-((r-0.12*scale)**2)/(2*(0.06*scale)**2))
    o = np.fft.ifft2(f*band).real
    o /= (np.abs(o).max()+1e-9)
    return o

def save(arr, name):
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    Image.fromarray(arr, "RGB").save(f"{OUT}/{name}.png")
    print("wrote", name)

def shade(base, amt):
    """Add soft large-scale light/shadow for depth."""
    return base

# ---------------- GRASS ----------------
def grass():
    clumps = tileable_noise(SIZE, 2.3, 11, lowcut=0.004)   # big lawn variation
    mid    = tileable_noise(SIZE, 1.9, 12)                  # medium clumps
    n = 0.6*clumps + 0.4*mid
    n = (n - n.min())/(n.max()-n.min())
    col = ramp(n, [
        (0.0, (74, 122, 60)),    # deep cool green (shadowed clumps)
        (0.35,(104, 156, 74)),
        (0.6, (128, 176, 92)),
        (0.85,(150, 194, 108)),
        (1.0, (176, 212, 132)),  # warm sunlit tips
    ])
    # fine blade stipple
    blades = hi(21, scale=2.4)
    col += (blades[...,None] * np.array([10, 16, 6])) * 1.2
    # sparse warm dandelion/clover flecks
    rng=_rng(31); spot = rng.random((SIZE,SIZE))
    flower = spot > 0.9975
    col[flower] = np.array([232, 224, 150])
    save(col, "tex_grass")

# ---------------- FOREST FLOOR ----------------
def forest():
    canopy = tileable_noise(SIZE, 2.4, 41, lowcut=0.004)   # dappled shade
    litter = tileable_noise(SIZE, 1.7, 42)
    n = 0.55*canopy + 0.45*litter
    n=(n-n.min())/(n.max()-n.min())
    col = ramp(n, [
        (0.0, (44, 72, 44)),     # deep shade
        (0.35,(60, 90, 52)),
        (0.6, (78, 104, 58)),
        (0.8, (96, 116, 66)),
        (1.0, (120, 132, 80)),   # sun gaps
    ])
    # leaf litter / twigs
    lit = hi(43, scale=2.0)
    col += (lit[...,None]*np.array([16,12,4]))*1.4
    rng=_rng(44); s=rng.random((SIZE,SIZE))
    # brown leaves scattered
    leaves = s>0.992
    col[leaves] = col[leaves]*0.5 + np.array([112, 78, 44])*0.5
    # darker roots/dirt patches (low canopy)
    dirt = canopy < 0.16
    col[dirt] = col[dirt]*0.6 + np.array([84, 66, 46])*0.4
    save(col, "tex_forest")

# ---------------- SAND ----------------
def sand():
    dunes = tileable_noise(SIZE, 2.5, 51, lowcut=0.003)
    # directional ripples
    x = np.linspace(0, 40*np.pi, SIZE)
    ripple = 0.5+0.5*np.sin(x[None,:] + 6.0*tileable_noise(SIZE,2.6,52))
    n = 0.7*dunes + 0.3*ripple
    n=(n-n.min())/(n.max()-n.min())
    col = ramp(n, [
        (0.0,(206, 180, 132)),
        (0.4,(224, 200, 152)),
        (0.7,(236, 216, 170)),
        (1.0,(246, 230, 190)),
    ])
    grain = hi(53, scale=3.0)
    col += grain[...,None]*np.array([8,7,5])
    # tiny pebbles/shells
    rng=_rng(54); s=rng.random((SIZE,SIZE))
    peb = s>0.9985
    col[peb] = np.array([180,150,120])
    save(col, "tex_sand")

# ---------------- WATER ----------------
def water():
    swell = tileable_noise(SIZE, 2.6, 61, lowcut=0.004)
    fine  = tileable_noise(SIZE, 1.8, 62)
    n = 0.7*swell + 0.3*fine
    n=(n-n.min())/(n.max()-n.min())
    col = ramp(n, [
        (0.0,(30, 92, 140)),
        (0.5,(46, 120, 168)),
        (0.8,(74, 154, 196)),
        (1.0,(150, 210, 230)),   # crest highlights
    ])
    # sparkle caustics on crests
    spark = np.clip(n-0.86,0,1)*7
    col += spark[...,None]*np.array([40,50,55])
    save(col, "tex_water")

# ---------------- STREET (downtown paving stone) ----------------
def street():
    # seamless paving grid: divide tile into an even NxN of cobbles
    N = 12
    cell = SIZE//N
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    gx = (xx % cell); gy = (yy % cell)
    # rounded-square cobble mask via distance to cell center
    cxp = cell/2; cyp = cell/2
    d = np.maximum(np.abs(gx-cxp), np.abs(gy-cyp))/(cell/2)
    grout = np.clip((d-0.86)/0.14, 0, 1)   # 0 inside cobble, 1 in grout
    # per-cobble color variation (seamless: index by cell id, wraps)
    ci = ((yy//cell)*N + (xx//cell))
    rng=_rng(71); tint = rng.random(N*N)
    tintmap = tint[ci % (N*N)]
    base = ramp(tintmap, [
        (0.0,(96, 88, 80)),
        (0.5,(118, 108, 96)),
        (1.0,(140, 128, 112)),
    ])
    # aggregate speckle within stones
    agg = hi(72, scale=3.2)
    base += agg[...,None]*np.array([10,9,8])
    # subtle dome shading per cobble (brighter center)
    dome = (1-d)[...,None]*np.array([10,9,8])*0.6
    base += dome
    grout_col = np.array([58, 52, 48])
    col = base*(1-grout[...,None]) + grout_col*grout[...,None]
    save(col, "tex_street")

# ---------------- SIDEWALK (concrete slabs) ----------------
def sidewalk():
    N = 8
    cell = SIZE//N
    yy, xx = np.mgrid[0:SIZE,0:SIZE]
    gx=(xx%cell); gy=(yy%cell)
    joint = ((gx<5)|(gy<5)).astype(float)*0.7  # softer expansion joints
    ci=((yy//cell)*N+(xx//cell))
    rng=_rng(81); tint=rng.random(N*N); tm=tint[ci%(N*N)]
    base = ramp(tm, [(0.0,(190,186,180)),(1.0,(204,200,194))])  # tighter slab-to-slab variation
    spec = hi(82, scale=3.0)
    base += spec[...,None]*np.array([5,5,5])
    jc = np.array([168,164,158])
    col = base*(1-joint[...,None]) + jc*joint[...,None]
    save(col, "tex_sidewalk")

if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv)>1 else "all"
    fns = {"grass":grass,"forest":forest,"sand":sand,"water":water,"street":street,"sidewalk":sidewalk}
    if which=="all":
        for f in fns.values(): f()
    else:
        for w in which.split(","): fns[w]()
    print("done")
