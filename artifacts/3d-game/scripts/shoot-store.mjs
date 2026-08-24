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

// ── precondition: the art that PHOTOGRAPHS must be on disk ──────────────────
//
// This used to refuse on any missing ref and counted meshes alongside images,
// which made it unrunnable rather than safe: 17 of the 34 GLB URLs are
// permanently 403 at the CDN, so "17 of 53 missing" was a permanent state and
// the tool that produces the store screenshots could never be run at all. That
// is worse than no guard, because the last submission died on Guideline 2.3.3
// for shipping the retired 2D game's screenshots — exactly what happens when
// the replacement cannot run.
//
// The two kinds of missing are not the same thing:
//   IMAGES are the failure the guard was written for. A missing skin texture
//   photographs as a plain ball and a missing nebula leaves the void with no
//   galaxy in it, and there is no fallback — the screenshot is simply a lie
//   about what the app looks like. Still fatal.
//   MESHES have hand-written procedural fallbacks at every call site
//   (makePalm, LUXE.makeCabanaLux, makeTree...), and GAME DAY and LANTERN
//   NIGHT place NO pack meshes at all — two of the four worlds are already
//   100% procedural and the audit rated Game Day's prop density the highest of
//   the four. A missing mesh changes what the shot contains; it does not make
//   the shot dishonest.
{
  const refs = collectRefs();
  const missing = refs.filter((r) => !fs.existsSync(path.join(ROOT, 'public', r.replace(/^\//, ''))));
  const images = missing.filter((r) => !r.endsWith('.glb'));
  const meshes = missing.filter((r) => r.endsWith('.glb'));
  if (images.length) {
    console.error(`REFUSING TO SHOOT: ${images.length} of ${refs.filter((r) => !r.endsWith('.glb')).length} IMAGES are missing.`);
    console.error('Every paid skin would photograph as a plain ball and the void would have no');
    console.error('galaxy inside it. Run `node scripts/vendor-assets.mjs` first.');
    for (const r of images) console.error('  ' + r);
    process.exit(1);
  }
  if (meshes.length) {
    console.warn(`${meshes.length} of ${refs.filter((r) => r.endsWith('.glb')).length} meshes are absent — those props will`);
    console.warn('photograph as their procedural fallbacks, which is what a player sees too.');
  }
}

// ── the eight shots this run must produce ───────────────────────────────────
const EXPECTED = ['01-menu.png', '02-worlds.png', '03-devouring.png',
  '04-lantern-market.png', '05-lantern-bathhouse.png', '06-gameday.png',
  '07-skins.png', '08-results.png'];

// ── PURGE FIRST, SHOOT SECOND ───────────────────────────────────────────────
// Every .png in store/ goes before the first capture: the retired 2D game's
// images, and any earlier run's output that is about to be replaced anyway.
// Deleting them at the END, which is what this used to do, meant a capture that
// threw left the 2D shots on disk beside a handful of new ones — and a mixed
// folder is indistinguishable from a finished one to whoever uploads it. That
// is Guideline 2.3.3, which is what the previous submission was rejected for.
// Losing a good previous set to a failed re-run costs one command. Shipping a
// mixture costs a review cycle.
//
// AND IT MOVES THEM RATHER THAN DELETING THEM. The reasoning above is right —
// a half-replaced folder is worse than an empty one — but the first version
// called unlinkSync, and it ran BEFORE the browser had even launched. Proved
// the hard way: a run on a machine where CHROME_PATH was unset purged all eight
// App Store screenshots and then failed at chromium.launch, three lines later,
// on an environment problem that had nothing to do with the game. The set was
// only recoverable because it happens to be committed.
//
// A tool whose first act is to destroy its own output, before it has
// established that it can produce any, is not a tool anybody should run twice.
// The old set moves to store/.previous/ instead. The folder is still
// unmistakably empty-or-complete, which is the property that mattered, and a
// failed run now costs nothing.
// ── A RUN THAT CANNOT SURVIVE BEING INTERRUPTED CAN NEVER FINISH HERE ──────
// Eight screenshots take about twenty-five minutes on a software renderer, and
// the container this runs in reclaims itself on a shorter clock than that. The
// run before this one died after three images with nothing to show for the
// other twenty minutes, which is the third time this script has cost a whole
// session and produced nothing.
//
//   SHOOT_ONLY=04,05,06     shoot exactly these, leave the rest alone
//   SHOOT_RESUME=1          shoot whatever store/ is still missing
//
// Under either, the old set is NOT moved aside — a partial run is topping up a
// set, not replacing one, and moving the survivors out would defeat the point.
const ONLY = (process.env.SHOOT_ONLY || '').split(',').map((x) => x.trim()).filter(Boolean);
const RESUME = process.env.SHOOT_RESUME === '1';
const PARTIAL = ONLY.length > 0 || RESUME;
const have = () => { try { return new Set(fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, 2))); } catch { return new Set(); } };
const HAVE = have();
/** Should segment `n` ("01".."08") run? A segment that shoots several images
 *  runs if ANY of them is wanted. */
const want = (...ns) => ns.some((n) => {
  if (ONLY.length) return ONLY.includes(n);
  if (RESUME) return !HAVE.has(n);
  return true;
});

//
// …AND MOVING THEM ASIDE IS STILL TOO EARLY IF THE SERVER IS NOT THERE. The
// next run after that note was written pointed at the default port while the
// preview was on another one, so it filed all eight images under .previous/
// and then died on ERR_CONNECTION_REFUSED before shooting a pixel. Establish
// that the thing we are photographing exists FIRST. One request costs nothing
// and the alternative is an empty store/ every time somebody mistypes a port.
{
  let ok = false, why = '';
  try {
    const r = await fetch(`${URL}/`, { signal: AbortSignal.timeout(8000) });
    ok = r.ok; why = `HTTP ${r.status}`;
  } catch (e) { why = e?.message || String(e); }
  if (!ok) {
    console.error(`No preview server at ${URL} — ${why}\n`
      + `  start one:  npm run build && npx vite preview --port ${(URL.match(/:(\d+)/) || [, '4173'])[1]}\n`
      + `  or point this at yours:  SHOOT_URL=http://127.0.0.1:<port> npm run shoot:store\n`
      + `Nothing was touched: store/ still holds the previous set.`);
    process.exit(2);
  }
}
{
  fs.mkdirSync(OUT, { recursive: true });
  const prev = path.join(OUT, '.previous');
  const gone = PARTIAL ? [] : fs.readdirSync(OUT).filter((f) => f.toLowerCase().endsWith('.png'));
  if (PARTIAL) {
    const todo = ['01', '02', '03', '04', '05', '06', '07', '08'].filter((n) => want(n));
    if (!todo.length) {
      console.log(ONLY.length
        ? `nothing to shoot — SHOOT_ONLY=${ONLY.join(',')} names no known segment (01..08)`
        : 'nothing to shoot — store/ already holds every image');
      process.exit(0);
    }
    console.log(`partial run: shooting ${todo.join(', ')} (store/ keeps the rest)`);
  }
  if (gone.length) {
    fs.rmSync(prev, { recursive: true, force: true });
    fs.mkdirSync(prev, { recursive: true });
    for (const f of gone) fs.renameSync(path.join(OUT, f), path.join(prev, f));
    console.log(`moved ${gone.length} old screenshot(s) to store/.previous/ before shooting`);
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
  // Every probe in qa/ pins this path; this script alone fell back to
  // Playwright's bundled headless shell, which is not installed here, so it
  // launched nothing and failed after the purge had already run. Same default
  // as the rest of the kit now, still overridable.
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
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
  // ── AND THE WORLDS MUST BE UNLOCKED, OR THIS SCRIPT EATS THE SCREENSHOTS ──
  // This is the single most expensive missing line in the repo. The block above
  // purges every PNG in store/ before shooting — deliberately, and for a good
  // reason recorded there — and then enterMatch() taps the world cards for
  // LANTERN, GAME DAY and PIRATE BAY. Worlds unlock by finishing the one
  // before, so on the fresh profile this seed creates, all three are LOCKED and
  // the card refuses the tap BY DESIGN. The click resolves (the element is
  // there and clickable, it just does nothing), the waitForFunction that
  // follows it waits out its full two minutes, and the run dies having already
  // emptied the folder.
  //
  // Net effect: `npm run shoot:store` deletes all eight App Store screenshots
  // and produces none. The screenshots are a submission blocker — the current
  // set is from before the rename and shows a VOIDLING wordmark, which is the
  // same Guideline 2.3.3 finding that got the previous attempt rejected — so
  // the one tool that can fix the blocker was itself destroying the evidence.
  //
  // docs/HANDOFF.md lists this as trap #3 and notes four probes had hit it.
  // This is the fifth, and the only one where hitting it cost the artefact.
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
};
await page.addInitScript(SEED);

console.log(`shooting ${VIEW.width * SCALE}x${VIEW.height * SCALE} from ${URL}\n`);

// ── 01 · the menu ───────────────────────────────────────────────────────────
if (want('01', '02')) {
  await boot();
  await settle(3500);
  await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));
  await settle(1200);
  if (want('01')) await shot('01-menu.png');

  // ── 02 · the world picker ─────────────────────────────────────────────────
  await page.click('#btnPlay');
  await settle(1800);
  if (want('02')) await shot('02-worlds.png');
}

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
  // Refuse to tap a card the profile cannot open, rather than clicking it and
  // waiting out a two-minute timeout for a match that was never going to start.
  const locked = await page.evaluate((w) => {
    const card = document.querySelector(`#worldRow .wCard[data-world="${w}"]`);
    if (!card) return 'missing';
    // The class is `lock`, NOT `locked`. Written as `locked` first, which would
    // have matched nothing and made this guard a decoration — the same mistake
    // that had just been found in qa/personsheet.mjs's HUD selector list, made
    // again within the hour. Verified against index.html:967,973,1097
    // (`.wCard.lock`) before this line was kept.
    return card.classList.contains('lock') ? 'locked' : '';
  }, world);
  if (locked) throw new Error(
    `world card "${world}" is ${locked} — the seed did not unlock it, and store/'s previous set has already been moved aside. See the voidUnlocked note in SEED().`);
  await page.click(`#worldRow .wCard[data-world="${world}"]`);
  // ── A WORLD SWITCH IS A RELOAD, AND IT LANDS ON A GATE ────────────────────
  // Tapping another world's card reloads the page. The reload does not drop the
  // child straight into a match: it lands on TAP TO PLAY, and the tap is the
  // thing that starts the clock. This function used to click the card and then
  // wait two minutes for a match clock that was never going to advance, which
  // is why the run died after three of eight screenshots with LANTERN.
  //
  // The gate also ARMS separately from appearing — it shows GETTING READY…
  // while the asset pack settles and a tap before that is deliberately inert,
  // so waiting for `.show` alone and tapping would be a coin flip on a slow
  // machine. qa/switch.mjs walks this same path and is the reference.
  //
  // …BUT ONLY WHEN THE CARD IS A DIFFERENT WORLD. Picking the world already
  // loaded is not a switch, so there is no reload and no gate — the match just
  // starts. Waiting unconditionally for `#tapGate.show.armed` therefore hung
  // the very first call (`enterMatch('maple')`) for the full timeout and took
  // the run down after two of eight images. Race the two outcomes instead of
  // assuming either.
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await page.waitForFunction(() => {
    const g = document.getElementById('tapGate');
    const armed = !!g && g.classList.contains('show') && g.classList.contains('armed');
    const running = !!window.__matchState && window.__matchState().t > 0.2;
    return armed || running;
  }, null, { timeout: 400000 });
  const gated = await page.evaluate(() => {
    const g = document.getElementById('tapGate');
    return !!g && g.classList.contains('show') && g.classList.contains('armed');
  });
  if (gated) await page.click('#tapGate');
  await page.waitForFunction(() => window.__matchState && window.__matchState().t > 0.2,
    null, { timeout: 400000 });
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
if (want('03')) {
  await toPicker();
  await enterMatch('maple');
// a photogenic size — big enough to look powerful, small enough that the town
// still reads around it
await growTo(3.4);
await page.evaluate(() => window.__news());     // a headline in frame sells the world
await settle(900);
  await shot('03-devouring.png');
  await stopPlay();
}

// ── 04 · LANTERN NIGHT, the market street ───────────────────────────────────
// The newest world and the best-looking frame in the game: a corridor of lit
// stalls with the lantern strings overhead. __warpVoid rather than autoplay,
// because a hero image should be framed and not hoped for — the auto-driver
// ends up wherever the food is, which on a market street is usually a gap.
if (want('04', '05')) {
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
    await page.evaluate(([x, z]) => {
      window.__warpVoid(x, z);
      // AND WAKE HIM UP. The hero has an idle timer, and a harness that warps
      // and then waits is by definition idle — the first framed shot came out
      // with the mascot asleep, eyes shut, Zzz over his head, which is a
      // remarkable thing to put on an App Store page. Pin it for the shutter.
      window.__setMood('frenzy');
    }, [w(wx), w(wy)]);
    await settle(700);
  };
  await afterIntro();
  // SIZE IS ALMOST NOT A FRAMING CONTROL HERE, which took a photograph to
  // learn. camDist does scale with the void's radius — but it scales at close
  // to the same rate the void grows, so making the hero bigger pulls the
  // camera back by about as much as the hero gained and the composition barely
  // moves. All that changes is the share of the frame the ball occupies, which
  // goes UP. Shot at 5.5 on that reasoning and it was worse than 3.2, not
  // better: fewer stalls, fewer spirits, more purple.
  //
  // 3.4 is where a district sweep of this same spot framed the street best —
  // stall roofs, umbrellas, crates and a crowd around a hero small enough to
  // be standing IN a market rather than in front of one.
  await frame(3.4, 6050, 7800);
  if (want('04')) await shot('04-lantern-market.png');

  // ── 05 · LANTERN NIGHT, the bathhouse ─────────────────────────────────────
  // The finale, at the size a player reaches it, with its eave lines lit.
  //
  // THE REASON THREE ATTEMPTS AT THIS MISSED. The bathhouse stands at world
  // (6280, 2500) and every attempt moved the void due NORTH of it — which
  // cannot work, because north is not up the screen. camOffset is
  // (0.62, 0.92, 0.62), so the ground direction away from the camera is
  // (-1, -1)/sqrt2 in world axes: screen-up is x and y decreasing EQUALLY.
  // A void placed due south of the building sees it up AND right in equal
  // measure, which is exactly where it kept appearing, and no amount of
  // sliding along y alone was ever going to centre it.
  //
  // So it is derived rather than guessed. To put the building d world units
  // straight up-screen, offset the void by d/sqrt2 in BOTH axes:
  //     void = (6280 + d/sqrt2, 2500 + d/sqrt2)
  // d = 600 gives (6704, 2924). Photographed at radius 8.5 and 10; 10 wins —
  // all six storeys in frame with headroom, the golden pool at the base, the
  // finial clear of the timer, and the hero at its feet.
  await frame(10.0, 6704, 2924);
  if (want('05')) await shot('05-lantern-bathhouse.png');
  await page.evaluate(() => window.__setMood(null));   // hand the face back
}

