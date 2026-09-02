#!/usr/bin/env python3
"""coast.py <bay.ts> x,y ... — is each point inside the SMOOTHED Pirate coast (bay.ts smoothPoly(BAY_LAND, 6))?"""
import re, sys, json
src = open(sys.argv[1]).read()
body = re.search(r'export const BAY_LAND: Pt\[\] = \[([\s\S]*?)\];', src).group(1)
LAND = json.loads('[' + re.sub(r'\s+', '', re.sub(r'//.*', '', body)).rstrip(',') + ']')
def smooth(pts, steps=6):
    out = []; n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]; p = pts[(i - 1) % n]
        m0 = ((p[0] + a[0]) / 2, (p[1] + a[1]) / 2); m1 = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        for s in range(steps):
            t = s / steps; it = 1 - t
            out.append((it * it * m0[0] + 2 * it * t * a[0] + t * t * m1[0], it * it * m0[1] + 2 * it * t * a[1] + t * t * m1[1]))
    return out
S = smooth(LAND)
def inpoly(x, y, P):
    c = False; n = len(P)
    for i in range(n):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def dring(x, y):
    best = 1e9
    for i in range(len(S)):
        ax, ay = S[i]; bx, by = S[(i + 1) % len(S)]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy or 1
        t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L)); best = min(best, ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2) ** .5)
    return best
for a in sys.argv[2:]:
    x, y = map(float, a.split(','))
    print('%7.0f,%-7.0f %s  coast %.0f world (%.1f units) away' % (x, y, 'LAND ' if inpoly(x, y, S) else 'WATER', dring(x, y), dring(x, y) / 20))
