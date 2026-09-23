// LEAVES GO ON GRASS — the leaf-drift stain probe (studio round 4, Job 3 / I-6)
//
//   node qa/leafsurface.mjs [port] [--out=dir]
//
// Maple's leaf drifts are painted into the ground bake by block, on the
// blocks the plan calls grassy — and a "grassy" block like the plaza is mostly
// pale stone walks. A warm translucent drift on cream stone does not read as
// leaves; it reads as a spill (island.ts says so itself, and still did it).
// The studio governor found two in the game's opening frame, on the square's
// walks, and blocked the push on them (B1); and the protest's worn patch is
// the same warm paint on the paved apron.
//
// THE MEASURE — a DIFF, not a colour guess. The first version of this probe
// classified texels by colour alone ("warm, on a pale low-chroma neighbour-
// hood") and it measured the wrong thing: pale cream sand is itself "warm"
// (R-B ~ 45) and sits in pale surroundings, so it flagged 1,520 texels of
// plain ground and would have missed a faint tint on cream stone whose own
// chroma is over the cutoff. So the game bakes Maple twice — as shipped, and
// with ?qaleaves=0, which skips exactly the leaf paint — and every texel that
// differs IS leaf paint. Each is classified by what is underneath it in the
// clean bake: green-dominant (G > R+6 and G > B+6) is grass; anything else is
// a stain.
//
// …AND BOTH BAKES DRAW THE SAME DICE. The bake is not fully seeded — the
// beach towels, for one, are placed with Math.random — so the first diff run
// counted towels that landed in different places as "leaf paint on sand".
// Math.random is replaced with one seeded generator in both pages; the leaf
// pass draws from its own local stream and the protest patch draws nothing,
// so skipping them leaves every other draw where it was.
//
// BAR: at most 20 leaf texels off the grass across the 3072px bake — the
// governor's number, set before the fix.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '4177';
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice(6) : null;
const BAR = 20;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
async function bake(q) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch {} });
  await p.addInitScript(() => {
    let a = 0x9e3779b9;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple${q}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // the ground bake is the biggest canvas-backed map in the scene (as qa/_dumpbake.mjs finds it)
  const url = await p.evaluate(() => {
    let best = null;
    window.__scene.traverse((o) => {
      if (o.isMesh && o.material?.map?.image?.toDataURL) {
        const img = o.material.map.image;
        if (!best || img.width * img.height > best.width * best.height) best = img;
      }
    });
    return best ? best.toDataURL('image/png') : null;
  });
  await p.close();
  if (!url) { console.log(`FAIL — no canvas-backed ground map found for ?w=maple${q}; nothing was measured`); process.exit(1); }
  return Buffer.from(url.split(',')[1], 'base64');
}
const shipped = await bake('');
const clean = await bake('&qaleaves=0');
await b.close();
if (OUT) { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/maple-bake.png`, shipped); writeFileSync(`${OUT}/maple-bake-noleaves.png`, clean); }

const A = PNG.sync.read(shipped), B = PNG.sync.read(clean);
if (A.width !== B.width || A.height !== B.height) { console.log('FAIL — the two bakes differ in size; cannot diff'); process.exit(1); }
const W = A.width, H = A.height;
let leaf = 0, onGrass = 0, off = 0;
const cells = new Map();
for (let i = 0; i < W * H; i++) {
  const k = i * 4;
  const d = Math.max(Math.abs(A.data[k] - B.data[k]), Math.abs(A.data[k + 1] - B.data[k + 1]), Math.abs(A.data[k + 2] - B.data[k + 2]));
  if (d <= 3) continue;
  leaf++;
  const r = B.data[k], g = B.data[k + 1], bl = B.data[k + 2];
  if (g > r + 6 && g > bl + 6) { onGrass++; continue; }
  off++;
  const x = i % W, y = (i / W) | 0, key = `${(x >> 7) << 7},${(y >> 7) << 7}`;
  cells.set(key, (cells.get(key) ?? 0) + 1);
}
const worst = [...cells.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 6).map(([k, n]) => `${n} at (${k})`);

console.log(`\n  LEAF SURFACE — Maple's ground bake, ${W}x${H}, diffed against ?qaleaves=0, on :${PORT}\n`);
console.log(`  ·    texels the leaf paint touched: ${leaf}`);
console.log(`  ·    on grass: ${onGrass}   off the grass: ${off}${worst.length ? `   worst 128px cells: ${worst.join(', ')}` : ''}`);
if (OUT) console.log(`  ·    both bakes written to ${OUT}/`);
if (leaf === 0) { console.log('\nFAIL — the two bakes are identical: either ?qaleaves=0 is not wired or there is no leaf paint to judge'); process.exit(1); }
if (off > BAR) {
  console.log(`\nFAIL — ${off} leaf texels sit off the grass (bar ${BAR}): drifts painted onto walks and paving read as stains`);
  process.exit(1);
}
console.log(`\nPASS — ${off} leaf texels off the grass (bar ${BAR}), ${onGrass} on it: the leaves are on the grass`);
