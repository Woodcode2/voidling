// zoom into a window of an _fp.mjs capture:  node qa/_fpz.mjs <json> <t0> <t1>
import { readFileSync } from 'fs';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const t0 = +process.argv[3], t1 = +process.argv[4];
console.log('  t      dt(ms)  render  heapMB   dHeap    r     join prog calls edibles drive');
for (let i = 1; i < d.n; i++) {
  if (d.t[i] < t0 || d.t[i] > t1) continue;
  const dh = (d.heap[i] - d.heap[i - 1]) / 1048576;
  console.log(`${d.t[i].toFixed(2).padStart(7)} ${d.dt[i].toFixed(1).padStart(7)} ${d.rdr[i].toFixed(1).padStart(7)} ${(d.heap[i] / 1048576).toFixed(1).padStart(8)} ${dh.toFixed(2).padStart(8)} ${d.r[i].toFixed(2).padStart(6)} ${String(d.join[i]).padStart(4)} ${String(d.prog[i]).padStart(4)} ${String(d.calls[i]).padStart(5)} ${String(d.ed[i]).padStart(7)} ${d.driveMs[i].toFixed(2).padStart(6)}`);
}
