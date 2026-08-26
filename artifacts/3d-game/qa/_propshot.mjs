// Stand next to a named prop class and photograph it at the play camera.
//   node qa/_propshot.mjs <port> <world> <minR> <maxR> <out>
import { chromium } from 'playwright';
const [PORT, WORLD, MINR, MAXR, OUT] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}&r=6`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 8, null, { timeout: 400000 });
const at = await p.evaluate(({ lo, hi }) => {
  const c = window.__edibles.filter((e) => !e.eaten && e.mesh?.visible && e.radius >= lo && e.radius <= hi);
  if (!c.length) throw new Error(`no prop with radius ${lo}-${hi} on screen`);
  const best = c[Math.floor(c.length / 2)];
  window.__warpVoid(best.mesh.position.x + 14, best.mesh.position.z + 14);
  window.__setMood?.('cruise'); window.__pinMouth?.(true); window.__calm?.();
  return { n: c.length, r: +best.radius.toFixed(2) };
}, { lo: Number(MINR), hi: Number(MAXR) });
await p.evaluate(() => { const cv = document.querySelector('canvas');
  for (const el of Array.from(document.body.children)) if (el !== cv && !el.contains(cv)) el.style.display = 'none'; });
await p.waitForTimeout(2500);
await p.screenshot({ path: OUT });
console.log(`${WORLD}: ${at.n} candidates, stood by r=${at.r} -> ${OUT}`);
await b.close();
