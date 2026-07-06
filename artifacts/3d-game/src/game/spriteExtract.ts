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

// Dark-violet BG colour shared by every sprite sheet: #1E1338
const BG_R = 0x1E, BG_G = 0x13, BG_B = 0x38;
const BG_THRESH_SQ = 58 * 58; // squared Euclidean distance threshold

interface BBox { minX: number; minY: number; maxX: number; maxY: number; size: number; }

/** BFS flood-fill from border seeds (every pixel + every 32px interval on all four edges). */
function removeBg(px: Uint8ClampedArray, W: number, H: number): void {
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

/** Iteratively merge bboxes whose Chebyshev gap is ≤ 8px (rejoins fragments). */
function mergeBBoxes(boxes: BBox[]): BBox[] {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const xGap = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
        const yGap = Math.max(0, a.minY - b.maxY, b.minY - a.maxY);
        if (xGap <= 8 && yGap <= 8) {
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
  g.putImageData(data, 0, 0);

  // Step 2: find components
  let comps = findComponents(px, W, H);

  // Step 3: discard specks < 0.2% sheet area
  const minSize = W * H * 0.002;
  comps = comps.filter(c => c.size >= minSize);

  // Step 4: merge nearby
  comps = mergeBBoxes(comps);

  // Step 5: assign to nearest grid cell
  const cellW = W / cols, cellH = H / rows;
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
