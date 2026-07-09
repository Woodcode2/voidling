/**
 * lineupDebug.ts — Prompt 19 Stage 0: ?debug=lineup overlay.
 *
 * Shows every clay cutout at in-game scale, grouped by category, with a
 * reference row (void / person / car / house / skyscraper) at the top.
 * Scroll with the mouse wheel.
 */

import { objectSprites, spriteAspect } from './sprites';
import { clayPeopleKeys, clayVehicleKeys } from './clayLife';
import {
  clayHouseKeys, claySkyscraperKeys,
  clayHouseFancyKeys, clayHouseCottageKeys,
} from './clayCity';
import { SCENERY_FOREST, SCENERY_PARK, SCENERY_BEACH } from './clayScenery';
import { clayZooKeys } from './clayZoo';
import { clayFoodKeys } from './clayFood';
import { clayAirportKeys } from './clayAirport';
import { clayMilitaryKeys } from './clayMilitary';

// Scroll state (accumulated wheel delta, clamped ≥ 0).
let _scrollY = 0;

export function lineupScroll(dy: number): void {
  _scrollY = Math.max(0, _scrollY + dy * 0.7);
}
export function lineupScrollReset(): void { _scrollY = 0; }

// ─── Row builder ─────────────────────────────────────────────────────────────

interface LineupRow { label: string; items: Array<{ key: string; r: number }>; }

