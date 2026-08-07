// Does the DAILY REWARD panel survive into a match?
// Path under test: first launch of the day -> tap PLAY -> pick a DIFFERENT
// world. That writes voidAutoPlay and reloads; on the reload the daily block
// runs while the menu is still displayed, so it shows — and then the rAF
// autoplay starts the match underneath it.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
pg.on('pageerror', e => console.log('PAGEERROR', e.message));
await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
// a returning child who has played before but has NOT claimed today
await pg.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); } catch {} });

await pg.goto(`http://127.0.0.1:${PORT}/?`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
await pg.waitForTimeout(1500);

const state = async (label) => {
  const s = await pg.evaluate(() => {
    const d = document.getElementById('daily');
    const cs = getComputedStyle(d);
    const card = d.querySelector('.dCard');
    const cr = card ? card.getBoundingClientRect() : null;
    let m = null; try { const x = window.__matchState(); m = { t: +x.t.toFixed(1), clock: +x.clock.toFixed(1) }; } catch {}
    // how much of the screen does the daily's own backdrop cover?
    return { display: cs.display, opacity: cs.opacity, cls: d.className, z: cs.zIndex,
      card: cr ? { w: Math.round(cr.width), h: Math.round(cr.height), top: Math.round(cr.top) } : null,
      backdropMarginLeft: cr ? Math.round(cr.left) : null,
      backdropMarginTop: cr ? Math.round(cr.top) : null,
      body: document.body.className, menu: getComputedStyle(document.getElementById('menu')).display,
      match: m,
      // is the in-match QUIT button reachable by a finger?
      quitHit: (() => { const q = document.getElementById('btnQuit'); const r = q.getBoundingClientRect();
        if (!r.width) return 'zero'; const t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        return t === q ? 'HIT' : 'blocked-by:' + (t ? (t.id || t.className) : 'null'); })(),
    };
  });
  console.log(label, JSON.stringify(s));
  return s;
};

await state('BOOT (menu):        ');
// tap PLAY like a child would: a real tap, hit-tested
const playTap = await pg.evaluate(() => {
  const p = document.getElementById('btnPlay'); const r = p.getBoundingClientRect();
  const t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
  return t === p ? 'HIT' : 'blocked-by:' + (t ? (t.id || t.className) : 'null');
});
console.log('real tap on PLAY at boot ->', playTap);

// dismiss the daily by tapping the backdrop, then measure how big that target is
const backdrop = await pg.evaluate(() => {
  const card = document.querySelector('#daily .dCard').getBoundingClientRect();
  return { leftGutter: Math.round(card.left), rightGutter: Math.round(innerWidth - card.right),
    topGutter: Math.round(card.top), bottomGutter: Math.round(innerHeight - card.bottom),
    vw: innerWidth, vh: innerHeight };
});
console.log('daily backdrop tappable gutters:', JSON.stringify(backdrop));

await pg.evaluate(() => { const d = document.getElementById('daily'); d.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await pg.waitForTimeout(400);
await state('after backdrop tap:  ');

// now the world switch: PLAY -> a world that is NOT the current one -> reload+autoplay
await pg.evaluate(() => document.getElementById('btnPlay').click());
await pg.waitForTimeout(600);
await pg.evaluate(() => document.querySelector('#worldRow .wCard[data-world="pirate"]').click());
await pg.waitForTimeout(2000);
await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 300000 });
await pg.waitForFunction(() => { try { return window.__matchState().t > 12; } catch { return false; } }, null, { timeout: 300000 });
await pg.waitForTimeout(500);
const s = await state('IN MATCH t>12:       ');
const cover = await pg.evaluate(() => {
  const d = document.getElementById('daily');
  const r = d.getBoundingClientRect();
  return { pctScreen: Math.round(100 * (r.width * r.height) / (innerWidth * innerHeight)),
    loadScr: getComputedStyle(document.getElementById('loadScr')).display };
});
console.log('daily covers', cover.pctScreen + '% of the screen; loadScr =', cover.loadScr);
await pg.screenshot({ path: 'qa-out/_rb_daily_inmatch.png' });
console.log('\nVERDICT: daily overlay during the match ->',
  s.display !== 'none' && s.cls.includes('show') ? 'STILL SHOWING (covers the match)' : 'gone');
await b.close();
