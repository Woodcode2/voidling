// Pin the mechanism: on the autoplay reload, is packReady already true by the
// time the rAF runs? If it is, withWorldReady() takes its early return and the
// coverHold('pack') from prototype3d.ts:2879 is never released.
// Measured by timing when preloadP resolves relative to the first rAF, and by
// counting how many pack meshes each world actually requests.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const PORT = process.env.PORT || 4271;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const w of ALL_WORLDS) {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const reqs = [];
  pg.on('request', r => { if (/\.glb(\?|$)/i.test(r.url())) reqs.push(r.url().split('/').pop()); });
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  // stamp when the first rAF after module eval fires, and when loadScr changes class
  await pg.addInitScript(() => {
    try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidWorld', new URLSearchParams(location.search).get('w') || 'maple');
      localStorage.setItem('voidAutoPlay', '1'); } catch {}
    window.__log = [];
    const t0 = performance.now();
    new MutationObserver(() => {
      const l = document.getElementById('loadScr');
      if (l) window.__log.push([Math.round(performance.now() - t0), 'loadScr.class=' + l.className]);
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  await pg.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.evaluate(() => { window.__renderer.render = () => {}; });
  await pg.waitForFunction(() => { try { return window.__matchState().t > 6; } catch { return false; } }, null, { timeout: 300000 });
  const out = await pg.evaluate(() => {
    const l = document.getElementById('loadScr');
    return { cls: l.className, disp: getComputedStyle(l).display, log: window.__log.slice(-6),
      t: +window.__matchState().t.toFixed(1) };
  });
  console.log(`\n${w}: glb requests during boot = ${reqs.length} ${reqs.slice(0,4).join(',')}`);
  console.log(`   at match t=${out.t}: loadScr class="${out.cls}" display=${out.disp}  => ${out.disp !== 'none' ? 'WEDGED' : 'clean'}`);
  console.log('   last class mutations:', JSON.stringify(out.log));
  await pg.close();
}
await b.close();
