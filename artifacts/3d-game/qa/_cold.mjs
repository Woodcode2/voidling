// SCRATCH PROBE — cold start timeline, payload census, GLB placement census.
//
//   node qa/_cold.mjs [worlds] [port] [mode]
//     mode = first  (no localStorage — the very first launch, autoplay path)
//          = repeat (voidPlayed set — the menu path a returning child sees)
//
// The whole island is built SYNCHRONOUSLY at module top level
// (src/prototype3d.ts:569 createIsland, animate() at :4667), so the boot cost
// shows as one giant long task. That task is pure JS + 2D-canvas work and is
// the honest device-comparable number; everything after the first render() is
// inflated by swiftshader and is reported separately, never conflated.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const PORT = process.argv[3] || 4188;
const MODE = process.argv[4] || 'first';

const INIT = `
  window.__marks = { rafs: [], longtasks: [], hooks_at: null, island_at: null };
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__marks.longtasks.push({ s: e.startTime, d: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) { window.__marks.ltErr = String(e); }
  (function tick(){ requestAnimationFrame((t) => { window.__marks.rafs.push(t); tick(); }); })();
  // __scene is assigned at prototype3d.ts:659, immediately after createIsland()
  // at :569 — so this setter times the end of the synchronous island build.
  for (const k of ['__scene', '__matchState']) {
    (function(key){
      Object.defineProperty(window, key, {
        configurable: true,
        set(v) {
          window.__marks[key === '__scene' ? 'island_at' : 'hooks_at'] = performance.now();
          Object.defineProperty(window, key, { value: v, writable: true, configurable: true });
        },
        get() { return undefined; },
      });
    })(k);
  }
`;

