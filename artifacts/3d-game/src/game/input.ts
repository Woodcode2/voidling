// Relative-drag virtual joystick. Pointer Events only (no touch/mouse duplicates),
// with pointer capture so a drag can't be lost off the canvas.
// The voidling is NEVER under the finger: the anchor is wherever the touch starts,
// and movement is driven by the anchor -> current vector.
import { CONFIG } from './config';
import { clamp } from './utils';

export interface JoystickState {
  active: boolean;
  anchorX: number;
  anchorY: number;
  curX: number;
  curY: number;
  dirX: number;
  dirY: number;
  mag: number; // 0..1
}

export function createJoystick(canvas: HTMLCanvasElement) {
  const state: JoystickState = {
    active: false, anchorX: 0, anchorY: 0, curX: 0, curY: 0, dirX: 0, dirY: 0, mag: 0,
  };
  let enabled = false;
  let pointerId: number | null = null;

  function coords(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function reset() {
    state.active = false;
    state.mag = 0;
    state.dirX = 0;
    state.dirY = 0;
    pointerId = null;
  }

  function onDown(e: PointerEvent) {
    if (!enabled) return;
    if (pointerId !== null) return; // one finger controls
    e.preventDefault();
    pointerId = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const c = coords(e);
    state.active = true;
    state.anchorX = state.curX = c.x;
    state.anchorY = state.curY = c.y;
    state.dirX = state.dirY = 0;
    state.mag = 0;
  }

  function onMove(e: PointerEvent) {
    if (!state.active || e.pointerId !== pointerId) return;
    e.preventDefault();
    const c = coords(e);
    state.curX = c.x;
    state.curY = c.y;
    const dx = c.x - state.anchorX;
    const dy = c.y - state.anchorY;
    const d = Math.hypot(dx, dy);
    state.mag = clamp(d / CONFIG.JOYSTICK_MAX_DIST, 0, 1);
    if (d > 0.001) {
      state.dirX = dx / d;
      state.dirY = dy / d;
    }
    // if the finger wanders far, let the anchor follow so control stays comfortable
    if (d > CONFIG.JOYSTICK_MAX_DIST * 1.6) {
      state.anchorX = c.x - state.dirX * CONFIG.JOYSTICK_MAX_DIST * 1.6;
      state.anchorY = c.y - state.dirY * CONFIG.JOYSTICK_MAX_DIST * 1.6;
    }
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    reset();
  }

  canvas.addEventListener('pointerdown', onDown, { passive: false });
  canvas.addEventListener('pointermove', onMove, { passive: false });
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  return {
    state,
    setEnabled(v: boolean) {
      enabled = v;
      if (!v) reset();
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    },
  };
}
