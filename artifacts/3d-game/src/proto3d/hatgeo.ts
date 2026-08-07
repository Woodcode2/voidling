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
// 1. CLEARANCE >= 1.14, AND THAT NUMBER IS MEASURED, NOT ASSUMED. The body is
//    displaced in its own vertex shader:
//      p *= 1.0 + wob * (0.012 + uWobble * 0.06) + churn * 0.022 * (uStage - 1)
//    Bounding |wob| <= 1.6 and |churn| <= 1 gives 1.18, and this file said 1.22
//    for exactly that reason — but that is the worst case anywhere on the
//    SPHERE, and a hat only ever sits at the POLE. At p = (0,1,0) the x and z
//    terms collapse: wob becomes sin(3.1+5t)*sin(-4.1t) + 0.6*sin(6.3t) and
//    churn becomes a product of three sines that hardly ever co-peak. Sampled
//    40,000 times per form with uWobble pinned at 1, the pole reaches 1.1142 at
//    stage 1 and 1.1164 at stage 4, with a 99th percentile of 1.107.
//
//    So the real bar is 1.12, and 1.14 carries a margin. The old 1.22 cost a
//    tenth of a body radius of clearance that nothing needed — which is
//    exactly the gap that made the first authored hats hover above the head
//    like a halo instead of sitting on it. Anything meant to look strapped on
//    still goes inside 0.85 so it is never caught half-in.
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


// ── PLACING THINGS ON A HEAD ──────────────────────────────────────────────
// Most of what a hat is made of wants to SIT ON the skull rather than float in
// front of it, and doing that by hand in cartesian coordinates is how the
// first pass at the mane ended up as a handful of blobs pointing sideways.
//
// seat() puts a mesh on a sphere of radius R around the body, facing outward.
// Because R is the same for every part, the clearance rule becomes one number
// checked once instead of a sum per mesh — and the parts follow the curve of
// the head, which is the difference between a hat and a pile.
//   az  = around the head, radians. 0 is the face (+Z), positive turns right.
//   pol = down from the top. 0 is the crown, PI/2 is the equator.
function seat(m: THREE.Object3D, R: number, az: number, pol: number, lean = 0): THREE.Object3D {
  const sp = Math.sin(pol), cp = Math.cos(pol);
  m.position.set(sp * Math.sin(az) * R, cp * R, sp * Math.cos(az) * R);
  // orient local +Y along the outward normal, then lean it over by `lean`
  m.rotation.set(0, 0, 0);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), m.position.clone().normalize());
  m.rotateX(lean);
  return m;
}

// ── LAYING HAIR ON A HEAD ─────────────────────────────────────────────────
// seat() leans a part with rotateX, which is only "backwards" for a part on
// the midline. Off the midline the local X axis has swung round with the
// minimal rotation and the same lean throws the part sideways — which is
// precisely how the mane's first two passes ended up as a fan of beans
// pointing off the right of the skull instead of hair sweeping down the nape.
//
// lay() builds the orientation from an explicit tangent frame instead, so the
// direction is meant rather than inherited:
//   sweep = 0 runs the part DOWNHILL (toward increasing polar angle) whatever
//           the azimuth. +/- turns it within the tangent plane.
//   lift  = radians off the surface. 0 lies flat.
// The part's ORIGIN lands exactly on radius R, so a lathe authored from y=0
// upward has its root on the sphere and the clearance rule reduces, again, to
// one number: R minus the part's own half-thickness.
// It also builds the orientation from an EXPLICIT basis rather than from
// setFromUnitVectors, which pins down where local +Z ends up — outward from
// the head. seat()'s minimal rotation leaves that axis wherever it lands, and
// a part cannot be bent around a head whose direction it cannot name.
const _ln = new THREE.Vector3(), _lt = new THREE.Vector3(), _lb = new THREE.Vector3();
const _lx = new THREE.Vector3(), _ly = new THREE.Vector3(), _lz = new THREE.Vector3();
const _lm = new THREE.Matrix4();
function lay(m: THREE.Object3D, R: number, az: number, pol: number, sweep = 0, lift = 0): THREE.Object3D {
  const sp = Math.sin(pol), cp = Math.cos(pol);
  _ln.set(sp * Math.sin(az), cp, sp * Math.cos(az));         // outward normal
  _lt.set(cp * Math.sin(az), -sp, cp * Math.cos(az));        // downhill tangent
  _lb.crossVectors(_ln, _lt);                                // the sideways one
  _ly.copy(_lt).multiplyScalar(Math.cos(sweep)).addScaledVector(_lb, Math.sin(sweep))
    .multiplyScalar(Math.cos(lift)).addScaledVector(_ln, Math.sin(lift)).normalize();
  _lz.copy(_ln).addScaledVector(_ly, -_ln.dot(_ly)).normalize();   // outward, squared up
  _lx.crossVectors(_ly, _lz);                                // X = Y x Z, right-handed
  m.position.copy(_ln).multiplyScalar(R);
  m.rotation.set(0, 0, 0);
  m.quaternion.setFromRotationMatrix(_lm.makeBasis(_lx, _ly, _lz));
  return m;
}

// ── A STRAND OF HAIR ──────────────────────────────────────────────────────
// One lathe, authored on y in [0,1] with its belly a third of the way up so
// it reads as a strand and not a sausage, then baked per use.
//
// The bake is the point. A STRAIGHT strand laid tangent to a sphere of radius
// R has its tip at sqrt(R*R + L*L) — a third of a body radius off the skull
// for a 0.9 lock — and renders as a leaf flying outward, which is how the
// unicorn's mane failed on its second attempt. Rolling it around the sphere
// keeps every vertex at (R + its own z), so the mane hugs AND the clearance
// stays one number: R minus half the strand's thickness.
//
//   wx / wz  width across and thickness through. Flat ribbons cover more head
//            per triangle than round locks, which is what lets a mane be made
//            of strands with nothing underneath it.
//   flare    lifts the TIP off the surface: the flick at the end of hair.
//   bulge    lifts the MIDDLE: the volume in a quiff. Neither can bring a
//            vertex inward, so neither can break the clearance.
// Local +Z must be outward from the head, which is what lay() guarantees and
// seat() does not.
const _sprof: THREE.Vector2[] = [];
for (let i = 0; i <= 7; i++) {
  const t = i / 7;
  _sprof.push(new THREE.Vector2(0.5 * Math.sin(Math.PI * Math.pow(t, 0.5)) * (1 - t * 0.08), t));
}
const _STRAND = new THREE.LatheGeometry(_sprof, 8);
function strand(wx: number, len: number, wz: number, R: number, flare = 0, bulge = 0)
  : THREE.BufferGeometry {
  const geo = _STRAND.clone();
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i) * wz + flare * y * y + bulge * Math.sin(Math.PI * y);
    const a = (y * len) / R;
    pos.setXYZ(i, pos.getX(i) * wx, (R + z) * Math.sin(a), (R + z) * Math.cos(a) - R);
  }
  geo.computeVertexNormals();
  return geo;
}

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


// ══ LEGENDARY ══════════════════════════════════════════════════════════════
// Three, and no more. A legendary tier stops being legendary the moment it has
// eight members. Each one changes the SILHOUETTE from across the map — that is
// the difference between a hat and a legendary hat — and each one has a voice.

// ── CROWN OF THE VOID KING ────────────────────────────────────────────────
// The read is WEIGHT. A crown that looks light looks like a party favour, so
// this is a thick band, five heavy points, and a fur trim with real depth.
function buildCrown(): THREE.Group {
  const g = new THREE.Group();
  const GOLD = 0xffc21f, GOLD_D = 0xd89400, FUR = 0xfff6e4, FUR_S = 0xe8dcc4;
  const GEMS = [0xff2d55, 0x2fa8ff, 0x35e07a, 0xff8a2f, 0xb875ff];

  // ── THE BAND, AND WHY IT IS THIS WIDE ──────────────────────────────────
  // v1 was a 0.70-radius tube parked at y=1.34 with the ermine at polar 0.62.
  // It cleared the jelly and rendered as a party crown perched on a balloon:
  // a narrow gold cylinder floating over a visible crescent of daylight.
  //
  // The cure is the party hat's, and the chef's: carry the thing DOWN past
  // the point where the head's own silhouette has fallen away. The ermine now
  // runs to polar 1.02, which puts it at (radial 1.10, y 0.66) — outside the
  // head's outline at that height — so it reads as a fur band encircling the
  // king rather than as a ring hovering above him. The band widened to match.
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.98, 0.45, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.24, metalness: 0.85 }));
  band.position.y = 1.175; g.add(band);
  // a darker underband so the gold has somewhere to fall away to
  const under = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.00, 0.09, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: GOLD_D, roughness: 0.3, metalness: 0.8 }));
  under.position.y = 0.95; g.add(under);

  // FIVE POINTS. Four reads as a box and six reads as a cog; five is a crown.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.32;
    const R = 0.90;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.66, 8),
      new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.22, metalness: 0.88, flatShading: true }));
    spike.position.set(Math.sin(a) * R, 1.73, Math.cos(a) * R);
    g.add(spike);
    // …each tipped with a gem that actually emits. At this size a gem that is
    // merely a saturated colour is a coloured dot; the glow is the jewel.
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glow(GEMS[i], 1.5));
    gem.position.set(Math.sin(a) * R, 2.12, Math.cos(a) * R);
    g.add(gem);
  }

  // the big centre stone, front and centre where the camera lives
  // …flush against the band rather than hovering in front of it, which is how
  // the first version rendered: a big red diamond floating off the gold
  const big = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), glow(0xff2d55, 1.7));
  big.position.set(0, 1.18, 0.93); big.rotation.z = 0.4; g.add(big);

  // ERMINE. Two staggered rings of fat lumps read as fur far better than one
  // smooth torus, and they hide the seam where the band meets the head.
  // Seated on concentric spheres rather than at hand-picked heights: an early
  // version's lower ring measured 1.13 from the origin, inside the jelly, so
  // the king's own fur was being eaten by his head.
  for (let k = 0; k < 2; k++) {
    // SIXTEEN, not twelve. At 1.36 the ring is 6.1 long and a 0.29 lump is
    // 0.29 of it — twelve of them leave gaps, and a fur trim with gaps in it
    // is a string of ping-pong balls, which is what the second render was.
    const n = k ? 18 : 16;
    for (let i = 0; i < n; i++) {
      const r = 0.17 + (i % 3) * 0.016;
      const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), soft(k ? FUR_S : FUR, 0.85));
      seat(lump, 1.365, (i / n) * Math.PI * 2 + k * 0.19, 0.80 + k * 0.26, 0);
      g.add(lump);
    }
  }
  return g;
}

