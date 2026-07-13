/**
 * spriteExtract.ts — Connected-component sprite extraction.
 *
 * Replaces fixed-grid slicing with a robust pipeline:
 *  1. BG flood-fill from border seeds, colour-matched to #1E1338 + alpha transparency
 *  2. Connected-component labelling of remaining opaque pixels
 *  3. Discard components < 0.2% of sheet area (stray specks)
 *  4. Merge component bboxes within 8px of each other (rejoins kite strings, hat tips)
 *  5. Assign each merged cluster to the nearest expected grid cell centre
 *  6. Tight bounding-box crop → each output canvas contains exactly one sprite
 *
 * Used by wardSprites.ts (ward sheets) and islandMap.ts (evolution + drift sheets).
 */

interface BBox { minX: number; minY: number; maxX: number; maxY: number; size: number; }

/** BFS flood-fill from border seeds (every pixel + every 32px interval on all four edges).
 *  The BG colour is sampled from the border (median), so both the dark-violet
 *  clay sheets (#1E1338) and the white-background city sheets key correctly.
 *  Light backgrounds get a tighter threshold so white objects (fences, marble
 *  facades) aren't flood-eaten; only the near-flat paper white is removed. */
function removeBg(px: Uint8ClampedArray, W: number, H: number): void {
  // Sample the median border colour as the BG reference
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const sample = (i: number) => { rs.push(px[i*4]); gs.push(px[i*4+1]); bs.push(px[i*4+2]); };
  for (let x = 0; x < W; x += 4) { sample(x); sample((H-1)*W + x); }
  for (let y = 0; y < H; y += 4) { sample(y*W); sample(y*W + W-1); }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  const BG_R = med(rs), BG_G = med(gs), BG_B = med(bs);
  const lum = 0.299 * BG_R + 0.587 * BG_G + 0.114 * BG_B;
  const lightSheet = lum > 140;
  const T = lightSheet ? 28 : 58; // light sheets: tight key; dark sheets: legacy 58
  const BG_THRESH_SQ = T * T;

  const visited = new Uint8Array(W * H);
  const q: number[] = [];
  let qh = 0;

  const isBg = (i: number): boolean => {
    if (px[i * 4 + 3] < 8) return true;
    const dr = px[i*4] - BG_R, dg = px[i*4+1] - BG_G, db = px[i*4+2] - BG_B;
    return dr*dr + dg*dg + db*db < BG_THRESH_SQ;
  };
  const seed = (i: number): void => {
    if (i < 0 || i >= W * H || visited[i] || !isBg(i)) return;
    visited[i] = 1; q.push(i);
  };

  // Every border pixel
  for (let x = 0; x < W; x++) { seed(x); seed((H-1)*W + x); }
  for (let y = 0; y < H; y++) { seed(y*W); seed(y*W + W-1); }
  // Extra 32px-interval seeds for large sheets
  for (let x = 32; x < W - 1; x += 32) { seed(x); seed((H-1)*W + x); }
  for (let y = 32; y < H - 1; y += 32) { seed(y*W); seed(y*W + W-1); }

  while (qh < q.length) {
    const i = q[qh++];
    const x = i % W, y = (i / W) | 0;
    px[i * 4 + 3] = 0;
    if (x > 0)     seed(i - 1);
    if (x < W - 1) seed(i + 1);
    if (y > 0)     seed(i - W);
    if (y < H - 1) seed(i + W);
  }

  // Bug fix (white-box halo): on white sheets the flood fill can leave a 1-2px
  // near-white RIM where anti-aliased/noisy background pixels drifted past the
  // key threshold. Erode any near-white pixel touching the transparent region
  // (2 passes ≈ 2px). Interior white (fences, marble) is untouched — only rim
  // pixels adjacent to transparency clear, so no object gets flood-eaten.
  if (lightSheet) {
    const N = W * H;
    for (let pass = 0; pass < 2; pass++) {
      const toClear: number[] = [];
      for (let i = 0; i < N; i++) {
        if (px[i * 4 + 3] < 8) continue;
        if (px[i*4] < 232 || px[i*4+1] < 232 || px[i*4+2] < 232) continue; // near-white only
        const x = i % W, y = (i / W) | 0;
        const clear = (j: number) => j >= 0 && j < N && px[j*4+3] < 8;
        if ((x > 0 && clear(i-1)) || (x < W-1 && clear(i+1)) || (y > 0 && clear(i-W)) || (y < H-1 && clear(i+W))) toClear.push(i);
      }
      for (const i of toClear) px[i*4+3] = 0;
    }
  }
}

