---
name: VOIDLING Prompt 16 Population Rebuild
description: New clay art for zoo, airport, and military reserved zones; photo mode populated-world fix; military sheet is 3x2, not 4x2.
---

- Zoo, airport, and military reserved zones are populated from new clay sheets: `zoo_clay_sheet.png` (4×3 grid), `airport_clay_sheet.png` (4×2 grid), `military_clay_sheet.png` (3×2 grid).
- New ObjectKind entries were added for zoo animals, airport set, and `radar_van`. They are treated as living/eatable and excluded from win math like people.
- Photo mode now builds a fresh, fully populated `WorldManager`, passes its lots to `setMatchLots()`, resets the ground cache, and restores the live round's lots after capture so the active round is not affected.
- `armored_humvee` phase-2 defense spawns are explicitly mapped to the `radar_van` clay cutout so every defense-wave kind is covered by the new clay army pool.
- Idle military pad units are NOT flagged as `defense`; they are decorative staging only. Defense waves still use the same timing/counts in `spawnDefenseWave()`.
- The old `military_sheet.png` loader was removed from `wardSprites.ts` and is no longer referenced in code.
- A `ZOO OFF-BLOCK` audit line was added to the existing audit block.

**Why:** The connected-component cutter assigns sprites to grid cells based on the physical sheet layout. The military sheet is actually arranged as 3 columns × 2 rows, so a 4×2 grid left two cells empty and would have misassigned cutouts. Using 3×2 matches the art and gives the intended 6 clay units (tank, helicopter, jeep, rocket truck, radar van, soldier).

**How to apply:** When adding new clay sheets for reserved zones, measure the component layout (or inspect the extraction log) before choosing grid dimensions. If the prompt says "about N" cutouts, verify the grid against the actual sheet rather than guessing a power-of-two layout. Always keep the `defense` flag only on true wave units, and restore global ground/lot state after photo-mode throwaway renders.