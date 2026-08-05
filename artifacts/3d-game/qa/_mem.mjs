// SCRATCH — memory across consecutive matches on the INSTANT REMATCH path
// (results → PLAY AGAIN → resetMatch(), prototype3d.ts:3040), which is how a
// child actually plays. A leak shows as heap climbing match over match after a
// forced GC. Also tracks the things that leak in a three.js game and never show
// in the heap number: geometries, textures, programs, scene nodes, edibles.
//
//   node qa/_mem.mjs [world] [matches] [port]
import { chromium } from 'playwright';

const W = process.argv[2] || 'maple';
const N = +(process.argv[3] || 4);
const PORT = process.argv[4] || 4188;

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--enable-precise-memory-info'],
});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
const page = await ctx.newPage();
await page.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
const cdp = await ctx.newCDPSession(page);
await cdp.send('HeapProfiler.enable');

await page.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' });
await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await page.waitForTimeout(2000);

const snap = async (label) => {
  await cdp.send('HeapProfiler.collectGarbage');
  await page.waitForTimeout(600);
  const s = await page.evaluate(() => {
    const r = window.__renderer, m = performance.memory || {};
    let nodes = 0, meshes = 0;
    window.__scene.traverse((o) => { nodes++; if (o.isMesh) meshes++; });
    return {
      heap: +(m.usedJSHeapSize / 1048576).toFixed(1),
      geo: r.info.memory.geometries, tex: r.info.memory.textures,
      prog: r.info.programs.length, calls: r.info.render.calls,
      nodes, meshes, edibles: window.__edibles.length,
      t: window.__matchState ? +window.__matchState().t.toFixed(1) : null,
    };
  });
  console.log(`${label.padEnd(22)} heap=${String(s.heap).padStart(7)}MB  geo=${String(s.geo).padStart(5)}  tex=${String(s.tex).padStart(4)}  prog=${String(s.prog).padStart(3)}  nodes=${String(s.nodes).padStart(6)}  meshes=${String(s.meshes).padStart(6)}  edibles=${String(s.edibles).padStart(5)}  matchT=${s.t}`);
  return s;
};

const rows = [];
rows.push(['menu (pre-match)', await snap('menu (pre-match)')]);

for (let i = 1; i <= N; i++) {
  if (i === 1) {
    await page.evaluate(() => {
      const p = document.getElementById('btnPlay'); p && p.click();
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const c = document.querySelector('#worldRow .wCard.sel') || document.querySelector('#worldRow .wCard[data-world]');
      c && c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  } else {
    await page.evaluate(() => { const a = document.getElementById('btnAgain'); a && a.click(); });
  }
  // let the match actually run: play forward on the MATCH clock, not wall time
  await page.waitForFunction(() => window.__matchState && window.__matchState().t > 1, null, { timeout: 400000 });
  const t0 = await page.evaluate(() => window.__matchState().t);
  // drive the void around so props are eaten, the crowd reacts, news fires
  await page.waitForFunction((t) => window.__matchState().t > t + 25, t0, { timeout: 600000 });
  rows.push([`match ${i} @t+25s`, await snap(`match ${i} @t+25s`)]);
  // grow it so late-match systems (defense, rivals hunting) engage
  await page.evaluate(() => window.__setVoidR(9));
  await page.waitForFunction(() => window.__matchState().t > 40, null, { timeout: 600000 });
  rows.push([`match ${i} big @t40`, await snap(`match ${i} big @t40`)]);
  // end it
  await page.evaluate(() => window.__rushClock(1.5));
  await page.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 600000 });
  await page.waitForTimeout(1500);
  rows.push([`match ${i} results`, await snap(`match ${i} results`)]);
}

console.log('\n=== TREND (same instant, match over match) ===');
for (const k of ['@t+25s', 'big @t40', 'results']) {
  const sel = rows.filter((r) => r[0].includes(k));
  console.log(`${k.padEnd(10)} heap ${sel.map((s) => s[1].heap).join(' → ')} MB   geo ${sel.map((s) => s[1].geo).join(' → ')}   nodes ${sel.map((s) => s[1].nodes).join(' → ')}   edibles ${sel.map((s) => s[1].edibles).join(' → ')}   tex ${sel.map((s) => s[1].tex).join(' → ')}`);
}
await b.close();
