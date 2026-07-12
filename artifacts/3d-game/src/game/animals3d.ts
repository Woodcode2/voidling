/**
 * animals3d.ts — procedural flat-shaded animal sprites.
 *
 * Replaces the remaining photographic "clay" animal cutouts with crisp
 * vector mascots in the same hole.io-inspired language as props3d.ts:
 * chunky front-facing figures, 2-tone shading (base + light top-left
 * highlight), simple dot eyes with catchlights. Sprites are injected into
 * the shared maps at init so everything downstream (rotation, bob, capture
 * tumble, shadows, aspect-correct draws) works unchanged.
 *
 * All generation is synchronous canvas drawing — no fetches, no pop-in.
 */

import { objectSprites, spriteBounds, spriteAspect } from './sprites';

const TAU = Math.PI * 2;

const put = (key: string, cvs: HTMLCanvasElement, contentW: number, contentH: number) => {
  // square foot-anchored pad, same contract as the clay cutout pipeline
  const S = Math.max(cvs.width, cvs.height);
  const sq = document.createElement('canvas');
  sq.width = S; sq.height = S;
  sq.getContext('2d')!.drawImage(cvs, Math.round((S - cvs.width) / 2), S - cvs.height);
  (objectSprites as Map<string, HTMLImageElement | HTMLCanvasElement>).set(key, sq);
  spriteBounds.set(key, { x: 0, y: 0, w: 1, h: 1 });
  spriteAspect.set(key, contentW / contentH);
};

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
};

const cv = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
};

/** Flat 2-tone ellipse: base fill + light offset highlight (props3d makeTree language). */
const blob = (g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, base: string, light?: string) => {
  g.fillStyle = base;
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
  if (light) {
    g.fillStyle = light;
    g.beginPath(); g.ellipse(cx - rx * 0.24, cy - ry * 0.28, rx * 0.6, ry * 0.6, 0, 0, TAU); g.fill();
  }
};

/** Dot eye with catchlight; ring=true adds a white sclera for dark faces. */
const eye = (g: CanvasRenderingContext2D, x: number, y: number, r = 3.2, ring = false) => {
  if (ring) { g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x, y, r * 1.55, 0, TAU); g.fill(); }
  g.fillStyle = '#26262B';
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = '#FFFFFF';
  g.beginPath(); g.arc(x - r * 0.32, y - r * 0.36, r * 0.38, 0, TAU); g.fill();
};

const eyes = (g: CanvasRenderingContext2D, cx: number, y: number, gap: number, r: number, ring = false) => {
  eye(g, cx - gap, y, r, ring);
  eye(g, cx + gap, y, r, ring);
};

const legs = (g: CanvasRenderingContext2D, cx: number, y: number, gap: number, w: number, h: number, col: string) => {
  g.fillStyle = col;
  rr(g, cx - gap - w, y, w, h, w * 0.45); g.fill();
  rr(g, cx + gap, y, w, h, w * 0.45); g.fill();
};

const tri = (g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: string) => {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fill();
};

// ── SAVANNA / ZOO ────────────────────────────────────────────────────────────

function makeLion(): HTMLCanvasElement {
  const { c, g } = cv(84, 96); const cx = 42;
  legs(g, cx, 78, 8, 11, 18, '#D9932F');
  blob(g, cx, 62, 26, 23, '#E8A33D', '#F2BC5C');                 // body
  blob(g, cx, 34, 26, 26, '#C9762B', '#D9893A');                 // mane ring
  blob(g, cx - 19, 15, 6.5, 6.5, '#E8A33D'); blob(g, cx - 19, 15, 3.4, 3.4, '#C9762B'); // ears
  blob(g, cx + 19, 15, 6.5, 6.5, '#E8A33D'); blob(g, cx + 19, 15, 3.4, 3.4, '#C9762B');
  blob(g, cx, 36, 18.5, 17, '#E8A33D', '#F2BC5C');               // head
  blob(g, cx, 44, 9.5, 7, '#F2D9A8');                            // muzzle
  blob(g, cx, 41, 2.8, 2.4, '#6B4A2E');                          // nose
  eyes(g, cx, 33, 7.5, 3.4);
  return c;
}