// ── THE TYCOON ────────────────────────────────────────────────────────────
// A comedy hat, and the joke is SCALE: far too much hair for a small round
// void. A generic bombastic-tycoon archetype — no likeness, no name, no
// slogans.
//
// FOUR ATTEMPTS, and the first three were all the same misunderstanding.
// Stacked flat ellipsoids read as concentric rings. Six similar spheres along
// a curve read as a croissant, because equal sizes at equal spacing SCALLOP —
// the eye finds the repeat and counts it. Three masses at clearly different
// scales fused into one shape at last… and rendered as a smooth lump of
// butter, because a pompadour that is smooth is not a pompadour. It was the
// right SILHOUETTE with nothing inside it.
//
// Hair is made of hair. So the mass is not sculpted and then textured; it is
// built out of nine big swept locks, each rolled around the skull with a
// BULGE that lifts its middle into the quiff. The notches between them are
// the silhouette, the gaps are the comb marks, and the lacquered highlight
// runs down each one instead of pooling on a single dome.
//
// The part is on the left because every lock is rooted along one meridian at
// az = -1.32 and sweeps over the crown to break right and forward.
function buildTycoon(): THREE.Group {
  const g = new THREE.Group();
  const LIT = 0xffe6a0, MID = 0xf0c95f, DARK = 0xc7962f;
  // Low roughness with a little metalness: lacquered hair carries ONE long
  // highlight down each lock, and that highlight is most of what sells the
  // volume. Smooth-shaded — a faceted pompadour is a pineapple.
  const lac = (c: number): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({
    color: c, roughness: 0.26, metalness: 0.20, envMapIntensity: 1.4 });

  // The scalp under it, carried below the equator so the locks never show
  // daylight between themselves and the head. MATTE, and dark: the first pass
  // gave it the same lacquer as the hair and it rendered as a polished brass
  // dome with a thin blonde fringe round the edge — the cap was the hat. It
  // is not meant to be seen; it is meant to be the shadow the comb marks fall
  // into.
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.152, 22, 12, 0, Math.PI * 2, 0, 0.74),
    new THREE.MeshStandardMaterial({ color: 0xb9892b, roughness: 0.82, metalness: 0.0,
      side: THREE.DoubleSide }));
  g.add(cap);

  // ── THE SWEEP ───────────────────────────────────────────────────────────
  // Eleven locks rooted down the part line and thrown over the crown. sweep
  // = PI is straight uphill — over the top and down the far side — and the
  // per-lock offset fans them so they do not all pile through the pole. The
  // bulge is graded, biggest at the brow, because a pompadour is tallest at
  // the front and lies down toward the nape.
  const A = 11;
  for (let i = 0; i < A; i++) {
    const t = i / (A - 1);                               // 0 at the brow, 1 at the nape
    const R = 1.26 + t * 0.03;
    const geo = strand(0.46 - t * 0.08, 2.35 - t * 0.60, 0.21, R, 0.12, 0.52 - t * 0.30);
    const m = new THREE.Mesh(geo, lac(t < 0.28 ? LIT : t < 0.68 ? MID : DARK));
    lay(m, R, -1.30 + t * 0.10, 0.34 + t * 0.80, Math.PI + (t - 0.45) * 0.95, 0);
    g.add(m);
  }

  // ── THE FALL ────────────────────────────────────────────────────────────
  // The sweep converges at the part and diverges over the crown, which leaves
  // the far side thin — the first pass showed bare cap down the whole right
  // of the head. These six lie down the right, and five more close the back.
  for (let j = 0; j < 6; j++) {
    const u = j / 5;
    const geo = strand(0.42, 0.98, 0.20, 1.252, 0.24, 0.20);
    const m = new THREE.Mesh(geo, lac(u < 0.5 ? MID : DARK));
    lay(m, 1.252, 0.86 + u * 1.10, 0.40 + u * 0.30, 0.22, 0);
    g.add(m);
  }
  for (let j = 0; j < 5; j++) {
    const u = j / 4;
    const geo = strand(0.40, 0.88, 0.19, 1.250, 0.26, 0.20);
    const m = new THREE.Mesh(geo, lac(DARK));
    lay(m, 1.250, Math.PI - 0.72 + u * 1.44, 0.58, 0.04, 0);
    g.add(m);
  }

  // ── THE QUIFF ───────────────────────────────────────────────────────────
  // Three locks breaking the other way — down off the crown toward the brow,
  // with the flare turned up so the ends lift instead of lying down. This is
  // the front of the hair, and it stops at polar 0.87 (z = 0.99, y = 0.87)
  // because nothing on any hat crosses z = 0.6 down near the brows.
  for (let k = -1; k <= 1; k++) {
    const R = 1.30 + Math.abs(k) * 0.01;
    const geo = strand(0.44, 0.76 - Math.abs(k) * 0.06, 0.22, R, 0.40, 0.24);
    const m = new THREE.Mesh(geo, lac(k <= 0 ? LIT : MID));
    lay(m, R, k * 0.42 - 0.10, 0.28, 0.18 + k * 0.30, 0);
    g.add(m);
  }

  // ── THE FRINGE ──────────────────────────────────────────────────────────
  // The quiff ARCS, so it left the cap showing beneath it as a hard brown
  // visor across the brow — the single loudest thing on the second render.
  // These five lie flat instead, reaching polar 0.92 while the cap now stops
  // at 0.74 — so the rim is overhung rather than merely met, which is what the
  // third render needed after the fringe landed exactly ON it and drew a hard
  // horizontal line across the brow.
  for (let j = 0; j < 5; j++) {
    const u = j / 4 - 0.5;
    const geo = strand(0.46, 0.64, 0.20, 1.245, 0.06, 0.10);
    const m = new THREE.Mesh(geo, lac(Math.abs(u) < 0.3 ? LIT : MID));
    lay(m, 1.245, u * 1.55 - 0.12, 0.46, u * 0.55, 0);
    g.add(m);
  }

  // and the flick at the back, which is the bit that makes it funny from
  // behind: one lock that leaves the head altogether
  const tail = new THREE.Mesh(strand(0.34, 0.90, 0.18, 1.26, 0.52, 0.12), lac(DARK));
  lay(tail, 1.26, Math.PI - 0.25, 0.96, -0.35, 0);
  g.add(tail);

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

