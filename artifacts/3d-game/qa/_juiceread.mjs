// read the _juice timeline and summarise it
import fs from 'fs';
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ev = d.ev;
console.log('world', d.world, 'ringPool', d.ringN, 'flashEl', d.hasFlash,
  'matchT', d.ms.t.toFixed(1), 'r', d.ms.r.toFixed(2), 'score', Math.round(d.ms.score),
  'bites', d.ms.ev.bites, 'ateRivals', d.ms.ev.eaten, 'charges', d.ms.ev.charges, 'nearMiss', d.ms.ev.nearMiss);

const by = {};
for (const e of ev) by[e.k] = (by[e.k] || 0) + 1;
console.log('\nEVENT COUNTS over the match');
for (const k of Object.keys(by).sort()) console.log('  ', k.padEnd(12), by[k]);

// buzz histogram
const bz = ev.filter(e => e.k === 'buzz');
const h = {};
for (const e of bz) h[e.ms] = (h[e.ms] || 0) + 1;
console.log('\nHAPTICS: navigator.vibrate(ms) -> count');
for (const k of Object.keys(h).map(Number).sort((a, b) => a - b)) console.log(`   ${String(k).padStart(4)}ms  x${h[k]}`);
console.log('   total buzzes', bz.length, '= one every', (d.ms.t / Math.max(1, bz.length)).toFixed(1), 'match-seconds');

// shake
const sh = ev.filter(e => e.k === 'shake');
sh.sort((a, b) => b.d - a.d);
console.log('\nSHAKE (camera 2nd difference, world units) top 12:');
for (const e of sh.slice(0, 12)) console.log('   t=' + e.t, 'd=' + e.d);
console.log('   shake frames total:', sh.length);

// flash
const fl = ev.filter(e => e.k === 'flash');
const fh = {};
for (const e of fl) { const k = e.a + ' ' + e.col; fh[k] = (fh[k] || 0) + 1; }
console.log('\nFLASH frames by (alpha, colour):');
for (const k of Object.keys(fh).sort((a, b) => fh[b] - fh[a])) console.log('   ', k, 'x' + fh[k]);

// rings
const rg = ev.filter(e => e.k === 'ring');
const rh = {};
for (const e of rg) rh[e.col] = (rh[e.col] || 0) + 1;
console.log('\nRINGS fired by colour:', JSON.stringify(rh));

// banners
console.log('\nBANNER / EVOLVE / NEWS timeline:');
for (const e of ev) if (e.k.startsWith('dom:')) console.log(`   t=${String(e.t).padStart(6)}  ${e.k.slice(4).padEnd(7)} ${e.tx}`);

// voices near each named moment
function window_(t0, t1) {
  return ev.filter(e => e.t >= t0 && e.t <= t1);
}
console.log('\nPER-MOMENT SLICES (everything in a 1.6s match-time window after the cue)');
const cues = ev.filter(e => e.k === 'dom:evolve' || (e.k === 'dom:banner' && /DEVOURED|STICKER|SECONDS|EVOLV/i.test(e.tx)));
for (const c of cues) {
  const w = window_(c.t, c.t + 1.6);
  const v = w.filter(x => x.k === 'voices').reduce((a, x) => a + x.n, 0);
  const bs = w.filter(x => x.k === 'buzz').map(x => x.ms);
  const rs = w.filter(x => x.k === 'ring').length;
  const fs2 = w.filter(x => x.k === 'flash');
  const ss = w.filter(x => x.k === 'shake');
  console.log(`   t=${c.t} "${c.tx.slice(0, 46)}"`);
  console.log(`       voices=${v} rings=${rs} flashFrames=${fs2.length}${fs2[0] ? ' a=' + fs2[0].a : ''} shakeFrames=${ss.length}${ss.length ? ' peak=' + Math.max(...ss.map(x => x.d)).toFixed(2) : ''} buzz=[${bs}]`);
}

// dead air: longest gap with no ring/buzz/flash/banner
const juice = ev.filter(e => ['ring', 'buzz', 'flash', 'shake'].includes(e.k) || e.k.startsWith('dom:'));
let worst = 0, wt = 0;
for (let i = 1; i < juice.length; i++) { const g = juice[i].t - juice[i - 1].t; if (g > worst) { worst = g; wt = juice[i - 1].t; } }
console.log(`\nLONGEST STRETCH WITH NO FEEDBACK OF ANY KIND: ${worst.toFixed(1)} match-seconds, from t=${wt.toFixed(1)}`);
