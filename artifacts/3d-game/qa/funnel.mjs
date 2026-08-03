// AUDIT 1 — THE FUNNEL, as a child actually meets it.
//
// Cold boot (nothing in localStorage, first ever launch) and returning player,
// timed and photographed at every step. The questions this answers are the
// ones that decide whether a 7-year-old ever reaches a match at all:
//   • how long from tapping the icon to being able to do ANYTHING
//   • how many taps to be playing
//   • what is on screen while they wait, and does it move
//   • what a returning player sees FIRST — a reason to play, or a wall of UI
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const OUT = './qa-out/funnel/';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const mode of ['cold', 'returning']) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  if (mode === 'returning') {
    await p.addInitScript(() => { try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidCoins', '340'); localStorage.setItem('voidXP', '260');
      localStorage.setItem('voidStreak', '3');
      localStorage.setItem('voidStats', JSON.stringify({ matches: 9, wins: 3, best: 41000, bestForm: 4, eaten: 900, rivals: 2, combo: 14 }));
    } catch {} });
  }
  const t0 = Date.now();
  await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
  const tDom = Date.now() - t0;
  // FIRST PAINT OF SOMETHING A CHILD RECOGNISES: when is the PLAY button both
  // present and hittable? That, not "load complete", is time-to-play.
  let tPlay = null;
  try {
    await p.waitForFunction(() => {
      const b2 = document.getElementById('btnPlay');
      if (!b2) return false;
      const r = b2.getBoundingClientRect();
      const cs = getComputedStyle(b2);
      return r.width > 20 && cs.visibility !== 'hidden' && +cs.opacity > 0.5;
    }, null, { timeout: 300000 });
    tPlay = Date.now() - t0;
  } catch {}
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const tReady = Date.now() - t0;
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}${mode}-1-menu.png` });

  // what is ON the menu, and how big is each thing a thumb must hit?
  const menu = await p.evaluate(() => {
    const hit = [];
    for (const el of document.querySelectorAll('button, [role=button], .wCard, #btnPlay, #btnShop')) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (r.width < 4 || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.1) continue;
      hit.push({ id: el.id || el.className?.toString?.().slice(0, 22) || el.tagName,
        w: Math.round(r.width), h: Math.round(r.height),
        y: Math.round(r.y), txt: (el.textContent || '').trim().slice(0, 18) });
    }
    const modals = [...document.querySelectorAll('.show')].map(e => e.id || e.className).filter(Boolean);
    return { hit, modals, title: document.title };
  });
  console.log(`\n══ ${mode.toUpperCase()} BOOT ══`);
  console.log(`  DOM ${tDom}ms   PLAY hittable ${tPlay ?? 'NEVER'}ms   game ready ${tReady}ms`);
  if (menu.modals.length) console.log(`  modals up on arrival: ${menu.modals.join(', ')}`);
  console.log('  tappable targets on the menu (44px is the iOS minimum):');
  for (const h of menu.hit)
    console.log(`    ${String(h.w).padStart(4)}x${String(h.h).padStart(3)} @y${String(h.y).padStart(4)}  ${h.h < 44 ? 'SMALL ' : '      '}${h.id}  ${h.txt}`);

  // FIRST LAUNCH DELIBERATELY HAS NO MENU — prototype3d.ts splashes straight
  // into a match ("the menu earns its place from session two"). So on a cold
  // boot there is nothing to click and the funnel is zero taps by design.
  const autoPlayed = await p.evaluate(() =>
    !document.getElementById('btnPlay') ||
    getComputedStyle(document.getElementById('btnPlay')).visibility === 'hidden' ||
    document.getElementById('menu')?.style.display === 'none');
  if (autoPlayed) {
    const st = await p.evaluate(() => {
      const ms = window.__matchState?.();
      return { t: ms ? +ms.t.toFixed(1) : null, rivals: ms ? ms.rivals.length : 0,
        joined: ms ? ms.rivals.filter(r => r.joined).length : 0,
        world: window.__biomeAt ? 'live' : '?' };
    });
    console.log(`  FIRST LAUNCH AUTO-PLAYS (by design): 0 taps to playing.`);
    console.log(`     rivals in the match: ${st.rivals} (${st.joined} already joined)`);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}${mode}-3-match.png` });
    if (errs.length) console.log('  PAGE ERRORS:', errs.slice(0, 4));
    await p.close();
    continue;
  }
  // TAPS TO PLAY
  let taps = 0;
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); taps++;
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}${mode}-2-picker.png` });
  const picker = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#worldRow .wCard')].map(c => ({
      w: c.dataset.world || '(locked)',
      locked: c.classList.contains('lock'),
      best: (c.querySelector('.wBest')?.textContent || '').trim(),
      title: (c.querySelector('b')?.textContent || '').trim(),
      sub: (c.querySelector('span')?.textContent || '').trim(),
      hasArt: !!c.querySelector('.wArt') &&
        getComputedStyle(c.querySelector('.wArt')).backgroundImage !== 'none',
    }));
    return cards;
  });
  console.log('  picker cards:');
  for (const c of picker)
    console.log(`    ${c.w.padEnd(9)} ${c.locked ? 'LOCKED' : '      '}  art:${c.hasArt ? 'yes' : 'NO '}  best:"${c.best}"  ${c.title} / ${c.sub}`);
  await p.click('#worldRow .wCard[data-world="maple"]'); taps++;
  const tPick = Date.now();
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.1, null, { timeout: 400000 });
  console.log(`  TAPS FROM LAUNCH TO PLAYING: ${taps}`);
  console.log(`  world-load stall after tapping a card: ${Date.now() - tPick}ms`);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${OUT}${mode}-3-match.png` });
  if (errs.length) console.log('  PAGE ERRORS:', errs.slice(0, 4));
  await p.close();
}
await b.close();