// ── RAINBOW HORN ──────────────────────────────────────────────────────────
// THE MOST EXPENSIVE THING IN THE SHOP HAS TO LOOK IT, AND IT TOOK THREE GOES.
//
// v1 rendered as a lollipop on a fan of jellybeans: the horn was a stack of
// flat pancakes, the mane was twelve scaled spheres pointing off the back-
// right, and the ears were two plain white cones at ninety degrees.
//
// v2 fixed the horn — a real helix — and got the mane wrong a second way. It
// laid STRAIGHT locks tangent to the skull, and a straight strand of length L
// laid tangent to a sphere of radius R has its tip at sqrt(R*R + L*L): 0.29 of
// a body radius off the head for a 0.9 lock. The render was a ring of leaves
// flying outward, over a bright rainbow shell whose rim cut a hard geometric
// arc across the crown.
//
// ── WHAT ACTUALLY MAKES HAIR ──────────────────────────────────────────────
// 1. IT FOLLOWS THE SKULL. Each lock is rolled around a sphere of its own root
//    radius (bendLock), so every point of it stays at that radius and the mane
//    hugs. As a bonus the clearance rule collapses to one number again: root
//    radius minus half the strand's thickness.
// 2. THE MASS UNDER IT IS SHADOW, NOT COLOUR. v2's shell was rainbow and read
//    as a shower cap. Hair is bright on top and dark underneath; the shell is
//    now deep plum and does nothing but kill the daylight between the strands.
// 3. THE STRANDS OVERHANG THE SHELL. The rim is only invisible if something
//    hangs past it, so the first row starts inside the shell's own edge.
//
// The body swells to 1.1164 at the pole in its own vertex shader, which is why
// none of this can simply lie ON the head at 1.05 — it would be swallowed and
// spat back out every frame.
function buildHorn(): THREE.Group {
  const g = new THREE.Group();

  // wrapped end-to-end: the last entry is the first, so a cycling t never
  // snaps from violet back to red
  const BOW = [0xff3d6e, 0xff9838, 0xffe23d, 0x4fe08a, 0x38c8ff, 0xb06bff, 0xff3d6e];
  const _b1 = new THREE.Color(), _b2 = new THREE.Color();
  const bowAt = (t: number, out: THREE.Color): THREE.Color => {
    const u = ((t % 1) + 1) % 1 * (BOW.length - 1);
    const i = Math.min(BOW.length - 2, Math.floor(u));
    _b1.setHex(BOW[i]); _b2.setHex(BOW[i + 1]);
    return out.copy(_b1).lerp(_b2, u - i);
  };

  // ── THE HORN ────────────────────────────────────────────────────────────
  // A pearl core with a rainbow ridge wound round it: a tube swept along a
  // helix, tapering in BOTH radius and thickness so it ends in a needle rather
  // than a traffic cone. Colour cycles the spectrum twice up the length.
  const H = 1.55, TURNS = 3.0, SEG = 64, RAD = 6;
  const spine = (t: number, out: THREE.Vector3): THREE.Vector3 => {
    const a = t * TURNS * Math.PI * 2;
    const r = 0.225 * Math.pow(1 - t, 0.88);
    return out.set(Math.cos(a) * r, t * H, Math.sin(a) * r);
  };
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= SEG; i++) pts.push(spine(i / SEG, new THREE.Vector3()));
  const ridge = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5),
    SEG, 0.098, RAD, false);
  {
    // TubeGeometry lays (SEG+1) rings of (RAD+1) vertices in order, so the
    // vertex index recovers t exactly — which is what lets the tube taper and
    // take its colour AFTER it is built, instead of needing a custom sweep.
    const pos = ridge.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const sp = new THREE.Vector3(), pv = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.floor(i / (RAD + 1)) / SEG;
      spine(t, sp); pv.fromBufferAttribute(pos, i);
      pv.sub(sp).multiplyScalar(0.34 + 0.66 * Math.pow(1 - t, 0.68)).add(sp);
      pos.setXYZ(i, pv.x, pv.y, pv.z);
      bowAt(t * 2.0 + 0.06, c);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    ridge.setAttribute('color', new THREE.BufferAttribute(col, 3));
    ridge.computeVertexNormals();
  }
  const ridgeM = new THREE.Mesh(ridge, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.22, metalness: 0.06,
    emissive: 0xffffff, emissiveIntensity: 0.12, envMapIntensity: 1.7,
  }));

  // the pearl core the ridge is wound around. Concave profile, so the horn
  // reads as tapering to a needle.
  const coreProf: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    coreProf.push(new THREE.Vector2(0.185 * Math.pow(1 - t, 0.94), t * H));
  }
  const core = new THREE.Mesh(new THREE.LatheGeometry(coreProf, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff4fb, roughness: 0.26, metalness: 0.04,
      emissive: 0xffd6ee, emissiveIntensity: 0.30, envMapIntensity: 1.4 }));

  // ROOTED, and deliberately so. Nothing on the base ring gets closer to the
  // body's own surface than |p| = 0.80 — well under the 0.85 the rule wants
  // for "buried" — so the horn grows out of the skull with no seam, and no
  // amount of churn can expose its open bottom.
  const horn = new THREE.Group();
  horn.add(core, ridgeM);
  horn.position.set(0, 0.66, 0.23);
  horn.rotation.x = 0.20;                       // forward off the brow
  g.add(horn);

  // a small hot point at the tip: the one bit of the hat that has to survive
  // being forty pixels tall on Lantern Night's dark street
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), glow(0xfff6ff, 2.6));
  spark.position.set(0, 0.66 + H * Math.cos(0.20), 0.23 + H * Math.sin(0.20));
  g.add(spark);

  // ── THE STRANDS, AND NOTHING UNDER THEM ─────────────────────────────────
  // v3 put a sphere-segment shell under the mane to kill the daylight between
  // strands. It rendered as a hard-edged slab across the side of the skull —
  // dark plum read as a black flap, and the same shell tinted rainbow read as
  // a shield. Both times the shell was the loudest thing on the hat and the
  // strands were a fringe around it, because a smooth continuous surface will
  // always out-shout a dozen thin ribbons.
  //
  // So there is nothing under them. The strands ARE the mass: wide flat
  // ribbons rather than round locks, six to a row, with alternate rows offset
  // half a step so the gaps never line up. Where the void's own colour shows
  // through it reads as a parting, which is what hair does.
  //
  //           polar  len   rootR  wide   thick  flare  count
  // Root radius is never a free choice: it is 1.14 plus HALF the strand's own
  // thickness, because bendLock keeps every vertex at (root + its own z) and
  // the near side of the ribbon is the half-thickness inside the root.
  const ROWS: [number, number, number, number, number, number, number][] = [
    [0.20, 0.86, 1.245, 0.36, 0.19, 0.06, 6],
    [0.48, 1.10, 1.250, 0.40, 0.20, 0.10, 7],
    [0.78, 1.20, 1.260, 0.42, 0.21, 0.14, 7],
    [1.08, 1.10, 1.260, 0.40, 0.20, 0.16, 7],
    [1.38, 0.88, 1.250, 0.36, 0.18, 0.14, 6],
  ];
  const _hc = new THREE.Color();
  for (let r = 0; r < ROWS.length; r++) {
    const [pol, len, R, wx, wz, flare, n] = ROWS[r];
    const geo = strand(wx, len, wz, R, flare);
    const spread = 1.45 + pol * 0.75;
    const stagger = (r & 1) ? 0.5 / (n - 1) : 0;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) - 0.5 + stagger;              // -0.5 .. +0.5 across the head
      // colour runs across the head, not up it: a rainbow mane reads left to
      // right from behind and in three-quarter, which is every angle the play
      // camera has
      bowAt(0.5 + f * 0.92 + r * 0.05, _hc);
      const lock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: _hc.getHex(), roughness: 0.34, metalness: 0.02,
        emissive: _hc.getHex(), emissiveIntensity: 0.20, envMapIntensity: 1.5,
      }));
      lay(lock, R, Math.PI + f * spread, pol, f * 0.55, 0);
      g.add(lock);
    }
  }

  // ── EARS ────────────────────────────────────────────────────────────────
  // Placed by hand rather than by lay(), because an ear points very nearly
  // straight out and that is the one direction where "lay it along the
  // surface" has nothing left to say. Built as a group so the pink inner can
  // sit proud of the outer's FRONT FACE — v2 mounted it at a larger head
  // radius, which put it proud of the wrong side and rendered two white
  // blobs. Both lathes start below the skull so the pair is properly rooted.
  const earProf: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    earProf.push(new THREE.Vector2(0.5 * Math.sin(Math.PI * Math.pow(t, 0.68)) * (1 - t * 0.3), t));
  }
  const earGeo = new THREE.LatheGeometry(earProf, 10);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    const outer = new THREE.Mesh(earGeo, soft(0xfff2f8, 0.5));
    outer.scale.set(0.38, 0.96, 0.19);
    ear.add(outer);
    const inner = new THREE.Mesh(earGeo, new THREE.MeshStandardMaterial({
      color: 0xff87bd, roughness: 0.45, emissive: 0xff5c9e, emissiveIntensity: 0.3 }));
    inner.scale.set(0.23, 0.80, 0.11);
    inner.position.set(0, -0.13, 0.062);
    ear.add(inner);
    ear.position.set(sx * 0.55, 0.63, 0.09);
    ear.rotation.set(-0.16, sx * 0.25, sx * -0.44);   // lean back a touch, splay out
    g.add(ear);
  }

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildChef(): THREE.Group {
  const g = new THREE.Group();
  // ── Chef Toque ───────────────────────────────────────────────────────────
  // Silhouette: a narrow stiff cuff, then a fat pleated balloon that mushrooms
  // out over it and gathers to a knob. The pleats are real geometry — six
  // half-torus arches, each spanning the whole crown rim-to-rim, so six meshes
  // buy twelve ribs at 30° spacing. Each arch's open ends point straight down
  // into a gathered ring sitting on the cuff line, so the arc seams never show.
  // Nothing worn sits closer than |p| = 1.27, well clear of the churn at 1.18.
  const cream = new THREE.MeshStandardMaterial({
    color: 0xfff8ec, roughness: 0.82, metalness: 0.0,
    emissive: 0xffe8c8, emissiveIntensity: 0.16,
  });
  const warm = new THREE.MeshStandardMaterial({
    color: 0xf3ddb0, roughness: 0.75, metalness: 0.0, flatShading: true,
  });
  const shade = new THREE.MeshStandardMaterial({
    color: 0xe8c992, roughness: 0.8, metalness: 0.0,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xffd25a, roughness: 0.25, metalness: 0.7,
    emissive: 0x8a5f10, emissiveIntensity: 0.6, flatShading: true,
  });

  // ── THE CUFF IS A FLARED BAND, AND THAT IS FORCED BY THE JELLY ─────────
  // Four renders. The first three were the same mistake at three sizes.
  //
  // v1 parked a 0.34-tall band with its bottom rim at y=1.12 — legal by the
  // clearance rule and completely wrong, because the head only reaches 1.0. It
  // rendered as a flying saucer with a finger of daylight under it.
  //
  // v2 rooted that band down to y=0.50 and rendered a JAM JAR. Rooting was
  // right and not enough: a cylinder of radius 0.62 does not touch a sphere of
  // radius 1 until y=0.785, so everything above that is a neck sticking out of
  // the top of a ball, whatever height the band is.
  //
  // v3 widened it to 0.74 so it met the skull at y=0.673 — and that is the one
  // that cannot work at all, for a reason arithmetic gives up front. A
  // CYLINDER of radius r sits at |p| = sqrt(r*r + y*y), which passes 1.14 only
  // above y = 0.867; below that the band is inside the jelly's reach and the
  // body swells THROUGH it. Widen the cylinder and the contact line rises with
  // it. There is no radius at which a straight band both touches the head and
  // clears the churn.
  //
  // A FRUSTUM flaring downward does both, because |p| grows as it widens. From
  // (r 1.01, y 0.70) to (r 0.72, y 1.24) the closest point on the whole cone is
  // the bottom rim at 1.229 — a fifth of a body radius of margin — and the rim
  // lands OUTSIDE the head's silhouette, so the gap under it reads as the flare
  // of a brim rather than as air. That is the same trick the party hat's cap
  // has been getting away with since it shipped.
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.01, 0.54, 18, 1), warm);
  band.position.set(0, 0.97, 0);
  g.add(band);

  // a rolled edge, so the band ends in something rather than in paper. Its
  // centreline IS the frustum's bottom rim, so the rim is swallowed.
  const roll = new THREE.Mesh(new THREE.TorusGeometry(1.01, 0.06, 7, 22), shade);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(0, 0.70, 0);
  g.add(roll);

  // soft crown body — a squashed dome carried past its equator so the skirt
  // OVERHANGS the band by 0.21. A toque mushrooms; a dome that stops at the
  // equator is a bun.
  const puff = new THREE.Mesh(
    new THREE.SphereGeometry(0.96, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), cream);
  puff.position.set(0, 1.30, 0);
  puff.scale.set(1, 0.86, 1);
  g.add(puff);

  // the pleats. Centreline r 1.015 rides 0.055 proud of the dome and the 0.17
  // tube stands 0.225 out of it — deep enough to catch a rim light and read as
  // ribs, tight enough (0.34 wide in a 0.53 slot) to read as pleating.
  for (let i = 0; i < 6; i++) {
    const pleat = new THREE.Mesh(new THREE.TorusGeometry(1.015, 0.17, 6, 14, Math.PI), cream);
    pleat.position.set(0, 1.30, 0);
    pleat.rotation.y = (i / 6) * Math.PI;
    pleat.scale.set(1, 0.90, 1);
    g.add(pleat);
  }

  // the gather: warm shadow ring where the puff is cinched onto the band. It
  // is also the plug for TWO paper edges at once — the dome's open rim at
  // (0.930, 1.095) and the twelve arch ends at (1.015, 1.30) both fall inside
  // a 0.15 tube centred on (0.98, 1.20).
  const gather = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.15, 8, 20), shade);
  gather.rotation.x = Math.PI / 2;
  gather.position.set(0, 1.20, 0);
  g.add(gather);

  // crown knob: sits exactly on the arches' shared apex, so the place where all
  // six cross becomes a deliberate gathered button instead of a spiky knot
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8), cream);
  knob.position.set(0, 2.214, 0);
  knob.scale.set(1, 0.86, 1);
  g.add(knob);

  // the one bit of delight: a single gold chef's-jacket button, glowing warm.
  // Seated on the band at azimuth 55 degrees rather than dead centre — a low
  // band crosses z = 0.6, and nothing crosses z = 0.6 down near the brows.
  // From the three-quarter the game is actually played at it is just as
  // visible, and it never sits in front of the face.
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.115, 0.075, 12), gold);
  seat(button, 1.30, 0.96, 0.758);
  g.add(button);

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildCowboy(): THREE.Group {
  const g = new THREE.Group();
  // ── Ten-Gallon ───────────────────────────────────────────────────────────
  // One idea, made big: a tall creased cattleman crown sitting on a HUGE brim
  // that sweeps up at the sides. The up-curl is the whole hat — a flat brim
  // here would read as a bucket, so the brim lathe gets pushed into a real
  // saddle (up with |x|, gently down with |z|) after it is built.
  const TAN_LIGHT = 0xe3a95e;
  const TAN_DARK = 0xa96c30;
  const felt = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0.02 });
  const V = (r: number, y: number) => new THREE.Vector2(r, y);

  // the cowboy curl. Applied identically to every brim layer so the light top
  // skin and the dark underbody stay perfectly parallel.
  const curl = (geo: THREE.BufferGeometry) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, p.getY(i) + 0.22 * x * x - 0.05 * z * z);
    }
    geo.computeVertexNormals();
  };

  // brim underbody — closed profile, so it has real chunky thickness and the
  // dark tan shows as a binding all the way round the rim
  const brimGeo = new THREE.LatheGeometry([
    V(0.00, 1.340), V(0.78, 1.340), V(1.22, 1.325), V(1.56, 1.350), V(1.70, 1.420),
    V(1.74, 1.480),
    V(1.67, 1.520), V(1.52, 1.460), V(1.20, 1.415), V(0.78, 1.425), V(0.00, 1.425),
  ], 16);
  curl(brimGeo);
  const brim = new THREE.Mesh(brimGeo, felt(TAN_DARK));

  // light top skin, inset 0.09 from the rim
  const topGeo = new THREE.LatheGeometry([
    V(0.00, 1.445), V(0.78, 1.445), V(1.20, 1.435), V(1.52, 1.480), V(1.65, 1.530),
  ], 16);
  curl(topGeo);
  const brimTop = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({
    color: TAN_LIGHT, roughness: 0.72, side: THREE.DoubleSide }));

  // tall crown, base buried inside the brim's thickness so it grows out of it
  const crownGeo = new THREE.LatheGeometry([
    V(0.00, 1.30), V(0.78, 1.30), V(0.75, 1.58), V(0.72, 1.88),
    V(0.76, 2.14), V(0.79, 2.26), V(0.70, 2.37), V(0.46, 2.43), V(0.00, 2.45),
  ], 14);
  {
    // cattleman crease: a valley pressed down the middle of the top running
    // front-to-back, leaving the two side ridges standing proud
    const p = crownGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const t = Math.min(1, Math.max(0, (y - 2.00) / 0.45));
      const w = x / 0.46;
      p.setY(i, y - 0.34 * t * Math.max(0, 1 - w * w));
    }
    crownGeo.computeVertexNormals();
  }
  const crown = new THREE.Mesh(crownGeo, felt(TAN_LIGHT));

  // leather band, tucked under the lifted brim at the sides
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.755, 0.085, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x8a3c1e, roughness: 0.6 }));
  band.rotation.x = Math.PI / 2;
  band.position.y = 1.70;

  // ── the one bit of delight: a chunky silver sheriff star on the band ──
  const starGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.055, 10);
  {
    // pull every other spoke of the 10-sided disc inward -> a 5-point star
    const p = starGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      if (Math.hypot(x, z) < 0.02) continue;   // cap centres stay put
      const spoke = Math.round((Math.atan2(z, x) - Math.PI / 2) / (Math.PI / 5));
      if (Math.abs(spoke) % 2 === 1) { p.setX(i, x * 0.44); p.setZ(i, z * 0.44); }
    }
    starGeo.computeVertexNormals();
  }
  const star = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({
    color: 0xeef3fa, roughness: 0.16, metalness: 0.95,
    emissive: 0x9dc0e8, emissiveIntensity: 0.45, flatShading: true }));
  star.position.set(0, 1.70, 0.87);
  star.rotation.set(Math.PI / 2, Math.PI / 5, 0);   // one point straight up

  // everything goes in one group so the rakish tilt is a rotation about the
  // ORIGIN — which is norm-preserving, so the wobble clearance survives it
  const hat = new THREE.Group();
  hat.add(brim, brimTop, crown, band, star);
  hat.rotation.z = -0.05;
  g.add(hat);

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildBobble(): THREE.Group {
  const g = new THREE.Group();
  // ── BOBBLE BEANIE ────────────────────────────────────────────────────────
  // Silhouette idea: fat cream roll-brim + squashed knitted dome + one
  // ENORMOUS cream pompom. Read at 40px = red blob with a cream donut at the
  // bottom and a cream cloud on top. Nothing else competes.
  //
  // ── WHY THIS WAS REBUILT ────────────────────────────────────────────────
  // v1 put the whole hat in a sub-frame at y=1.27 and hung a 1.02-radius brim
  // off it, which lands at |p| = 1.63 — two thirds of a body radius above a
  // head that only reaches 1.0. It rendered as a flying saucer with a bobble
  // on it. Every part passed the clearance rule, because the rule only ever
  // said "not too CLOSE".
  //
  // A beanie is pulled ON. So the dome is now a sphere segment CONCENTRIC
  // with the head at 1.155 — the gap is the same everywhere, which reads as
  // knitted fit rather than as hover — and it is carried down to polar 1.10,
  // past the point where the head's own silhouette has fallen away, so the
  // brim ends up encircling the void instead of floating over it.
  const KNIT = 0xe23a48;   // cosy saturated red
  const CREAM = 0xfff0d2;  // warm wool cream

  const domeMat = new THREE.MeshStandardMaterial({ color: KNIT, roughness: 0.92, metalness: 0.0,
    side: THREE.DoubleSide });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0xff6272, roughness: 0.85, metalness: 0.0, flatShading: true });
  const creamMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.88, metalness: 0.0, flatShading: true });
  const pomMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.8, metalness: 0.0, emissive: 0xffd9a8, emissiveIntensity: 0.22, flatShading: true });

  // 1. THE SHELL, AND WHY IT IS STRETCHED. A spherical cap carried to polar
  // 1.02 is 2.07 wide and 0.50 tall: a saucer, which is exactly how v2 and v3
  // both rendered whatever was done to the brim. A beanie is TALL.
  //
  // Scaling the cap on Y is the one distortion that is free here, because
  // |p|^2 = x^2 + z^2 + (k*y)^2 with k > 1 can only ever make a vertex FURTHER
  // from the origin. The clearance rule survives a stretch it would not
  // survive a squash.
  const DR = 1.230, DP = 1.235, KY = 1.28;
  const crown = new THREE.Group();
  crown.scale.set(1, KY, 1);
  g.add(crown);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(DR, 22, 12, 0, Math.PI * 2, 0, DP), domeMat);
  crown.add(dome);

  // 2. the ribs, inside the same stretched frame so they stay welded to the
  // shell. Three great-circle tubes, each rotated 60 degrees about Y, give SIX
  // raised ribs that converge at the crown exactly like gathered knitting.
  //
  // A partial torus starts its arc at +X, so centring a 2.10 arc over the POLE
  // is a Z rotation of PI/2 - 1.05, not of -1.05. Getting that wrong put the
  // arcs across the SIDES of the skull and rendered six red bars swinging down
  // past the void's equator like a roll cage.
  const RIB = 2.46;
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(DR + 0.045, 0.05, 6, 20, RIB), ribMat);
    rib.rotation.set(0, (i * Math.PI) / 3, Math.PI / 2 - RIB / 2);
    crown.add(rib);
  }

  // 3. the folded cuff. It sits ONE TENTH out along the shell's rim normal
  // with a 0.13 tube, so it swallows the hem while ending only 0.21 wider than
  // the cap — a fold, not a flying saucer. v3 put its centreline a whole tube
  // out on a bigger sphere and the roll finished 27% wider than the shell it
  // was supposed to be part of.
  // The rim normal of a STRETCHED cap is not its radial direction: for an
  // ellipsoid with semi-axes a and b it runs along (x/a^2, y/b^2). Using the
  // sphere's normal instead threw the cuff up and out, and v4 rendered the
  // roll floating half a body radius clear of the void with the head plainly
  // visible under it.
  const TUBE = 0.13, OUT = 0.06;
  const a2 = DR * DR, b2 = (DR * KY) * (DR * KY);
  const rx = DR * Math.sin(DP), ry = DR * Math.cos(DP) * KY;
  let nx = rx / a2, ny = ry / b2;
  const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
  const cuff = new THREE.Mesh(
    new THREE.TorusGeometry(rx + OUT * nx, TUBE, 10, 26), creamMat);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.y = ry + OUT * ny;
  g.add(cuff);

  // 4. deep-red gather collar where the ribs meet — hides the convergence and
  // sells "this was knitted", for the price of one tiny torus.
  const gather = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.055, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0xb42636, roughness: 0.9, flatShading: true }));
  gather.rotation.x = Math.PI / 2;
  gather.position.y = 1.55;
  g.add(gather);

  // 5. THE POMPOM — the delight, and the only thing allowed to be this big.
  // Icosahedron at detail 1, flat-shaded: 80 facets of bobbly wool that throw
  // real highlights as the void rolls. Faint warm emissive so it still glows
  // cream when the hat is in the orb's own shadow. Centre at 1.50 so its
  // underside lands on the shell instead of hovering over it.
  const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), pomMat);
  pom.position.set(0.05, 1.84, 0.03);
  pom.rotation.set(0.4, 0.7, 0.2);
  g.add(pom);

  // 6-7. two smaller tufts breaking the pompom's outline so it reads FLUFFY
  // rather than "sphere".
  const tuftA = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), pomMat);
  tuftA.position.set(-0.34, 1.79, 0.16);
  tuftA.rotation.set(0.9, 0.3, 0.5);
  g.add(tuftA);

  const tuftB = new THREE.Mesh(new THREE.IcosahedronGeometry(0.20, 1), pomMat);
  tuftB.position.set(0.30, 1.74, -0.26);
  tuftB.rotation.set(0.2, 1.1, 0.8);
  g.add(tuftB);

  // Worn pushed back, and the angle is load-bearing rather than decoration.
  // Level, the cuff's front underside reaches y = 0.404 at z = 1.219, and the
  // void's brows reach 0.55. Tipping the whole hat 0.22 about the ORIGIN lifts
  // that point to 0.660 — and rotation about the origin is the one transform
  // that leaves every |p| exactly where the clearance rule found it.
  g.rotation.x = -0.22;
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildFlower(): THREE.Group {
  const g = new THREE.Group();
  // ── FLOWER CROWN ──────────────────────────────────────────────────────────
  // A springtime wreath: a chunky green vine circlet carrying open blooms,
  // little buds and splayed leaves. Reads as a CIRCLET — a ring of colour
  // around the crown of the head, not a hat with a body.
  //
  // ── WHY THIS WAS REBUILT ────────────────────────────────────────────────
  // v1 rode a sphere of 1.34 at 29 degrees down from the crown, which puts
  // the vine at (radial 0.65, y 1.17): a hoop hanging a third of a body radius
  // clear of the skull, with the head plainly visible underneath it. And its
  // flowers were tori squashed flat — a ring is a ring, not a bloom — while
  // its leaves were four-sided cones, which render as arrowheads.
  //
  // The circlet now sits at polar 58 degrees, where the vine lands at
  // (radial 1.03, y 0.65): OUTSIDE the head's own outline at that height, so
  // there is no gap to see. Same reason the party hat's brim works.
  const RIM = 1.235;                                   // vine centre-line sphere
  const POL = 1.02;                                    // how far down the skull it sits
  const PET = 0x000000;                                // (placeholder, see blooms)
  void PET;

  const vineMat = new THREE.MeshStandardMaterial({ color: 0x3fa838, roughness: 0.62, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x76d84a, roughness: 0.55 });

  // 1 ── the circlet itself: a faceted woody vine, the thing that makes this
  // read as a crown of flowers rather than three flowers stuck to a head
  const vine = new THREE.Mesh(
    new THREE.TorusGeometry(RIM * Math.sin(POL), 0.088, 7, 28), vineMat);
  vine.rotation.x = -Math.PI / 2;
  vine.position.y = RIM * Math.cos(POL);
  g.add(vine);

  // 2 ── THE BLOOMS, and they are built out of petals. A torus squashed flat
  // is a washer with a bead in it; a flower is a ring of separate rounded
  // petals with a heart in the middle, and at forty pixels the difference is
  // the whole read. Five petals: four is a cross, six is a snowflake.
  const bloom = (az: number, pol: number, R: number, k: number, col: number,
    hot: boolean): void => {
    const b = new THREE.Group();
    const petMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.48,
      emissive: col, emissiveIntensity: 0.14 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const p = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), petMat);
      p.scale.set(0.085 * k, 0.042 * k, 0.135 * k);
      p.position.set(Math.sin(a) * 0.115 * k, 0.012 * k, Math.cos(a) * 0.115 * k);
      p.rotation.y = a;
      b.add(p);
    }
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.072 * k, 10, 8),
      new THREE.MeshStandardMaterial({ color: hot ? 0xffe27a : 0xffd25a, roughness: 0.3,
        emissive: 0xffb42a, emissiveIntensity: hot ? 1.3 : 0.5 }));
    heart.scale.set(1, 0.7, 1);
    heart.position.y = 0.055 * k;
    b.add(heart);
    seat(b, R, az, pol, 0);
    g.add(b);
  };

  // the hero daisy front and centre, then a ring of smaller ones all the way
  // round so the wreath never goes bald when the void turns away
  bloom(0.00, POL - 0.06, 1.30, 1.55, 0xfff3f7, true);
  bloom(1.02, POL - 0.02, 1.28, 1.05, 0xff6f9d, false);
  bloom(-1.02, POL - 0.02, 1.28, 1.05, 0xbb7cff, false);
  bloom(2.05, POL + 0.03, 1.28, 0.95, 0xffd66b, false);
  bloom(-2.05, POL + 0.03, 1.28, 0.95, 0x7ad2ff, false);
  bloom(Math.PI, POL, 1.28, 1.10, 0xfff3f7, false);

  // 3 ── buds tucked between the blooms, so the vine is never bare gaps
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const bud = new THREE.Mesh(new THREE.DodecahedronGeometry(0.085),
      new THREE.MeshStandardMaterial({ color: i & 1 ? 0xff9ec7 : 0xd8b4ff, roughness: 0.5,
        flatShading: true }));
    seat(bud, 1.27, a, POL - 0.13, 0);
    g.add(bud);
  }

  // 4 ── leaves, laid ALONG the vine rather than stuck out on stalks. Flat
  // blades bent around the head so they follow the circlet — a leaf pointing
  // straight out of a sphere is a spike, which is exactly what v1's four-sided
  // cones rendered as.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.62;
    const leaf = new THREE.Mesh(strand(0.19, 0.42, 0.075, 1.245, 0.06, 0.03), leafMat);
    lay(leaf, 1.245, a, POL - 0.10, (i & 1) ? 1.35 : -1.35, 0);
    g.add(leaf);
  }

  // tipped back off the brows. The hero daisy's lowest petal sits at y=0.53
  // level, which is under the brow line at 0.55; rotating the wreath about the
  // ORIGIN lifts it to 0.674 and costs no clearance at all.
  g.rotation.x = -0.14;
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildWizard(): THREE.Group {
  const g = new THREE.Group();
  // ── Star Wizard ────────────────────────────────────────────────────────────
  // One idea, held hard: a tall indigo cone that BENDS FORWARD near the tip,
  // sitting on a wide drooping brim, with a burning gold star on the end of the
  // flop. At 40px a child reads brim → bend → star and names it instantly.
  // Every worn part lives outside |p| = 1.22 (crown base rim is at 1.47, brim
  // inner edge at 1.55) so the chomp displacement never swallows it, and the
  // brim bottoms out at y = 1.17 — above the 1.15 face line where it crosses
  // z > 0.6.
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0x3830ad, roughness: 0.62, metalness: 0.06,
    emissive: 0x150e58, emissiveIntensity: 0.45,   // keeps the indigo from going black in shade
    flatShading: true, side: THREE.DoubleSide,
  });
  // gold is the whole point — hot, saturated, self-lit. Stars only.
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd84a, roughness: 0.3, metalness: 0.25,
    emissive: 0xffb412, emissiveIntensity: 1.5, flatShading: true,
  });
  // the tip star runs hotter still: near-white core, this is the paid moment
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xfff4bb, roughness: 0.22, metalness: 0.15,
    emissive: 0xffce2e, emissiveIntensity: 2.6, flatShading: true,
  });

  // ── brim: 14-sided, droops from y=1.54 at the crown down to y=1.17 at the
  // 1.88 rim. Wide enough to be the base of the silhouette, low-poly enough to
  // look hand-carved.
  const brim = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.52, 0.10),   // top surface, inner → outer, drooping
    new THREE.Vector2(0.98, 0.05),
    new THREE.Vector2(1.42, -0.03),
    new THREE.Vector2(1.72, -0.12),
    new THREE.Vector2(1.88, -0.21),
    new THREE.Vector2(1.86, -0.27),  // rolled edge
    new THREE.Vector2(1.68, -0.19),  // underside, outer → inner
    new THREE.Vector2(1.38, -0.11),
    new THREE.Vector2(0.94, -0.03),
    new THREE.Vector2(0.50, 0.03),
  ], 14), hatMat);
  brim.position.y = 1.44;
  g.add(brim);

  // ── crown: four frusta walking a spine that leans harder at every step, so
  // the cone curls forward instead of standing to attention. The crown's base
  // is wider than the brim's hole, so there is no seam to see.
  const LEAN = [0.10, 0.30, 0.62, 1.05];
  const CROWN_R = [0.64, 0.48, 0.34, 0.22, 0.145];
  const SEG = 0.30;
  let sy = 1.32, sz = 0;
  for (let i = 0; i < 4; i++) {
    const ny = sy + Math.cos(LEAN[i]) * SEG;
    const nz = sz + Math.sin(LEAN[i]) * SEG;
    // 1.16x length so consecutive segments overlap and the bend has no gap
    const part = new THREE.Mesh(new THREE.CylinderGeometry(CROWN_R[i + 1], CROWN_R[i], SEG * 1.16, 12), hatMat);
    part.position.set(0, (sy + ny) / 2, (sz + nz) / 2);
    part.rotation.x = LEAN[i];
    g.add(part);
    sy = ny; sz = nz;
  }
  // the flop itself: the last 0.28 goes almost horizontal, out over the brim
  const TIP_LEAN = 1.4;
  const tipCone = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.28, 12), hatMat);
  tipCone.position.set(0, sy + Math.cos(TIP_LEAN) * 0.14, sz + Math.sin(TIP_LEAN) * 0.14);
  tipCone.rotation.x = TIP_LEAN;
  g.add(tipCone);

  // ── THE delight: a four-point star burning on the end of the flop, built as
  // two crossed octahedral spindles (SphereGeometry(r,4,2) is exactly an
  // octahedron) so it has real concave notches instead of being a blob. Tops
  // out at y = 2.56, hanging out at z = 0.88 — high above the face, and the
  // first thing your eye lands on.
  const spindle = new THREE.SphereGeometry(0.14, 4, 2);
  const starY = new THREE.Mesh(spindle, tipMat);
  starY.scale.set(0.30, 1.42, 0.30);
  starY.position.set(0, 2.355, 0.878);
  starY.rotation.z = 0.24;                 // tipped, so it reads hand-placed
  g.add(starY);
  const starX = new THREE.Mesh(spindle, tipMat);
  starX.scale.set(1.42, 0.30, 0.30);
  starX.position.copy(starY.position);
  starX.rotation.z = 0.24;
  g.add(starX);

  // ── crescent moon on the left flank: a torus arc, horns pointing up-and-out.
  // Floats ~0.09 proud of the cone so it reads as an appliqué badge.
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.055, 6, 14, Math.PI * 1.3), goldMat);
  moon.position.set(-0.179, 1.90, 0.519);
  moon.rotation.z = Math.PI * 0.35 + 0.55;  // spin the gap round to the front-up
  moon.rotation.y = -0.42;                  // then swing it flat onto the cone face
  moon.rotation.x = -0.22;                  // lean back with the taper
  g.add(moon);

  // ── three gold stars scattered up the cone, each a flat diamond lying
  // against the surface. Different sizes and spins — a scatter, not a pattern.
  // The moon next door is what makes these read as stars and not as gems.
  const SPARKS: [number, number, number, number, number, number][] = [
    [0.343, 1.68, 0.440, 0.135, 0.72, 0.5],
    [-0.342, 2.02, 0.445, 0.105, -0.95, -0.3],
    [0.095, 2.20, 0.687, 0.090, 0.30, 0.9],
  ];
  for (const [x, y, z, s, az, spin] of SPARKS) {
    const st = new THREE.Mesh(spindle, goldMat);
    const k = s / 0.14;
    st.scale.set(k, k * 1.3, k * 0.3);      // flattened along its own facing axis
    st.position.set(x, y, z);
    st.rotation.z = spin;                   // in-plane spin first…
    st.rotation.y = az;                     // …then swing to face out of the cone
    g.add(st);
  }

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildViking(): THREE.Group {
  const g = new THREE.Group();
  // ── VIKING HELM ────────────────────────────────────────────────────────────
  // One idea: two ENORMOUS cream horns sweeping out and up off a squat iron
  // dome. The dome is pushed BACK on the skull (tilt) so its brow band clears
  // the face entirely — everything worn lives at |p| >= 1.22, and the whole
  // helm sits on a sphere of radius 1.30 concentric with the body, so the
  // event-horizon churn can never chew a hole in it.
  const TILT = 0.42;                            // helm rocked back off the brow
  const CB = Math.cos(TILT), SB = Math.sin(TILT);
  const RIMY = 1.30 * Math.cos(0.86) * 1.20;    // helm rim height in the tilted frame

  const steel = new THREE.MeshStandardMaterial({
    color: 0x8ea6c8, roughness: 0.30, metalness: 0.75,
    emissive: 0x2b3c60, emissiveIntensity: 0.30,
    flatShading: true, side: THREE.DoubleSide,
  });
  const iron = new THREE.MeshStandardMaterial({
    color: 0x46567a, roughness: 0.34, metalness: 0.85,
    emissive: 0x1a2340, emissiveIntensity: 0.35, flatShading: true,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xf0a93e, roughness: 0.28, metalness: 0.80,
    emissive: 0x7a4408, emissiveIntensity: 0.45, flatShading: true,
  });
  const studMat = new THREE.MeshStandardMaterial({
    color: 0xffc24a, roughness: 0.24, metalness: 0.85,
    emissive: 0x8a4d06, emissiveIntensity: 0.55,
  });
  const bone = new THREE.MeshStandardMaterial({
    color: 0xfff1d0, roughness: 0.45, metalness: 0.05,
    emissive: 0xffd9a0, emissiveIntensity: 0.16, flatShading: true,
  });

  // beaten-iron dome: a cap of the r=1.30 sphere, stretched along its own axis
  // then rocked backward. The rim lands at y=1.33 / z=0.49 in front (clear of
  // the face) and skirts down to y=0.53 at the nape.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.30, 12, 8, 0, Math.PI * 2, 0, 0.86), steel);
  dome.scale.y = 1.20;
  dome.rotation.x = -TILT;
  g.add(dome);

  // riveted brow band — a rolled edge sitting on the helm rim
  const bandC = new THREE.Vector3(0, RIMY * CB, -RIMY * SB);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.085, 8, 16), iron);
  band.rotation.x = Math.PI / 2 - TILT;
  band.position.copy(bandC);
  g.add(band);

  // nasal: a tapered, centre-ridged plate dropping down-and-forward off the
  // band front. Stops at y=1.12 / z=0.57 — nothing of it reaches the face.
  const nasalG = new THREE.CylinderGeometry(0.16, 0.055, 0.34, 4);
  nasalG.scale(1, 1, 0.44);
  const nasal = new THREE.Mesh(nasalG, steel);
  nasal.position.set(0, 1.27, 0.50);
  nasal.rotation.x = -0.451;
  g.add(nasal);

  // ── the horns: the whole idea ──────────────────────────────────────────────
  // A torus arc gives a genuinely smooth curve; tapering its tube by hand turns
  // it into a real horn — fat root, needle tip — in ONE mesh each. Root fires
  // out sideways, the sweep carries it up to y≈2.07 and out to x≈±1.52.
  const HR = 0.88, HT = 0.195, HARC = 1.55, HPHI = 1.30, YAW = 0.12;
  const hornGeo = (s: number) => {
    const geo = new THREE.TorusGeometry(HR, HT, 8, 14, HARC);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = Math.atan2(y, x);                       // 0..HARC along the horn
      const t = Math.min(Math.max(u / HARC, 0), 1);
      const k = 1 - 0.40 * t - 0.55 * t * t;            // fat root -> needle tip
      const rr = HR + (Math.sqrt(x * x + y * y) - HR) * k;
      p.setXYZ(i, rr * Math.cos(u), rr * Math.sin(u), z * k);
    }
    geo.translate(-HR, 0, 0);                 // root at the origin
    if (s < 0) geo.rotateY(Math.PI);          // mirror as a PROPER rotation (winding stays sane)
    geo.rotateZ(-s * HPHI);                   // root points out and up
    geo.computeVertexNormals();
    return geo;
  };

  const root = new THREE.Vector3(0.88, 1.005, -0.170);   // buried inside the band
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeo(s), bone);
    horn.position.set(s * root.x, root.y, root.z);
    horn.rotation.y = s * YAW;
    g.add(horn);

    // flared brass socket where the horn leaves the helm — hides the join and
    // puts a warm accent on the busiest silhouette junction.
    const dir = new THREE.Vector3(s * Math.sin(HPHI), Math.cos(HPHI), 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), s * YAW).normalize();
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.20, 8), brass);
    sock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    sock.position.set(s * root.x, root.y, root.z).addScaledVector(dir, 0.13);
    g.add(sock);
  }

  // ── warm rivets marching across the band ───────────────────────────────────
  const nrm = new THREE.Vector3(0, SB, CB);   // band-plane "forward" axis
  const RIVR = 0.99 + 0.085;                  // proud of the band's outer face
  for (const a of [-0.91, -0.42, 0.42, 0.91]) {
    const riv = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), studMat);
    riv.position.copy(bandC)
      .addScaledVector(nrm, RIVR * Math.cos(a))
      .add(new THREE.Vector3(RIVR * Math.sin(a), 0, 0));
    g.add(riv);
  }

  // the one bit of delight: a fat amber boss capping the nasal, the single warm
  // glow on an otherwise cold iron helm.
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffc24a, roughness: 0.20, metalness: 0.35,
      emissive: 0xff9b2e, emissiveIntensity: 1.15,
    }));
  boss.position.copy(bandC).addScaledVector(nrm, 1.06);
  g.add(boss);

  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

