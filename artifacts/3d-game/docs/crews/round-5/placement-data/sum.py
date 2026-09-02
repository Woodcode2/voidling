#!/usr/bin/env python3
"""sum.py <json>... — one markdown table row per world in each qa/placement.mjs --json file."""
import json, sys
COLS = ['road', 'water', 'offisland', 'float', 'inside', 'under', 'overlap', 'roadend', 'door', 'bench', 'sunk']
def n(k, v):
    return len([o for o in v if not o.get('ok')]) if k == 'roadend' else len(v)
for f in sys.argv[1:]:
    d = json.load(open(f))
    for wid, m in d.items():
        cats = m.get('cats', {})
        props = m.get('props') or m.get('n') or m.get('count') or '?'
        row = [wid, str(props)] + [str(n(k, cats.get(k, []))) for k in COLS]
        print('| ' + ' | '.join(row) + ' |   <- ' + f)