const out = [];
for (const w of WORLDS) {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(INIT);
  if (MODE === 'repeat') {
    await ctx.addInitScript(() => { try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch {} });
  }
  const page = await ctx.newPage();
  await page.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  const reqs = [];
  page.on('response', (r) => {
    reqs.push({ url: r.url(), status: r.status(), len: Number(r.headers()['content-length'] || 0) });
  });
  await page.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__marks.hooks_at != null, null, { timeout: 300000 });

  // cover down = the boot/pack curtain actually leaves. That is the first
  // moment a child sees anything but a loading screen.
  const coverDown = await page.evaluate(() => new Promise((res) => {
    const scr = document.getElementById('loadScr');
    if (!scr || !scr.classList.contains('show')) return res(performance.now());
    const iv = setInterval(() => {
      if (!scr.classList.contains('show') || scr.style.opacity === '0') { clearInterval(iv); res(performance.now()); }
    }, 25);
    setTimeout(() => { clearInterval(iv); res(-1); }, 180000);
  }));

  // playable = the match clock has actually started ticking
  let playable = -1;
  try {
    if (MODE === 'repeat') {
      await page.waitForFunction(() => !!document.getElementById('btnPlay'), null, { timeout: 60000 });
      await page.click('#btnPlay').catch(() => {});
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const c = document.querySelector('#worldRow .wCard.sel') || document.querySelector('#worldRow .wCard[data-world]');
        c && c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
    await page.waitForFunction(() => typeof window.__matchState === 'function' && window.__matchState().t > 0.4, null, { timeout: 300000 });
    playable = await page.evaluate(() => performance.now());
  } catch { playable = -1; }

  const snap = await page.evaluate(() => {
    const r = window.__renderer, m = performance.memory || {};
    const rafs = window.__marks.rafs;
    const lt = window.__marks.longtasks.slice().sort((a, b) => b.d - a.d);
    // frame cadence over the last 40 rendered frames
    const tail = rafs.slice(-40);
    const gaps = tail.slice(1).map((t, i) => t - tail[i]).sort((a, b) => a - b);
    return {
      island_at: window.__marks.island_at, hooks_at: window.__marks.hooks_at,
      // the first frame the browser actually painted AFTER the module finished
      first_raf_after_island: rafs.find((t) => t > window.__marks.island_at) ?? null,
      raf_before_island: rafs.filter((t) => t < window.__marks.island_at).length,
      longtasks_top: lt.slice(0, 6).map((t) => ({ s: Math.round(t.s), d: Math.round(t.d) })),
      longtask_total: Math.round(lt.reduce((a, b) => a + b.d, 0)),
      swr_frame_ms_median: gaps.length ? Math.round(gaps[gaps.length >> 1]) : null,
      calls: r?.info?.render?.calls, tris: r?.info?.render?.triangles,
      geometries: r?.info?.memory?.geometries, textures: r?.info?.memory?.textures,
      programs: r?.info?.programs?.length,
      heap_mb: +(m.usedJSHeapSize / 1048576).toFixed(1),
      heap_limit_mb: +(m.jsHeapSizeLimit / 1048576).toFixed(0),
      edibles: (window.__edibles || []).length,
      scene_nodes: window.__scene ? (() => { let n = 0; window.__scene.traverse(() => n++); return n; })() : null,
      glbCount: window.__glbCount || null,
      glbNames: window.__glbCount ? Object.keys(window.__glbCount).length : 0,
      glbPlacements: window.__glbCount ? Object.values(window.__glbCount).reduce((a, b) => a + b, 0) : 0,
      nav: (() => { const n = performance.getEntriesByType('navigation')[0]; return { respEnd: Math.round(n.responseEnd), domInteractive: Math.round(n.domInteractive) }; })(),
      mainJs: performance.getEntriesByType('resource').filter((x) => /main-.*\.js$/.test(x.name))
        .map((x) => ({ start: Math.round(x.startTime), end: Math.round(x.responseEnd), enc: x.encodedBodySize, dec: x.decodedBodySize }))[0] || null,
    };
  });

  const bytes = {};
  for (const r of reqs) {
    const k = /\/assets\/stickers\//.test(r.url) ? 'stickers'
      : /\/assets\/music\//.test(r.url) ? 'music'
      : /\/assets\/audio\//.test(r.url) ? 'audio'
      : /\.glb/.test(r.url) ? 'glb'
      : /\/assets\/hf\//.test(r.url) ? 'hf-img'
      : /\.js(\?|$)/.test(r.url) ? 'js' : /\.css/.test(r.url) ? 'css'
      : /woff/.test(r.url) ? 'font' : /\.(png|webp|jpg|svg)/.test(r.url) ? 'img' : 'other';
    bytes[k] = bytes[k] || { n: 0, bytes: 0, fail: 0 };
    bytes[k].n++; bytes[k].bytes += r.len; if (r.status >= 400) bytes[k].fail++;
  }

  out.push({ world: w, mode: MODE, coverDown: Math.round(coverDown), playable: Math.round(playable), ...snap, bytes });
  console.log(JSON.stringify(out[out.length - 1]));
  await browser.close();
}
fs.writeFileSync(`qa-out/_cold-${MODE}.json`, JSON.stringify(out, null, 1));
console.log('\n=== COLD START (' + MODE + ') ===');
console.log('world    islandBuilt  coverDown  playable   biggestBlock  heapMB  edibles  nodes  glbPlaced');
for (const o of out) {
  console.log(`${o.world.padEnd(8)} ${String(Math.round(o.island_at)).padStart(7)}ms ${String(o.coverDown).padStart(9)}ms ${String(o.playable).padStart(8)}ms ${String(o.longtasks_top[0]?.d).padStart(11)}ms ${String(o.heap_mb).padStart(7)} ${String(o.edibles).padStart(8)} ${String(o.scene_nodes).padStart(6)} ${String(o.glbPlacements).padStart(9)}`);
}
console.log('\n=== GLB PLACEMENT CENSUS (33 in PACK, all 33 downloaded at boot) ===');
for (const o of out) {
  const c = o.glbCount || {};
  const names = Object.keys(c).sort((a, b) => c[b] - c[a]);
  console.log(`${o.world}: ${names.length} distinct names, ${o.glbPlacements} placements`);
  console.log('   ' + names.map((n) => `${n}×${c[n]}`).join(', '));
}
