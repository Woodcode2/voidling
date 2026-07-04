// v10 §1 — Sprite asset pipeline
// At boot, tries to load PNG art for every skin and select form layers.
// If a PNG is absent the game falls back to its procedural renderer silently.
// The exported Maps are checked by voidling.ts before each body draw.

const SKIN_IDS = [
  'classic','pirate','princess','astronaut','ninja','wizard','kitty',
  'devil','galaxy','lava','ghost','midas','disco','dragon',
];
const LAYER_IDS = ['flame-crown', 'galaxy-core'];

export const skinSprites: Map<string, HTMLImageElement> = new Map();
export const layerSprites: Map<string, HTMLImageElement> = new Map();

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
 * Logs a one-liner listing loaded vs fallback ids — this is the dev signal.
 */
export async function preloadSprites(base: string): Promise<void> {
  const loaded: string[] = [];
  const fallback: string[] = [];

  const tasks: Promise<void>[] = [];

  for (const id of SKIN_IDS) {
    const img = new Image();
    tasks.push(tryLoad(`${base}assets/skins/${id}.png`, img).then((ok) => {
      if (ok) { skinSprites.set(id, img); loaded.push(id); }
      else fallback.push(id);
    }));
  }
  for (const id of LAYER_IDS) {
    const img = new Image();
    tasks.push(tryLoad(`${base}assets/layers/${id}.png`, img).then((ok) => {
      if (ok) { layerSprites.set(id, img); loaded.push(id); }
      else fallback.push(id);
    }));
  }

  await Promise.all(tasks);

  console.log(
    `[VOIDLING sprites] loaded: ${loaded.join(', ') || '(none)'}` +
    ` | fallback (procedural): ${fallback.join(', ')}`,
  );
}
