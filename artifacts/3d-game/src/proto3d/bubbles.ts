// Speech bubbles — the charm layer. Billboarded HTML labels projected from a 3D
// anchor to screen each frame. Ambient chatter + panic barks, biome-flavoured,
// exactly like the 2D game. A small pool keeps it readable (global cap).
import * as THREE from 'three';

// 'rival' is the FAMILY's kind, and it is not the same thing as 'event':
// the diagnosis that forced the split found both slots held by town-hall
// set-piece barks ("Point of order! POINT of order!") wearing the event
// class — the crowd shouting in the family's voice, starving actual rival
// speech of slots. 'event' is crowd EMPHASIS; 'rival' is a CHARACTER.
export type BubbleKind = 'ambient' | 'panic' | 'event' | 'rival';

export interface Bubbles {
  /** `opts.name`/`opts.color` put a SPEAKER CHIP on the bubble — the rival's
   *  name in their leaderboard colour. This is the comms redesign's spine
   *  (owner: three text streams read as one busy soup): the family's lines
   *  are IDENTIFIED conversation, the crowd's are anonymous texture, and the
   *  two are visually different classes at a glance. */
  say(pos: THREE.Vector3, text: string, kind: BubbleKind, opts?: { name?: string; color?: string }): void;
  float(pos: THREE.Vector3, text: string, big?: boolean): void;   // rising score/juice text
  update(dt: number): void;
  /** Clear every live bubble and floater. Called at match reset. */
  reset(): void;
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
// fired seven text elements at once. Three is a crowd; six is a wall — and a
// later measurement over 143 frames found 87% of bay frames carrying two or
// more and 42% carrying the full three, with 47% of frames showing bubbles
// physically overlapping (worst case: one bubble 100% hidden behind another).
// Two.
/** The top strip the leaderboard, clock and wallet own. Everything else the
 *  HUD occupies is measured from its real rect at clamp time — guessed bands
 *  went stale the moment an element moved. */
const HUD_TOP = 206;
/** HUD elements a bubble must never be drawn over. The size chip is projected
 *  from the void's own screen position, so it moves; the guide pill is fixed
 *  but its size is CSS. Read them, do not assume them. Unknown ids are skipped,
 *  so this list is safe to keep an element in after it is cut.
 *
 *  The banner, the evolve card and the news card were added after a screenshot
 *  caught "BAKE SALE RUSH! everything is DOUBLE!" drawn straight across "our
 *  gas is two cents cheaper." — the earlier pass only guarded the always-on
 *  panels, and those three are exactly the ones that arrive without warning. */
const HUD_AVOID = ['form', 'guide'];
/** Full-bleed centred text that arrives without warning. These are dodged as
 *  horizontal BANDS — their element box spans the whole screen, so an x-overlap
 *  test would always match — and only while they are actually on screen. */
const HUD_BANDS = ['banner', 'evolve', 'news', 'titlecard'];
export function createBubbles(camera: THREE.Camera, max = 2): Bubbles {
  // inject styles once
  // ── HOUSE SENTENCE CASE, ENFORCED AT THE GLASS ──────────────────────────────
// 84% of the town's spoken lines were authored lower-case — 743 of 885 across
// life.ts and rivals.ts — against a house style the owner rejected twice, in
// writing, and which both newsroom modules carry a header about: "That rule is
// DEAD… it is the reason the newsfeed was rejected twice." The rewrite reached
// two of the six pools. The result is a child reading "The mayor says there is
// no hole" on the news card and "i fixed that pothole. me." two inches below.
//
// Doing this at the point of display rather than by rewriting 743 string
// literals is deliberate: it cannot corrupt a key, a path or a CSS value by
// accident, it costs one charAt per bubble, and — the part that matters — a
// line added next month is correct without anyone remembering the rule.
//
// Only the first LETTER is touched. Lines opening with an emoji, an ellipsis
// or a number keep their opening, and nothing is done to punctuation: "+15✦"
// and "owie." are both already right and neither wants a full stop bolted on.
function sentence(t: string): string {
  const i = t.search(/[A-Za-z]/);
  if (i < 0) return t;
  const c = t[i];
  if (c === c.toUpperCase()) return t;          // already capitalised, or ALL CAPS
  return t.slice(0, i) + c.toUpperCase() + t.slice(i + 1);
}

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
    /* the crowd is TEXTURE, not content: smaller and quieter than the family */
    .vb.panic, .vb:not(.event) { font-size: 12.5px; padding: 5px 9px; }
    /* the speaker chip: the rival's name in their leaderboard colour, so a
       child knows WHO is talking from across the island */
    .vb .vbN { display: block; font-size: 10px; font-weight: 900; letter-spacing: 1.2px;
      margin: -1px 0 2px; text-transform: uppercase; }
    .vb .vbN i { font-style: normal; display: inline-block; width: 8px; height: 8px;
      border-radius: 50%; margin-right: 4px; vertical-align: baseline; }
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
    say(pos, text, kind, opts) {
      text = sentence(text);
      // ── THE TEMPORAL RULES (comms redesign) ─────────────────────────────
      // Three voices share one screen, so two rules keep them from talking
      // over each other. 1: while a hero card owns the centre, the crowd —
      // set-piece 'event' barks included — holds its tongue; family lines
      // still land, drama continues. 2: while the FAMILY is speaking, the
      // crowd waits — gossip never outranks a rival hunting you.
      if (kind !== 'rival') {
        const ban = document.getElementById('banner');
        if (ban && ban.classList.contains('show')) return;
        if (slots.some((s) => s.active && s.el.classList.contains('rival'))) return;
      }
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
      // the long gate belongs to the FAMILY — their drama must survive the
      // big-void pull-back. Crowd emphasis rides the camera like the rest.
      const gate = kind === 'rival' ? 460 : Math.max(BUBBLE_MAX_CAMD, camD * 2.4);
      if (camera.position.distanceTo(pos) > gate) return;
      // dedupe: never show the same line twice at once (panicked crowds all
      // pull from the same pool). Compares the raw LINE, not textContent —
      // the speaker chip is part of textContent now.
      if (slots.some((s) => s.active && s.el.dataset.line === text)) return;
      // pile-up guard: cap panic chatter, and reject a bubble whose anchor
      // lands within 60px of one already on screen
      if (kind === 'panic' && slots.filter((s) => s.active && s.el.classList.contains('panic')).length >= 2) return;
      v.copy(pos).project(camera);
      const nx = (v.x * 0.5 + 0.5) * window.innerWidth, ny = (-v.y * 0.5 + 0.5) * window.innerHeight;
      // de-collide against the RENDERED box, not the anchor point. A flat 60px
      // radius let two 236px-wide bubbles sit on top of each other, which is
      // exactly what the phone screenshots caught. A rival only yields to
      // another RIVAL — a crowd bubble in its way is about to be evicted.
      for (const s of slots) {
        if (!s.active) continue;
        if (kind === 'rival' && !s.el.classList.contains('rival')) continue;
        const r = s.el.getBoundingClientRect();
        if (!r.width) continue;
        if (nx > r.left - 14 && nx < r.right + 14 && ny > r.top - 30 && ny < r.bottom + 30) return;
      }
      let slot = slots.find((s) => !s.active);
      // FAMILY OUTRANKS GOSSIP, structurally: with the pool full of crowd
      // lines, a rival line evicts the oldest one rather than being refused —
      // this is the fix for the diagnosed slot-starvation above.
      if (!slot && kind === 'rival') {
        slot = slots.filter((s) => !s.el.classList.contains('rival'))
          .sort((a, b) => a.until - b.until)[0];
        if (slot) { slot.el.classList.remove('show'); delete slot.el.dataset.line; }
      }
      if (!slot) return; // at cap — keep it readable
      slot.active = true;
      slot.pos.copy(pos);
      // crowd texture fades a beat sooner than it used to — it is seasoning,
      // and 4.2s of seasoning was reading as a fourth text channel
      slot.until = clock + (kind === 'panic' ? 2.6 : kind === 'ambient' ? 3.4 : 4.2);
      // rival renders in the event palette PLUS its own marker class — the
      // class is what the temporal rules and the eviction test read
      const cls = kind === 'ambient' ? '' : kind === 'rival' ? 'event rival' : kind;
      slot.el.dataset.line = text;
      slot.el.textContent = '';
      if (opts?.name) {
        // the speaker chip: dot in the rival's colour + their name, above the line
        const tag = document.createElement('span');
        tag.className = 'vbN';
        const dot = document.createElement('i');
        dot.style.background = opts.color ?? '#b875ff';
        tag.appendChild(dot);
        tag.appendChild(document.createTextNode(opts.name));
        if (opts.color) tag.style.color = opts.color;
        slot.el.appendChild(tag);
      }
      slot.el.appendChild(document.createTextNode(text));
      slot.el.className = `vb ${cls}`.trim();
      slot.el.style.visibility = 'visible';
      // force reflow then show for the fade-in
      void slot.el.offsetWidth;
      slot.el.classList.add('show');
    },
    float(pos, text, big = false) {
      text = sentence(text);
      const f = floats[fHead]; fHead = (fHead + 1) % floats.length;
      f.active = true; f.pos.copy(pos); f.until = clock + 0.9;
      f.el.textContent = text;
      f.el.className = `vf${big ? ' big' : ''}`;
      void (f.el as HTMLElement).offsetWidth;
      f.el.classList.add('go');
    },
    reset() {
      // Every live bubble and floater dies at the match boundary. They used to
      // carry over verbatim — measured in 5 of 5 match transitions — and hang
      // over empty grass for two to four seconds while the new match started
      // underneath them, saying things about a match that had already ended.
      for (const sl of slots) {
        sl.active = false; sl.until = 0;
        sl.el.classList.remove('show');
        sl.el.style.visibility = '';
        sl.el.textContent = '';
        delete sl.el.dataset.line;   // or dedupe rejects this line next match
      }
      for (const f of floats) {
        f.active = false; f.until = 0;
        f.el.classList.remove('show');
        f.el.textContent = '';
      }
    },
    update(dt: number) {
      // was a hard 1/60 per FRAME, so a "4.2s" bubble was really 252 frames:
      // 8.4s on a 30fps phone and 2.1s on a 120Hz one, where a child cannot
      // finish reading it. Bubbles now age in seconds like everything else.
      clock += dt;
      // the banner's arrival also RETIRES crowd bubbles already up — the
      // spawn gate alone left them living out their 3.4s beside the hero
      // card (measured: 29 of 180 samples co-visible). 0.6s of grace, no
      // pop-out; family lines stay, as everywhere else in these rules.
      {
        const ban = document.getElementById('banner');
        if (ban && ban.classList.contains('show')) {
          for (const s of slots) {
            if (s.active && !s.el.classList.contains('rival')) s.until = Math.min(s.until, clock + 0.6);
          }
        }
      }
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
        // whole box above it, which is the clipped bubble behind the board.
        //
        // THE HUD BAND. The clamp used to clamp to the raw viewport, at
        // z-index 4, underneath every HUD element — so bubbles were drawn
        // BEHIND the leaderboard and the clock. Measured over 91 bay frames:
        // the board covered a bubble in 30 of them, worst case 79% of it; the
        // clock in 34; the coin chip in 12, worst case 93%. That is the
        // half-sentence of clipped text in the owner's screenshot — it is a
        // speech bubble, not the news card. Raising the z-index would only put
        // chatter over the score, so the fix is to keep bubbles OUT of the
        // band: refuse the top strip, keep clear of the panels that remain, and
        // drop anything that cannot fit rather than squeezing it in.
        const top = HUD_TOP + halfH;
        let y = Math.min(h - 26, Math.max(top, (-v.y * 0.5 + 0.5) * h));   // never under the iOS home indicator
        // …and out from under every HUD panel it would otherwise hide behind.
        // A bubble is anchored by its BOTTOM edge, so its box is
        // [y - offsetHeight, y].
        const dodge = (rTop: number, rBot: number) => {
          if (y <= rTop - 4 || y - s.el.offsetHeight >= rBot + 4) return;
          const above = rTop - s.el.offsetHeight - 10;
          const below = rBot + s.el.offsetHeight + 10;
          y = above >= top ? above : Math.min(h - 26, below);
        };
        for (const id of HUD_AVOID) {
          const el2 = document.getElementById(id);
          const r = el2?.getBoundingClientRect();
          if (!el2 || !r || !r.width) continue;
          if (Math.abs(x - (r.left + r.width / 2)) < halfW + r.width / 2 - 4) dodge(r.top, r.bottom);
        }
        // …and the hero-message bands, which is what caught the owner's
        // screenshot: "BAKE SALE RUSH! everything is DOUBLE!" drawn straight
        // across "our gas is two cents cheaper."
        for (const id of HUD_BANDS) {
          const el2 = document.getElementById(id);
          if (!el2) continue;
          const cs = getComputedStyle(el2);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.06) continue;
          const r = el2.getBoundingClientRect();
          if (!r.height) continue;
          dodge(r.top, r.bottom);
        }
        // …and never on top of another bubble: the spawn-time de-collision
        // does not survive two anchors both leaving the viewport and clamping
        // to the same coordinate, which measured as one bubble 100% hidden.
        let clash = false;
        for (const o of slots) {
          if (o === s || !o.active || o.el.style.visibility === 'hidden') continue;
          const r = o.el.getBoundingClientRect();
          if (!r.width) continue;
          if (Math.abs(x - (r.left + r.width / 2)) < (halfW + r.width / 2 - 6)
            && Math.abs(y - r.bottom) < (s.el.offsetHeight + r.height) * 0.5 - 4) { clash = true; break; }
        }
        if (clash) { s.el.style.visibility = 'hidden'; continue; }
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
