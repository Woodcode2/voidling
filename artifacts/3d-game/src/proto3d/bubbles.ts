// Speech bubbles — the charm layer. Billboarded HTML labels projected from a 3D
// anchor to screen each frame. Ambient chatter + panic barks, biome-flavoured,
// exactly like the 2D game. A small pool keeps it readable (global cap).
import * as THREE from 'three';

export type BubbleKind = 'ambient' | 'panic' | 'event';

export interface Bubbles {
  say(pos: THREE.Vector3, text: string, kind: BubbleKind): void;
  float(pos: THREE.Vector3, text: string, big?: boolean): void;   // rising score/juice text
  update(): void;
}

interface Slot {
  el: HTMLDivElement;
  pos: THREE.Vector3;
  until: number;
  active: boolean;
}

export function createBubbles(camera: THREE.Camera, max = 6): Bubbles {
  // inject styles once
  const style = document.createElement('style');
  style.textContent = `
    .vb {
      position: fixed; transform: translate(-50%, -100%); z-index: 6;
      font-family: system-ui, sans-serif; font-weight: 800; font-size: 14px;
      padding: 6px 11px; border-radius: 13px; white-space: nowrap;
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
      position: fixed; transform: translate(-50%, -50%); z-index: 6; pointer-events: none;
      font-family: system-ui, sans-serif; font-weight: 900; font-size: 17px; color: #ff7da8;
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
      // dedupe: never show the same line twice at once (panicked crowds all
      // pull from the same pool)
      if (slots.some((s) => s.active && s.el.textContent === text)) return;
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
    update() {
      clock += 1 / 60;
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
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-v.y * 0.5 + 0.5) * h;
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