// ── 06 · GAME DAY, the bowl ─────────────────────────────────────────────────
if (want('06')) {
  await toPicker();
  await enterMatch('gameday');
  await growTo(5.0);
  await page.evaluate(() => window.__news());
  await settle(900);
  await shot('06-gameday.png');
  await stopPlay();
}

// ── 07 · the shop ───────────────────────────────────────────────────────────
// ?iapmock=1 ONLY so iapAvailable() reports what an iPhone reports. Without it
// this page is a browser with no StoreKit, so the legendary header renders
// "COMING SOON ON iPHONE" and the buttons offer the App Store instead of a
// price — and that screenshot then goes to Apple, on the iPhone listing,
// announcing that the paid tier is not available on iPhone. It is the 2.3.3
// rule pointing the other way: the browser capture is the misrepresentation,
// because on device isNative() is true and this tier reads "A WHOLE NEW
// CHARACTER" with real prices. The flag only affects what is DISPLAYED here;
// nothing is purchased or granted during a capture.
if (want('07')) {
await boot('?iapmock=1');
await settle(3000);
await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await page.click('#btnShop');
// WAIT FOR THE CARDS, DO NOT GUESS AT THEM. Every card is a live render, painted
// across animation frames on a per-frame budget, and each one now solves its own
// framing from the alpha it draws — so the grid fills in over rather more frames
// than it used to. A fixed settle photographs however much happened to be ready,
// which on a slow machine is a screenshot of empty cards submitted to Apple.
// An unpainted canvas still reports 300x150; a painted one is square.
await page.waitForFunction(() => {
  const cvs = [...document.querySelectorAll('#shopGrid .skCard canvas')];
  return cvs.length > 0 && cvs.every((c) => c.width > 0 && c.width === c.height);
}, null, { timeout: 120000 });
// frame the legendary tier — that is the catalogue's best art
await page.evaluate(() => document.querySelector('#shopGrid .skCard.legend')
  ?.scrollIntoView({ block: 'center' }));
await settle(1200);
await shot('07-skins.png');
}

