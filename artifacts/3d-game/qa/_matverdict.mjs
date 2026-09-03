// Stream B verdict numbers: K parity (rung 3's kill gate), tonal range, chroma,
// and the mascot's mean colour per world, before vs a tag.
//   node qa/_matverdict.mjs <tag> [gate=0.04]
import fs from 'fs';
const TAG = process.argv[2] || 'rung2', GATE = Number(process.argv[3] || 0.04);
const D = 'docs/crews/round-5/materials-data';
const J = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const hero = (f) => { try { const m = fs.readFileSync(f, 'utf8').match(/^\s*3(?:\.0+)?\s+\S+\s+(\d+),\s*(\d+),\s*(\d+)|^\s*3\b.*?(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/m); return m ? [+(m[1] ?? m[4]), +(m[2] ?? m[5]), +(m[3] ?? m[6])] : null; } catch { return null; } };
const lab = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; const [R, G, B] = [f(r), f(g), f(b)]; const X = R * 0.4124 + G * 0.3576 + B * 0.1805, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = R * 0.0193 + G * 0.1192 + B * 0.9505; const t = (v) => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116; const [x, y, z] = [t(X / 0.95047), t(Y), t(Z / 1.08883)]; return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
console.log(`  world     K before -> ${TAG}   dK%    Y05/Y95 before -> after      C before -> after   mascot dE`);
let killed = 0;
for (const w of ['maple', 'pirate', 'gameday', 'lantern', 'powder']) {
  const a = J(`${D}/${w}-before.json`), b = J(`${D}/${w}-${TAG}.json`);
  if (!a || !b) { console.log(`  ${w.padEnd(8)}  (missing ${!a ? 'before' : TAG})`); continue; }
  const dk = (b.K - a.K) / a.K; const kill = Math.abs(dk) > GATE; if (kill) killed++;
  const ha = hero(`${D}/${w}-before.hero.log`), hb = hero(`${D}/${w}-${TAG}.hero.log`);
  console.log(`  ${w.padEnd(8)}  ${String(a.K).padStart(3)} -> ${String(b.K).padStart(3)}      ${(dk * 100).toFixed(1).padStart(5)}%  ${kill ? 'KILL' : 'ok  '}  ${a.Y05}/${a.Y95} -> ${b.Y05}/${b.Y95}        ${a.C} -> ${b.C}       ${ha && hb ? dE(ha, hb).toFixed(1) : '-'}`);
}
console.log(killed ? `FAIL — ${TAG}: K parity broken on ${killed} world(s) (gate ${GATE * 100}%)` : `PASS — ${TAG}: K within ${GATE * 100}% on every measured world`);