function makeElephant(): HTMLCanvasElement {
  const { c, g } = cv(106, 94); const cx = 53;
  legs(g, cx, 76, 20, 13, 18, '#8593A3');
  legs(g, cx, 78, 4, 13, 16, '#9AA6B5');
  blob(g, cx - 34, 36, 15, 19, '#8593A3'); blob(g, cx - 34, 36, 9, 12, '#B9A6B2'); // big ears
  blob(g, cx + 34, 36, 15, 19, '#8593A3'); blob(g, cx + 34, 36, 9, 12, '#B9A6B2');
  blob(g, cx, 60, 34, 26, '#9AA6B5', '#B4C0CD');                 // body
  blob(g, cx, 34, 23, 20, '#9AA6B5', '#B4C0CD');                 // head
  blob(g, cx - 10, 46, 3.2, 4, '#F2EFE6');                       // tusk nubs
  blob(g, cx + 10, 46, 3.2, 4, '#F2EFE6');
  g.strokeStyle = '#8E9AAA'; g.lineWidth = 11; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, 40); g.quadraticCurveTo(cx - 2, 58, cx + 6, 70); g.stroke(); // trunk
  eyes(g, cx, 30, 9, 3.4);
  return c;
}

function makeGiraffe(): HTMLCanvasElement {
  const { c, g } = cv(88, 130); const cx = 44;
  legs(g, cx, 108, 9, 10, 22, '#E0AE4C');
  blob(g, cx, 98, 25, 20, '#EFC15C', '#F7D27C');                 // body
  g.fillStyle = '#EFC15C'; rr(g, cx - 9, 36, 18, 66, 9); g.fill();  // neck
  g.fillStyle = '#F7D27C'; rr(g, cx - 9, 36, 8, 60, 4); g.fill();
  g.fillStyle = '#C98A3A';                                        // patch spots
  const spots: [number, number][] = [[cx - 7, 48], [cx + 1, 64], [cx - 6, 80], [cx - 17, 92], [cx + 7, 98], [cx + 13, 88]];
  for (const [sx, sy] of spots) { rr(g, sx, sy, 7, 8, 3); g.fill(); }
  g.strokeStyle = '#C98A3A'; g.lineWidth = 3; g.lineCap = 'round'; // ossicones
  g.beginPath(); g.moveTo(cx - 6, 16); g.lineTo(cx - 8, 8); g.stroke();
  g.beginPath(); g.moveTo(cx + 6, 16); g.lineTo(cx + 8, 8); g.stroke();
  blob(g, cx - 8, 7.5, 3, 3, '#C98A3A'); blob(g, cx + 8, 7.5, 3, 3, '#C98A3A');
  blob(g, cx - 15, 24, 6, 4, '#EFC15C'); blob(g, cx + 15, 24, 6, 4, '#EFC15C'); // ears
  blob(g, cx, 26, 14, 12.5, '#EFC15C', '#F7D27C');               // head
  blob(g, cx, 33, 8, 5.5, '#F2DCA8');                            // muzzle
  eyes(g, cx, 23, 6, 3);
  return c;
}

function makeBear(): HTMLCanvasElement {
  const { c, g } = cv(92, 100); const cx = 46;
  legs(g, cx, 82, 10, 13, 18, '#8A5C40');
  blob(g, cx, 64, 28, 25, '#9C6B4C', '#B58363');                 // body
  blob(g, cx, 68, 15, 13, '#C9A183');                            // belly
  blob(g, cx - 16, 14, 7, 7, '#9C6B4C'); blob(g, cx - 16, 14, 3.8, 3.8, '#C9A183'); // round ears
  blob(g, cx + 16, 14, 7, 7, '#9C6B4C'); blob(g, cx + 16, 14, 3.8, 3.8, '#C9A183');
  blob(g, cx, 32, 21, 19, '#9C6B4C', '#B58363');                 // head
  blob(g, cx, 41, 10.5, 8, '#C9A183');                           // muzzle
  blob(g, cx, 38, 3, 2.6, '#4A342A');                            // nose
  eyes(g, cx, 29, 8.5, 3.4);
  return c;
}

