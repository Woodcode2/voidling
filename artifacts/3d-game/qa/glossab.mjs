// IS THE PER-VERTEX SPECULAR VISIBLE? One frame, rendered twice by hand, with
// the game loop never running in between.
//
// THIS PROBE HAS BEEN WRONG TWICE AND BOTH FAILURES ARE WORTH KEEPING HERE,
// because they are the two ways an A/B on a live game lies to you.
//
// v1 built the tree twice — once with the change stashed — served both on
// separate ports and diffed the screenshots. Only Maple Falls seeds its
// layout, so Game Day generated a different car park for each build. That
// diff measured the level generator.
//
// v2 moved the A/B inside one page and toggled the vertex buffer at runtime,
// which is the right idea, but took the two shots through page.screenshot()
// with requestAnimationFrame in between. A null control — the same frame
// twice, nothing changed — came back at 11.34% of pixels differing with a
// mean delta of 88/255. The crowd walks, the void breathes, a speech bubble
// arrives, the camera is still easing after the warp. The gloss result was
// 2.6x that floor, which is not a result.
//
// v3 renders into an offscreen target under this probe's own control:
//   render -> read pixels -> rewrite the buffer -> render -> read pixels
// with no requestAnimationFrame anywhere between them. Nothing in the game
// advances, so the null control is EXACTLY zero and every pixel that differs
// differs because of the shader. That is the only honest way to measure a
// material change in a game that is otherwise moving.
//
//   node qa/glossab.mjs [worlds] [port]
import { chromium } from 'playwright';
import fs from 'node:fs';
const worlds = (process.argv[2] || 'gameday,lantern,pirate,maple').split(',');
const PORT = process.argv[3] || '4177';
// where to stand: a small void in a dense place, so the frame is scenery
const SPOT = { gameday: [-40, 40, 3.0], lantern: [0, 30, 3.0], pirate: [30, -20, 3.0], maple: [-63, 70, 3.0] };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
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

  const r = await p.evaluate(async (spot) => {
    const THREE = window.__THREE, R = window.__renderer;
    window.__pinQuality(0);
    window.__setVoidR(spot[2]);
    window.__warpVoid(spot[0], spot[1]);
    // The camera eases toward the warp exponentially. It no longer has to be
    // fully at rest for CORRECTNESS — nothing moves between the two renders —
    // but a frame caught mid-slide is a muddled thing to look at, so let it
    // arrive before anything is captured.
    for (let i = 0; i < 200; i++) await new Promise((res) => requestAnimationFrame(res));

    const W = 860, H = 1240;
    const rt = new THREE.WebGLRenderTarget(W, H);
    // Without this the read-back is linear-light and both frames come out
    // looking like a different, much darker game.
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const shoot = () => {
      R.setRenderTarget(rt);
      R.render(window.__scene, window.__cam);
      const buf = new Uint8Array(W * H * 4);
      R.readRenderTargetPixels(rt, 0, 0, W, H, buf);
      R.setRenderTarget(null);
      return buf;
    };
    const setGloss = (on) => {
      let n = 0;
      window.__scene.traverse((o) => {
        const g = o.geometry;
        const a = g && g.getAttribute && g.getAttribute('aGloss');
        if (!a) return;
        if (!o.userData._gloss) o.userData._gloss = a.array.slice();
        if (on) a.array.set(o.userData._gloss); else a.array.fill(0);
        a.needsUpdate = true;
        n++;
      });
      return n;
    };

    const meshes = setGloss(true);
    const A = shoot();
    const A2 = shoot();                 // null control: must be exactly zero
    setGloss(false);
    const B = shoot();
    setGloss(true);                     // leave the page as we found it

    const cmp = (x, y) => {
      let n = 0, sum = 0, up = 0, lumA = 0, lumB = 0;
      const hist = new Uint32Array(256);
      for (let i = 0; i < x.length; i += 4) {
        lumA += x[i] * 0.299 + x[i + 1] * 0.587 + x[i + 2] * 0.114;
        lumB += y[i] * 0.299 + y[i + 1] * 0.587 + y[i + 2] * 0.114;
        const d0 = x[i] - y[i], d1 = x[i + 1] - y[i + 1], d2 = x[i + 2] - y[i + 2];
        const m = Math.max(Math.abs(d0), Math.abs(d1), Math.abs(d2));
        if (m > 1) { n++; sum += m; hist[m]++; if (d0 + d1 + d2 > 0) up++; }
      }
      const total = x.length / 4;
      let acc = 0, p99 = 0;
      for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.01) { p99 = v; break; } }
      return { pct: (n / total) * 100, mean: n ? sum / n : 0, p99,
        upPct: n ? (up / n) * 100 : 0, lumDelta: (lumA - lumB) / total };
    };

    // a PNG of each, flipped: readRenderTargetPixels hands back bottom-up
    const png = (buf) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(W, H);
      for (let y = 0; y < H; y++) {
        const src = (H - 1 - y) * W * 4, dst = y * W * 4;
        img.data.set(buf.subarray(src, src + W * 4), dst);
      }
      ctx.putImageData(img, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    };
    return { meshes, noise: cmp(A, A2), gloss: cmp(A, B), onPng: png(A), offPng: png(B) };
  }, SPOT[wid]);

  fs.writeFileSync(`qa-out/gloss-${wid}-on.png`, Buffer.from(r.onPng, 'base64'));
  fs.writeFileSync(`qa-out/gloss-${wid}-off.png`, Buffer.from(r.offPng, 'base64'));
  const fmt = (x) => `${x.pct.toFixed(2).padStart(6)}% of px  mean ${x.mean.toFixed(1).padStart(5)}/255  `
    + `p99 ${String(x.p99).padStart(3)}  brighter ${x.upPct.toFixed(0).padStart(3)}%  `
    + `frame luminance ${x.lumDelta >= 0 ? '+' : ''}${x.lumDelta.toFixed(3)}`;
  console.log(`\n${wid.toUpperCase()}  ${r.meshes} meshes carry aGloss`);
  console.log(`  null control (must be 0)  ${fmt(r.noise)}`);
  console.log(`  gloss on vs off           ${fmt(r.gloss)}`);
  if (r.noise.pct > 0.001) console.log('  !! THE INSTRUMENT IS NOT STATIC — the gloss row means nothing');
  const bad = errs.filter((e) => !/hf3d|\/assets\/hf|403|404|net::/.test(e));
  if (bad.length) console.log(`  ERRORS: ${bad.join(' | ')}`);
  await p.close();
}
await b.close();
