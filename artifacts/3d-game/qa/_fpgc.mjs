// Are the spikes GARBAGE COLLECTION? Correlates the worst animate() calls in an
// _fp2.mjs capture against the heap delta on the same frame. A major GC shows as
// a large NEGATIVE heap step on the frame that was slow.
//   node qa/_fpgc.mjs qa-out/fp2-<world>-js.json
import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const n = d.n, st = 30;
const dh = i => (d.heap[i] - d.heap[i - 1]) / 1048576;
const js = d.js.slice(st);
const sorted = [...js].sort((a, x) => a - x);
const med = sorted[sorted.length >> 1];
const thr = 4 * med;
let spikes = 0, withDrop = 0, dropSum = 0;
const rows = [];
for (let i = st + 1; i < n; i++) {
  if (d.js[i] <= thr) continue;
  spikes++;
  const h = dh(i);
  if (h < -0.25) { withDrop++; dropSum += -h; }
  rows.push({ i, js: d.js[i], t: d.t[i], h });
}
rows.sort((a, x) => x.js - a.js);
console.log(`${process.argv[2]}   p50 ${med.toFixed(2)}ms   spikes >4x = ${spikes}`);
console.log(`  of those, ${withDrop} (${(100 * withDrop / spikes).toFixed(0)}%) land on a frame where the heap DROPPED >256KB  → major GC`);
console.log(`  worst 20 spikes:   ms      t      heap delta on that frame`);
for (const r of rows.slice(0, 20))
  console.log(`    ${r.js.toFixed(1).padStart(8)}  ${r.t.toFixed(1).padStart(6)}  ${r.h >= 0 ? '+' : ''}${r.h.toFixed(2)} MB${r.h < -0.25 ? '   ← GC' : ''}`);
// how much of the total frame budget across the match do the spikes account for
const tot = js.reduce((a, x) => a + x, 0);
const sp = rows.reduce((a, x) => a + x.js, 0);
console.log(`  spikes are ${(100 * rows.length / js.length).toFixed(2)}% of frames but ${(100 * sp / tot).toFixed(1)}% of all main-thread JS time`);
// GC frames vs non-GC frames, median
const g = [], ng = [];
for (let i = st + 1; i < n; i++) (dh(i) < -0.25 ? g : ng).push(d.js[i]);
g.sort((a, x) => a - x); ng.sort((a, x) => a - x);
console.log(`  median frame WITH a heap drop: ${g.length ? g[g.length >> 1].toFixed(2) : 'n/a'} ms (n=${g.length})`);
console.log(`  median frame WITHOUT one:      ${ng[ng.length >> 1].toFixed(2)} ms (n=${ng.length})`);
console.log(`  worst frame WITH a heap drop:  ${g.length ? g[g.length - 1].toFixed(1) : 'n/a'} ms`);
console.log(`  worst frame WITHOUT one:       ${ng[ng.length - 1].toFixed(1)} ms`);
