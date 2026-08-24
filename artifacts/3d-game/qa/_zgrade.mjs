// simulate prototype3d.ts:257-276 CustomToneMapping for a vertex colour x light
const s2l = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const l2s = (v) => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); };
const mul = (M, v) => [
  M[0][0] * v[0] + M[1][0] * v[1] + M[2][0] * v[2],
  M[0][1] * v[0] + M[1][1] * v[1] + M[2][1] * v[2],
  M[0][2] * v[0] + M[1][2] * v[1] + M[2][2] * v[2]];
const IN = [[0.59719, 0.07600, 0.02840], [0.35458, 0.90834, 0.13383], [0.04823, 0.01566, 0.83777]];
const OUT = [[1.60475, -0.10208, -0.00327], [-0.53108, 1.10813, -0.07276], [-0.07367, -0.00605, 1.07602]];
const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function grade(hex, k) {
  const lin = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(s2l).map(v => v * k);
  let c = mul(IN, lin).map(fit);
  c = mul(OUT, c).map(v => Math.min(1, Math.max(0, v)));
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  // MUST TRACK prototype3d.ts's CustomToneMapping. It was the hard per-channel
  // clip `max(0, (v - 0.014) / (1 - 0.014))` and the shader is now a
  // compressing toe — a simulator that models the previous build is worse than
  // no simulator, because everything downstream of it reads as measurement.
  const TOE = 0.014;
  c = c.map(v => v * v / (v + TOE) * (1 + TOE));
  const cool = [0.96, 0.99, 1.06], warm = [1.05, 1.005, 0.95], t = ss(0.18, 0.78, l);
  c = c.map((v, i) => v * (cool[i] + (warm[i] - cool[i]) * t));
  c = c.map(v => l + 1.07 * (v - l));
  return c.map(l2s);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const hexes = { CRIM: 0xc4342f, VERM: 0xc1382e, TEAL: 0x2aa9a0, GOLD: 0xf0b429, WHITE: 0xf6f2e8, LEAF_B: 0xd8392f };
  for (const [n, h] of Object.entries(hexes)) {
    const row = [0.15, 0.3, 0.5, 0.8, 1.2, 1.8, 2.6, 3.4].map(k => `k=${k}:(${grade(h, k).join(',')})`);
    console.log(n.padEnd(7), row.join(' '));
  }
}
