// Does the UI survive small/odd viewports and a resize while a sheet is open?
//  - results screen at 320x480 and 390x844, before and after a resize storm
//  - the parental gate with an on-screen keyboard eating half the viewport
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
pg.on('pageerror', e => console.log('  PAGEERROR', e.message));
await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await pg.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
await pg.waitForTimeout(1500);

// ── gate with a keyboard up ──
await pg.evaluate(() => document.getElementById('btnSettings').click());
await pg.waitForTimeout(200);
await pg.evaluate(() => document.getElementById('setPrivacy').click());
await pg.waitForTimeout(400);
for (const h of [844, 480, 400, 330]) {
  await pg.setViewportSize({ width: 390, height: h });
  await pg.waitForTimeout(300);
  const g = await pg.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); if (!e) return 'MISSING';
      const r = e.getBoundingClientRect();
      const visH = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const visW = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
      const pct = r.width * r.height ? Math.round(100 * (visH * visW) / (r.width * r.height)) : 0;
      return `${pct}% visible (${Math.round(r.width)}x${Math.round(r.height)} @ y=${Math.round(r.top)})`; };
    return { q: vis('gateSum'), input: vis('gateIn'), go: vis('gateGo'), no: vis('gateNo') };
  });
  console.log(`gate @390x${h}:`, JSON.stringify(g));
}
await pg.setViewportSize({ width: 390, height: 844 });
await pg.evaluate(() => { document.getElementById('gateNo').click(); document.getElementById('setClose').click(); });
await pg.waitForTimeout(400);

// ── results screen fit ──
await pg.evaluate(() => { window.__renderer.render = () => {}; document.getElementById('btnPlay').click(); });
await pg.waitForTimeout(400);
await pg.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 200000 });
// grow the void so the run banks stickers and the results list is long
await pg.evaluate(() => window.__setVoidR(9));
await pg.waitForFunction(() => { try { return window.__matchState().t > 25; } catch { return false; } }, null, { timeout: 300000 });
await pg.evaluate(() => window.__rushClock(0.8));
await pg.waitForFunction(() => getComputedStyle(document.getElementById('end')).display !== 'none', null, { timeout: 90000 });
await pg.waitForTimeout(2000);

const fit = async (label) => {
  const r = await pg.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); if (!e) return 'MISSING';
      const b = e.getBoundingClientRect();
      const visH = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
      const visW = Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0));
      const pct = b.width * b.height ? Math.round(100 * (visH * visW) / (b.width * b.height)) : 0;
      const t = (b.width && pct > 40) ? document.elementFromPoint(b.left + b.width/2, Math.max(1, Math.min(innerHeight-1, b.top + b.height/2))) : null;
      return `${pct}% (${Math.round(b.width)}x${Math.round(b.height)} y=${Math.round(b.top)}) hit=${!t ? 'n/a' : (t === e || e.contains(t)) ? 'HIT' : 'blocked:' + (t.id || t.className)}`; };
    return { vw: innerWidth, vh: innerHeight, again: vis('btnAgain'), home: vis('btnHome'),
      finds: document.getElementById('endFinds').children.length,
      scrollH: document.getElementById('end').scrollHeight };
  });
  console.log(`  ${label}:`, JSON.stringify(r));
};
await fit('results @390x844');
await pg.setViewportSize({ width: 320, height: 480 }); await pg.waitForTimeout(500);
await fit('results @320x480');
await pg.setViewportSize({ width: 320, height: 568 }); await pg.waitForTimeout(500);
await fit('results @320x568 (iPhone SE 1)');
for (let k = 0; k < 20; k++) await pg.setViewportSize({ width: 320 + (k * 23) % 400, height: 400 + (k * 37) % 450 });
await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(600);
await fit('results after a 20-step resize storm');
await pg.screenshot({ path: 'qa-out/_rb_fit_results.png', fullPage: false });
await b.close();
