// SCRATCH PROBE — WHAT DOES THE RESULTS SCREEN OFFER A CHILD WHO ALREADY OWNS
// EVERYTHING COINS CAN BUY?
//
// nextGoal() (prototype3d.ts:2025) is the game's own answer to "why press PLAY
// AGAIN" — its comment says so: "the results screen stated an outcome and
// offered a button; it never stated a goal". It returns the cheapest UNOWNED
// coin skin, and null when there is none. This measures what #endNext actually
// contains in the two states, side by side, and what the shop and the menu look
// like once the whole 2,700-coin catalogue is owned.
//
// Two profiles, one match each:
//   fresh      — owns 'classic' only, 0 coins
//   boughtout  — owns all five coin skins, 9,999 coins (about 19 matches in)
//
//   node qa/_ret_end.mjs [port] [world]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4231';
const WORLD = process.argv[3] || 'maple';

const PROFILES = {
  fresh: { owned: ['classic'], coins: 0, streak: 0 },
  boughtout: { owned: ['classic', 'toxic', 'sunset', 'ocean', 'candy', 'honey', 'ember', 'prism'], coins: 9999, streak: 30 },
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const [name, prof] of Object.entries(PROFILES)) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((pr) => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidBookSeen', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidSkinsOwned', JSON.stringify(pr.owned));
    localStorage.setItem('voidSaveVer', '2');
    localStorage.setItem('voidCoins', String(pr.coins));
    localStorage.setItem('voidStreak', String(pr.streak));
    localStorage.setItem('voidStats', JSON.stringify({ matches: 40, wins: 12, best: 240000, bestForm: 4, eaten: 9000, rivals: 14, combo: 28 }));
  } catch { } }, prof);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

  // the shop and the trophy case, BEFORE playing
  const shop = await p.evaluate(() => {
    document.getElementById('btnShop').click();
    return [...document.querySelectorAll('#shopGrid > *')]
      .map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  });
  await p.evaluate(() => document.getElementById('shop').classList.remove('show'));
  const troph = await p.evaluate(() => {
    document.getElementById('btnTrophies').click();
    const r = { count: document.getElementById('trophyCount')?.textContent,
      got: [...document.querySelectorAll('#trophyGrid .tr.got')].length,
      open: [...document.querySelectorAll('#trophyGrid .tr:not(.got)')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()) };
    document.getElementById('trophies').classList.remove('show');
    return r;
  });

  // one match, clock rushed — we want the RESULTS SCREEN, not a fair score
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  await p.waitForTimeout(4000);
  await p.evaluate(() => window.__rushClock(0.4));
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 200000 });
  await p.waitForTimeout(1500);
  const end = await p.evaluate(() => ({
    next: document.getElementById('endNext')?.innerHTML ?? '',
    nextText: document.getElementById('endNext')?.textContent?.trim() ?? '',
    nextH: document.getElementById('endNext')?.getBoundingClientRect().height ?? 0,
    quests: document.getElementById('endQuests')?.textContent ?? '',
    stats: [...document.querySelectorAll('#endStats .es')].map((e) => e.textContent.trim()),
  }));
  console.log(`\n=== ${name.toUpperCase()} ===`);
  console.log(`shop cards (${shop.length}): ${JSON.stringify(shop)}`);
  console.log(`trophies: ${troph.count}  earned ${troph.got}  still open: ${JSON.stringify(troph.open)}`);
  console.log(`endNext text = "${end.nextText}"   (rendered height ${end.nextH}px)`);
  console.log(`endStats = ${JSON.stringify(end.stats)}`);
  await p.close();
}
await b.close();