function buildSpace(): THREE.Group {
  const g = new THREE.Group();
  // ── SPACE HELMET ─────────────────────────────────────────────────────────
    // The joke is that you can still see the face, so the bubble is REAL glass
    // (opacity 0.28, depthWrite off so the eyes always win the transparency
    // sort) and every opaque part is pushed out to the rim, where it frames the
    // face instead of covering it.
    //
    // CLEARANCE, and why this hat gets it for free: a space helmet is SUPPOSED
    // to have air between the glass and your nose. The whole assembly is cut
    // from ONE sphere concentric with the body at r = 1.34, so the 0.34 gap the
    // jelly wobble forces on every hat in this game stops being a compromise
    // and becomes the concept — the void is sealed inside a bubble.
    //
    // Note on three's sphere parametrisation: phi = PI/2 faces +Z (the face),
    // phi = -PI/2 faces -Z (the back of the head). Every arc below is aimed
    // with that, not guessed.
    const R = 1.34;          // the glass sphere everything is built on
    const BOT = 2.12;        // polar angle where the bubble ends (~121 deg)
    const WHITE = 0xfdf6ee, GLASS = 0xcdeeff, GOLD = 0xffb92e, LAMP = 0xff3a2e;

    const shellMat = new THREE.MeshStandardMaterial({
      color: WHITE, roughness: 0.5, metalness: 0.06,
      flatShading: true, side: THREE.DoubleSide });
    const goldMat = new THREE.MeshStandardMaterial({
      color: GOLD, roughness: 0.22, metalness: 0.85, emissive: 0x8a4a00,
      emissiveIntensity: 0.5, flatShading: true, side: THREE.DoubleSide });

    // ── the bubble ──────────────────────────────────────────────────────────
    // Roughness stays very low and shading stays SMOOTH so the scene lights lay
    // a real moving specular streak across it. A painted-on glint quad reads as
    // a sticker; an actual highlight reads as glass, and it costs no mesh.
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(R, 14, 10, 0, Math.PI * 2, 0, BOT),
      new THREE.MeshStandardMaterial({
        color: GLASS, roughness: 0.06, metalness: 0.12,
        emissive: 0x2f8fc4, emissiveIntensity: 0.14,
        transparent: true, opacity: 0.28, side: THREE.DoubleSide,
        depthWrite: false }));
    dome.renderOrder = 2;
    g.add(dome);

    // ── the white hard shell, BACK ONLY ─────────────────────────────────────
    // A bare transparent bubble has no silhouette — at forty pixels it is a
    // faint smudge and the child cannot name it. The rear shell is what makes
    // the outline read HELMET in one glance: it caps the back and crown, and
    // from the front it shows as two chunky white cheeks framing the glass.
    // Centred on -Z and 149 deg wide, so it stops well short of the face.
    const back = new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.03, 12, 8, -Math.PI / 2 - 1.3, 2.6, 0.5, BOT - 0.5),
      shellMat);
    g.add(back);

    // ── the collar ring, sitting on the bubble's own bottom edge ────────────
    // It rides the r = 1.34 sphere like everything else, which puts it at
    // y = -0.70: below the mouth (y = -0.26), so it never crowds the face, and
    // exactly where a suit's neck ring belongs. Fat tube, because the collar is
    // the hat's ground line and a thin one reads as a dropped hula hoop.
    const cy = R * Math.cos(BOT), cr = R * Math.sin(BOT);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(cr, 0.1, 8, 16), shellMat);
    collar.rotation.x = Math.PI / 2; collar.position.y = cy; g.add(collar);
    // a slim second ring just above it — two stacked rings is the difference
    // between "collar" and "band", and it costs one mesh
    const lockA = 1.98, lock = new THREE.Mesh(
      new THREE.TorusGeometry(R * Math.sin(lockA), 0.045, 6, 16), shellMat);
    lock.rotation.x = Math.PI / 2; lock.position.y = R * Math.cos(lockA); g.add(lock);

    // ── the gold visor, pushed up ───────────────────────────────────────────
    // A real sun visor comes down over the whole face, which here would delete
    // the character. So it is worn PARKED — a fat gold band wrapped 143 deg
    // across the front of the crown, its lowest edge at y = 1.03, clear of the
    // brows (0.55) and of the y = 0.9 face line with room to spare. Metallic
    // and lightly emissive so it flashes as the void rolls.
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.035, 14, 4, Math.PI / 2 - 1.25, 2.5, 0.34, 0.36),
      goldMat);
    g.add(visor);

    // ── the delight: one antenna, one red lamp ──────────────────────────────
    // Mounted back-left so the silhouette is asymmetric (a dead-symmetric hat
    // reads as a shape, an off-centre spike reads as a thing someone made), and
    // aimed straight out of the sphere so it looks bolted on, not stabbed in.
    const dir = new THREE.Vector3(-0.48, 0.82, -0.3).normalize();
    const aim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const at = (d: number): THREE.Vector3 => dir.clone().multiplyScalar(d);

    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.18, 8), shellMat);
    nub.quaternion.copy(aim); nub.position.copy(at(1.4)); g.add(nub);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.036, 0.46, 6), shellMat);
    stalk.quaternion.copy(aim); stalk.position.copy(at(1.72)); g.add(stalk);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8),
      new THREE.MeshStandardMaterial({ color: LAMP, emissive: LAMP,
        emissiveIntensity: 2.0, roughness: 0.3, metalness: 0.1 }));
    lamp.position.copy(at(2.0)); g.add(lamp);
    // soft bloom shell around the lamp — the bit that catches a child's eye
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xff5a44, emissive: 0xff3a24,
        emissiveIntensity: 1.4, transparent: true, opacity: 0.3, depthWrite: false }));
    halo.position.copy(at(2.0)); halo.renderOrder = 3; g.add(halo);
  return g;
}

