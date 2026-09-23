// THE CHARACTER SHEET — look at a person from the front before shipping a face.
//
// WHY THIS EXISTS: eyes were added to both crowds and "verified" against a 3x
// crop of a person seen FROM BEHIND. The owner's next phone screenshot showed
// white blobs stuck to the sides of people's heads. A face was shipped without
// anybody looking at a face.
//
// A play screenshot cannot answer this reliably, because the crowd walks and
// most of it walks AWAY from a camera that follows the void. So this probe
// turns people to face the camera on purpose, and photographs them close.
//
//   node qa/personsheet.mjs [port] [world]
//
// It writes qa/out/person/<world>_<n>.png — one tight crop per person, and a
// contact sheet of the same people turned to four angles, so a fix can be
// judged at the angle it actually failed at.
//
// TRAP: the render loop owns the camera every frame, so the camera cannot be
// moved from a probe. The people are moved and turned instead, which the loop
// does not touch, and the shot is the ordinary play camera.
//
// ── AND "FRONT" HAS TO MEAN THE FACE IS TOWARD THE CAMERA ────────────────────
// makeTownsfolk bakes a random facing, mr(0, 2pi), INTO the merged geometry.
// Setting rotation.y turns the mesh, not the face inside it, so this probe's
// "front" frame was front for the protesters (built facing +z) and a random
// angle for everyone else: maple_front.png shows the bowler from behind. The
// facing now rides on the mesh as userData.faceRy and is subtracted here.
//
// And the sheet asserts it rather than hoping: in the front frame every subject
// whose face this probe can find must have its EYE CENTRE nearer the camera
// than its HEAD CENTRE. The eyes are found by their colour — mainstreet.ts's
// INK, read out of that file, not copied — in the head band, and the upper of
// the two INK clusters there is the eyes (the lower is the mouth). The head
// centre is the mesh's own vertical axis at the eyes' height, because
// personParts builds every static at x = z = 0. That is a check on the face,
// not on faceRy: it reads the vertices the camera sees, so a wrong faceRy, a
// missing one or a face built facing the wrong way all fail it the same way.
//
//   PASS — every found face in the front frame looks at the camera
//   FAIL — a subject shows the camera the back of its head
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const OUT = 'qa/out/person';
mkdirSync(OUT, { recursive: true });
const INK_M = readFileSync('src/proto3d/mainstreet.ts', 'utf8').match(/\nconst INK = (0x[0-9a-fA-F]{6});/);
if (!INK_M) { console.log('ABORTED — const INK is not in src/proto3d/mainstreet.ts; the face colour moved.'); process.exit(2); }
const INK = Number(INK_M[1]);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
// START THE MATCH. `?w=<world>` selects the world; it does not skip the menu,
// and the first version of this probe photographed the splash screen for four
// angles without noticing. Same sequence qa/ground.mjs uses.
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
// PLAY NO LONGER OPENS THE PICKER, and this probe went on clicking through it
// until it timed out — "element is not visible", 77s, four angles never shot.
// #btnPlay is startFresh(false) now: it launches the dot the ring is on and the
// world picker never appears, so `?w=${WORLD}` is already the whole world
// selection. The click below waited for a screen that stopped existing.
//
// It failed LOUDLY, which is the lucky half. qa/uisystem.mjs walks a screen it
// calls "picker" through the same dead door and simply finds nothing there, so
// it has been reporting that screen clean without opening it.
await p.click('#btnPlay');
await p.waitForTimeout(2500);
// the match opens on a TAP TO PLAY gate, and the camera sits PULLED BACK on
// the overview until it is taken. The first working version of this probe shot
// that overview and the people were 20 pixels tall. Take the gate, then wait
// for the match clock to actually be running before believing the camera.
await p.mouse.click(215, 700).catch(() => {});
await p.waitForFunction(() => {
  const m = window.__matchState && window.__matchState();
  return m && m.t > 1.5;
}, null, { timeout: 120000, polling: 200 });
await p.waitForFunction(() => {
  const n = window.__edibles.length;
  if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
  return performance.now() - (window.__stableSince || 0) > 2500;
}, null, { timeout: 300000, polling: 250 });

// ── HIDE THE HUD, AND THIS SELECTOR LIST WAS A LIE ─────────────────────────
// The first version read:
//   '#hud,#quests,#news,#bubbles,.banner,#joy,#topbar,#formbar'
// and index.html has no #hud, no #bubbles, no #topbar and no #formbar, while
// `banner` is an ID and was matched as a class. So FOUR of the eight selectors
// hit nothing, the HUD was never hidden, and every character sheet this probe
// produced carried the timer, the score chip and the growth bar across the
// subjects — including one speech bubble sitting on their feet. Caught by TEAM
// MOTION reading the sheets, not by the person who wrote the probe and then
// looked at the sheets four times.
//
// Verified against index.html: these ids all exist. Bubbles are .vb/.vf/.vbN
// from bubbles.ts:161,170,255.
const HUD_SEL = '#timer,#board,#coins,#quests,#growth,#banner,#count,#news,'
  + '#hungerlbl,#hunger,#joy,#powers,#guide,#btnQuit,.vb,.vf,.vbN';
