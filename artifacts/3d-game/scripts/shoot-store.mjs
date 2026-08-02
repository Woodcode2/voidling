// App Store screenshots, at the exact size App Store Connect wants, from the
// game as it actually is today.
//
// WHY THIS SCRIPT AND NOT A HUMAN WITH A SIMULATOR
// -----------------------------------------------
// The five images in store/ are of the RETIRED 2D game — SOLO RUN button,
// DAILY BITE, a flat 2D void, a build stamp reading "v31 · final pass". None of
// that is in the game. Shipping screenshots that do not match the app is
// Guideline 2.3.3, and 2.3.3 is what the previous submission was rejected for.
// Re-shooting by hand is exactly the kind of chore that gets skipped, so it is
// a script: one command, same five shots, same framing, every time the game
// changes.
//
// IT REFUSES TO RUN WITHOUT THE ART. Every generated image and mesh is fetched
// from a CDN at runtime and is not in the repo (see scripts/vendor-assets.mjs).
// Without them the shop renders plain gradient balls where the paid skins go
// and the void loses its galaxy interior — screenshots that would misrepresent
// the app in the opposite direction. So the asset check is a precondition, not
// a suggestion.
//
//   node scripts/vendor-assets.mjs      # once — puts the art on disk
//   npm run build && npx vite preview --port 4173
//   node scripts/shoot-store.mjs        # writes store/01..08
//
// Run it against `vite preview`, not the dev server: the dev server hot-reloads
// and will reload the page underneath a capture.
import fs from 'node:fs';
import path from 'node:path';
import { collectRefs, ROOT } from './asset-refs.mjs';

const URL = process.env.SHOOT_URL || 'http://127.0.0.1:4173';
const OUT = path.join(ROOT, 'store');