// ── 08 · the results screen ─────────────────────────────────────────────────
// toPicker() rather than leaning on 07's page, so this segment stands alone
// when SHOOT_ONLY / SHOOT_RESUME skips the shop.
if (want('08')) {
  await page.evaluate(() => document.getElementById('shop')?.classList.remove('show'));
  await toPicker();
  await enterMatch('pirate');
  await page.evaluate(() => { window.__setVoidR(7.5); window.__rushClock(0.3); });
  await page.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 120000 });
  await settle(2600);   // let the coin count-up and the rows finish sliding in
  await shot('08-results.png');
}

// ── the folder must contain THIS run, or obviously nothing ──────────────────
// The stale 2D images used to be removed here, at the end, after all eight
// captures. Any capture that threw — a timeout, a renamed selector — exited the
// script with the old 2D shots still on disk NEXT TO however many new ones had
// been written, and there is exactly one way that folder ends up in a
// submission: somebody uploads it. A mixed set is the 2.3.3 rejection all over
// again, and it is the failure mode that looks most like success.
//
// They are deleted before the first capture now (see PURGE above), so a run
// that dies half way leaves a short set, which is obvious, instead of a
// plausible-looking mixture. This is the completeness check for the other half.
{
  const missing = EXPECTED.filter((f) => !fs.existsSync(path.join(OUT, f)));
  if (missing.length && PARTIAL) {
    console.log(`\npartial run finished. store/ is still missing ${missing.length}: ${missing.join(', ')}`);
    console.log(`  finish it with:  SHOOT_RESUME=1 SHOOT_URL=${URL} npm run shoot:store`);
  } else if (missing.length) {
    console.error(`\nINCOMPLETE: ${missing.length} of ${EXPECTED.length} shots are missing:`);
    for (const f of missing) console.error('  ' + f);
    console.error('DO NOT UPLOAD store/. Fix the failure and re-run.');
    await browser.close();
    process.exit(1);
  }
}

console.log('\nDone. Upload store/01..08 to the 6.7" slot in App Store Connect.');
console.log('Check each one first: they must show the app a reviewer will actually see.');
await browser.close();
