// THE EDGE CASES A SYNTHETIC DRIVER NEVER HITS.
//
//   node qa/_stickedge.mjs [port] [world]
//
// Every case ends with the same question: is the void DEAD (input ignored) or
// DRIVING ITSELF (moving with no finger on the glass)? Both are blockers.
// Verdicts are decided on the void's own displacement over 60 virtual frames,
// not on a flag.
import { chromium } from 'playwright';
import { bootMatch, VCLOCK, PTR } from './_boot.mjs';

const PORT = process.argv[2] || '4267';
const WORLD = process.argv[3] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await bootMatch(b, PORT, WORLD);
await p.evaluate(() => { for (const e of window.__edibles) e.eaten = true; });
await p.evaluate(VCLOCK);
await p.evaluate(PTR);
await p.waitForFunction(() => window.__F > 30, null, { timeout: 300000 });

const R = await p.evaluate(async () => {
  const CX = Math.round(innerWidth / 2), CY = Math.round(innerHeight * 0.62);
  const F = () => window.__F;
  const waitF = (n) => new Promise(res => window.__at(F() + n, res));
  const now = () => window.__L[window.__L.length - 1];
  // mean speed over the last n frames — the only honest "is it moving" test
  const speed = (n = 30) => { const a = window.__L.slice(-n); return a.reduce((s, r) => s + r.sp, 0) / a.length; };
  const reset = async () => {
    window.up(CX, CY); window.up(CX, CY, 2); window.up(CX, CY, 3);
    await waitF(140);
  };
  const out = [];
  const rec = (name, note, drift, recov) => out.push({ name, note, drift, recov });

  // helper: get into a steady full-speed drive heading "north"
  const drive = async () => {
    await reset();
    window.down(CX, CY);
    const f0 = F();
    for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(CX, CY - 90));
    await waitF(80);
    return speed(20);
  };
  // after the disturbance: does a fresh, ordinary drag still steer the void?
  const canRecover = async () => {
    window.down(CX, CY);
    const f0 = F();
    for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(CX + 90, CY));
    await waitF(70);
    const s = speed(20);
    window.up(CX + 90, CY);
    await waitF(120);
    return s;
  };

  // ── 1. POINTERUP OUTSIDE THE CANVAS (over the HUD, then off the viewport) ──
  {
    const pre = await drive();
    window.move(CX, 8);                                   // up over the top HUD band
    await waitF(20);
    document.getElementById('board').dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 1, clientX: CX, clientY: 8, bubbles: true, pointerType: 'touch' }));
    await waitF(90);
    rec('pointerup released over a HUD element', `pre ${pre.toFixed(2)}`, speed(40), await canRecover());
  }
  // ── 1b. POINTERUP AT NEGATIVE COORDS, OFF THE VIEWPORT ────────────────────
  {
    const pre = await drive();
    window.up(-40, -60);
    await waitF(90);
    rec('pointerup off the viewport (-40,-60)', `pre ${pre.toFixed(2)}`, speed(40), await canRecover());
  }
  // ── 1c. NO POINTERUP AT ALL — the finger slides off the bottom bezel and the
  //        browser simply stops sending events for it (documented WebKit case) ─
  {
    const pre = await drive();
    // last event is a move to the very bottom edge; then silence
    window.move(CX, innerHeight - 1);
    await waitF(200);
    rec('finger leaves the screen edge, no up/cancel', `pre ${pre.toFixed(2)}`, speed(60), null);
    await reset();
  }
  // ── 2. POINTERCANCEL MID-DRIVE ────────────────────────────────────────────
  {
    const pre = await drive();
    window.cancel(CX, CY - 90);
    await waitF(90);
    rec('pointercancel mid-drive', `pre ${pre.toFixed(2)}`, speed(40), await canRecover());
  }
  // ── 3. A SECOND FINGER LANDS, THEN THE FIRST LIFTS ────────────────────────
  {
    const pre = await drive();
    window.down(CX - 120, CY + 40, 2);                    // second thumb arrives
    await waitF(30);
    const dur2 = speed(20);                               // does finger 2 steal the stick?
    window.up(CX, CY - 90, 1);                            // finger 1 lifts, finger 2 STAYS DOWN
    await waitF(40);
    const afterLift = speed(30);
    // finger 2 now drags hard — a child who has swapped thumbs expects to steer
    const f0 = F();
    for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(CX - 120, CY - 60, 2));
    await waitF(80);
    const withF2 = speed(30);
    window.up(CX - 120, CY - 60, 2);
    await waitF(120);
    rec('2nd finger down, 1st lifts, 2nd drags',
      `pre ${pre.toFixed(2)}; while both down ${dur2.toFixed(2)}; after 1st lifts ${afterLift.toFixed(2)}`,
      withF2, await canRecover());
  }
  // ── 4. DRAG THAT STARTS ON A HUD ELEMENT ──────────────────────────────────
  {
    await reset();
    // what is hit-testable over the whole screen during a match?
    const grid = [];
    for (let y = 4; y < innerHeight; y += 8) for (let x = 4; x < innerWidth; x += 8) {
      const el = document.elementFromPoint(x, y);
      if (el && el.tagName !== 'CANVAS') grid.push(el.id || el.className || el.tagName);
    }
    const tally = {}; for (const k of grid) tally[k] = (tally[k] || 0) + 1;
    const total = Math.ceil((innerHeight - 4) / 8) * Math.ceil((innerWidth - 4) / 8);
    // and drive a real drag starting on the biggest offender
    const qb = document.getElementById('btnQuit').getBoundingClientRect();
    window.down(qb.x + qb.width / 2, qb.y + qb.height / 2, 1, document.getElementById('btnQuit'));
    const f0 = F();
    for (let k = 1; k <= 18; k++) window.__at(f0 + k, () => window.move(qb.x + 20, qb.y + 110));
    await waitF(70);
    const s = speed(25);
    window.up(qb.x + 20, qb.y + 110);
    await waitF(120);
    rec('drag started on #btnQuit (44x44, top right)',
      `non-canvas cells ${grid.length}/${total} = ${(100 * grid.length / total).toFixed(1)}% of the screen; ` +
      Object.entries(tally).sort((a, c) => c[1] - a[1]).slice(0, 5).map(e => `${e[0]}:${e[1]}`).join(' '),
      s, await canRecover());
  }
  // ── 5. ORIENTATION CHANGE HELD MID-DRAG ───────────────────────────────────
  {
    const pre = await drive();
    // the anchor is in client px of the PORTRAIT viewport; the resize handler
    // (prototype3d.ts:1160) touches the camera and the renderer and nothing else
    const a0 = { ax: now().ax, ay: now().ay };
    window.dispatchEvent(new Event('resize'));
    await waitF(20);
    // the finger has not moved in the world, but in the new viewport its client
    // coords are transposed
    window.move(CY, CX - 90);
    await waitF(70);
    rec('orientation change held mid-drag', `pre ${pre.toFixed(2)}; anchor stayed ${a0.ax},${a0.ay}`,
      speed(30), await canRecover());
  }
  // ── 6. WINDOW BLUR MID-DRAG, NO POINTERUP (Control Centre / call banner) ──
  {
    const pre = await drive();
    window.dispatchEvent(new Event('blur'));
    await waitF(150);
    rec('window blur mid-drag, no pointerup', `pre ${pre.toFixed(2)} (keys are cleared here; joy is not)`,
      speed(60), null);
    await reset();
  }
  // ── 7. BACKGROUNDED MID-DRAG -> PAUSE -> RESUME, FINGER LONG GONE ─────────
  {
    const pre = await drive();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitF(40);
    const whilePaused = speed(30);
    // iOS delivers no pointerup for a pointer that was down when the app went
    // away; the child comes back and taps RESUME
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.getElementById('pauseResume').click();
    await waitF(100);
    rec('backgrounded mid-drag, then RESUME tapped',
      `pre ${pre.toFixed(2)}; while paused ${whilePaused.toFixed(2)}`, speed(60), null);
    await reset();
  }
  return { out, vp: [innerWidth, innerHeight] };
});

console.log(`\n=== EDGE CASES — ${WORLD}, viewport ${R.vp.join('x')}, virtual 60 Hz ===`);
console.log('drift = mean speed with NO finger on the glass (should be ~0)');
console.log('recov = mean speed of a fresh ordinary drag afterwards (should be ~12 u/s)\n');
for (const r of R.out) {
  const bad = r.drift > 0.4 ? '  <<< DRIVING ITSELF' : (r.recov !== null && r.recov < 6 ? '  <<< DEAD' : '');
  console.log(`${r.name}`);
  console.log(`    ${r.note}`);
  console.log(`    drift ${r.drift.toFixed(3)} u/s   recovery ${r.recov === null ? ' n/a ' : r.recov.toFixed(2)} u/s${bad}\n`);
}
await b.close();
