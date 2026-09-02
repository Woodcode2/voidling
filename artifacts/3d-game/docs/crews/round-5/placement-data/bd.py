#!/usr/bin/env python3
"""bd.py <json> <world> <cat> [top] — histogram of offender classes in one category (kind r= foot=WxD h=H), plus 3 samples."""
import json, sys, re, collections
d = json.load(open(sys.argv[1])); w = sys.argv[2]; cat = sys.argv[3]; top = int(sys.argv[4]) if len(sys.argv) > 4 else 12
L = d[w]['cats'].get(cat, [])
if cat == 'roadend': L = [o for o in L if not o.get('ok')]
def cls(desc):
    # "#12 kind r=2.4 foot=5.8x3.6 h=3.3 at (x,z)" -> "kind r=2.4 foot=5.8x3.6"
    m = re.findall(r'#\d+ (\w+) r=([\d.]+) foot=([\d.]+)x([\d.]+) h=([\d.]+)', desc)
    return ' x '.join('%s r=%s %sx%s h%s' % (k, r, fx, fz, h) for k, r, fx, fz, h in m) or desc[:60]
h = collections.Counter(cls(o['d']) for o in L)
print('%s/%s: %d entries, %d classes' % (w, cat, len(L), len(h)))
for k, n in h.most_common(top): print('%5d  %s' % (n, k))
for o in L[:3]: print('   e.g.', o['d'][:150], o.get('depth', ''))