function makeZebra(): HTMLCanvasElement {
  const { c, g } = cv(88, 100); const cx = 44;
  legs(g, cx, 80, 9, 11, 20, '#F2F2EE');
  g.fillStyle = '#2E2E33';                                        // hooves
  rr(g, cx - 20, 92, 11, 8, 3); g.fill(); rr(g, cx + 9, 92, 11, 8, 3); g.fill();
  tri(g, cx - 18, 18, cx - 12, 3, cx - 6, 16, '#F2F2EE');         // pointy ears
  tri(g, cx + 18, 18, cx + 12, 3, cx + 6, 16, '#F2F2EE');
  tri(g, cx - 15, 15, cx - 12, 7, cx - 9, 14, '#5C5C64');
  tri(g, cx + 15, 15, cx + 12, 7, cx + 9, 14, '#5C5C64');
  blob(g, cx, 62, 27, 24, '#F2F2EE', '#FFFFFF');                 // body
  g.save();                                                       // stripes clipped to body
  g.beginPath(); g.ellipse(cx, 62, 27, 24, 0, 0, TAU); g.clip();
  g.strokeStyle = '#2E2E33'; g.lineWidth = 5; g.lineCap = 'round';
  for (const y of [46, 57, 68, 79]) {
    g.beginPath(); g.moveTo(cx - 27, y); g.quadraticCurveTo(cx, y + 7, cx + 27, y); g.stroke();
  }
  g.restore();
  blob(g, cx, 30, 17.5, 16, '#F2F2EE', '#FFFFFF');               // head
  g.fillStyle = '#2E2E33';                                        // mane cap + tuft
  g.beginPath(); g.arc(cx, 27, 17.5, Math.PI * 0.98, Math.PI * 0.02); g.fill();
  rr(g, cx - 4, 6, 8, 12, 3); g.fill();
  blob(g, cx, 39, 9, 7, '#8A8A92');                              // muzzle
  blob(g, cx - 3, 39, 1.3, 1.3, '#4A4A52'); blob(g, cx + 3, 39, 1.3, 1.3, '#4A4A52');
  eyes(g, cx, 28, 8, 3.2);
  return c;
}

function makeHippo(): HTMLCanvasElement {
  const { c, g } = cv(108, 88); const cx = 54;
  legs(g, cx, 72, 20, 14, 16, '#968AA6');
  legs(g, cx, 74, 4, 13, 14, '#A79BB5');
  blob(g, cx - 24, 18, 5, 5, '#A79BB5'); blob(g, cx - 24, 18, 2.6, 2.6, '#C9A8B0'); // tiny ears
  blob(g, cx + 24, 18, 5, 5, '#A79BB5'); blob(g, cx + 24, 18, 2.6, 2.6, '#C9A8B0');
  blob(g, cx, 48, 40, 26, '#A79BB5', '#BDB2C9');                 // wide body
  blob(g, cx - 14, 33, 6.5, 6, '#A79BB5'); blob(g, cx + 14, 33, 6.5, 6, '#A79BB5'); // eye bumps
  blob(g, cx, 58, 27, 17, '#BDB2C9', '#CFC5DA');                 // huge muzzle
  blob(g, cx - 10, 53, 3.5, 2.5, '#5C5468'); blob(g, cx + 10, 53, 3.5, 2.5, '#5C5468'); // nostrils
  g.fillStyle = '#F5F3EE';                                        // tooth nubs
  rr(g, cx - 17, 66, 6, 8, 3); g.fill(); rr(g, cx + 11, 66, 6, 8, 3); g.fill();
  eyes(g, cx, 32, 14, 3.2);
  return c;
}

function makePanda(): HTMLCanvasElement {
  const { c, g } = cv(92, 96); const cx = 46;
  legs(g, cx, 80, 9, 13, 16, '#2B2B30');                          // black legs
  blob(g, cx - 24, 58, 9, 14, '#2B2B30'); blob(g, cx + 24, 58, 9, 14, '#2B2B30'); // black arms
  blob(g, cx, 62, 27, 25, '#F5F3EE', '#FFFFFF');                 // white body
  blob(g, cx - 16, 13, 8, 8, '#2B2B30'); blob(g, cx + 16, 13, 8, 8, '#2B2B30');   // black ears
  blob(g, cx, 32, 21, 19, '#F5F3EE', '#FFFFFF');                 // head
  blob(g, cx - 8.5, 32, 6.5, 8, '#2B2B30');                      // eye patches
  blob(g, cx + 8.5, 32, 6.5, 8, '#2B2B30');
  eyes(g, cx, 31, 8.5, 2.6, true);
  blob(g, cx, 41, 3, 2.6, '#2B2B30');                            // nose
  return c;
}

