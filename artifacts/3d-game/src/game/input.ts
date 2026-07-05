// v14 §3 — Minimum-latency joystick.
// • Uses `pointerrawupdate` where supported (falls back to `pointermove`) and
//   processes ALL coalesced events per callback so zero input samples are dropped.
// • 2 px deadband kills micro-jitter without adding any perceptible lag.
// • All listeners that call preventDefault are registered { passive: false }.
// • Velocity prediction is handled in the render path (engine.ts) not here.
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

// 2px deadband (in canvas CSS pixels): below this the joystick doesn't register
const DEADBAND = 2;

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

  function processMove(cx: number, cy: number) {
    state.curX = cx;
    state.curY = cy;
    const dx = cx - state.anchorX;
    const dy = cy - state.anchorY;
    const d = Math.hypot(dx, dy);
    // 2px deadband — ignore micro-jitter without adding lag
    if (d < DEADBAND) {
      state.mag = 0;
      return;
    }
    state.mag = clamp(d / CONFIG.JOYSTICK_MAX_DIST, 0, 1);
    state.dirX = dx / d;
    state.dirY = dy / d;
    // if the finger wanders far, let the anchor follow so control stays comfortable
    if (d > CONFIG.JOYSTICK_MAX_DIST * 1.6) {
      state.anchorX = cx - state.dirX * CONFIG.JOYSTICK_MAX_DIST * 1.6;
      state.anchorY = cy - state.dirY * CONFIG.JOYSTICK_MAX_DIST * 1.6;
    }
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

  // Process all coalesced events so no input samples are dropped between frames.
  // This matters on high-refresh-rate screens where multiple move events coalesce.
  function onMove(e: PointerEvent) {
    if (!state.active || e.pointerId !== pointerId) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    // getCoalescedEvents() is available in all modern browsers; fall back gracefully
    const events: PointerEvent[] = (e.getCoalescedEvents?.() ?? null) || [e];
    for (const ev of events) {
      processMove(ev.clientX - r.left, ev.clientY - r.top);
    }
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    reset();
  }

  // Use pointerrawupdate where available for minimum latency (fires before frame,
  // before display compositor, no coalescing delay). Fall back to pointermove.
  const moveEvent = (typeof window !== 'undefined' && 'onpointerrawupdate' in window)
    ? 'pointerrawupdate'
    : 'pointermove';

  canvas.addEventListener('pointerdown', onDown, { passive: false });
  canvas.addEventListener(moveEvent, onMove as EventListener, { passive: false });
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  // Also keep pointermove as backup if using pointerrawupdate (different event)
  if (moveEvent === 'pointerrawupdate') {
    canvas.addEventListener('pointermove', onMove, { passive: false });
  }

  console.log(`[input] using ${moveEvent} + coalesced events, 2px deadband`);

  return {
    state,
    setEnabled(v: boolean) {
      enabled = v;
      if (!v) reset();
    },
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener(moveEvent, onMove as EventListener);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      if (moveEvent === 'pointerrawupdate') {
        canvas.removeEventListener('pointermove', onMove);
      }
    },
  };
}