function buildPropeller(): THREE.Group {
  const g = new THREE.Group();
  // ── PROPELLER CAP ──────────────────────────────────────────────────────────
  // Six primary-colour panels, a button, and a two-blade prop on a mast. The
  // whole thing is authored UPRIGHT — dome pole on +Y — and tilted back at the
  // very end. That tilt is not decoration, it is the only way this silhouette is
  // legal. A beanie has to reach down to theta ~0.95 or it reads as a saucer
  // hovering over the pole, but an upright dome that deep puts its front edge at
  // (y 0.76, z 1.06) — straight across the eyes. Rotating about X is FREE on the
  // clearance rule (rotation preserves |p|, so every panel vertex stays exactly
  // 1.30 from the origin no matter how far it swings) and it moves the front
  // edge to polar angle 0.95 - 0.55 = 0.40, i.e. (y 1.20, z 0.51): above the
  // brows, behind the z = 0.6 line, with the deep part of the cap now hanging
  // down the BACK of the head. Which is where a cartoon child wears one anyway.
  const RED = 0xf0392f, YEL = 0xffd334, BLU = 0x2f86f0, GRN = 0x33c65c;
  const CREAM = 0xfff4e2, STEEL = 0xdbe2ec;
  const R_CAP = 1.30;          // > 1.22: the jelly can never swallow the cap
  const TH = 0.95;             // how far down the sides the beanie reaches
  const TILT = 0.55;

  // ── THE SIX PANELS ────────────────────────────────────────────────────────
  // One SphereGeometry wedge each, all cut from the SAME sphere of the SAME
  // radius, so the seams are exact and the six meshes shade as one dome — no
  // cracks, no z-fighting, and the clearance is the radius itself: one number,
  // true at every vertex. DoubleSide because the cap now hangs low at the back
  // and the play camera looks up under it constantly.
  // PHI0 centres a whole panel on +Z rather than a seam, so the child sees three
  // clean colours across the front (blue / red / yellow) instead of a join.
  const PANELS = [RED, YEL, BLU, GRN, RED, BLU];
  const STEP = Math.PI / 3;
  const PHI0 = Math.PI / 2 - STEP / 2;
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(R_CAP, 3, 4, PHI0 + i * STEP, STEP, 0, TH),
      new THREE.MeshStandardMaterial({
        color: PANELS[i], roughness: 0.58, metalness: 0, side: THREE.DoubleSide,
      }));
    g.add(p);
  }

  // ── THE BAND ──────────────────────────────────────────────────────────────
  // Sat on a slightly LARGER sphere (1.35) than the panels so the tube's inner
  // face still clears at 1.28, and offset from the panel edge by only 0.05 so
  // the 0.07 tube swallows the raw open hem. Cream, not a fifth primary — the
  // four colours need one neutral to sing against, and a pale ring is also the
  // line that separates hat from purple orb at forty pixels.
  const RB = 1.35;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(RB * Math.sin(TH), 0.07, 8, 18),
    new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.62 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = RB * Math.cos(TH);
  g.add(rim);

  // ── BUTTON ────────────────────────────────────────────────────────────────
  // Seated INTO the crown: the bottom face sits at y 1.28, just under the 1.30
  // dome, so the pole pokes through it and it reads as sewn on rather than
  // balanced on top. Still 1.28 from the origin, so still outside the churn.
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.14, 10),
    new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.5, flatShading: true }));
  btn.position.y = 1.35; g.add(btn);

  // ── MAST ──────────────────────────────────────────────────────────────────
  // The 0.42 of air between crown and blades is the whole joke. Without a gap
  // the prop is a hat decoration; with one it is a machine bolted to a child.
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.30, 8),
    new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.3, metalness: 0.75, flatShading: true }));
  post.position.y = 1.55; g.add(post);

  // ── THE PROPELLER ─────────────────────────────────────────────────────────
  // name === 'spin' and rotation.y is what void3d drives, so the HUB carries the
  // name and the blades hang off it as children — they inherit the spin for
  // free. Its local Y is the hat's axis, tilted with everything else, which is
  // exactly the axis a prop should turn about.
  // The hub is also this hat's one glint: a warm emissive bead, the only thing
  // here that is not matte, so it catches a highlight and drags the eye upward
  // to the moving part.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.10, 0.18, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffb02e, emissive: 0xff8a12, emissiveIntensity: 1.1,
      roughness: 0.3, metalness: 0.25, flatShading: true,
    }));
  hub.name = 'spin';
  hub.position.y = 1.72;
  g.add(hub);

  // Two blades, PITCHED IN OPPOSITE DIRECTIONS about the bar axis. A single flat
  // bar reads as a stick; both blades rolled the same way reads as a bent stick.
  // Opposing roll is the thing a six-year-old recognises as a propeller even
  // when it is standing still. Different colours on the two blades so the spin
  // is legible as motion and not as a blur of one hue.
  const BLADES: Array<[number, number]> = [[1, RED], [-1, YEL]];
  for (const [s, col] of BLADES) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.055, 0.24),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, flatShading: true }));
    b.position.x = s * 0.50;      // inner ends buried in the hub
    b.rotation.x = s * 0.34;
    hub.add(b);
  }

  // Tilted back 0.55 (see the top of this function — this is the clearance fix,
  // not a flourish) plus a 0.07 roll, because a propeller beanie sitting dead
  // square is a colander. The roll is small enough that the band's forwardmost
  // tube point still lands at z 0.597, inside the 0.6 line.
  g.rotation.set(-TILT, 0, -0.07);
  return g;
}

