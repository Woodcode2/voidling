// Speech bubbles — the charm layer. Billboarded HTML labels projected from a 3D
// anchor to screen each frame. Ambient chatter + panic barks, biome-flavoured,
// exactly like the 2D game. A small pool keeps it readable (global cap).
import * as THREE from 'three';

export type BubbleKind = 'ambient' | 'panic' | 'event';

export interface Bubbles {
  say(pos: THREE.Vector3, text: string, kind: BubbleKind): void;
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
  `;
  document.head.appendChild(style);

  const slots: Slot[] = [];
  for (let i = 0; i < max; i++) {
    const el = document.createElement('div');
    el.className = 'vb';
    document.body.appendChild(el);
    slots.push({ el, pos: new THREE.Vector3(), until: 0, active: false });
  }

  let clock = 0;
  const v = new THREE.Vector3();

  return {
    say(pos, text, kind) {
      // dedupe: if the same text is already showing near here, skip
      let slot = slots.find((s) => !s.active);
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
    },
  };
}