await p.addStyleTag({ content: `${HUD_SEL}{opacity:0 !important}` });
// And prove it worked, rather than trusting a selector list twice — which is
// exactly the mistake the list above documents.
//
// "Visible" has to mean ACTUALLY DRAWN, not "opacity is not zero". An element
// that is display:none still computes opacity 1, and the first version of this
// check counted those and cried wolf about a clean sheet. Something is on
// screen only if it has a layout box AND is not transparent AND is not hidden.
const stillVisible = await p.evaluate((sel) => [...document.querySelectorAll(sel)]
  .filter((e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  })
  .map((e) => e.id || e.className), HUD_SEL);
if (stillVisible.length)
  console.log(`  ! HUD still on screen, the sheet is dirty: ${stillVisible.join(', ')}`);

let frontVerdict = 'FAIL — the front frame was never judged';
for (const [tag, turn] of [['front', 0], ['threequarter', Math.PI * 0.25], ['side', Math.PI * 0.5], ['back', Math.PI]]) {
  const found = await p.evaluate(({ turn }) => {
    const THREE = window.__THREE, cam = window.__cam, vs = window.__voidState();
    // the camera looks along camOffset (0.62, 0.92, 0.62); "toward camera" on
    // the ground plane is therefore +x +z, normalised
    const faceCam = Math.atan2(0.62, 0.62);
    // Collect candidate people: anything with a head-sized sphere and legs is
    // hard to detect generically, so use the two things that ARE knowable —
    // life.ts tags its movers, and the static townsfolk are edibles of a
    // person-ish radius.
    const people = [];
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      const r = e.radius || 0;
      if (r < 0.5 || r > 1.6) continue;               // person-sized only
      let verts = 0;
      m.traverse((o) => { if (o.isMesh && o.geometry) verts += o.geometry.attributes.position?.count || 0; });
      // A BUSH IS PERSON-SIZED. The first version filtered on verts > 400 and
      // photographed four bushes and two flower beds: a three-lobe bush is
      // 1,224 vertices and a flower bed 780, both inside a person's radius
      // band. A life.ts person is ~3,900 and a static townsperson ~2,400,
      // because a person is a dozen limbs, a garment and a head.
      if (verts < 2000) continue;
      const d = Math.hypot(m.position.x - vs.x, m.position.z - vs.z);
      people.push({ m, d, verts, r });
    }
    people.sort((a, c) => a.d - c.d);
    const picked = people.slice(0, 6);
    window.__sheetPicked = picked.map((q) => q.m);    // the front-frame check reads these same six
    // stand them in a row just in front of the void, all turned the same way,
    // and lift them clear of anything they were standing behind
    const out = [];
    picked.forEach((q, i) => {
      // in a row across the screen, a little BEHIND the void so nothing of the
      // hero overlaps them, at a spacing that fills the frame at spawn radius
      const off = (i - (picked.length - 1) / 2) * 2.6;
      q.m.position.set(vs.x + off * 0.71 - 2.5, 0, vs.z - off * 0.71 - 2.5);
      // the face inside the geometry already looks along faceRy (see the
      // header), and rotation.y adds to it — so take it back out, or "front"
      // is front only for the people who happened to be built facing +z
      q.m.rotation.y = faceCam + turn - (q.m.userData.faceRy ?? 0);
      q.m.updateMatrixWorld(true);
      const v = new THREE.Vector3(q.m.position.x, 2.0, q.m.position.z).project(cam);
      out.push({ i, verts: q.verts, r: +q.r.toFixed(2),
        sx: (v.x * 0.5 + 0.5) * window.innerWidth, sy: (-v.y * 0.5 + 0.5) * window.innerHeight });
    });
    return out;
  }, { turn });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}/${WORLD}_${tag}.png` });
  // ── THE FRONT FRAME HAS TO SHOW FACES ────────────────────────────────────
  // Read against the camera that just took the shot, from the vertices
  // themselves (header). Only the front frame carries a verdict: the other
  // three angles are for a person to judge.
  if (tag === 'front') {
    const faces = await p.evaluate(({ INK }) => {
      const THREE = window.__THREE, cam = window.__cam;
      const ink = new THREE.Color().setHex(INK);        // linear, the way part() wrote it
      const rows = [];
      for (const [i, m] of (window.__sheetPicked || []).entries()) {
        if (!m.isMesh || !m.geometry?.attributes?.color) { rows.push({ i, why: 'not one vertex-coloured mesh' }); continue; }
        const pos = m.geometry.attributes.position, col = m.geometry.attributes.color;
        let y0 = Infinity, y1 = -Infinity;
        for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); if (y < y0) y0 = y; if (y > y1) y1 = y; }
        // INK after part()'s bake is INK times ONE factor on all three channels:
        // the skylight k, 0.91-1.18 for a colour this dark. Shoes can be the
        // same hex, so only the top 35% of the body counts as the head band.
        const band = y1 - 0.35 * (y1 - y0);
        const hs = [], at = [];
        for (let k = 0; k < pos.count; k++) {
          const y = pos.getY(k); if (y < band) continue;
          const kr = col.getX(k) / ink.r, kg = col.getY(k) / ink.g, kb = col.getZ(k) / ink.b;
          const lo = Math.min(kr, kg, kb), hi = Math.max(kr, kg, kb);
          if (lo < 0.85 || hi > 1.25 || hi - lo > 0.01) continue;
          hs.push(y); at.push(k);
        }
        if (at.length < 12) { rows.push({ i, why: `${at.length} INK vertices in the head band — no mainstreet face found` }); continue; }
        // two clusters by height, the eyes over the mouth
        let a = Math.min(...hs), b = Math.max(...hs);
        for (let it = 0; it < 30; it++) {
          let sa = 0, na = 0, sb = 0, nb = 0;
          for (const y of hs) if (Math.abs(y - a) <= Math.abs(y - b)) { sa += y; na++; } else { sb += y; nb++; }
          if (!na || !nb) break;
          a = sa / na; b = sb / nb;
        }
        const eye = new THREE.Vector3(); let n = 0;
        for (let j = 0; j < at.length; j++) if (Math.abs(hs[j] - b) < Math.abs(hs[j] - a)) {
          eye.x += pos.getX(at[j]); eye.y += pos.getY(at[j]); eye.z += pos.getZ(at[j]); n++;
        }
        eye.multiplyScalar(1 / n);
        const head = new THREE.Vector3(0, eye.y, 0);
        const offAxis = Math.hypot(eye.x, eye.z);
        m.localToWorld(eye); m.localToWorld(head);
        const de = eye.distanceTo(cam.position), dh = head.distanceTo(cam.position);
        rows.push({ i, faceRy: m.userData.faceRy ?? null, offAxis: +offAxis.toFixed(3), nearer: +(dh - de).toFixed(3), ok: de < dh });
      }
      return rows;
    }, { INK });
    for (const f of faces) {
      if (f.why) { console.log(`    subject ${f.i}: not asserted — ${f.why}`); continue; }
      console.log(`    subject ${f.i}: eyes ${f.nearer >= 0 ? f.nearer.toFixed(3) + ' nearer' : (-f.nearer).toFixed(3) + ' FURTHER'} than the head centre`
        + ` (eyes ${f.offAxis} off the head axis, faceRy ${f.faceRy === null ? 'none' : f.faceRy.toFixed(3)})`);
    }
    const judged = faces.filter((f) => !f.why), back = judged.filter((f) => !f.ok);
    frontVerdict = !judged.length
      ? `FAIL — no subject in the front frame carried a face this probe could find; nothing was judged`
      : back.length
        ? `FAIL — ${back.length} of ${judged.length} subject(s) show the camera the back of the head in the FRONT frame (subject ${back.map((f) => f.i).join(', ')})`
        : `PASS — every found face in the front frame looks at the camera (${judged.length} subject(s))`;
  }
  // ── THE TIGHT CROPS THIS HEADER HAS ALWAYS PROMISED ──────────────────────
  // "one tight crop per person" was in the header from the first version and
  // the loop never wrote one — the only close-ups on disk were hand-cropped
  // afterwards. A probe whose header describes output it does not produce is
  // the same class of thing as a selector list that matches nothing.
  // Playwright's own clip is used rather than a PNG library, so this needs no
  // dependency the repo does not already have.
  let n = 0;
  for (const f of found) {
    const w = 190, h = 210;
    const x = Math.round(Math.max(0, Math.min(430 - w, f.sx - w / 2)));
    const y = Math.round(Math.max(0, Math.min(932 - h, f.sy - h * 0.62)));
    await p.screenshot({ path: `${OUT}/${WORLD}_${tag}_${n++}.png`, clip: { x, y, width: w, height: h } });
  }
  console.log(`  ${tag.padEnd(13)} ${found.length} people  ${n} crop(s)  verts ${found.map(f => f.verts).join(',')}`);
}
await b.close();
console.log(`\n  wrote ${OUT}/${WORLD}_{front,threequarter,side,back}.png\n`);
console.log(frontVerdict);
if (!frontVerdict.startsWith('PASS')) process.exit(1);