// ── PIRATE TRICORN ────────────────────────────────────────────────────────
// The three upturned corners ARE the hat: a tricorn seen in silhouette is a
// wide flat triangle with a peak at each point, and nothing else about it
// matters at forty pixels. Built as a brim disc with three corner flips
// seated on it, so the corners rise out of the brim rather than sitting on it.
function buildTricorn(): THREE.Group {
  const g = new THREE.Group();
  const BLACK = 0x22202c, GOLD = 0xffc21f, BONE = 0xfff4e2, RED = 0xd8302f;
  const felt = flat(BLACK, 0.78);

  // the crown, low and rounded — a tricorn has almost none, which is why the
  // corners have to do all the work
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.30, 26, 12, 0, Math.PI * 2, 0, 0.72), felt);
  (crown.material as THREE.Material).side = THREE.DoubleSide;
  g.add(crown);

  // the brim: a wide shallow cone, tipped up at the rim
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.30, 0.10, 30, 1, true), felt);
  brim.position.y = 1.02; g.add(brim);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.70, 0.075, 8, 34), flat(GOLD, 0.3, 0.7));
  lip.rotation.x = Math.PI / 2; lip.position.y = 1.06; g.add(lip);

  // THREE CORNERS, folded up against the crown. Flat plates rather than
  // curved shells: the fold of a tricorn is a crease, and a crease reads as a
  // hard edge.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI;
    const flip = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.05, 0.09, 3, 1, false), felt);
    flip.position.set(Math.sin(a) * 1.05, 1.34, Math.cos(a) * 1.05);
    flip.rotation.set(-0.95, -a, 0, 'YXZ');
    g.add(flip);
  }

  // the skull badge, front and centre where the camera lives
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), soft(BONE, 0.55));
  skull.scale.set(1, 1.05, 0.6); skull.position.set(0, 1.42, 1.02); g.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.1), soft(BONE, 0.55));
  jaw.position.set(0, 1.25, 1.06); g.add(jaw);
  for (const sx of [-0.07, 0.07]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), flat(BLACK, 0.5));
    eye.position.set(sx, 1.45, 1.14); g.add(eye);
  }

  // …and the plume, which is the one piece of delight and the only colour
  const plume = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), soft(RED, 0.7));
  plume.scale.set(0.13, 0.5, 0.2);
  plume.position.set(0.92, 1.62, -0.42); plume.rotation.set(0.5, 0, -0.6); g.add(plume);
  const plume2 = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), soft(0xff6a5e, 0.7));
  plume2.scale.set(0.1, 0.34, 0.15);
  plume2.position.set(1.12, 1.92, -0.66); plume2.rotation.set(0.7, 0, -0.85); g.add(plume2);
  return g;
}

type Builder = () => THREE.Group;
const BUILDERS: Record<string, Builder> = {
  party: buildParty,
  chef: buildChef,
  cowboy: buildCowboy,
  bobble: buildBobble,
  flower: buildFlower,
  wizard: buildWizard,
  viking: buildViking,
  space: buildSpace,
  propeller: buildPropeller,
  tricorn: buildTricorn,
  crown: buildCrown,
  tycoon: buildTycoon,
  horn: buildHorn,
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
