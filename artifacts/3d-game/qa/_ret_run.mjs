// SCRATCH PROBE — THE RETENTION LOOP, RUN BY RUN.
//
// One PERSISTENT browser context, so localStorage carries between page loads
// exactly as it does for a child who closes the app and opens it again. Each
// iteration is a full cold boot + one 180s match driven by an autopilot, and
// after every match we read the whole meta state: coins, xp/level, stickers
// found, quests, shop affordability, and what the results screen said.
//
// That answers the three questions the shop and the book were priced on and
// nobody had counted:
//   - how many coins does a match actually pay, for THIS driver
//   - how many matches to afford each of the five coin skins (2,700 total)
//   - how the sticker find-rate DECAYS as the book fills (found stickers are
//     not re-placed, so run 5 has fewer curios hidden than run 1)
//
//   node qa/_ret_run.mjs [world] [runs] [policy] [port]
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const RUNS = +(process.argv[3] || 6);
const POLICY = process.argv[4] || 'wander';
const PORT = process.argv[5] || '4231';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
// ONE context for the whole experiment — that is the entire point.
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await ctx.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
// A returning player: past the tutorial, past the book intro, calendar claimed
// today so the modal does not block. Nothing else is seeded.
await ctx.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidBookSeen', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { } });

const rows = [];
for (let run = 0; run < RUNS; run++) {
  const t0 = Date.now();
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error(`PAGE ERROR: ${e.message}`));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const tBoot = Date.now() - t0;
  const pre = await p.evaluate(() => ({
    coins: Number(localStorage.getItem('voidCoins') || 0),
    xp: Number(localStorage.getItem('voidXP') || 0),
    stickers: (localStorage.getItem('voidStickers')||'').split(',').filter(Boolean).length,
    stats: JSON.parse(localStorage.getItem('voidStats') || '{}'),
    quests: JSON.parse(localStorage.getItem('voidQuestState') || '{}'),
  }));
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  const placed = await p.evaluate(() => window.__edibles.filter((e) => e.mesh?.userData?.sticker).length);

  await p.evaluate((policy) => {
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    let seed = 20260807, head = 0, holdUntil = -1;
    const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      let aim = best;
      if (policy === 'wander') {
        const t = (window.__matchState?.().t ?? 0);
        if (t > holdUntil) { head = rnd() * Math.PI * 2; holdUntil = t + 1.6 + rnd() * 2.2; }
        aim = (best && bd < 22 * 22) ? best : { dx: Math.cos(head), dz: Math.sin(head) };
      }
      if (aim) { const m = Math.hypot(aim.dx, aim.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + aim.dx / m * 110, clientY: cy + aim.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, POLICY);

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 1800000 });
  await p.waitForTimeout(1200);
  const post = await p.evaluate(() => ({
    coins: Number(localStorage.getItem('voidCoins') || 0),
    xp: Number(localStorage.getItem('voidXP') || 0),
    stickers: (localStorage.getItem('voidStickers')||'').split(',').filter(Boolean).length,
    stats: JSON.parse(localStorage.getItem('voidStats') || '{}'),
    quests: JSON.parse(localStorage.getItem('voidQuestState') || '{}'),
    owned: JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]'),
    endHd: document.getElementById('endHd')?.textContent ?? '',
    endSub: document.getElementById('endSub')?.textContent ?? '',
    endNext: document.getElementById('endNext')?.textContent ?? '',
    endStats: [...document.querySelectorAll('#endStats .es')].map((e) => e.textContent.trim()),
    endQuests: document.getElementById('endQuests')?.textContent ?? '',
    reveal: document.getElementById('endFinds')?.classList.contains('show') ?? false,
    revealCells: document.querySelectorAll('#endFinds .stk').length,
  }));
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const r = { run: run + 1, boot: tBoot, secs, placed, pre, post,
    dCoins: post.coins - pre.coins, dXp: post.xp - pre.xp, dStk: post.stickers - pre.stickers };
  rows.push(r);
  console.log(`run ${run + 1}  boot ${(tBoot / 1000).toFixed(0)}s  wall ${secs}s  hidden ${String(placed).padStart(2)}`
    + `  +${String(r.dCoins).padStart(3)}✦ (tot ${post.coins})  +${r.dXp}xp  stickers ${pre.stickers}->${post.stickers}`
    + `  reveal ${post.reveal ? post.revealCells : 'no'}`);
  console.log(`      hd="${post.endHd}"  next="${post.endNext}"`);
  console.log(`      stats=${JSON.stringify(post.endStats)}`);
  console.log(`      quests="${post.endQuests}"  owned=${JSON.stringify(post.owned)}`);
  await p.close();
}
await b.close();

const PRICES = { toxic: 150, sunset: 300, ocean: 500, candy: 750, honey: 1000 };
const avg = rows.reduce((a, r) => a + r.dCoins, 0) / rows.length;
console.log(`\n[${WORLD}/${POLICY}] ${rows.length} runs  mean +${avg.toFixed(0)}✦/match  `
  + `range ${Math.min(...rows.map((r) => r.dCoins))}..${Math.max(...rows.map((r) => r.dCoins))}`);
let cum = 0;
for (const [id, price] of Object.entries(PRICES)) {
  cum += price;
  console.log(`  own through ${id.padEnd(7)} = ${String(cum).padStart(4)}✦ = ${(cum / avg).toFixed(1)} matches `
    + `= ${((cum / avg) * 3.2).toFixed(0)} min of play`);
}
console.log(`  stickers: ${rows.map((r) => r.dStk).join('/')} per run, book now `
  + `${rows[rows.length - 1].post.stickers}/48`);
