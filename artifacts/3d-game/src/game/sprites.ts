// v10 §1 — Sprite asset pipeline (skin bodies + form layers)
// v11     — World object sprites
// v12 §0  — Alpha-channel bounding-box scan (no transparent padding in rendering)
// v12 §6  — Ground texture tiles (grass, asphalt, sidewalk, pond)
//
// At boot, tries to load PNG art from four folders:
//   /assets/skins/{id}.png    — replaces procedural voidling body
//   /assets/layers/{id}.png   — replaces procedural form layer (flame-crown, galaxy-core)
//   /assets/objects/{id}.png  — replaces procedural world-object drawing
//   /assets/ground/{id}.png   — ground texture tile (tiled + district-tinted)
//
// If a PNG is absent the game falls back to its procedural renderer silently.

// ── §0: tight bounding box per sprite (trim transparent padding) ─────────────
// Stored in normalised [0,1] coords relative to the full image.
// Callers scale by naturalWidth/naturalHeight to get source pixels, then map
// the trimmed content into their logical draw rect.
export interface SpriteBounds { x: number; y: number; w: number; h: number; }
export const spriteBounds: Map<string, SpriteBounds> = new Map();

function scanAlphaBounds(img: HTMLImageElement, key: string): void {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    const W = canvas.width, H = canvas.height;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 8) {
          if (x < minX) minX = x; if (y < minY) minY = y;
          if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return; // fully transparent — leave no entry; callers use full rect
    spriteBounds.set(key, { x: minX / W, y: minY / H, w: (maxX - minX + 1) / W, h: (maxY - minY + 1) / H });
  } catch {
    // cross-origin or tainted canvas — skip; caller falls back to full rect
  }
}

const SKIN_IDS = [
  'classic','pirate','princess','astronaut','ninja','wizard','kitty',
  'devil','galaxy','lava','ghost','midas','disco','dragon',
];
const LAYER_IDS = ['flame-crown', 'galaxy-core'];

// v11: 12 base object types that support PNG art
// v12 §1: extended with downtown + playground types
const OBJECT_IDS = [
  'house_a','house_b','tree','bush','gnome','bench',
  'hydrant','mailbox','trashcan','foodcart','fountain','watertower',
  // v12 §1: downtown
  'shop_a','shop_b','library','office','skyscraper_a','skyscraper_b',
  // v12 §1: additional
  'school','gazebo','swingset','slide','pool',
];

// v12 §6: ground texture tile IDs
const GROUND_IDS = ['grass', 'asphalt', 'sidewalk', 'pond'];

export const skinSprites:   Map<string, HTMLImageElement> = new Map();
export const layerSprites:  Map<string, HTMLImageElement> = new Map();
export const objectSprites: Map<string, HTMLImageElement> = new Map();
export const groundSprites: Map<string, HTMLImageElement> = new Map(); // v12 §6

function tryLoad(url: string, img: HTMLImageElement): Promise<boolean> {
  return new Promise((resolve) => {
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Call once at app boot with `import.meta.env.BASE_URL`.
 * Returns a promise that resolves after every asset attempt completes.
 */
export async function preloadSprites(base: string): Promise<void> {
  const skinLoaded: string[] = [], skinFallback: string[] = [];
  const objLoaded:  string[] = [], objFallback:  string[] = [];
  const tasks: Promise<void>[] = [];

  // ── skin bodies ───────────────────────────────────────────────────────────
  for (const id of SKIN_IDS) {
    const img = new Image();
    tasks.push(tryLoad(`${base}assets/skins/${id}.png`, img).then((ok) => {
      if (ok) { skinSprites.set(id, img); skinLoaded.push(id); }
      else skinFallback.push(id);
    }));
  }

  // ── form layers ───────────────────────────────────────────────────────────
  for (const id of LAYER_IDS) {
    const img = new Image();
    tasks.push(tryLoad(`${base}assets/layers/${id}.png`, img).then((ok) => {
      if (ok) { layerSprites.set(id, img); skinLoaded.push(id); }
      else skinFallback.push(id);
    }));
  }

  // ── world objects (§0: scan alpha bounds after load) ─────────────────────
  for (const id of OBJECT_IDS) {
    const img = new Image();
    tasks.push(tryLoad(`${base}assets/objects/${id}.png`, img).then((ok) => {
      if (ok) {
        objectSprites.set(id, img);
        scanAlphaBounds(img, id); // §0: compute tight bounding box, remove padding
        objLoaded.push(id);
      } else {
        objFallback.push(id);
      }
    }));
  }

  // ── ground textures (§6) ──────────────────────────────────────────────────
  for (const id of GROUND_IDS) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    tasks.push(tryLoad(`${base}assets/ground/${id}.png`, img).then((ok) => {
      if (ok) groundSprites.set(id, img);
    }));
  }

  await Promise.all(tasks);

  console.log(
    `[VOIDLING sprites] loaded: ${skinLoaded.join(', ') || '(none)'}` +
    ` | fallback (procedural): ${skinFallback.join(', ')}`,
  );
  console.log(
    `[VOIDLING objects] loaded: ${objLoaded.join(', ') || '(none)'}` +
    ` | fallback (procedural): ${objFallback.join(', ')}`,
  );
}