function makeMonkey(): HTMLCanvasElement {
  const { c, g } = cv(78, 90); const cx = 39;
  g.strokeStyle = '#8A5C40'; g.lineWidth = 6; g.lineCap = 'round'; // tail
  g.beginPath(); g.moveTo(cx + 14, 66); g.quadraticCurveTo(cx + 34, 58, cx + 30, 38); g.stroke();
  legs(g, cx, 74, 8, 11, 16, '#8A5C40');
  blob(g, cx, 58, 21, 20, '#9C6B4C', '#B58363');                 // body
  blob(g, cx, 62, 12, 11, '#E8C9A8');                            // tan belly
  blob(g, cx - 17, 30, 7, 7, '#9C6B4C'); blob(g, cx - 17, 30, 3.6, 3.6, '#E8C9A8'); // round ears
  blob(g, cx + 17, 30, 7, 7, '#9C6B4C'); blob(g, cx + 17, 30, 3.6, 3.6, '#E8C9A8');
  blob(g, cx, 30, 17, 15.5, '#9C6B4C', '#B58363');               // head
  blob(g, cx, 33, 11.5, 9.5, '#E8C9A8');                         // tan face
  blob(g, cx - 2.5, 37, 1.2, 1.2, '#6B4A2E'); blob(g, cx + 2.5, 37, 1.2, 1.2, '#6B4A2E');
  eyes(g, cx, 30, 5.5, 2.9);
  return c;
}

function makeTortoise(): HTMLCanvasElement {
  const { c, g } = cv(96, 80); const cx = 48;
  legs(g, cx, 66, 22, 12, 14, '#A8B86A');                         // feet
  blob(g, cx, 42, 36, 28, '#6BA05C', '#82B871');                 // dome shell
  g.save();                                                       // plate pattern
  g.beginPath(); g.ellipse(cx, 42, 36, 28, 0, 0, TAU); g.clip();
  g.strokeStyle = 'rgba(46,86,44,0.55)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(cx - 14, 14); g.quadraticCurveTo(cx - 18, 42, cx - 14, 70); g.stroke();
  g.beginPath(); g.moveTo(cx + 14, 14); g.quadraticCurveTo(cx + 18, 42, cx + 14, 70); g.stroke();
  g.beginPath(); g.moveTo(cx - 36, 34); g.quadraticCurveTo(cx, 42, cx + 36, 34); g.stroke();
  g.beginPath(); g.moveTo(cx - 34, 52); g.quadraticCurveTo(cx, 60, cx + 34, 52); g.stroke();
  g.restore();
  g.fillStyle = '#4E8248'; rr(g, cx - 36, 56, 72, 10, 5); g.fill(); // shell rim
  blob(g, cx, 64, 10.5, 9.5, '#A8B86A', '#BFCB80');              // head peeking
  eyes(g, cx, 62, 4.5, 2.6);
  return c;
}

function makePenguin(): HTMLCanvasElement {
  const { c, g } = cv(76, 100); const cx = 38;
  g.fillStyle = '#F2913D';                                        // orange feet
  rr(g, cx - 14, 92, 13, 8, 4); g.fill(); rr(g, cx + 1, 92, 13, 8, 4); g.fill();
  blob(g, cx, 54, 24, 40, '#2E3440', '#454E5E');                 // black body
  blob(g, cx - 25, 58, 6, 16, '#2E3440'); blob(g, cx + 25, 58, 6, 16, '#2E3440'); // flippers
  blob(g, cx, 63, 15, 27, '#F5F3EE', '#FFFFFF');                 // white belly
  tri(g, cx - 5, 32, cx + 5, 32, cx, 41, '#F2913D');              // orange beak
  eyes(g, cx, 26, 8, 2.9, true);
  return c;
}

