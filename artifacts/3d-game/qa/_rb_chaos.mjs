// ROBUSTNESS CHAOS: spam, double-tap, two overlays at once, immediate quit,
// rotate, resize storm, background/foreground, blur/focus.
// After every step it asks the only question that matters: can a child still
// reach a match? — measured as real hit-testing (elementFromPoint on the
// control's own centre), not "display !== none".
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const WORLD = process.argv[2] || 'maple';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const errs = [];
pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
pg.on('console', m => { if (m.type() === 'error' && !/403|Forbidden|net::ERR/.test(m.text())) errs.push('CONSOLE: ' + m.text().slice(0, 160)); });
await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await pg.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidLastDay', new Date().toDateString());
  localStorage.setItem('voidGiftAt', String(Date.now() + 9e9)); } catch {} });
await pg.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
await pg.evaluate(() => window.__pinQuality(0));
await pg.waitForTimeout(1500);

// what is actually on top, and is the given control reachable by a finger?
const probeUI = () => pg.evaluate(() => {
  const hit = (id) => {
    const e = document.getElementById(id); if (!e) return 'MISSING';
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return 'zero-size';
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return 'offscreen';
    const top = document.elementFromPoint(cx, cy);
    if (!top) return 'nothing';
    return (top === e || e.contains(top)) ? 'HIT' : `blocked-by:${top.id || top.className || top.tagName}`;
  };
  const shown = [];
  for (const id of ['menu','worlds','loadScr','tut','end','daily','book','settings','pause','gate','shop','trophies','topvoids','policy','skinPrev'])
    { const e = document.getElementById(id); if (e && getComputedStyle(e).display !== 'none') shown.push(id); }
  let st = null; try { const m = window.__matchState(); st = { t: +m.t.toFixed(1), clock: +m.clock.toFixed(1) }; } catch (e) { st = 'ERR ' + e.message; }
  return { shown, play: hit('btnPlay'), again: hit('btnAgain'), home: hit('btnHome'), quit: hit('btnQuit'), st,
    body: document.body.className };
});

const step = async (name, fn) => {
  const before = errs.length;
  try { await fn(); } catch (e) { errs.push(`STEP "${name}" THREW: ${e.message}`); }
  await pg.waitForTimeout(600);
  const u = await probeUI();
  const newErrs = errs.slice(before);
  console.log(`\n== ${name}`);
  console.log('   shown:', u.shown.join(',') || '(none)', '| body:', u.body, '| state:', JSON.stringify(u.st));
  console.log('   PLAY:', u.play, '| AGAIN:', u.again, '| HOME:', u.home, '| QUIT:', u.quit);
  if (newErrs.length) for (const e of new Set(newErrs)) console.log('   !!', e);
};

const started = () => pg.evaluate(() => { try { return window.__matchState().t > 0.2; } catch { return false; } });

await step('baseline menu', async () => {});

// ── 1. spam every menu button 8x as fast as playwright can ──────────────────
await step('spam every menu button x8', async () => {
  for (let k = 0; k < 8; k++) {
    for (const id of ['btnBook','btnShop','btnTrophies','btnTop','btnSettings','btnWorlds','gift','btnSolo'])
      await pg.evaluate((i) => { const e = document.getElementById(i); if (e) e.click(); }, id);
  }
});
// close whatever piled up, by the routes a child has
await step('close all via visible close buttons', async () => {
  for (let k = 0; k < 8; k++) await pg.evaluate(() => {
    for (const id of ['bookClose','setClose','polClose','spClose','btnBack']) {
      const e = document.getElementById(id);
      if (e && e.offsetParent !== null) e.click();
    }
    document.querySelectorAll('.metaScr.show .msBack, .metaScr.show button').forEach(x => { if (/BACK|DONE|✕|‹/.test(x.textContent||'')) x.click(); });
  });
});

// ── 2. two overlays at once, on purpose ─────────────────────────────────────
for (const [a, c] of [['btnBook','btnSettings'], ['btnWorlds','btnShop'], ['btnTrophies','btnTop'], ['btnSettings','btnBook']]) {
  await step(`open ${a} then ${c} (two overlays)`, async () => {
    await pg.evaluate(([x, y]) => { document.getElementById(x).click(); document.getElementById(y).click(); }, [a, c]);
  });
  await step(`  ...try to get back to the menu`, async () => {
    for (let k = 0; k < 6; k++) await pg.evaluate(() => {
      for (const id of ['bookClose','setClose','polClose','spClose','btnBack'])
        { const e = document.getElementById(id); if (e && e.offsetParent !== null) e.click(); }
      document.querySelectorAll('.metaScr.show').forEach(s => s.querySelectorAll('button').forEach(x => { if (/BACK|DONE|✕|‹/.test(x.textContent||'')) x.click(); }));
    });
  });
}

