// 1. GHOST MATCH: btnHome (prototype3d.ts:3216) only hides #end and re-shows
//    the menu — it never stops the match. Press PLAY AGAIN then HOME and the
//    child is on the menu with a live 180-second match running behind it.
// 2. FIRST-EVER LAUNCH: prototype3d.ts:2735 calls beginMatch() before the boot
//    curtain has lifted. How much match time is spent behind the curtain?
// 3. Geometry of the PLAY AGAIN / HOME pair — how reachable is the double hit.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4271;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const mk = async (init) => {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  pg.on('pageerror', e => console.log('  PAGEERROR', e.message));
  await pg.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  if (init) await pg.addInitScript(init);
  return pg;
};
const primed = () => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} };

// ── 2. first-ever launch: match time behind the boot curtain ───────────────
console.log('\n=== 2. FIRST-EVER launch: match clock vs boot curtain ===');
{
  const pg = await mk();
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.evaluate(() => {
    window.__cur = [];
    const tick = () => { try { const m = window.__matchState(); const l = document.getElementById('loadScr');
      window.__cur.push([+m.t.toFixed(2), l.className, getComputedStyle(l).display, +getComputedStyle(l).opacity]); } catch {}
      if (window.__cur.length < 6000) requestAnimationFrame(tick); };
    tick();
  });
  await pg.waitForFunction(() => { try { return window.__matchState().t > 10; } catch { return false; } }, null, { timeout: 300000 });
  const rows = await pg.evaluate(() => window.__cur);
  const up = rows.filter(r => r[2] !== 'none' && r[3] > 0.02 && r[0] > 0);
  console.log(`  samples ${rows.length}, first sample t=${rows[0][0]}`);
  console.log(`  curtain up over a RUNNING clock for ${up.length} samples`);
  if (up.length) console.log(`  match t=${up[0][0]} .. ${up[up.length-1][0]}  => ${(up[up.length-1][0] - up[0][0]).toFixed(2)}s of the 180 spent behind the curtain`);
  await pg.close();
}

// ── 3 + 1. results row geometry, then the ghost match ─────────────────────
console.log('\n=== 3+1. results row geometry, then PLAY AGAIN + HOME ===');
{
  const pg = await mk(primed);
  await pg.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await pg.waitForFunction(() => window.__matchState, null, { timeout: 300000 });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window.__renderer.render = () => {}; document.getElementById('btnPlay').click(); });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
  await pg.waitForFunction(() => { try { return window.__matchState().t > 1; } catch { return false; } }, null, { timeout: 200000 });
  await pg.evaluate(() => window.__rushClock(0.8));
  await pg.waitForFunction(() => getComputedStyle(document.getElementById('end')).display !== 'none', null, { timeout: 90000 });
  await pg.waitForTimeout(1500);
  console.log('  geometry:', await pg.evaluate(() => {
    const a = document.getElementById('btnAgain').getBoundingClientRect();
    const h = document.getElementById('btnHome').getBoundingClientRect();
    return { again: [Math.round(a.left), Math.round(a.top), Math.round(a.width), Math.round(a.height)],
      home: [Math.round(h.left), Math.round(h.top), Math.round(h.width), Math.round(h.height)],
      gapPx: Math.round(Math.min(Math.abs(h.top - a.bottom), Math.abs(h.left - a.right))),
      sideBySide: Math.abs(h.top - a.top) < 8 };
  }));
  // the fat-finger / double-tap case
  await pg.evaluate(() => { document.getElementById('btnAgain').click(); document.getElementById('btnHome').click(); });
  await pg.waitForTimeout(1500);
  const g = async (l) => console.log(`  ${l}:`, await pg.evaluate(() => {
    let m = null; try { const x = window.__matchState(); m = { t: +x.t.toFixed(1), clock: +x.clock.toFixed(1), r: +x.r.toFixed(2), score: Math.round(x.score) }; } catch {}
    return { shown: ['menu','end','loadScr','pause'].filter(i => getComputedStyle(document.getElementById(i)).display !== 'none'),
      body: document.body.className, match: m };
  }));
  await g('right after AGAIN+HOME');
  await pg.waitForTimeout(4000);
  await g('4s later (clock should be frozen if HOME really stopped it)');
  // run the ghost match out and see what the child gets
  await pg.evaluate(() => window.__rushClock(0.8));
  await pg.waitForTimeout(3500);
  await g('after the ghost match hits 0');
  console.log('  what is on top of the screen centre:', await pg.evaluate(() => {
    const t = document.elementFromPoint(innerWidth/2, innerHeight/2); return t ? (t.id || t.className || t.tagName) : 'null'; }));
  console.log('  is #end display/visible:', await pg.evaluate(() => {
    const e = document.getElementById('end'); const cs = getComputedStyle(e);
    return `${cs.display} z=${cs.zIndex} opacity=${cs.opacity} cls="${e.className}"`; }));
  await pg.screenshot({ path: 'qa-out/_rb_ghost.png' });
  await pg.close();
}
await b.close();