/** 4-connected component labelling of opaque pixels; returns bounding boxes. */
function findComponents(px: Uint8ClampedArray, W: number, H: number): BBox[] {
  const total = W * H;
  const label = new Int32Array(total).fill(-1);
  const boxes: BBox[] = [];

  for (let i = 0; i < total; i++) {
    if (label[i] >= 0 || px[i * 4 + 3] < 8) continue;
    const ci = boxes.length;
    const box: BBox = { minX: W, minY: H, maxX: -1, maxY: -1, size: 0 };
    boxes.push(box);
    label[i] = ci;
    const q = [i]; let qh = 0;
    while (qh < q.length) {
      const j = q[qh++];
      const x = j % W, y = (j / W) | 0;
      box.size++;
      if (x < box.minX) box.minX = x; if (x > box.maxX) box.maxX = x;
      if (y < box.minY) box.minY = y; if (y > box.maxY) box.maxY = y;
      if (x > 0   && label[j-1] < 0 && px[(j-1)*4+3] >= 8) { label[j-1] = ci; q.push(j-1); }
      if (x < W-1 && label[j+1] < 0 && px[(j+1)*4+3] >= 8) { label[j+1] = ci; q.push(j+1); }
      if (y > 0   && label[j-W] < 0 && px[(j-W)*4+3] >= 8) { label[j-W] = ci; q.push(j-W); }
      if (y < H-1 && label[j+W] < 0 && px[(j+W)*4+3] >= 8) { label[j+W] = ci; q.push(j+W); }
    }
  }
  return boxes;
}

/** Iteratively merge bboxes whose Chebyshev gap is ≤ 8px (rejoins fragments).
 *  Guarded by a centre-distance cap (~½ grid cell) so tightly-packed sheets
 *  don't chain-merge neighbouring sprites into one giant cluster — same-cell
 *  fragments still union later during grid assignment regardless. */
function mergeBBoxes(boxes: BBox[], maxCX: number, maxCY: number): BBox[] {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const xGap = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
        const yGap = Math.max(0, a.minY - b.maxY, b.minY - a.maxY);
        const cdx = Math.abs((a.minX + a.maxX) - (b.minX + b.maxX)) / 2;
        const cdy = Math.abs((a.minY + a.maxY) - (b.minY + b.maxY)) / 2;
        if (xGap <= 8 && yGap <= 8 && cdx <= maxCX && cdy <= maxCY) {
          a.minX = Math.min(a.minX, b.minX); a.maxX = Math.max(a.maxX, b.maxX);
          a.minY = Math.min(a.minY, b.minY); a.maxY = Math.max(a.maxY, b.maxY);
          a.size += b.size;
          boxes.splice(j, 1); j--; changed = true;
        }
      }
    }
  }
  return boxes;
}

// ── Debug registry (populated by extractComponents, read by ?debug=sprites) ──
export interface ExtractionRecord {
  sheet: string;
  cols: number;
  rows: number;
  sprites: HTMLCanvasElement[];  // one per grid cell (row-major), possibly 1×1 if empty
  emptyCells: number[];          // cell indices (row*cols+col) that had no pixels
}
export const extractionLog: ExtractionRecord[] = [];

/**
 * Extract sprites from a sheet using the connected-component pipeline.
 * Returns one HTMLCanvasElement per grid cell in row-major order, tightly cropped.
 * Empty cells produce a 1×1 transparent canvas and are logged as warnings.
 */