// ── 3. double-tap PLAY, then double-tap the world card ──────────────────────
await step('double-tap PLAY', async () => {
  await pg.evaluate(() => { const p = document.getElementById('btnPlay'); p.click(); p.click(); });
});
await step('double-tap world card (same world = launch twice)', async () => {
  await pg.evaluate((w) => {
    const c = document.querySelector(`#worldRow .wCard[data-world="${w}"]`);
    c.click(); c.click(); c.click();
  }, WORLD);
});
await pg.waitForFunction(() => { try { return window.__matchState().t > 0.2; } catch { return false; } }, null, { timeout: 200000 }).catch(() => console.log('   !! never started after triple-tap'));
await step('  in match after triple-tap', async () => {});

// ── 4. rotate mid-match ─────────────────────────────────────────────────────
await step('rotate to landscape mid-match', async () => { await pg.setViewportSize({ width: 844, height: 390 }); });
await step('rotate back to portrait', async () => { await pg.setViewportSize({ width: 390, height: 844 }); });
await step('resize storm x30', async () => {
  for (let k = 0; k < 30; k++) await pg.setViewportSize({ width: 320 + (k * 17) % 500, height: 500 + (k * 29) % 400 });
  await pg.setViewportSize({ width: 390, height: 844 });
});
await step('tiny viewport 320x480 (iPhone SE-ish floor)', async () => { await pg.setViewportSize({ width: 320, height: 480 }); });
await step('back to 390x844', async () => { await pg.setViewportSize({ width: 390, height: 844 }); });

// ── 5. background / foreground, blur / focus ────────────────────────────────
const setHidden = (v) => pg.evaluate((hidden) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}, v);
await step('background the tab mid-match', async () => { await setHidden(true); });
await step('foreground the tab', async () => { await setHidden(false); });
await step('background/foreground x10', async () => {
  for (let k = 0; k < 10; k++) { await setHidden(true); await pg.waitForTimeout(60); await setHidden(false); await pg.waitForTimeout(60); }
});
await step('blur/focus x10', async () => {
  for (let k = 0; k < 10; k++) { await pg.evaluate(() => window.dispatchEvent(new Event('blur'))); await pg.evaluate(() => window.dispatchEvent(new Event('focus'))); }
});

// ── 6. spam in-match controls ───────────────────────────────────────────────
await step('spam QUIT button x10 (arm/disarm)', async () => {
  for (let k = 0; k < 10; k++) await pg.evaluate(() => document.getElementById('btnQuit').click());
});
await step('spam pause resume/quit toggles', async () => {
  for (let k = 0; k < 6; k++) await pg.evaluate(() => {
    document.getElementById('btnQuit').click();
    const r = document.getElementById('pauseResume'); if (r) r.click();
  });
});
await step('spam power buttons x20', async () => {
  for (let k = 0; k < 20; k++) await pg.evaluate(() => document.querySelectorAll('#powers button, #powers .pw').forEach(x => x.click()));
});

// ── 7. quit immediately after starting ──────────────────────────────────────
await step('LEAVE THE MATCH from pause', async () => {
  await pg.evaluate(() => { document.getElementById('btnQuit').click(); });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { const q = document.getElementById('pauseQuit'); if (q) q.click(); });
});
await step('start a match then quit within 1s, x5', async () => {
  for (let k = 0; k < 5; k++) {
    await pg.evaluate((w) => {
      document.getElementById('btnPlay').click();
      const c = document.querySelector(`#worldRow .wCard[data-world="${w}"]`); if (c) c.click();
    }, WORLD);
    await pg.waitForTimeout(900);
    await pg.evaluate(() => { document.getElementById('btnQuit').click(); });
    await pg.waitForTimeout(200);
    await pg.evaluate(() => { const q = document.getElementById('pauseQuit'); if (q) q.click(); });
    await pg.waitForTimeout(400);
  }
});

console.log('\n\nTOTAL distinct errors:', new Set(errs).size);
for (const e of new Set(errs)) console.log('  ', e);
await b.close();