// ── precondition: the art must be on disk ───────────────────────────────────
{
  const missing = collectRefs().filter((r) => !fs.existsSync(path.join(ROOT, 'public', r.replace(/^\//, ''))));
  if (missing.length) {
    console.error(`REFUSING TO SHOOT: ${missing.length} of ${collectRefs().length} art files are missing.`);
    console.error('Every paid skin would photograph as a plain ball and the void would have no');
    console.error('galaxy inside it. Run `node scripts/vendor-assets.mjs` first.');
    process.exit(1);
  }
}

// Playwright drives the capture. It is imported AFTER the asset check so the
// useful error ("run vendor-assets first") wins over the boring one, and
// dynamically so the message is a sentence rather than a stack trace.
let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.error('This script needs Playwright:  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

// iPhone 6.7": 1290x2796. 430 x 932 CSS at deviceScaleFactor 3 is exactly that,
// and App Store Connect accepts the 6.7" slot for 6.5" too.
const VIEW = { width: 430, height: 932 };
const SCALE = 3;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.warn('  page error:', String(e).slice(0, 120)));

const shot = async (name) => {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, timeout: 120000 });
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  wrote ${name}  (${VIEW.width * SCALE}x${VIEW.height * SCALE}, ${kb} KB)`);
};

/** Settle on a stable frame — these are hero images, not action stills. */
const settle = (ms = 2500) => page.waitForTimeout(ms);

const boot = async (query = '') => {
  await page.goto(URL + '/' + query, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 120000 });
};

// A shop with everything owned photographs the catalogue, not an empty wallet.
const SEED = () => {
  localStorage.setItem('voidPlayed', '1');
  localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidCoins', '2400');
  localStorage.setItem('voidXP', '900');
  localStorage.setItem('voidStreak', '6');
  localStorage.setItem('voidDailyLast', new Date().toDateString());   // no reward modal
  localStorage.setItem('voidStats', JSON.stringify({ matches: 24, wins: 9, best: 141000, bestForm: 5, eaten: 3100, rivals: 7, combo: 22 }));
};
await page.addInitScript(SEED);

console.log(`shooting ${VIEW.width * SCALE}x${VIEW.height * SCALE} from ${URL}\n`);

// ── 01 · the menu ───────────────────────────────────────────────────────────
await boot();
await settle(3500);
await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await settle(1200);
await shot('01-menu.png');

// ── 02 · the world picker ───────────────────────────────────────────────────
await page.click('#btnPlay');
await settle(1800);
await shot('02-worlds.png');

// Drive the void at whatever is nearest, so a match photographs mid-devour
// with debris in the air rather than as a ball standing still in a street.
const autoplay = () => page.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  window.__shootStop = false;
  const tick = () => {
    if (window.__shootStop) return;
    const vs = window.__voidState();
    let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) {
      const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 90, clientY: cy + best.dz / m * 90, bubbles: true }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const stopPlay = () => page.evaluate(() => { window.__shootStop = true; });
/** Start a match on a named world from wherever we are. */
const enterMatch = async (world) => {
  await page.click(`#worldRow .wCard[data-world="${world}"]`);
  await page.waitForFunction(() => window.__matchState && window.__matchState().t > 0.2,
    null, { timeout: 120000 });
};
/** Grow to `r` by actually playing, and if the machine is too slow to get
 *  there in time, set it. The dry run of this script on a software renderer
 *  timed out here and took the whole run down with it, having written two of
 *  eight images — which is the worst possible outcome for a script somebody
 *  runs once, on a deadline, on a machine I cannot see. A photographed void of
 *  the right size beats no photograph. */
const growTo = async (r, ms = 150000) => {
  await autoplay();
  try {
    await page.waitForFunction((t) => window.__voidState().r > t, r, { timeout: ms });
  } catch {
    console.log(`  (too slow to grow to ${r} in ${ms / 1000}s — setting it instead)`);
    await page.evaluate((t) => window.__setVoidR(t), r);
    await settle(1500);
  }
};
/** Back to the menu, modals cleared, ready to pick a world. */
const toPicker = async () => {
  await boot();
  await settle(3000);
  await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await page.click('#btnPlay');
  await settle(1400);
};

// ── 03 · a match, mid-devour ────────────────────────────────────────────────
await enterMatch('maple');
// a photogenic size — big enough to look powerful, small enough that the town
// still reads around it
await growTo(3.4);
await page.evaluate(() => window.__news());     // a headline in frame sells the world
await settle(900);
await shot('03-devouring.png');
await stopPlay();

// ── 04 · LANTERN NIGHT, the market street ───────────────────────────────────
// The newest world and the best-looking frame in the game: a corridor of lit
// stalls with the lantern strings overhead. __warpVoid rather than autoplay,
// because a hero image should be framed and not hoped for — the auto-driver
// ends up wherever the food is, which on a market street is usually a gap.
{
  const w = (v) => (v - 6000) * 0.05;
  await toPicker();
  await enterMatch('lantern');
  // WAIT OUT THE INTRO. Every world opens on an authored camera move over its
  // hero landmark, and on LANTERN NIGHT that is 3.6 seconds pointed at the
  // bathhouse. The first version of this warped at +2s and settled for 2.6,
  // and the intro simply drove the camera back — so BOTH lantern shots came
  // out as the same bathhouse flyover, one of them labelled "market". A warp
  // that loses a fight with the camera rig fails silently and photographs
  // something plausible, which is the worst way for a shot to be wrong.
  // Tolerant, for the same reason growTo is: a machine slow enough to miss
  // this is a machine where losing all eight images to one timeout is the
  // worst possible outcome. Measured on a software renderer at 1864px tall,
  // the match clock advances about FORTY times slower than real time — so
  // this wait is roughly 50x what a real GPU needs and still not a guarantee.
  const afterIntro = async () => {
    try {
      await page.waitForFunction(() => (window.__matchState?.().t ?? 0) > 7,
        null, { timeout: 180000 });
    } catch {
      console.log('  (intro camera may still be moving — check 04 and 05 framing)');
    }
  };
  /** Frame a place: set the size, put the void there, let it settle, and put
   *  it there AGAIN — the camera lerps toward the void every frame, so a
   *  second warp immediately before the shutter makes the framing exact
   *  rather than approximately wherever it drifted to. */
  const frame = async (r, wx, wy) => {
    await page.evaluate(([rr, x, z]) => { window.__setVoidR(rr); window.__warpVoid(x, z); },
      [r, w(wx), w(wy)]);
    await settle(2400);
    await page.evaluate(([x, z]) => window.__warpVoid(x, z), [w(wx), w(wy)]);
    await settle(700);
  };
  await afterIntro();
  await frame(3.2, 6050, 7800);
  await shot('04-lantern-market.png');

  // ── 05 · LANTERN NIGHT, the bathhouse ─────────────────────────────────────
  // The finale, at the size a player reaches it, with its eave lines lit.
  await frame(9.0, 6280, 4400);
  await shot('05-lantern-bathhouse.png');
}

// ── 06 · GAME DAY, the bowl ─────────────────────────────────────────────────
{
  await toPicker();
  await enterMatch('gameday');
  await growTo(5.0);
  await page.evaluate(() => window.__news());
  await settle(900);
  await shot('06-gameday.png');
  await stopPlay();
}

// ── 07 · the shop ───────────────────────────────────────────────────────────
await boot();
await settle(3000);
await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await page.click('#btnShop');
await settle(1600);
// frame the legendary tier — that is the catalogue's best art
await page.evaluate(() => document.querySelector('#shopGrid .skCard.legend')
  ?.scrollIntoView({ block: 'center' }));
await settle(1200);
await shot('07-skins.png');

// ── 08 · the results screen ─────────────────────────────────────────────────
await page.evaluate(() => document.getElementById('shop')?.classList.remove('show'));
await page.click('#btnPlay');
await settle(900);
await enterMatch('pirate');
await page.evaluate(() => { window.__setVoidR(7.5); window.__rushClock(0.3); });
await page.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
await settle(2600);   // let the coin count-up and the rows finish sliding in
await shot('08-results.png');

// The retired 2D game's five images are still on disk under their old names
// and there is exactly one way they end up in a submission: somebody uploads
// the folder. They are not this app, and 2.3.3 is what the last submission was
// rejected for — so the script that replaces them also removes them.
{
  const STALE = ['01-menu.png', '02-shop.png', '03-downtown.png', '04-zoo.png',
    '05-results.png', '06-edge.png', '02-worlds.png', '03-devouring.png', '04-skins.png'];
  const fresh = new Set(['01-menu.png', '02-worlds.png', '03-devouring.png',
    '04-lantern-market.png', '05-lantern-bathhouse.png', '06-gameday.png',
    '07-skins.png', '08-results.png']);
  for (const f of STALE) {
    if (fresh.has(f)) continue;                      // just written by this run
    const p = path.join(OUT, f);
    if (!fs.existsSync(p)) continue;
    fs.unlinkSync(p);
    console.log(`  removed stale ${f}  (2D game)`);
  }
}

console.log('\nDone. Upload store/01..08 to the 6.7" slot in App Store Connect.');
console.log('Check each one first: they must show the app a reviewer will actually see.');
await browser.close();