function makeFlamingo(): HTMLCanvasElement {
  const { c, g } = cv(80, 128); const cx = 40;
  g.strokeStyle = '#E8738C'; g.lineWidth = 4; g.lineCap = 'round'; // ONE thin leg
  g.beginPath(); g.moveTo(cx + 4, 124); g.lineTo(cx + 4, 74); g.stroke();
  blob(g, cx + 4, 124, 7, 3.5, '#E8738C');                       // foot
  g.strokeStyle = '#F2879E'; g.lineWidth = 8;                    // S-curve neck
  g.beginPath(); g.moveTo(cx - 8, 58);
  g.bezierCurveTo(cx - 28, 48, cx - 26, 18, cx - 8, 16); g.stroke();
  blob(g, cx, 62, 21, 16, '#F2879E', '#F8A8BA');                 // pink oval body
  blob(g, cx + 4, 65, 12, 9, '#E8738C');                         // wing
  blob(g, cx - 8, 15, 9, 8.5, '#F2879E', '#F8A8BA');             // head
  tri(g, cx - 12, 18, cx - 4, 18, cx - 7, 31, '#F2E4D8');         // beak
  tri(g, cx - 9.4, 26, cx - 5.3, 26, cx - 7, 31, '#26262B');      // black tip
  eyes(g, cx - 8, 13, 3.5, 2.1);
  return c;
}

function makeSeal(): HTMLCanvasElement {
  const { c, g } = cv(92, 84); const cx = 46;
  blob(g, cx - 26, 74, 11, 7, '#7E96A8'); blob(g, cx + 26, 74, 11, 7, '#7E96A8'); // flippers
  blob(g, cx, 56, 28, 26, '#8FA6B8', '#A9BECD');                 // teardrop body
  blob(g, cx, 63, 15, 14, '#C4D4DE');                            // belly
  blob(g, cx, 28, 18, 16, '#8FA6B8', '#A9BECD');                 // head
  blob(g, cx, 35, 10, 7, '#C4D4DE');                             // muzzle
  blob(g, cx, 31.5, 2.6, 2.3, '#3E4A54');                        // nose
  g.fillStyle = '#5C707E';                                        // whisker dots
  for (const [wx, wy] of [[-5, 34], [-8, 36], [-5, 38], [5, 34], [8, 36], [5, 38]] as [number, number][]) {
    g.beginPath(); g.arc(cx + wx, wy, 1.1, 0, TAU); g.fill();
  }
  eyes(g, cx, 25, 7.5, 3.2);
  return c;
}

// ── NEIGHBORHOOD ─────────────────────────────────────────────────────────────

function makeDog(): HTMLCanvasElement {
  const { c, g } = cv(74, 80); const cx = 37;
  g.strokeStyle = '#B98A52'; g.lineWidth = 6; g.lineCap = 'round'; // tail
  g.beginPath(); g.moveTo(cx + 14, 58); g.quadraticCurveTo(cx + 28, 52, cx + 28, 42); g.stroke();
  legs(g, cx, 66, 7, 10, 14, '#D9A566');
  blob(g, cx, 54, 19, 17, '#D9A566', '#E8BE82');                 // body
  blob(g, cx - 16, 27, 6, 11, '#9C6B4C');                        // floppy ears
  blob(g, cx + 16, 27, 6, 11, '#9C6B4C');
  blob(g, cx, 28, 16, 14.5, '#D9A566', '#E8BE82');               // head
  blob(g, cx, 36, 8.5, 6.5, '#F2DCB8');                          // muzzle
  blob(g, cx, 33, 2.8, 2.4, '#4A342A');                          // nose
  eyes(g, cx, 25, 6.5, 3);
  return c;
}

