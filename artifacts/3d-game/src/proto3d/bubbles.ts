// Speech bubbles — the charm layer. Billboarded HTML labels projected from a 3D
// anchor to screen each frame. Ambient chatter + panic barks, biome-flavoured,
// exactly like the 2D game. A small pool keeps it readable (global cap).
import * as THREE from 'three';

export type BubbleKind = 'ambient' | 'panic' | 'event';

export interface Bubbles {
  say(pos: THREE.Vector3, text: string, kind: BubbleKind): void;
  float(pos: THREE.Vector3, text: string, big?: boolean): void;   // rising score/juice text
  update(dt: number): void;
}

interface Slot {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  until: number;
  active: boolean;
}

// Was a flat 150. The camera pulls back to 300 at WORLD ENDER, so every
// ambient and panic line was rejected from roughly GOBBLER onward — the island
// went silent exactly as the player became big enough to enjoy it. Measured:
// 2 unique lines per 10s in the BUSIEST district at camDist 155, 1 at 202.
// The gate now rides the camera so the talking distance scales with the view.
const BUBBLE_MAX_CAMD = 150;   // whole-island views don't need street gossip
// Six simultaneous bubbles, each up to ~250px wide on a 460px screen, with a
// 60px separation rule measured on the ANCHOR rather than the rendered box.
// A measured frame had four of them stacked in one corner, and an evolution
// fired seven text elements at once. Three is a crowd; six is a wall.
export function createBubbles(camera: THREE.Camera, max = 3): Bubbles {
  // inject styles once
  const style = document.createElement('style');
  style.textContent = `
    .vb {
      position: fixed; transform: translate(-50%, -100%); z-index: 4;
      /* system-ui in a game set entirely in Fredoka, and nowrap with no cap, so
         a 236px bubble and a 202px bubble anchored 70px apart on a 390px phone
         landed on top of each other and neither could be read */
      font-family: 'Fredoka', system-ui, sans-serif; font-weight: 800; font-size: 14px;
      padding: 6px 11px; border-radius: 13px;
      /* WITHOUT max-content THIS BOX SHRINKS TOWARD ITS RIGHT EDGE. A fixed
         element with only a left offset has a shrink-to-fit width of
         (viewport - left), so a bubble anchored at x=330 on a 390px phone gets
         60px and renders one word per line — and because the de-collision
         clamp then measures that collapsed box, it pushes the anchor further
         right and the box narrower still, converging on min-content in about
         four frames. Measured: 141 of 141 right-half bubbles affected on a
         phone, 0 of 298 left-half. Desktop was clean, which is why it hid. */
      width: max-content;
      max-width: min(64vw, 300px); white-space: normal; text-align: center;
      overflow-wrap: break-word; line-height: 1.25;
      background: #fff; color: #23203a; pointer-events: none;
      box-shadow: 0 3px 10px rgba(0,0,0,0.28); opacity: 0; transition: opacity 0.18s ease;
      border: 2px solid rgba(0,0,0,0.06);
    }
    .vb::after { content: ''; position: absolute; left: 50%; bottom: -7px; transform: translateX(-50%);
      border: 6px solid transparent; border-top-color: #fff; }
    .vb.panic { background: #ffe1e6; color: #a11a34; border-color: #ffb3c0; }
    .vb.panic::after { border-top-color: #ffe1e6; }
    .vb.event { background: #efe4ff; color: #4a2a80; border-color: #cbb0ff; }
    .vb.event::after { border-top-color: #efe4ff; }
    .vb.show { opacity: 1; }
    .vf {
      position: fixed; transform: translate(-50%, -50%); z-index: 4; pointer-events: none;
      font-family: 'Fredoka', system-ui, sans-serif; font-weight: 900; font-size: 17px; color: #ff7da8;
      -webkit-text-stroke: 1px rgba(70,20,50,0.35);
      text-shadow: 0 2px 6px rgba(0,0,0,0.35); opacity: 0; white-space: nowrap;
    }
    .vf.big { font-size: 26px; color: #7ef2a0; letter-spacing: 1px; }
    .vf.go { animation: vfRise 0.9s ease-out forwards; }
    @keyframes vfRise {
      0% { opacity: 0; transform: translate(-50%, -30%) scale(0.6); }
      18% { opacity: 1; transform: translate(-50%, -70%) scale(1.12); }
      100% { opacity: 0; transform: translate(-50%, -230%) scale(1); }
    }
  `;
  document.head.appendChild(style);

  const slots: Slot[] = [];
  for (let i = 0; i < max; i++) {
    const el = document.createElement('div');
    el.className = 'vb';
    document.body.appendChild(el);
    slots.push({ el, pos: new THREE.Vector3(), until: 0, active: false });
  }

  // floater pool (score popups / EAT! flair)
  const floats: Slot[] = [];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'vf';
    document.body.appendChild(el);
    floats.push({ el, pos: new THREE.Vector3(), until: 0, active: false });
  }
  let fHead = 0;

  let clock = 0;
  const v = new THREE.Vector3();

  return {
    say(pos, text, kind) {
      // whole-island zoom doesn't need street gossip — but FAMILY lines
      // ('event') must survive the big-void camera pull-back, or the rivals go
      // silent exactly when the drama happens
      // Ride the camera. A flat 150 rejected every street line from roughly
      // GOBBLER onward, because camDist reaches 300 at WORLD ENDER — the island
      // fell silent exactly when the player got big enough to enjoy it.
      // Measured before this: 2 unique lines per 10s in the BUSIEST district at
      // camDist 155, and 1 at 202.
      // camera.position.y is the reliable proxy for zoom here — the rig orbits
      // the void, so its absolute position is not the view distance
      const camD = Math.max(40, camera.position.y);
      const gate = kind === 'event' ? 460 : Math.max(BUBBLE_MAX_CAMD, camD * 2.4);
      if (camera.position.distanceTo(pos) > gate) return;
      // dedupe: never show the same line twice at once (panicked crowds all
      // pull from the same pool)
      if (slots.some((s) => s.active && s.el.textContent === text)) return;
      // pile-up guard: cap panic chatter, and reject a bubble whose anchor
      // lands within 60px of one already on screen
      if (kind === 'panic' && slots.filter((s) => s.active && s.el.classList.contains('panic')).length >= 2) return;
      v.copy(pos).project(camera);
      const nx = (v.x * 0.5 + 0.5) * window.innerWidth, ny = (-v.y * 0.5 + 0.5) * window.innerHeight;
      // de-collide against the RENDERED box, not the anchor point. A flat 60px
      // radius let two 236px-wide bubbles sit on top of each other, which is
      // exactly what the phone screenshots caught.
      for (const s of slots) {
        if (!s.active) continue;
        const r = s.el.getBoundingClientRect();
        if (!r.width) continue;
        if (nx > r.left - 14 && nx < r.right + 14 && ny > r.top - 30 && ny < r.bottom + 30) return;
      }
      const slot = slots.find((s) => !s.active);
      if (!slot) return; // at cap — keep it readable
      slot.active = true;
      slot.pos.copy(pos);
      slot.until = clock + (kind === 'panic' ? 2.6 : 4.2);
      slot.el.textContent = text;
      slot.el.className = `vb ${kind === 'ambient' ? '' : kind}`.trim();
      slot.el.style.visibility = 'visible';
      // force reflow then show for the fade-in
      void slot.el.offsetWidth;
      slot.el.classList.add('show');
    },
    float(pos, text, big = false) {
      const f = floats[fHead]; fHead = (fHead + 1) % floats.length;
      f.active = true; f.pos.copy(pos); f.until = clock + 0.9;
      f.el.textContent = text;
      f.el.className = `vf${big ? ' big' : ''}`;
      void (f.el as HTMLElement).offsetWidth;
      f.el.classList.add('go');
    },
    update(dt: number) {
      // was a hard 1/60 per FRAME, so a "4.2s" bubble was really 252 frames:
      // 8.4s on a 30fps phone and 2.1s on a 120Hz one, where a child cannot
      // finish reading it. Bubbles now age in seconds like everything else.
      clock += dt;
      const w = window.innerWidth, h = window.innerHeight;
      for (const s of slots) {
        if (!s.active) continue;
        if (clock > s.until) {
          s.active = false; s.el.classList.remove('show');
          continue;
        }
        v.copy(s.pos).project(camera);
        if (v.z > 1) { s.el.style.visibility = 'hidden'; continue; }  // behind camera
        s.el.style.visibility = 'visible';
        // clamp so the whole box stays on screen — and cope with a box wider
        // than the screen rather than producing an inverted range, which is
        // what pushed a bubble half off the left edge
        const halfW = Math.min(s.el.offsetWidth / 2 + 8, w / 2);
        const halfH = s.el.offsetHeight + 6;
        const x = Math.min(w - halfW, Math.max(halfW, (v.x * 0.5 + 0.5) * w));
        // …and the same on the vertical: the bubble is anchored by its BOTTOM
        // (translate -100%), so an anchor near the top of the screen put the
        // whole box above it, which is the clipped bubble behind the board
        const y = Math.min(h - 8, Math.max(halfH, (-v.y * 0.5 + 0.5) * h));
        s.el.style.left = `${x}px`;
        s.el.style.top = `${y}px`;
      }
      for (const f of floats) {
        if (!f.active) continue;
        if (clock > f.until) { f.active = false; f.el.classList.remove('go'); continue; }
        v.copy(f.pos).project(camera);
        if (v.z > 1) continue;
        f.el.style.left = `${(v.x * 0.5 + 0.5) * w}px`;
        f.el.style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
      }
    },
  };
}
