#!/usr/bin/env python3
"""ASCII map of Pirate Bay from bay.ts (parsed, not retyped). usage: map.py <bay.ts> [extra 'name:x,y' ...]"""
import re, sys, json
src = open(sys.argv[1]).read()
def pts(name):
    body = re.search(r'export const %s: Pt\[\] = \[([\s\S]*?)\];' % name, src).group(1)
    body = re.sub(r'//.*', '', body); body = re.sub(r'\s+', '', body).rstrip(',')
    return json.loads('[' + body + ']')
LAND, WATER, PROM, TRAIL = pts('BAY_LAND'), pts('BAY_WATER'), pts('PROMENADE'), pts('TRAIL')
PIERS = json.loads('[' + re.sub(r'\s+', '', re.search(r'PIERS: \[number, number, number, number\]\[\] = \[([\s\S]*?)\];', src).group(1)).rstrip(',') + ']')
regions = re.findall(r"id: '(\w+)'[\s\S]*?poly: (\[\[[\s\S]*?\]\])", src)
def inpoly(x, y, P):
    c = False; n = len(P)
    for i in range(n):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c
def dseg(x, y, a, b):
    ax, ay = a; bx, by = b; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy or 1
    t = max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / L)); px, py = ax + t * dx, ay + t * dy
    return ((x - px) ** 2 + (y - py) ** 2) ** .5
def dpath(x, y, P): return min(dseg(x, y, P[i], P[i + 1]) for i in range(len(P) - 1))
X0, X1, Y0, Y1 = 1500, 10800, 400, 11000; W, H = 110, 56
sx, sy = (X1 - X0) / W, (Y1 - Y0) / H
grid = [[' '] * W for _ in range(H)]
for j in range(H):
    for i in range(W):
        x, y = X0 + (i + .5) * sx, Y0 + (j + .5) * sy
        ch = ' '
        if inpoly(x, y, LAND):
            ch = '.'
            for rid, poly in regions:
                if inpoly(x, y, json.loads(poly)): ch = rid[0]
            if inpoly(x, y, WATER): ch = '~'
            if dpath(x, y, TRAIL) < 130: ch = '='
            if dpath(x, y, PROM) < 175: ch = '#'
            for x0, y0, x1, y1 in PIERS:
                if dseg(x, y, (x0, y0), (x1, y1)) < 75: ch = 'P'
        grid[j][i] = ch
def mark(x, y, c):
    i, j = int((x - X0) / sx), int((y - Y0) / sy)
    if 0 <= i < W and 0 <= j < H: grid[j][i] = c
for a in sys.argv[2:]:
    name, xy = a.split(':'); x, y = map(float, xy.split(',')); mark(x, y, name[0])
for p in PROM[0], PROM[-1], TRAIL[0], TRAIL[-1]: mark(p[0], p[1], '@')
print('x %d..%d (col=%.0f)  y %d..%d (row=%.0f)   . land  ~ bay  # promenade  = trail  P pier  @ road end  letters = region initial / landmark' % (X0, X1, sx, Y0, Y1, sy))
for j in range(H): print('%5d %s' % (Y0 + j * sy, ''.join(grid[j])))
