// LEVEL COMPLETENESS — offline analysis of qa-out/content.json.
// Size bands are keyed to the growth law in prototype3d.ts: lawCap at a given
// elapsed second, so "what is on the menu at 2:30" is a real question.
import { readFileSync } from 'fs';
const C = JSON.parse(readFileSync('qa-out/content.json', 'utf8'));

// growth law, transcribed from prototype3d.ts ~3949-3956, pace = 1 (par run)
function lawCap(el, pace = 1, matchLen = 180) {
  const surgeT = Math.max(0, el - matchLen * 0.66) / (matchLen * 0.34);
  const warm = Math.min(1, el / 25);
  const paceK = (1 - warm) + warm * (0.60 + 0.40 * pace);
  return Math.min(12, 0.9 + (0.022 * Math.min(el, 30) + 0.025 * el) * paceK
    + surgeT * surgeT * (2.8 + 2.6 * pace));
}
const EAT = 1.11;
console.log('THE GROWTH LAW (par run, pace=1) — R at t, and the biggest thing eatable there');
for (const t of [0, 15, 30, 60, 90, 120, 140, 150, 160, 170, 175, 180])
  console.log(`   t=${String(t).padStart(3)}s   R=${lawCap(t).toFixed(2)}   can eat up to r=${(lawCap(t) * EAT).toFixed(2)}`);
console.log('   weak run (pace 0.0) final R', lawCap(180, 0).toFixed(2),
  ' strong (pace 1.2) final R', lawCap(180, 1.2).toFixed(2));

const BANDS = [[0, 0.5], [0.5, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 11], [11, 99]];
for (const w of Object.keys(C)) {
  const { es, area, aD } = C[w];
  const n = es.length;
  console.log(`\n${'='.repeat(74)}\n${w.toUpperCase()}   ${n} edibles   ${area} u² legal ground   ${(n / area * 100).toFixed(2)} per 100u²`);
  // size bands
  const b = BANDS.map(() => 0);
  for (const e of es) for (let i = 0; i < BANDS.length; i++) if (e.r >= BANDS[i][0] && e.r < BANDS[i][1]) { b[i]++; break; }
  console.log('  SIZE BANDS');
  BANDS.forEach(([lo, hi], i) => {
    const bar = '#'.repeat(Math.min(60, Math.round(b[i] / n * 300)));
    console.log(`    r ${String(lo).padStart(4)}-${String(hi === 99 ? '+' : hi).padEnd(4)} ${String(b[i]).padStart(5)}  ${(b[i] / n * 100).toFixed(1).padStart(5)}%  ${bar}`);
  });
  // what the LAST 30 SECONDS has to eat: things a smaller void could NOT have
  // taken. At t=150 R=6.71; at 180 R=11.46. So the "new food" in the finale is
  // everything in (6.71*1.11, 11.46*1.11] = (7.45, 12.72].
  const lo150 = lawCap(150) * EAT, lo180 = lawCap(180) * EAT;
  const fin = es.filter((e) => e.r > lo150 && e.r <= lo180);
  const unreach = es.filter((e) => e.r > 12 * EAT);
  console.log(`  THE FINALE: props that only become edible in the last 30s (r ${lo150.toFixed(2)}..${lo180.toFixed(2)}): ${fin.length}`);
  const fk = {}; fin.forEach((e) => { const k = `${e.r}`; fk[k] = (fk[k] || 0) + 1; });
  console.log('     ' + (Object.keys(fk).sort((a, x) => x - a).map((k) => `r${k}x${fk[k]}`).join('  ') || '(NOTHING)'));
  console.log(`  UNREACHABLE (r > 13.32, can never be eaten by anyone): ${unreach.length}`);
  // biggest 12
  const big = [...es].sort((a, x) => x.r - a.r).slice(0, 10);
  console.log('  BIGGEST: ' + big.map((e) => `${e.r}@${e.d}`).join(' '));
  // by district
  console.log('  DISTRICTS');
  const rows = {};
  for (const e of es) { const r0 = rows[e.d] = rows[e.d] || { n: 0, mv: 0, big: 0, mid: 0, sm: 0, max: 0, st: [] };
    r0.n++; if (e.mv) r0.mv++; if (e.r >= 7) r0.big++; else if (e.r >= 3) r0.mid++; else r0.sm++;
    if (e.r > r0.max) r0.max = e.r; if (e.st) r0.st.push(e.st); }
  const keys = Object.keys(rows).concat(Object.keys(aD).filter((k) => !rows[k]));
  console.log('    district        edibles  movers  r>=7  3-7    <3   biggest  area u²  per100u²  stickers');
  for (const k of keys.sort((a, x) => (rows[x]?.n || 0) - (rows[a]?.n || 0))) {
    const q = rows[k] || { n: 0, mv: 0, big: 0, mid: 0, sm: 0, max: 0, st: [] };
    const a = aD[k] || 0;
    console.log(`    ${k.padEnd(14)} ${String(q.n).padStart(7)} ${String(q.mv).padStart(7)} ${String(q.big).padStart(5)} ${String(q.mid).padStart(5)} ${String(q.sm).padStart(5)} ${q.max.toFixed(1).padStart(9)} ${String(a).padStart(8)} ${(a ? q.n / a * 100 : 0).toFixed(2).padStart(9)}  ${q.st.length ? q.st.join(',') : '—'}`);
  }
  // stickers
  const st = es.filter((e) => e.st);
  console.log(`  CURIOS PLACED: ${st.length}`);
}
