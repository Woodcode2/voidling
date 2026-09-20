// IS ANYBODY CARRYING A SIGN THROUGH THEIR OWN SKULL?
//
//   node qa/headclear.mjs [port] [world]
//
// A hand prop is WELDED into the arm's mesh — "a waiter's tray is not an extra
// draw call, it is extra triangles on a mesh that already exists" (life.ts). So
// there is no object to raycast and nothing in the scene graph that says "this
// sign is inside that head". Every existing probe here is blind to it, and the
// studio's MOTION team found it by looking at a picture.
//
// THE DEFECT THIS WAS WRITTEN FOR: the placard panel hung at z = 0.30*s with a
// 0.035 half-depth, against a skull whose z half-depth is 0.495 — 0.45 units
// INSIDE the solid head, on every placard carrier on every load, in the
// campaign world. It is 76% of head height and 68% of its width, so from the
// play camera a protester wears their own sign like a visor.
//
// ── AABB IS NOT ENOUGH, AND THAT IS THE WHOLE METHOD ─────────────────────────
// A head is an ellipsoid and an arm swings across its bounding box constantly:
// a box test flags every walking person in the game. This transforms the arm's
// own vertices into the HEAD GROUP's local space and tests them against the
// skull ellipsoid — (x/a)^2 + (y/b)^2 + (z/c)^2 < 1 — which is the test the
// studio's own skeptic used to confirm the finding rather than assert it.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
// the skull, from life.ts's own head part: pc(B.sph, skin, 0, 0, 0.01, 1.06,
// 1.12, 0.99) — pc scales a radius-0.5 base, so the half-extents are half of
// those, and the centre sits 0.01 forward.
const A = 0.53, B = 0.56, C = 0.495, CZ = 0.01;
// ── TWO SAMPLES, AND THAT IS THE BAR ────────────────────────────────────────
// The first run of this probe found 18 offenders and I nearly shipped a fix for
// all of them. They are not one defect. A prop AUTHORED through the head is
// there in every frame of every load; an arm that SWINGS through it is there
// for a fraction of a second, in one pose, on a person who is otherwise fine.
// life.ts has four rooted poses that throw an arm up past the shoulder — the
// campaigner's "take one. TAKE one." reaches -1.80 rad, 103 degrees past
// straight down — and those existed long before any prop did.
//
// So the probe samples the same crowd twice, seconds apart, and the BAR is on
// the intersection: a prop kind is broken when the SAME PEOPLE are still inside
// their own skulls the second time. A threshold I picked out of the air would
// have been a guess; this is the difference itself, measured. The transient
// rate is printed underneath so it can only go down, and so the next person to
// add a pose can see what it costs.
// MEASURED IN MATCH SECONDS, NOT WALL SECONDS. This box renders about one
// frame every two wall-seconds with 5,600 edibles on screen, and a pose only
// moves when a frame runs — so a setTimeout can return before the crowd has
// taken a single step. The gap waits on the match clock instead.
const GAP_T = 2.6;
// a vertex has to be MEANINGFULLY inside, not grazing the surface: 0.80 in
// normalised ellipsoid units is ~0.89 of the way to the skin along any axis.
const DEEP = 0.80;

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const pg = await br.newPage({ viewport: { width: 430, height: 932 } });
let fail = 0;
const bad = (m) => { console.log('  ' + m); fail++; };
// guard 2 (qa/idiomguard.mjs): a throw outside the try below — br.close(), a
// page crash — must still become a verdict line, because gate.mjs reads a step
// that prints neither token as a PASS.
const die = (e) => { console.log(`\nFAIL — headclear threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

try {
  await pg.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await pg.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 400000 });
  await pg.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
  await enterMatch(pg, WORLD);
  await pg.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 900000 });

  const sweep = () => pg.evaluate(({ A, B, C, CZ, DEEP }) => {
    const THREE = window.__THREE;
    const inv = new THREE.Matrix4(), v = new THREE.Vector3();
    let people = 0, withArms = 0, checked = 0;
    const carried = {};                // how many carry each prop at all
    const hit = {};                    // prop -> [person ids offending now]
    const deep = {};                   // person id -> worst depth this sample
    const where = {};                  // person id -> {tag, hits, at}
    let i = -1;
    for (const e of window.__edibles) {
      i++;
      const m = e.mesh;
      if (!m || !m.userData || !m.userData.mover) continue;
      let head = null; const arms = [];
      m.traverse((o) => {
        if (o.name === 'head') head = o;
        else if (o.name === 'arm') arms.push(o);
      });
      people++;
      if (!head || !arms.length) continue;
      withArms++;
      // life.ts writes userData.prop only when there IS one, so an absent key
      // is "empty-handed", not "unknown".
      const props = [m.userData.prop, m.userData.propL].filter(Boolean);
      const tag = props.length ? props.join('+') : '(bare hands)';
      carried[tag] = (carried[tag] || 0) + 1;
      head.updateWorldMatrix(true, false);
      inv.copy(head.matrixWorld).invert();
      let deepest = 0, hits = 0, at = null;
      for (const arm of arms) {
        arm.updateWorldMatrix(true, true);
        arm.traverse((o) => {
          if (!o.isMesh || !o.geometry) return;
          const pos = o.geometry.getAttribute('position');
          if (!pos) return;
          checked++;
          for (let k = 0; k < pos.count; k++) {
            v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
            const q = (v.x / A) ** 2 + (v.y / B) ** 2 + ((v.z - CZ) / C) ** 2;
            if (q < DEEP * DEEP) {
              hits++;
              const d = 1 - Math.sqrt(q);
              if (d > deepest) { deepest = d; at = { x: +v.x.toFixed(2), y: +v.y.toFixed(2), z: +v.z.toFixed(2) }; }
            }
          }
        });
      }
      if (hits) {
        (hit[tag] = hit[tag] || []).push(i);
        deep[i] = +deepest.toFixed(3);
        where[i] = { tag, hits, at };
      }
    }
    return { people, withArms, checked, carried, hit, deep, where };
  }, { A, B, C, CZ, DEEP });

  const s1 = await sweep();
  const t0 = await pg.evaluate(() => window.__matchState().t);
  await pg.waitForFunction((t) => window.__matchState().t > t, t0 + GAP_T, { timeout: 300000 });
  const s2 = await sweep();
  const t1 = await pg.evaluate(() => window.__matchState().t);

  // the intersection, by person, per prop
  const set2 = new Set(Object.keys(s2.deep).map(Number));
  const both = {}, everN = {};
  for (const [tag, ids] of Object.entries(s1.hit)) {
    const stay = ids.filter((id) => set2.has(id));
    if (stay.length) both[tag] = stay;
  }
  for (const [tag, ids] of Object.entries(s1.hit)) everN[tag] = ids.length;
  for (const [tag, ids] of Object.entries(s2.hit)) everN[tag] = Math.max(everN[tag] || 0, ids.length);
  const res = { ...s1, s2, both, everN };

  console.log(`\n  ${WORLD}: ${res.people} movers, ${res.withArms} with a named head and arms, `
    + `${res.checked} arm meshes walked, sampled at t=${t0.toFixed(1)}s and t=${t1.toFixed(1)}s\n`);
  if (res.withArms < 8) bad(`FAIL — only ${res.withArms} people exposed a named head and arm; the test had almost nothing to check. Did the names move?`);

  const tags = [...new Set([...Object.keys(res.carried), ...Object.keys(res.everN)])]
    .filter((t) => res.everN[t]).sort((a, b) => (res.both[b]?.length || 0) - (res.both[a]?.length || 0));
  console.log('  prop                    carried   in one sample   in BOTH   welded?');
  const welded = [];
  for (const t of tags) {
    const n = res.carried[t] || 0;
    const ever = res.everN[t] || 0;
    const stay = res.both[t]?.length || 0;
    const rate = n ? stay / n : 0;
    const flag = n >= 4 && rate >= 0.5;
    if (flag) welded.push({ t, n, stay, rate });
    console.log(`  ${String(t).padEnd(22)} ${String(n).padStart(7)} ${String(ever).padStart(15)} ${String(stay).padStart(9)}   ${flag ? `YES — ${(rate * 100).toFixed(0)}% of carriers, every frame` : (stay ? `no (${(rate * 100).toFixed(0)}%, a pose)` : 'no')}`);
  }

  if (welded.length) {
    bad(`FAIL — ${welded.length} prop kind(s) are AUTHORED through their carrier's head: `
      + welded.map((w) => `${w.t} (${w.stay} of ${w.n} carriers, ${(w.rate * 100).toFixed(0)}%, in both samples)`).join('; '));
    for (const w of welded) {
      const ids = res.both[w.t].slice(0, 3);
      for (const id of ids) {
        const e = res.where[id];
        console.log(`      · ${w.t}: ${e.hits} vertices, ${(res.deep[id] * 100).toFixed(1)}% deep, worst at (${e.at.x}, ${e.at.y}, ${e.at.z}) in head space`);
      }
    }
    console.log('      A held prop is welded into the arm mesh, so this is a sign, a tray or a horn');
    console.log('      drawn through the face of the person carrying it, on every load.');
  } else {
    console.log(`\n  PASS — ${res.withArms} people checked over two samples; no prop kind is drawn through its carrier's head.`);
  }

  // THE TRANSIENT TAIL, REPORTED AND NOT BARRED. These are arms swinging
  // through a skull for a frame in one of life.ts's rooted poses (mode 3
  // "working", mode 5 "campaigning" at -1.80 rad, the kids' skip). Real, worth
  // a number so it can only go down, and not the same defect as a welded prop.
  const tN = Object.keys(res.deep).length;
  const stayN = Object.values(res.both).reduce((a, b) => a + b.length, 0);
  console.log(`\n  ·    transient tail: ${tN - stayN} of ${res.withArms} people had an arm inside their own `
    + `skull in one sample and not the other (${(100 * (tN - stayN) / Math.max(1, res.withArms)).toFixed(1)}%) — `
    + `a swing, not a weld (REPORT, not a bar)`);
} catch (e) {
  bad(`FAIL — headclear threw: ${e.message}`);
}
await br.close();
console.log('');
console.log(fail ? `FAIL — ${fail} problem(s).` : 'PASS — no held prop is drawn through its carrier.');
process.exit(fail ? 1 : 0);
