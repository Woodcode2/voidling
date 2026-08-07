// ══ HAT GEOMETRY ═══════════════════════════════════════════════════════════
//
// Every hat in the shop, built from primitives. No downloads, no GLB, nothing
// that can arrive after the child has looked away — the whole wardrobe is a
// few kilobytes of source.
//
// ── THE SPACE ──────────────────────────────────────────────────────────────
// UNIT-ORB SPACE. The void's body is a sphere of radius 1 at the origin, +Y is
// up, +Z is the way the face looks.
//
// ── THE TWO RULES THAT ARE NOT STYLE ──────────────────────────────────────
//
// 1. CLEARANCE >= 1.22. The body is displaced in its own vertex shader —
//    jelly wobble plus an event-horizon churn that grows with the form:
//      p *= 1.0 + wob * (0.012 + uWobble * 0.06) + churn * 0.022 * (uStage - 1)
//    with |wob| <= 1.6 and |churn| <= 1.0, so the surface reaches r = 1.18 on
//    a chomp at WORLD ENDER. uWobble is driven to 1 on every meaningful bite,
//    which is to say constantly. Anything meant to look WORN must keep its
//    visible mass outside 1.22 or the void will swallow its own hat, on the
//    exact frame the child is watching. Anything meant to look strapped on
//    goes inside 0.85 so it is never caught half-in.
//
// 2. NOTHING IN FRONT OF THE FACE. The eyes sit near y=+0.25, z=+0.95 and the
//    brows reach y=+0.55. A brim may push forward but must stay above y=1.15
//    wherever it crosses z > 0.6. The face is the character; a hat that covers
//    it is a hat that deletes the thing the child is attached to.
//
// Segment counts stay low on purpose. This is a chunky toy-diorama style and
// a hat is forty pixels tall in play — a 32-segment cylinder spends its
// budget somewhere nobody is looking.
import * as THREE from 'three';

/** flat, hard-edged: architecture, brims, buckles */
const flat = (color: number, roughness = 0.62, metalness = 0)
  : THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
/** smooth: anything soft, round or inflated */
const soft = (color: number, roughness = 0.7, metalness = 0)
  : THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness, metalness });
/** it glows: gems, stars, lights. Emissive does the work, not the albedo. */
const glow = (color: number, i = 1.1): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.3, metalness: 0.2 });

// ── THE FREE ONE ───────────────────────────────────────────────────────────
// The reference implementation, and deliberately the simplest thing in here: a
// cone, a frill, a pompom. Its job is to teach a child that the void's head is
// a place where things go, in one glance, at thumbnail size. Everything else
// in the shop is competing with it.
function buildParty(): THREE.Group {
  const g = new THREE.Group();
  const PINK = 0xff3d93, ROSE = 0xff8cc4, CREAM = 0xfff3d6, CYAN = 0x2fd3f0;

  // ── THE CAP IS THE BRIM, AND IT IS A SPHERE SEGMENT ─────────────────────
  // Two renders taught this. Anything that TOUCHES the head sits at distance
  // 1.0, which is inside the 1.22 the body's jelly reaches — so every hat in
  // this game has to float slightly. A flat ring at the pole floats visibly
  // and reads as a hula hoop (that is exactly what the first attempt looked
  // like). A sphere segment CONCENTRIC with the body floats by the same
  // amount everywhere, so the gap reads as fit rather than as hover, and the
  // clearance is the radius itself — one number, true at every vertex.
  // …AND IT REACHES DOWN FAR ENOUGH TO BECOME A BRIM. At a narrow sweep the
  // segment is a skullcap hovering over the pole and the 0.27 gap is plainly
  // visible as air. Carried down to ~55 degrees the rim lands where the body's
  // own silhouette has already fallen away, so the same gap now reads as the
  // flare UNDER a brim — which is what a party hat has anyway. Two-sided
  // because the underside of a brim is a face the play camera sees.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.27, 30, 14, 0, Math.PI * 2, 0, 0.96),
    soft(CREAM, 0.68));
  (cap.material as THREE.Material).side = THREE.DoubleSide;
  g.add(cap);
  // a rolled edge, so the brim has thickness instead of ending in paper
  // sat on a slightly LARGER sphere than the cap so its own tube still clears
  // 1.22 — the roll was the only thing on this hat the check ever flagged
  const RR = 1.34, PHI = 0.96;
  const roll = new THREE.Mesh(new THREE.TorusGeometry(RR * Math.sin(PHI), 0.062, 8, 30),
    soft(ROSE, 0.6));
  roll.rotation.x = Math.PI / 2; roll.position.y = RR * Math.cos(PHI); g.add(roll);

  // the cone, sitting on the cap
  const H = 1.32, BASE = 1.12, R = 0.6;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(R, H, 22, 1, true), soft(PINK, 0.5));
  cone.position.y = BASE + H / 2; g.add(cone);

  // ── BANDS ARE FRUSTA, NOT CONES ─────────────────────────────────────────
  // ConeGeometry tapers to a POINT, so a "stripe" built from one is a little
  // spike buried inside the hat — which is why the first version rendered with
  // no stripes at all on a hat whose entire visual idea is stripes. A band has
  // two radii. Each sits 0.015 proud of the cone's own profile so it cannot
  // z-fight, and the profile is just linear interpolation up the cone.
  const rAt = (y: number) => R * (1 - (y - BASE) / H);
  const band = (y0: number, hgt: number, col: number) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rAt(y0 + hgt) + 0.015, rAt(y0) + 0.015, hgt, 22, 1, true),
      soft(col, 0.45));
    m.position.y = y0 + hgt / 2; g.add(m);
  };
  band(1.20, 0.26, CREAM);
  band(1.62, 0.24, CYAN);
  band(2.00, 0.20, ROSE);

  // …and the one piece of delight: a fat pompom, seated ON the tip
  const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), soft(CYAN, 0.5));
  pom.position.y = BASE + H - 0.06; g.add(pom);

  // JAUNTY. A party hat standing dead vertical is a traffic cone. Tilted back
  // and to one side is how paper actually sits on a head, and the asymmetry is
  // what makes the silhouette readable at thumbnail size.
  g.rotation.set(0.06, 0, -0.15);
  return g;
}

type Builder = () => THREE.Group;
const BUILDERS: Record<string, Builder> = {
  party: buildParty,
};

/** Register a hat builder. hatgeo keeps them in one table so void3d can build
 *  lazily and the shop preview can reuse the identical geometry. */
export function registerHat(id: string, build: Builder): void { BUILDERS[id] = build; }

/** Build a hat by id. Returns an empty group for an unknown id rather than
 *  throwing — a shop card for a hat that has lost its geometry should be a
 *  bare void, not a crashed game. */
export function buildHat(id: string): THREE.Group {
  const b = BUILDERS[id];
  if (!b) { console.warn(`VOIDLING: no geometry for hat "${id}"`); return new THREE.Group(); }
  return b();
}

export { flat as hatFlat, soft as hatSoft, glow as hatGlow };
