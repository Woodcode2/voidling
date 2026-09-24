// ── WHAT YOU EAT TALKS BACK: the names of the eat voices, and the tag ──────
// Research governor G5. A car, a person, a sheep and a chalet all sounded the
// same apart from size — pop() is one tuned note whose depth follows the meal,
// and nothing in the bite said WHAT went in, although capture() has the prop
// in its hand. The eat voices say it: a car meeps, a townsperson goes wheee, a
// goat bleats, a house crumbles, a tree rustles.
//
// This module is only the vocabulary, shared by the three places that need it
// and nothing else: the world modules TAG a prop whose kind no existing field
// can tell (a tree carries no qk anywhere), prototype3d.ts CLASSIFIES a meal
// from the tags the worlds already write (qk, kind, balloon, limbs) plus these,
// and audio3d.ts PLAYS the name it is handed. Nothing here draws a random
// number, so a tag moves no seeded placement (mainstreet.ts:252): it is a
// field on userData, like qk, set after the geometry is built.
//
// The census of which kinds get which voice, world by world, and which stay
// silent, is printed by qa/eatvoice.mjs — read off the live world, never a
// list kept here.
import type * as THREE from 'three';

/** Every voice the eat can speak in. A kind that fits none of them stays
 *  silent — a silent kind is better than a wrong one. */
export const EAT_VOICES = ['meep', 'wheee', 'baa', 'quack', 'crumble', 'rustle', 'crinkle', 'squeak', 'poof'] as const;
export type EatVoice = typeof EAT_VOICES[number];

/** Tag a prop with the voice it makes when eaten. Returns the prop, so a
 *  factory can wrap its own return: `return voiced(noFront(grp), 'rustle')`. */
export const voiced = <T extends THREE.Object3D>(m: T, v: EatVoice): T => { m.userData.eatVoice = v; return m; };
