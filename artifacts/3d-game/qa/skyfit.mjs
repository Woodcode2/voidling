// DOES THE PLANET FIT ITS OWN CANVAS? Source arithmetic, no browser — the
// regression guard for the half-cut ring (round 5, Stream C, 2026-09-03).
// island.ts paint() draws the disc at DISC_R of the canvas, the ring's arcs at
// 1.34 R, 1.49 R and 1.64 R with a line 0.10 R wide, and the atmosphere glow
// out to 1.16 R. Everything must end inside the square's half-width (0.5 S) or
// the sprite slices it flat — photographed on Pirate and Powder
// (docs/crews/round-5/shots/sky/powder-coast.png) when DISC_R was 0.40.
//   node qa/skyfit.mjs [path-to-island.ts]      exit 1 = a cut
import fs from 'fs';
import { fileURLToPath } from 'url';
// Resolve island.ts from THIS file, not the cwd: the gate spawns steps from
// wherever it runs and hands every step the port as argv[2]. An argument that
// is not a readable file is ignored.
const here = fileURLToPath(new URL('../src/proto3d/island.ts', import.meta.url));
const arg = process.argv[2];
const path = arg && fs.existsSync(arg) && fs.statSync(arg).isFile() ? arg : here;
const src = fs.readFileSync(path, 'utf8');
const num = (re, what) => { const m = src.match(re); if (!m) throw new Error(`skyfit: cannot find ${what} in island.ts`); return Number(m[1]); };
const DISC_R = num(/const DISC_R = ([0-9.]+)/, 'DISC_R');
const ringBase = num(/R \* \(([0-9.]+) \+ k \* [0-9.]+\)/, 'ring base radius'), ringStep = num(/R \* \([0-9.]+ \+ k \* ([0-9.]+)\)/, 'ring step');
const ringN = num(/for \(let k = 0; k < (\d+); k\+\+\) \{\s*g\.beginPath\(\);\s*g\.arc\(0, 0, R \* \(/, 'ring count');
const lineW = num(/g\.lineWidth = R \* \(([0-9.]+) - k/, 'ring line width');
const glow = num(/createRadialGradient\(cx, cy, R \* 0\.92, cx, cy, R \* ([0-9.]+)\)/, 'glow reach');
const ringReach = (ringBase + (ringN - 1) * ringStep + lineW / 2) * DISC_R, glowReach = glow * DISC_R;
const rows = [['ring', ringReach], ['glow', glowReach]];
let bad = 0;
for (const [k, v] of rows) { const ok = v <= 0.5; if (!ok) bad++; console.log(`  ${k.padEnd(5)} reaches ${v.toFixed(3)} S of a 0.500 S half-canvas  ${ok ? 'ok' : 'CUT'}`); }
console.log(bad ? `SKYFIT: FAIL — ${bad} element(s) run off the sprite's canvas (DISC_R ${DISC_R})` : `SKYFIT: PASS — disc, ring and glow all inside the sprite's canvas (DISC_R ${DISC_R})`);
process.exit(bad ? 1 : 0);