function makeCat(): HTMLCanvasElement {
  const { c, g } = cv(70, 74); const cx = 35;
  g.strokeStyle = '#E8955C'; g.lineWidth = 5; g.lineCap = 'round'; // tail curl
  g.beginPath(); g.moveTo(cx + 12, 56);
  g.bezierCurveTo(cx + 28, 50, cx + 30, 38, cx + 20, 36); g.stroke();
  legs(g, cx, 62, 6.5, 9, 12, '#E8955C');
  blob(g, cx, 50, 17, 16, '#E8955C', '#F2B27E');                 // body
  tri(g, cx - 15, 18, cx - 11, 4, cx - 4, 15, '#E8955C');         // pointy ears
  tri(g, cx + 15, 18, cx + 11, 4, cx + 4, 15, '#E8955C');
  tri(g, cx - 12.5, 15, cx - 11, 8, cx - 7, 14, '#F2C9A8');
  tri(g, cx + 12.5, 15, cx + 11, 8, cx + 7, 14, '#F2C9A8');
  blob(g, cx, 26, 15, 13.5, '#E8955C', '#F2B27E');               // head
  g.fillStyle = '#C97941';                                        // head stripes
  rr(g, cx - 6, 14, 3.5, 6, 1.75); g.fill(); rr(g, cx + 2.5, 14, 3.5, 6, 1.75); g.fill();
  blob(g, cx, 32.5, 7, 5, '#F7DFC2');                            // muzzle
  blob(g, cx, 30.5, 1.8, 1.6, '#D96A6A');                        // pink nose
  eyes(g, cx, 24, 6, 2.8);
  return c;
}

function makeDuck(): HTMLCanvasElement {
  const { c, g } = cv(70, 72); const cx = 35;
  g.fillStyle = '#F2913D';                                        // feet
  rr(g, cx - 12, 65, 11, 7, 3.5); g.fill(); rr(g, cx + 1, 65, 11, 7, 3.5); g.fill();
  blob(g, cx, 46, 20, 18, '#F5E29B', '#FBF0C0');                 // body
  blob(g, cx - 16, 46, 6, 11, '#E8CD7E'); blob(g, cx + 16, 46, 6, 11, '#E8CD7E'); // wings
  blob(g, cx, 22, 13, 12, '#F5E29B', '#FBF0C0');                 // head
  blob(g, cx, 29, 8, 4.5, '#F2913D', '#F7AB63');                 // orange bill
  eyes(g, cx, 19, 5.5, 2.8);
  return c;
}

function makeSquirrel(): HTMLCanvasElement {
  const { c, g } = cv(86, 82); const bx = 34;
  blob(g, 60, 44, 15, 22, '#C1703E', '#D98D55');                 // BIG fluffy tail behind
  blob(g, 58, 20, 12, 12, '#C1703E', '#D98D55');
  legs(g, bx, 70, 7, 9, 12, '#C1703E');
  blob(g, bx, 58, 16, 15, '#C1703E', '#D98D55');                 // body
  blob(g, bx, 61, 9, 9, '#F2D9B8');                              // cream belly
  blob(g, bx - 11, 22, 5, 5, '#C1703E'); blob(g, bx - 11, 22, 2.5, 2.5, '#F2D9B8'); // ears
  blob(g, bx + 11, 22, 5, 5, '#C1703E'); blob(g, bx + 11, 22, 2.5, 2.5, '#F2D9B8');
  blob(g, bx, 34, 13.5, 12.5, '#C1703E', '#D98D55');             // head
  blob(g, bx, 41, 6.5, 5, '#F2D9B8');                            // muzzle
  blob(g, bx, 38.5, 2, 1.8, '#4A342A');                          // nose
  eyes(g, bx, 31, 5.5, 2.8);
  return c;
}

function makeBird(): HTMLCanvasElement {
  const { c, g } = cv(58, 56); const cx = 29;
  g.strokeStyle = '#C98A3A'; g.lineWidth = 2.5; g.lineCap = 'round'; // legs
  g.beginPath(); g.moveTo(cx - 5, 46); g.lineTo(cx - 5, 54); g.stroke();
  g.beginPath(); g.moveTo(cx + 5, 46); g.lineTo(cx + 5, 54); g.stroke();
  blob(g, cx, 32, 17, 16, '#5C9BD9', '#7FB6E8');                 // tiny round body
  blob(g, cx - 14, 34, 6, 10, '#4A82BF'); blob(g, cx + 14, 34, 6, 10, '#4A82BF');  // wings
  blob(g, cx, 39, 9, 7.5, '#CFE4F5');                            // belly
  tri(g, cx - 4, 29, cx + 4, 29, cx, 36, '#F2913D');              // beak
  eyes(g, cx, 24, 6.5, 3);
  return c;
}