function buildRows(): LineupRow[] {
  const rows: LineupRow[] = [];

  if (clayPeopleKeys.length > 0) {
    rows.push({
      label: 'PEOPLE (clay_person_0..11)',
      items: clayPeopleKeys.map((k) => ({ key: k, r: 32 })),
    });
  }
  if (clayVehicleKeys.length > 0) {
    rows.push({
      label: 'VEHICLES (clay_vehicle_0..14)',
      items: clayVehicleKeys.map((k) => ({ key: k, r: 55 })),
    });
  }
  if (clayHouseFancyKeys.length > 0) {
    rows.push({
      label: 'HOUSES — fancy (clay_house2_0..7)',
      items: clayHouseFancyKeys.map((k) => ({ key: k, r: 100 })),
    });
  }
  if (clayHouseCottageKeys.length > 0) {
    rows.push({
      label: 'HOUSES — cottage (clay_house2_8..15)',
      items: clayHouseCottageKeys.map((k) => ({ key: k, r: 80 })),
    });
  }
  // Legacy/merged house keys not covered above
  const covered = new Set([...clayHouseFancyKeys, ...clayHouseCottageKeys]);
  const legacyH = clayHouseKeys.filter((k) => !covered.has(k));
  if (legacyH.length > 0) {
    rows.push({ label: 'HOUSES — legacy', items: legacyH.map((k) => ({ key: k, r: 90 })) });
  }
  if (claySkyscraperKeys.length > 0) {
    rows.push({
      label: 'SKYSCRAPERS / DOWNTOWN',
      items: claySkyscraperKeys.map((k) => ({ key: k, r: 200 })),
    });
  }
  if (SCENERY_FOREST.length > 0) {
    rows.push({
      label: 'NATURE (clay_nature_0..15)',
      items: SCENERY_FOREST.map((d) => ({ key: d.key, r: d.rMin })),
    });
  }
  if (SCENERY_PARK.length > 0) {
    rows.push({
      label: 'PARK (clay_park_0..15)',
      items: SCENERY_PARK.map((d) => ({ key: d.key, r: d.rMin })),
    });
  }
  if (SCENERY_BEACH.length > 0) {
    rows.push({
      label: 'BEACH (clay_beach_0..11)',
      items: SCENERY_BEACH.map((d) => ({ key: d.key, r: d.rMin })),
    });
  }
  const zooFilled = clayZooKeys.filter(Boolean);
  if (zooFilled.length > 0) {
    rows.push({
      label: 'ZOO ANIMALS (clay_zoo_0..11)',
      items: zooFilled.map((k) => ({ key: k, r: 42 })),
    });
  }
  const foodFilled = clayFoodKeys.filter(Boolean);
  if (foodFilled.length > 0) {
    rows.push({
      label: 'FOOD / STREET FURNITURE (clay_food_0..11)',
      items: foodFilled.map((k) => ({ key: k, r: 24 })),
    });
  }
  const airportFilled = clayAirportKeys.filter(Boolean);
  if (airportFilled.length > 0) {
    rows.push({
      label: 'AIRPORT (clay_airport_0..7)',
      items: airportFilled.map((k) => ({ key: k, r: 60 })),
    });
  }
  const milFilled = clayMilitaryKeys.filter(Boolean);
  if (milFilled.length > 0) {
    rows.push({
      label: 'MILITARY (clay_military_0..5)',
      items: milFilled.map((k) => ({ key: k, r: 70 })),
    });
  }

  return rows;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CELL_W   = 120;  // px per sprite cell (screen pixels)
const ROW_PAD  = 10;
const LABEL_H  = 24;
const TITLE_H  = 44;
const REF_H    = 210;
const REF_SCALE = 0.75; // screen-px per world unit in the reference row

// ─── Main draw entry point ────────────────────────────────────────────────────

export function drawLineup(
  ctx: CanvasRenderingContext2D,
  fw: number,
  fh: number,
): void {
  ctx.save();

  // Background
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, fw, fh);

  // ── Title bar (fixed, not scrolled) ─────────────────────────────────────────
  ctx.fillStyle = '#1a1830';
  ctx.fillRect(0, 0, fw, TITLE_H);
  ctx.fillStyle = '#e0daf5';
  ctx.font = 'bold 16px Fredoka, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('?debug=lineup  — VOIDLING clay sprite lineup  |  all categories at in-game scale', 14, TITLE_H / 2);
  ctx.fillStyle = '#7070a0';
  ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('mouse wheel to scroll', fw - 14, TITLE_H / 2);

  // ── Scrollable content ───────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath(); ctx.rect(0, TITLE_H, fw, fh - TITLE_H); ctx.clip(); // mask below title
  ctx.translate(0, TITLE_H - _scrollY);

  let curY = ROW_PAD;

  // ── Reference row ────────────────────────────────────────────────────────────
  {
    ctx.fillStyle = '#1c1b2e';
    ctx.fillRect(0, curY, fw, REF_H);
    ctx.fillStyle = '#6864a0';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('REFERENCE ROW — relative in-game scale', 12, curY + 4);

    const refs: Array<{ label: string; r: number; key: string | null; fallbackColor?: string }> = [
      { label: 'void s1',    r: 18,  key: null,                                fallbackColor: '#7c3af2' },
      { label: 'person',     r: 32,  key: clayPeopleKeys[0] ?? null },
      { label: 'car',        r: 55,  key: clayVehicleKeys[0] ?? null },
      { label: 'house',      r: 100, key: clayHouseCottageKeys[0] ?? clayHouseKeys[0] ?? null },
      { label: 'skyscraper', r: 200, key: claySkyscraperKeys[0] ?? null },
    ];

    let rx = 80;
    const baseY = curY + REF_H - 28; // foot line

    for (const ref of refs) {
      const r = ref.r * REF_SCALE;
      const asr = (ref.key ? spriteAspect.get(ref.key) : null) ?? 1;
      const dH = r * 2, dW = dH * asr;
      const spriteImg = ref.key ? objectSprites.get(ref.key) : null;

      if (spriteImg) {
        ctx.drawImage(spriteImg as CanvasImageSource, rx - dW / 2, baseY - dH, dW, dH);
      } else {
        ctx.fillStyle = ref.fallbackColor ?? '#666';
        ctx.beginPath();
        ctx.arc(rx, baseY - r, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.ellipse(rx, baseY + 3, r * 0.85 * Math.min(asr * 1.1, 1.7), r * 0.20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Labels
      ctx.fillStyle = '#aaaacc'; ctx.font = '11px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(ref.label, rx, baseY + 6);
      ctx.fillStyle = '#5a5a80';
      ctx.fillText(`r=${ref.r}`, rx, baseY + 19);

      rx += Math.max(dW + 28, 60);
    }

    curY += REF_H + ROW_PAD * 2;
  }

  // ── Category rows ─────────────────────────────────────────────────────────────
  const rows = buildRows();
  for (const row of rows) {
    // Section label strip
    ctx.fillStyle = '#2e2b4a';
    ctx.fillRect(0, curY, fw, LABEL_H);
    ctx.fillStyle = '#b0a8e0';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(row.label, 10, curY + LABEL_H / 2);
    curY += LABEL_H + ROW_PAD;

    let cellX = ROW_PAD;
    let rowMaxH = 0;

    for (const { key, r } of row.items) {
      const spriteImg = objectSprites.get(key);
      const asr = spriteAspect.get(key) ?? 1;
      const dH = r * 2, dW = dH * asr;

      // Scale so the taller dimension fits in CELL_W-10
      const scale = Math.min(1.0, (CELL_W - 12) / Math.max(dW, dH, 1));
      const sdH = dH * scale, sdW = dW * scale;
      const cellH = sdH + 28; // sprite + shadow + two label lines
      rowMaxH = Math.max(rowMaxH, cellH);

      const footY = curY + sdH;

      if (spriteImg) {
        ctx.drawImage(
          spriteImg as CanvasImageSource,
          cellX + (CELL_W - sdW) / 2, footY - sdH, sdW, sdH,
        );
      } else {
        // Placeholder for unloaded sprite
        ctx.fillStyle = 'rgba(90,90,130,0.25)';
        ctx.fillRect(cellX + (CELL_W - sdW) / 2, footY - sdH, sdW, sdH);
        ctx.fillStyle = '#555'; ctx.font = '9px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('…', cellX + CELL_W / 2, footY - sdH / 2);
      }

      // Shadow ellipse
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(cellX + CELL_W / 2, footY + 2, sdW * 0.46, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Key label
      ctx.fillStyle = '#6868a0';
      ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const shortKey = key.replace(/^clay_/, '').slice(0, 16);
      ctx.fillText(shortKey, cellX + CELL_W / 2, footY + 5);
      ctx.fillStyle = '#484870';
      ctx.fillText(`r=${r}`, cellX + CELL_W / 2, footY + 15);

      cellX += CELL_W;
      if (cellX + CELL_W > fw - ROW_PAD) {
        cellX = ROW_PAD;
        curY += rowMaxH + ROW_PAD;
        rowMaxH = 0;
      }
    }
    if (cellX > ROW_PAD) { curY += rowMaxH + ROW_PAD; }
    curY += ROW_PAD * 2;
  }

  // Hint at the bottom of content
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(`↕ scroll  ·  total ≈${Math.round(curY + _scrollY)}px`, fw / 2, curY + 20);

  ctx.restore(); // pop scroll clip
  ctx.restore(); // pop everything
}
