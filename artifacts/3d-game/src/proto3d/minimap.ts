// ── THE MINIMAP ──────────────────────────────────────────────────────────────
// There was no minimap, radar, compass, waypoint or off-screen indicator
// anywhere in the game. That matters more than it sounds: the twenty GILDED
// props are, by the code's own comment, "where the run-to-run variety lives now
// that the opening is deliberately fixed" — and they were invisible, so the
// entire variety budget was being paid for and never delivered. A logged match
// also spent sixty-seven seconds on one beach with nothing worth eating and no
// way to know that anywhere else was better.
//
// One canvas, redrawn a few times a second. Island silhouette, you, the rivals
// coloured by whether they can hurt you, and the treasure.

export interface MiniTarget { x: number; z: number; }
export interface MiniRival { x: number; z: number; r: number; color: number; }

export interface Minimap {
  update(px: number, pz: number, pr: number, gold: MiniTarget[], rivals: MiniRival[]): void;
  setVisible(v: boolean): void;
  dispose(): void;
}

export function createMinimap(outline: [number, number][]): Minimap {
  const SIZE = 116, PAD = 5;
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = SIZE * dpr; cv.height = SIZE * dpr;
  cv.id = 'minimap';
  document.body.appendChild(cv);
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);

  // fit the outline into the canvas once — the island never moves
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of outline) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const span = Math.max(maxX - minX, maxZ - minZ) || 1;
  const k = (SIZE - PAD * 2) / span;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const px2 = (x: number) => SIZE / 2 + (x - cx) * k;
  const pz2 = (z: number) => SIZE / 2 + (z - cz) * k;

  let last = 0;
  const update: Minimap['update'] = (x, z, r, gold, rivals) => {
    // 8 Hz is plenty for a 116px map and keeps it off the frame budget
    const now = performance.now();
    if (now - last < 125) return;
    last = now;
    g.clearRect(0, 0, SIZE, SIZE);
    // the island
    g.beginPath();
    outline.forEach(([ox, oz], i) => (i ? g.lineTo(px2(ox), pz2(oz)) : g.moveTo(px2(ox), pz2(oz))));
    g.closePath();
    g.fillStyle = 'rgba(126,213,122,0.24)'; g.fill();
    g.strokeStyle = 'rgba(201,166,255,0.55)'; g.lineWidth = 1.5; g.stroke();
    // treasure — the whole point of this thing
    g.fillStyle = '#ffd23f';
    for (const t of gold) {
      const tx = px2(t.x), tz = pz2(t.z);
      g.beginPath(); g.arc(tx, tz, 2.2, 0, Math.PI * 2); g.fill();
    }
    // rivals: red if they outsize you, otherwise their own colour — the same
    // read the world-space halos already use
    for (const rv of rivals) {
      g.beginPath(); g.arc(px2(rv.x), pz2(rv.z), 3, 0, Math.PI * 2);
      g.fillStyle = rv.r > r * 1.12 ? '#ff5d6e' : `#${rv.color.toString(16).padStart(6, '0')}`;
      g.fill();
    }
    // you, last, so nothing can cover you
    const ux = px2(x), uz = pz2(z);
    g.beginPath(); g.arc(ux, uz, 4.4, 0, Math.PI * 2);
    g.fillStyle = '#0d0821'; g.fill();
    g.beginPath(); g.arc(ux, uz, 3.2, 0, Math.PI * 2);
    g.fillStyle = '#c9a6ff'; g.fill();
  };
  return {
    update,
    setVisible: (v) => { cv.style.display = v ? '' : 'none'; },
    dispose: () => cv.remove(),
  };
}