function makeCrab(): HTMLCanvasElement {
  const { c, g } = cv(98, 70); const cx = 49;
  for (const s of [-1, 1]) {                                      // claws up (with pincer notch)
    blob(g, cx + s * 36, 20, 10, 10, '#E85D45', '#F2836B');
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(cx + s * 40, 11, 4.5, 0, TAU); g.fill();
    g.restore();
  }
  g.strokeStyle = '#D14C38'; g.lineWidth = 7; g.lineCap = 'round'; // arms
  g.beginPath(); g.moveTo(cx - 24, 40); g.lineTo(cx - 34, 28); g.stroke();
  g.beginPath(); g.moveTo(cx + 24, 40); g.lineTo(cx + 34, 28); g.stroke();
  g.lineWidth = 4.5;                                              // walking legs
  for (const s of [-1, 1]) for (const [x1, y1, x2, y2] of [[20, 48, 34, 56], [17, 53, 30, 63], [13, 57, 24, 67]]) {
    g.beginPath(); g.moveTo(cx + s * x1, y1); g.lineTo(cx + s * x2, y2); g.stroke();
  }
  blob(g, cx, 46, 27, 17, '#E85D45', '#F2836B');                 // wide body
  g.strokeStyle = '#D14C38'; g.lineWidth = 3.5;                  // eye stalks
  g.beginPath(); g.moveTo(cx - 8, 34); g.lineTo(cx - 9, 22); g.stroke();
  g.beginPath(); g.moveTo(cx + 8, 34); g.lineTo(cx + 9, 22); g.stroke();
  eye(g, cx - 9, 20, 2.7, true); eye(g, cx + 9, 20, 2.7, true);
  return c;
}

function makeSnail(): HTMLCanvasElement {
  const { c, g } = cv(86, 64);
  g.fillStyle = '#E8D5B0'; rr(g, 12, 46, 62, 18, 9); g.fill();    // cream foot
  g.fillStyle = '#F5E7CC'; rr(g, 12, 46, 62, 8, 4); g.fill();
  blob(g, 20, 40, 10, 13, '#E8D5B0', '#F5E7CC');                 // head raised
  g.strokeStyle = '#D9C29A'; g.lineWidth = 3; g.lineCap = 'round'; // eye stalks
  g.beginPath(); g.moveTo(16, 32); g.lineTo(12, 20); g.stroke();
  g.beginPath(); g.moveTo(24, 32); g.lineTo(27, 19); g.stroke();
  eye(g, 12, 18, 2.6); eye(g, 27, 17, 2.6);
  blob(g, 55, 36, 22, 21, '#A6764C', '#BF8E60');                 // brown shell
  g.strokeStyle = '#7E5636'; g.lineWidth = 3;                    // spiral
  g.beginPath(); g.arc(55, 36, 14, 0.4, Math.PI * 1.55); g.stroke();
  g.beginPath(); g.arc(57, 38, 8, 1.0, Math.PI * 2.1); g.stroke();
  g.beginPath(); g.arc(56, 37, 3, 0, TAU); g.stroke();
  return c;
}

// ── INIT ─────────────────────────────────────────────────────────────────────

const MAKERS: [string, () => HTMLCanvasElement][] = [
  ['lion', makeLion], ['elephant', makeElephant], ['giraffe', makeGiraffe],
  ['bear', makeBear], ['zebra', makeZebra], ['hippo', makeHippo],
  ['panda', makePanda], ['monkey', makeMonkey], ['tortoise', makeTortoise],
  ['penguin', makePenguin], ['flamingo', makeFlamingo], ['seal', makeSeal],
  ['dog', makeDog], ['cat', makeCat], ['duck', makeDuck],
  ['squirrel', makeSquirrel], ['bird', makeBird], ['crab', makeCrab],
  ['snail', makeSnail],
];

let _done = false;
export function initAnimals3d(): void {
  if (_done) return;
  _done = true;
  for (const [kind, make] of MAKERS) {
    const cvs = make();
    put(`a3d_${kind}`, cvs, cvs.width, cvs.height);
  }
  console.log(`[animals3d] procedural animal sprites ready — ${MAKERS.length} species (a3d_*)`);
}
