// HOSTILE ENVIRONMENTS: storage disabled (private mode / "Block All Cookies"),
// storage full (quota exceeded on every write), and prefers-reduced-motion.
// Each runs the whole loop: boot -> menu -> PLAY -> match -> whistle -> results
// -> PLAY AGAIN, and reports anything thrown plus whether each stage was
// actually reached.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;

const KILL_STORAGE = () => {
  const boom = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
  const fake = { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, get length() { boom(); } };
  try { Object.defineProperty(window, 'localStorage', { configurable: true, get() { boom(); } }); } catch {}
  try { Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { boom(); } }); } catch {}
  void fake;
};
const FILL_STORAGE = () => {
  // real quota pressure: every setItem after this throws QuotaExceededError
  try {
    const chunk = 'x'.repeat(512 * 1024);
    for (let i = 0; i < 40; i++) window.localStorage.setItem('__fill' + i, chunk);
  } catch { /* full — which is the point */ }
};

const run = async (b, label, { init, reducedMotion } = {}) => {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    reducedMotion: reducedMotion || null });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/403|Forbidden|net::ERR/.test(m.text())) errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  if (init) await pg.addInitScript(init);
  const stages = {};
  try {
    await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    stages.boot = await pg.waitForFunction(() => window.__matchState && window.__renderer, null, { timeout: 300000 }).then(() => 'ok').catch(e => 'FAILED: ' + e.message.slice(0, 60));
    await pg.waitForTimeout(2000);
    stages.sceneNodes = await pg.evaluate(() => { let n = 0; try { window.__scene.traverse(() => n++); } catch (e) { return 'ERR ' + e.message; } return n; }).catch(e => 'ERR');
    stages.edibles = await pg.evaluate(() => { try { const e = window.__edibles; const a = typeof e === 'function' ? e() : e; return a.length; } catch (e) { return 'ERR ' + e.message; } });
    await pg.evaluate(() => { try { window.__renderer.render = () => {}; } catch {} });
    // dismiss the daily if it fired, then play
    await pg.evaluate(() => { const d = document.getElementById('daily'); if (d && d.classList.contains('show')) d.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await pg.waitForTimeout(300);
    // tutorial may show for a first-ever player with no storage
    await pg.evaluate(() => document.getElementById('btnPlay').click());
    await pg.waitForTimeout(400);
    await pg.evaluate(() => { const c = document.querySelector('#worldRow .wCard[data-world="maple"]'); if (c) c.click(); });
    await pg.waitForTimeout(600);
    await pg.evaluate(() => { const g = document.getElementById('btnGotIt'); if (g && g.offsetParent !== null) g.click(); });
    stages.matchStarted = await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 200000 }).then(() => 'ok').catch(() => 'NEVER STARTED');
    // curtain check
    stages.curtain = await pg.evaluate(() => { const l = document.getElementById('loadScr'); return l.className + '/' + getComputedStyle(l).display; });
    await pg.evaluate(() => window.__rushClock(1.0));
    await pg.waitForTimeout(2500);
    stages.results = await pg.evaluate(() => {
      const e = document.getElementById('end');
      const a = document.getElementById('btnAgain'); const r = a.getBoundingClientRect();
      const t = r.width ? document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) : null;
      return { end: getComputedStyle(e).display, again: !t ? 'zero' : (t === a || a.contains(t)) ? 'HIT' : 'blocked-by:' + (t.id || t.className) };
    });
    await pg.evaluate(() => { const a = document.getElementById('btnAgain'); if (a) a.click(); });
    stages.rematch = await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 200000 }).then(() => 'ok').catch(() => 'REMATCH FAILED');
    // stickers / coins survive?
    stages.coins = await pg.evaluate(() => document.getElementById('coins').textContent);
  } catch (e) { stages.THREW = e.message.slice(0, 160); }
  console.log(`\n### ${label}`);
  for (const [k, v] of Object.entries(stages)) console.log(`   ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  console.log(`   distinct errors: ${new Set(errs).size}`);
  for (const e of [...new Set(errs)].slice(0, 8)) console.log('     !!', e);
  await pg.close();
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
await run(b, 'BASELINE (storage works)', { init: () => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} } });
await run(b, 'STORAGE DISABLED (private mode)', { init: KILL_STORAGE });
await run(b, 'STORAGE FULL (quota exceeded)', { init: FILL_STORAGE });
await run(b, 'prefers-reduced-motion: reduce', { reducedMotion: 'reduce',
  init: () => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} } });
await b.close();
