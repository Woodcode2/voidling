// THE WEDGE. Switch worlds from the picker -> the page reloads with
// voidAutoPlay=1 -> module init takes coverHold('pack') at prototype3d.ts:2879
// -> the rAF calls launchWorld -> withWorldReady() finds packReady already true
// (prototype3d.ts:2687) and takes the early return, which NEVER releases that
// hold. The load curtain (z-index 60) stays up over the entire match and over
// the results screen (z-index 9).
// This probe plays the whole match out from behind the curtain and asks what a
// child can still reach.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const FROM = process.argv[2] || 'maple';
const TO = (process.argv[3] || 'pirate,gameday,lantern,maple').split(',');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const to of TO) {
  if (to === FROM) continue;
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await pg.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await pg.goto(`http://127.0.0.1:${PORT}/?w=${FROM}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => document.getElementById('btnPlay').click());
  await pg.waitForTimeout(400);
  await pg.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), to);
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.evaluate(() => { window.__renderer.render = () => {}; });
  await pg.waitForFunction(() => { try { return window.__matchState().t > 3; } catch { return false; } }, null, { timeout: 300000 });

  const mid = await pg.evaluate(() => {
    const l = document.getElementById('loadScr');
    const hit = (id) => { const e = document.getElementById(id); if (!e) return 'MISSING';
      const r = e.getBoundingClientRect(); if (!r.width) return 'zero';
      const t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
      return (t === e || e.contains(t)) ? 'HIT' : 'blocked-by:' + (t ? (t.id || t.className) : 'null'); };
    return { cls: l.className, disp: getComputedStyle(l).display, z: getComputedStyle(l).zIndex,
      pct: document.getElementById('lPct').textContent,
      centreTop: (() => { const t = document.elementFromPoint(innerWidth/2, innerHeight/2); return t ? (t.id || t.className || t.tagName) : 'null'; })(),
      quit: hit('btnQuit') };
  });
  // now run the match to the whistle and see whether the results screen is reachable
  await pg.evaluate(() => window.__rushClock(1.0));
  await pg.waitForTimeout(3000);
  const end = await pg.evaluate(() => {
    const l = document.getElementById('loadScr'), e = document.getElementById('end');
    const hit = (id) => { const x = document.getElementById(id); if (!x) return 'MISSING';
      const r = x.getBoundingClientRect(); if (!r.width) return 'zero';
      const t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
      return (t === x || x.contains(t)) ? 'HIT' : 'blocked-by:' + (t ? (t.id || t.className) : 'null'); };
    return { curtain: l.className + ' / ' + getComputedStyle(l).display,
      endDisp: getComputedStyle(e).display,
      again: hit('btnAgain'), home: hit('btnHome'),
      centreTop: (() => { const t = document.elementFromPoint(innerWidth/2, innerHeight/2); return t ? (t.id || t.className || t.tagName) : 'null'; })() };
  });
  console.log(`\n${FROM} -> ${to}`);
  console.log('  mid-match:', JSON.stringify(mid));
  console.log('  at whistle:', JSON.stringify(end));
  await pg.screenshot({ path: `qa-out/_rb_wedge_${to}.png` });
  await pg.close();
}
await b.close();