export function extractComponents(
  sheet: HTMLImageElement,
  cols: number,
  rows: number,
  sheetName = 'unknown',
): HTMLCanvasElement[] {
  const W = sheet.naturalWidth || 1, H = sheet.naturalHeight || 1;
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const g = cvs.getContext('2d')!;
  g.drawImage(sheet, 0, 0);
  const data = g.getImageData(0, 0, W, H);
  const px = data.data;

  // Step 1: remove background
  removeBg(px, W, H);

  // Step 1b: erase cell-divider grid lines. Some sheets draw thin grey
  // separators between cells; they survive keying and weld every sprite that
  // touches them into one sheet-wide lattice. A column/row whose opaque
  // coverage spans ≥88% of the sheet can only be a divider — clear it.
  // Sprites crossing a cleared 2-3px line are rejoined by the 8px merge.
  for (let x = 0; x < W; x++) {
    let n = 0;
    for (let y = 0; y < H; y++) if (px[(y * W + x) * 4 + 3] >= 8) n++;
    if (n > H * 0.88) for (let y = 0; y < H; y++) px[(y * W + x) * 4 + 3] = 0;
  }
  for (let y = 0; y < H; y++) {
    let n = 0;
    for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] >= 8) n++;
    if (n > W * 0.88) for (let x = 0; x < W; x++) px[(y * W + x) * 4 + 3] = 0;
  }
  g.putImageData(data, 0, 0);

  // Step 2: find components
  let comps = findComponents(px, W, H);

  // Step 3: discard specks < 0.2% sheet area
  const minSize = W * H * 0.002;
  comps = comps.filter(c => c.size >= minSize);

  // Step 4: merge nearby (centre-capped to ~½ cell so neighbours can't chain)
  const cellW = W / cols, cellH = H / rows;
  comps = mergeBBoxes(comps, cellW * 0.55, cellH * 0.55);

  // Step 5: assign to nearest grid cell
  const assigned: (BBox | null)[] = new Array(cols * rows).fill(null);

  for (const comp of comps) {
    const cx = (comp.minX + comp.maxX) / 2;
    const cy = (comp.minY + comp.maxY) / 2;
    let bestCell = 0, bestDist = Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const d = Math.hypot(cx - (c + 0.5) * cellW, cy - (r + 0.5) * cellH);
        if (d < bestDist) { bestDist = d; bestCell = r * cols + c; }
      }
    }
    if (assigned[bestCell]) {
      const ex = assigned[bestCell]!;
      ex.minX = Math.min(ex.minX, comp.minX); ex.maxX = Math.max(ex.maxX, comp.maxX);
      ex.minY = Math.min(ex.minY, comp.minY); ex.maxY = Math.max(ex.maxY, comp.maxY);
      ex.size += comp.size;
    } else {
      assigned[bestCell] = { ...comp };
    }
  }

  // Step 6: tight-bbox crop per cell
  const sprites: HTMLCanvasElement[] = [];
  const emptyCells: number[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const bbox = assigned[row * cols + col];
      if (!bbox || bbox.maxX < bbox.minX) {
        console.warn(`[spriteExtract] "${sheetName}" cell (col=${col} row=${row}): no pixels found`);
        emptyCells.push(row * cols + col);
        const empty = document.createElement('canvas');
        empty.width = 1; empty.height = 1;
        sprites.push(empty);
        continue;
      }
      const cw = bbox.maxX - bbox.minX + 1, ch = bbox.maxY - bbox.minY + 1;
      const crop = document.createElement('canvas');
      crop.width = cw; crop.height = ch;
      crop.getContext('2d')!.drawImage(cvs, bbox.minX, bbox.minY, cw, ch, 0, 0, cw, ch);
      sprites.push(crop);
    }
  }

  console.log(
    `[spriteExtract] "${sheetName}": ${comps.length} components → ${cols * rows} cells` +
    (emptyCells.length ? ` (${emptyCells.length} empty)` : ' ✓'),
  );
  extractionLog.push({ sheet: sheetName, cols, rows, sprites, emptyCells });
  return sprites;
}
