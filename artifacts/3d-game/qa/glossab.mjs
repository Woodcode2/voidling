// IS THE PER-VERTEX SPECULAR VISIBLE? One page, one layout, one camera, one
// variable.
//
// The first attempt at this shot two BUILDS on two ports and compared the
// PNGs. That cannot work: only Maple Falls seeds its layout, so Game Day
// placed a different car park each time and the two frames differed in every
// prop. A diff of those images measures the level generator, not the shading.
//
// So the A/B happens INSIDE one page. aGloss lives in a vertex buffer that
// can be rewritten and re-uploaded at runtime, so the same frame is shot with
// the channel on, then with every byte of it zeroed — which is exactly the
// build that shipped before this change. Everything else is bit-identical.
//
//   node qa/glossab.mjs [worlds] [port]
import { chromium } from 'playwright';
import fs from 'node:fs';
const worlds = (process.argv[2] || 'gameday,lantern,pirate,maple').split(',');
const PORT = process.argv[3] || '4177';
const SPOT = { gameday: [-40, 40, 3.0], lantern: [0, 30, 3.0], pirate: [30, -20, 3.0], maple: [-63, 70, 3.0] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 240)); });
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`.slice(0, 240)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
  // FREEZE THE WORLD, not just the crowd: anything that animates between the
  // two shots lands in the diff as if it were shading.
  const covered = await p.evaluate(async (spot) => {
    window.__pinQuality(0);
    window.__setVoidR(spot[2]);
    window.__warpVoid(spot[0], spot[1]);
    let n = 0;
    window.__scene.traverse((o) => {
      if (o.userData && (o.userData.mover || o.userData.ped)) o.visible = false;
      if (o.isSprite || o.isPoints) o.visible = false;
      const a = o.geometry && o.geometry.getAttribute && o.geometry.getAttribute('aGloss');
      if (a) { o.userData._gloss = a.array.slice(); n++; }
    });
    for (let i = 0; i < 90; i++) await new Promise((r) => requestAnimationFrame(r));
    return n;
  }, SPOT[wid]);
  const clip = { x: 0, y: 60, width: 430, height: 620 };
  await p.screenshot({ path: `qa-out/gloss-${wid}-on.png`, clip });
  // …and now the same frame with the channel switched off
  await p.evaluate(async () => {
    window.__scene.traverse((o) => {
      const a = o.geometry && o.geometry.getAttribute && o.geometry.getAttribute('aGloss');
      if (a && o.userData._gloss) { a.array.fill(0); a.needsUpdate = true; }
    });
    for (let i = 0; i < 12; i++) await new Promise((r) => requestAnimationFrame(r));
  });
  await p.screenshot({ path: `qa-out/gloss-${wid}-off.png`, clip });
  const bad = errs.filter((e) => !/hf3d|\/assets\/hf|403|404|net::/.test(e));
  const d = await diff(p, `qa-out/gloss-${wid}-on.png`, `qa-out/gloss-${wid}-off.png`);
  console.log(`${wid.padEnd(8)} ${covered} meshes carry aGloss   `
    + `changed ${d.pct.toFixed(2)}% of pixels   mean |delta| ${d.mean.toFixed(2)}/255   `
    + `p99 ${d.p99}/255   brighter ${d.upPct.toFixed(0)}%`
    + (bad.length ? `\n  ERRORS: ${bad.join(' | ')}` : ''));
  await p.close();
}
await b.close();

// There is no PNG decoder in this repo and no network to fetch one, so the
// two frames are decoded by the browser that is already open — the same trick
// qa/_aodiff.mjs uses. Runs on the game's own page after both shots are taken,
// which costs nothing and keeps the probe to one dependency.
async function diff(page, a, c) {
  return page.evaluate(async ([da64, db64]) => {
    const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d; });
    const A = await load(da64), B = await load(db64);
    const cv = document.createElement('canvas'); cv.width = A.width; cv.height = A.height;
    const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(A, 0, 0); const pa = x.getImageData(0, 0, A.width, A.height).data;
    x.clearRect(0, 0, cv.width, cv.height);
    x.drawImage(B, 0, 0); const pb = x.getImageData(0, 0, A.width, A.height).data;
    let n = 0, sum = 0, up = 0;
    const hist = new Uint32Array(256);
    for (let i = 0; i < pa.length; i += 4) {
      const d0 = pa[i] - pb[i], d1 = pa[i + 1] - pb[i + 1], d2 = pa[i + 2] - pb[i + 2];
      const m = Math.max(Math.abs(d0), Math.abs(d1), Math.abs(d2));
      if (m > 1) { n++; sum += m; hist[m]++; if (d0 + d1 + d2 > 0) up++; }
    }
    const total = pa.length / 4;
    let acc = 0, p99 = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.01) { p99 = v; break; } }
    return { pct: (n / total) * 100, mean: n ? sum / n : 0, p99, upPct: n ? (up / n) * 100 : 0 };
  }, [fs.readFileSync(a).toString('base64'), fs.readFileSync(c).toString('base64')]);
}
