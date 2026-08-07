// THE FIRST NINETY SECONDS, beat by beat, on a genuine cold install.
//
//   node qa/_first90.mjs [world] [persona...]
//
// personas: idle (never touches the screen) | driver (drags from t=1 and
// steers at the nearest edible) | masher (taps wildly, never drags)
//
// Everything in-match is timestamped against __matchState().t, never a wall
// clock — swiftshader runs the sim at a fraction of real time. The one wall
// clock reported is boot->playable, which is real seconds a real child waits,
// and it is measured BEFORE the renderer is stubbed.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const WORLD = process.argv[2] || 'maple';
const PERSONAS = process.argv.slice(3).length ? process.argv.slice(3) : ['idle', 'driver', 'masher'];
const PORT = 4237;
const HORIZON = 95;      // match-seconds to record

mkdirSync('./qa-out/first90', { recursive: true });
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});

const out = {};
for (const persona of PERSONAS) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  // GENUINE COLD INSTALL — nothing at all in localStorage.
  await p.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });

  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  const tDom = Date.now() - t0;
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const tHooks = Date.now() - t0;
  // playable = the match clock is actually running
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 400000 });
  const tLive = Date.now() - t0;

  // Now stub the draw. Nothing below reads pixels; everything below is DOM +
  // sim state, and the stub takes the sim from ~1/9 real time to ~1x.
  await p.evaluate(() => { window.__renderer.render = () => { }; });

  await p.evaluate(({ persona, HORIZON }) => {
    window.__L = [];            // the timeline
    window.__EV = [];           // discrete events
    const seen = {};
    const cv = document.querySelector('canvas');
    let pid = 7, down = false, ax = 195, ay = 600;
    const pe = (type, x, y) => {
      const ev = new PointerEvent(type, {
        pointerId: pid, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true,
        clientX: x, clientY: y,
      });
      (type === 'pointerdown' ? cv : window).dispatchEvent(ev);
    };
    const vis = (id) => { const e = document.getElementById(id); if (!e) return false;
      const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.02; };
    const txt = (id) => { const e = document.getElementById(id); if (!e) return '';
      const cs = getComputedStyle(e); if (cs.display === 'none' || +cs.opacity < 0.02) return '';
      return (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 110); };
    const note = (t, kind, v) => { if (seen[kind + '|' + v]) return; seen[kind + '|' + v] = 1;
      window.__EV.push({ t: +t.toFixed(2), kind, v }); };

    let lastGuide = null, lastNews = null, lastAnn = null, lastBanner = null, lastTitle = null;
    let lastEv = null, lastJoined = -1, lastAte = -1, lastStick = -1, lastForm = null;
    let taps = 0, drags = 0, dirT = 0, dx = 0, dy = -1;

    window.__stopIn = setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const t = ms.t;
      if (t > HORIZON) { clearInterval(window.__stopIn); window.__done = true; return; }

      // ── INPUT ────────────────────────────────────────────────────────────
      if (persona === 'driver' && t > 1.0) {
        if (t > dirT) {
          dirT = t + 1.2;
          // steer at the nearest edible we are allowed to eat
          const R = ms.r; const vs = window.__voidState();
          let best = null, bd = 1e9;
          for (const e of window.__edibles) {
            if (!e.mesh.visible || e.eaten) continue;
            if (e.radius > R * 0.92) continue;
            const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
            if (d < bd) { bd = d; best = e; }
          }
          if (best) {
            // world +x is screen-right-ish, +z is screen-down-ish for this cam
            const wx = best.mesh.position.x - vs.x, wz = best.mesh.position.z - vs.z;
            const c = window.__cam;
            const pv = new (window.__THREE_V3 || Object)();
            // project both points and use the screen delta — no camera maths guesswork
            const proj = (x, z) => { const v = { x, y: 0, z };
              const m = c.matrixWorldInverse, pm = c.projectionMatrix;
              // manual: use three's own helper through a scratch vector on the scene
              return null; };
            void proj; void pv;
            const l = Math.hypot(wx, wz) || 1;
            dx = wx / l; dy = wz / l;   // camera is a fixed isometric offset; +x right, +z down
          }
        }
        if (!down) { down = true; drags++; ax = 195; ay = 500; pe('pointerdown', ax, ay); }
        pe('pointermove', ax + dx * 90, ay + dy * 90);
      }
      if (persona === 'masher') {
        // wild taps: down+up in the same frame at a random spot, ~7 per second
        for (let i = 0; i < 2; i++) {
          const x = 20 + Math.random() * 350, y = 60 + Math.random() * 720;
          pid++; pe('pointerdown', x, y); pe('pointerup', x, y); taps++;
        }
      }

      // ── SAMPLE ───────────────────────────────────────────────────────────
      const joined = ms.rivals.filter((r) => r.joined).length;
      let ate = 0; for (const e of window.__edibles) if (e.mesh.userData.byPlayer) ate++;
      let stick = 0; try { stick = (localStorage.getItem('voidStickers') || '').split(',').filter(Boolean).length; } catch { }
      const g = txt('guide'), nw = txt('news'), an = txt('announce') || txt('beat'), bn = txt('banner');
      const ti = vis('titlecard') ? txt('titlecard') : '';
      const evc = vis('evolve') ? txt('evolve') : '';
      const form = (document.querySelector('#growth .gNow') || {}).textContent || '';

      if (g !== lastGuide) { window.__EV.push({ t: +t.toFixed(2), kind: 'guide', v: g || '(hidden)' }); lastGuide = g; }
      if (ti !== lastTitle) { window.__EV.push({ t: +t.toFixed(2), kind: 'titlecard', v: ti || '(hidden)' }); lastTitle = ti; }
      if (nw !== lastNews) { window.__EV.push({ t: +t.toFixed(2), kind: 'news', v: nw || '(hidden)' }); lastNews = nw; }
      if (an !== lastAnn) { window.__EV.push({ t: +t.toFixed(2), kind: 'beat', v: an || '(hidden)' }); lastAnn = an; }
      if (bn !== lastBanner) { window.__EV.push({ t: +t.toFixed(2), kind: 'banner', v: bn || '(hidden)' }); lastBanner = bn; }
      if (evc !== lastEv) { window.__EV.push({ t: +t.toFixed(2), kind: 'evolvecard', v: evc || '(hidden)' }); lastEv = evc; }
      if (form !== lastForm) { window.__EV.push({ t: +t.toFixed(2), kind: 'form', v: form }); lastForm = form; }
      if (joined !== lastJoined) { window.__EV.push({ t: +t.toFixed(2), kind: 'rivals', v: String(joined) }); lastJoined = joined; }
      if (ate !== lastAte) { if (lastAte < 0 || ate - lastAte >= 1) window.__EV.push({ t: +t.toFixed(2), kind: 'ate', v: String(ate) }); lastAte = ate; }
      if (stick !== lastStick) { window.__EV.push({ t: +t.toFixed(2), kind: 'sticker', v: String(stick) }); lastStick = stick; }
      note(t, 'nomArmed', 'x');   // placeholder so `seen` is used

      window.__L.push({ t: +t.toFixed(2), r: +ms.r.toFixed(3), score: ms.score, joined, ate, stick,
        guide: g, taps, drags, tense: +(ms.tense ?? 0).toFixed(2) });
    }, 55);
  }, { persona, HORIZON });

  // let it run. Poll on the match clock, not the wall clock.
  const started = Date.now();
  while (true) {
    const st = await p.evaluate(() => ({ done: !!window.__done, t: window.__matchState?.().t ?? 0 }));
    if (st.done || st.t > HORIZON) break;
    if (Date.now() - started > 420000) { console.log('  !! wall timeout at match t=' + st.t.toFixed(1)); break; }
    await p.waitForTimeout(2000);
  }
  const res = await p.evaluate(() => ({ L: window.__L, EV: window.__EV,
    ls: Object.fromEntries(Object.keys(localStorage).map((k) => [k, (localStorage.getItem(k) || '').slice(0, 60)])) }));
  out[persona] = { tDom, tHooks, tLive, errs, ...res };
  console.log(`\n════════ ${WORLD.toUpperCase()} / ${persona.toUpperCase()} ════════`);
  console.log(`  boot (REAL wall clock, swiftshader — a device is faster):`);
  console.log(`    DOM ${tDom}ms   hooks ${tHooks}ms   match live ${tLive}ms`);
  for (const e of res.EV) if (e.kind !== 'nomArmed') console.log(`  t=${String(e.t).padStart(6)}  ${e.kind.padEnd(11)} ${e.v}`);
  if (errs.length) console.log('  PAGE ERRORS: ' + errs.slice(0, 5).join(' | '));
  await p.close();
}
writeFileSync(`./qa-out/first90/${WORLD}.json`, JSON.stringify(out, null, 1));
await b.close();
