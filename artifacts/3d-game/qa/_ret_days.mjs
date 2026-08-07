// SCRATCH PROBE — WHAT IS DIFFERENT ABOUT OPENING IT AGAIN TOMORROW?
//
// One persistent context. Boot the menu once per simulated day, with Date
// shifted forward a day at a time, claim whatever the game offers, and dump
// everything the menu says. No match is played: this isolates the OPEN, which
// is the moment a child decides whether there is anything here today.
//
// Chaining real boots (rather than hand-seeding localStorage) is deliberate —
// the calendar's day/week/streak arithmetic is exactly what is under test, and
// a hand-seeded save proves only that the probe can do the same sum.
//
//   node qa/_ret_days.mjs [days] [port] [world]
import { chromium } from 'playwright';

const DAYS = +(process.argv[2] || 10);
const PORT = process.argv[3] || '4231';
const WORLD = process.argv[4] || 'maple';
const SKIP = (process.argv[5] || '').split(',').filter(Boolean).map(Number);   // days to NOT open

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await ctx.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

const rows = [];
for (let d = 0; d < DAYS; d++) {
  if (SKIP.includes(d)) { console.log(`day ${d}: (child did not open the app)`); continue; }
  const p = await ctx.newPage();
  await p.addInitScript((off) => {
    const _D = Date;
    const shim = class extends _D {
      constructor(...a) { if (a.length === 0) super(_D.now() + off); else super(...a); }
      static now() { return _D.now() + off; }
    };
    shim.parse = _D.parse; shim.UTC = _D.UTC;
    window.Date = shim;
  }, d * 86400000);
  p.on('pageerror', (e) => console.error(`day ${d} PAGE ERROR: ${e.message}`));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(600);

  const s = await p.evaluate(() => {
    const t = (id) => document.getElementById(id)?.textContent?.trim() ?? null;
    const dailyShown = document.getElementById('daily')?.classList.contains('show') ?? false;
    return {
      dailyShown,
      dailyTitle: t('dailyTitle'), dailyStreak: t('dailyStreak'), dailyClaim: t('dailyClaim'),
      cells: [...document.querySelectorAll('#dailyGrid .dCell')].map((c) => c.textContent.trim()),
      rank: t('rankChip'),
      quests: [...document.querySelectorAll('#quests .q')].map((q) => q.getAttribute('title')),
      coins: Number(localStorage.getItem('voidCoins') || 0),
      streakLS: localStorage.getItem('voidStreak'),
      navCards: [...document.querySelectorAll('.navRow .navCard, .navRow > *')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
      bookChip: document.getElementById('bookChip')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      owned: JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]'),
    };
  });
  // claim, the way a child would
  // NOT p.click(): the CLAIM button never stops animating, so Playwright's
  // stability check times out on it forever. A thumb has no such problem.
  if (s.dailyShown) {
    await p.evaluate(() => document.getElementById('dailyClaim').click());
    await p.waitForTimeout(1500);
  }
  const after = await p.evaluate(() => ({
    coins: Number(localStorage.getItem('voidCoins') || 0),
    owned: JSON.parse(localStorage.getItem('voidSkinsOwned') || '["classic"]'),
    streak: localStorage.getItem('voidDailyStreak'), week: localStorage.getItem('voidDailyWeek'),
  }));
  rows.push({ d, ...s, after });
  console.log(`day ${String(d).padStart(2)}  modal=${s.dailyShown ? 'YES' : 'no '}  `
    + `title="${s.dailyTitle}"  streakline="${s.dailyStreak}"  claim="${s.dailyClaim}"  `
    + `-> coins ${s.coins}->${after.coins}  streak=${after.streak} week=${after.week}`);
  console.log(`        rank="${s.rank}"`);
  console.log(`        quests=${JSON.stringify(s.quests)}`);
  console.log(`        owned=${JSON.stringify(after.owned)}`);
  await p.close();
}
await b.close();

// what actually CHANGED between consecutive opens
console.log('\n── day-to-day deltas ──');
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], c = rows[i];
  const diff = [];
  if (a.dailyClaim !== c.dailyClaim) diff.push(`claim ${a.dailyClaim} -> ${c.dailyClaim}`);
  if (a.dailyTitle !== c.dailyTitle) diff.push(`title ${a.dailyTitle} -> ${c.dailyTitle}`);
  if (JSON.stringify(a.quests) !== JSON.stringify(c.quests)) diff.push('QUEST BOARD CHANGED');
  if (JSON.stringify(a.after.owned) !== JSON.stringify(c.after.owned)) diff.push(`skins ${JSON.stringify(c.after.owned)}`);
  if (a.rank !== c.rank) diff.push(`rank ${a.rank} -> ${c.rank}`);
  console.log(`day ${a.d}->${c.d}: ${diff.length ? diff.join(' | ') : 'NOTHING CHANGED except the coin amount'}`);
}
const boards = new Set(rows.map((r) => JSON.stringify(r.quests)));
console.log(`\ndistinct quest boards over ${rows.length} opened days: ${boards.size}`);
