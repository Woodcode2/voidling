// v10 §1 — Sprite asset pipeline (skin bodies + form layers)
// v11     — World object sprites
//
// At boot, tries to load PNG art from three folders:
//   /assets/skins/{id}.png    — replaces procedural voidling body
//   /assets/layers/{id}.png   — replaces procedural form layer (flame-crown, galaxy-core)
//   /assets/objects/{id}.png  — replaces procedural world-object drawing
//
// If a PNG is absent the game falls back to its procedural renderer silently.

const SKIN_IDS = [
  'classic','pirate','princess','astronaut','ninja','wizard','kitty',
  'devil','galaxy','lava','ghost','midas','disco','dragon',
];
const LAYER_IDS = ['flame-crown', 'galaxy-core'];

// v11: the 12 object types that support PNG art
const OBJECT_IDS = [
  'house_a','house_b','tree','bush','gnome','bench',
  'hydrant','mailbox','trashcan','foodcart','fountain','watertower',
];

export const skinSprites:   Map<string, HTMLImageElement> = new Map();
export const layerSprites:  Map<string, HTMLImageElement> = new Map();
export const objectSprites: Map<string, HTMLImageElement> = new Map();

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
 * Logs a line for skins/layers and a separate line for object sprites.
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

  // ── world objects ─────────────────────────────────────────────────────────
  for (const id of OBJECT_IDS) {
    const img = new Image();
    tasks.push(tryLoad(`${base}assets/objects/${id}.png`, img).then((ok) => {
      if (ok) { objectSprites.set(id, img); objLoaded.push(id); }
      else objFallback.push(id);
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
