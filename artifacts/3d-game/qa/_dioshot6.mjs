// THE DIORAMA, PHOTOGRAPHED. Six worlds, ?dio=1 against ?dio=0, same page size,
// same seed of a profile — because the only question step 1 can answer is what it
// looks like, and day 8 got its framing wrong four times on arithmetic that
// checked out every time.
//
//   node qa/_dioshot6.mjs [port]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['maple','pirate','gameday','lantern','powder','skylark'];
const OUT = 'docs/crews/round-8/dio';
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const w of WORLDS) for (const dio of [1, 0]) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1&dio=${dio}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  // long enough for the GLB landmarks to land and the drift to be somewhere
  // other than its start, under a renderer doing 0.4-2.9 fps
  await p.waitForTimeout(20000);
  const m = await p.evaluate(() => {
    const ms = window.__menuState(), T = window.__THREE, cam = window.__cam, g = window.__voidGroup();
    let bob = null;
    g.traverse((o) => { const q = o.geometry && o.geometry.parameters;
      if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) bob = o.parent; });
    bob.updateWorldMatrix(true, false);
    const sc = new T.Vector3(), ctr = new T.Vector3();
    bob.matrixWorld.decompose(ctr, new T.Quaternion(), sc);
    const D = ctr.distanceTo(cam.position);
    const k = 932 / (2 * D * Math.tan(cam.fov * Math.PI / 360));
    return { camD: +D.toFixed(1), camY: +cam.position.y.toFixed(1), r: ms.voidR,
      heroPx: +(2 * sc.y * k).toFixed(0) };
  });
  // DRAW CALLS: THE MAX OVER A RUN OF FRAMES, not one sample. The menu draws on
  // ALTERNATE frames (menuOptim), so a single read has an even chance of landing
  // on a skipped one — the first run of this probe reported "1 call" for both
  // sides and I nearly quoted it as a cost figure.
  const calls = await p.evaluate(() => new Promise((res) => {
    let best = 0, n = 0;
    const tick = () => { best = Math.max(best, window.__menuState().drawCalls);
      if (++n < 40) requestAnimationFrame(tick); else res(best); };
    requestAnimationFrame(tick);
  }));
  m.calls = calls;
  await p.screenshot({ path: `${OUT}/${w}-dio${dio}.png` });
  rows.push({ w, dio, ...m });
  console.log(`  ${w.padEnd(8)} dio=${dio}  camD ${String(m.camD).padStart(5)}  camY ${String(m.camY).padStart(5)}  r ${String(m.r).padStart(4)}  hero ${String(m.heroPx).padStart(3)}px  ${String(m.calls).padStart(4)} calls`);
  await p.close();
}
await b.close();
console.log('\nworld     hero px (dio -> off)   draw calls (dio -> off)');
for (const w of WORLDS) {
  const a = rows.find((r) => r.w === w && r.dio === 1), c = rows.find((r) => r.w === w && r.dio === 0);
  if (a && c) console.log(`${w.padEnd(9)} ${String(a.heroPx).padStart(3)} -> ${String(c.heroPx).padStart(3)}          ${String(a.calls).padStart(4)} -> ${String(c.calls).padStart(4)}  (${(a.calls / c.calls).toFixed(2)}x)`);
}
