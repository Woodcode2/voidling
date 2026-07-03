// Shared canvas helpers for the "crisp HD sticker" look:
// saturated fill + 3px white outline + hard offset shadow (4px down, no blur) + highlight.
import { CONFIG } from './config';

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

interface StickerOpts {
  outline?: number;   // outline width; 0 to skip
  shadow?: boolean;   // hard offset shadow
  outlineColor?: string;
}

// Draw a path (built by `path`) as a sticker. `path` should NOT call beginPath.
export function sticker(
  ctx: CanvasRenderingContext2D,
  path: (c: CanvasRenderingContext2D) => void,
  fill: string,
  opts: StickerOpts = {}
) {
  const { outline = 3, shadow = true, outlineColor = CONFIG.COLORS.outline } = opts;
  if (shadow) {
    ctx.save();
    ctx.translate(0, 4);
    ctx.fillStyle = CONFIG.COLORS.shadow;
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  path(ctx);
  ctx.fill();
  if (outline > 0) {
    ctx.lineWidth = outline;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = outlineColor;
    ctx.beginPath();
    path(ctx);
    ctx.stroke();
  }
}

export function stickerCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, fill: string, opts: StickerOpts = {}
) {
  sticker(ctx, (c) => c.arc(x, y, r, 0, Math.PI * 2), fill, opts);
}

export function stickerEllipse(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number, fill: string,
  rot = 0, opts: StickerOpts = {}
) {
  sticker(ctx, (c) => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2), fill, opts);
}

// A soft two-tone highlight blob (upper-left sheen). Draw AFTER the fill.
export function highlight(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, alpha = 0.35
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.6, r * 0.4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Simple filled circle (no sticker treatment) — for tiny details.
export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
