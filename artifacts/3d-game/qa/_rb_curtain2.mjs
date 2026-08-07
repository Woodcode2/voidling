// WHY is the curtain still up? Sample the element's own classList and inline
// style rather than the computed display, on BOTH entry paths:
//   A) plain load + PLAY + same-world card  (no reload)
//   B) world switch -> reload -> voidAutoPlay
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const sampler = () => {
  window.__renderer.render = () => {};
  window.__cur = [];
  const tick = () => {
    try {
      const m = window.__matchState();
      const l = document.getElementById('loadScr');
      window.__cur.push([+m.t.toFixed(2), l.className, l.style.opacity || '(none)', getComputedStyle(l).display, +getComputedStyle(l).opacity]);
    } catch {}
    if (window.__cur.length < 20000) requestAnimationFrame(tick);
  };
  tick();
};

const report = async (pg, label, untilT) => {
  await pg.waitForFunction((u) => { try { return window.__matchState().t > u; } catch { return false; } }, untilT, { timeout: 400000 });
  const rows = await pg.evaluate(() => window.__cur);
  const vis = rows.filter(r => r[3] !== 'none' && r[4] > 0.02);
  console.log(`\n--- ${label}: ${rows.length} samples, curtain visible in ${vis.length}`);
  console.log('  first:', JSON.stringify(rows[0]));
  if (vis.length) {
    console.log('  last visible:', JSON.stringify(vis[vis.length - 1]));
    console.log(`  MATCH TIME BEHIND THE CURTAIN: ${(vis[vis.length-1][0] - Math.max(0, vis[0][0])).toFixed(2)}s (last sample t=${rows[rows.length-1][0]})`);
  } else console.log('  curtain never visible after the match began — clean');
};

// ── B: world switch (reload + autoplay) ──
{
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  pg.on('pageerror', e => console.log('PAGEERROR', e.message));
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await pg.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => document.getElementById('btnPlay').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('#worldRow .wCard[data-world="pirate"]').click());
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.evaluate(sampler);
  await report(pg, 'B world switch -> reload -> autoplay (pirate)', 25);
  await pg.screenshot({ path: 'qa-out/_rb_curtainB.png' });
  await pg.close();
}

// ── A: no reload, PLAY then the card for the world already built ──
{
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  pg.on('pageerror', e => console.log('PAGEERROR', e.message));
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await pg.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1500);
  await pg.evaluate(sampler);
  await pg.evaluate(() => document.getElementById('btnPlay').click());
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
  await report(pg, 'A menu PLAY -> same world (no reload)', 25);
  await pg.screenshot({ path: 'qa-out/_rb_curtainA.png' });
  await pg.close();
}
await b.close();
