// Drawings of the pitching delivery: a right-handed pitcher seen from the third-base
// side, throwing toward the plate on the right. The pitcher starts chest-on to the
// viewer and turns to face the plate, so the shoulders and pelvis narrow as they
// rotate. Teaching sketches, not motion-capture data.
import { athlete, extent, frameFor, jointAt, motionArrow, pin, svg, add, dir } from './athlete-figures.js';
import { createMotion } from './figure-motion.js';

const ground = x => x < 96 ? 232 : 232 + (x - 96) * 0.06;

// t = trunk lean toward the plate. sh / hp = how square shoulders / pelvis are to the viewer.
// arm1 = throwing arm [upper, forearm, upper scale, forearm scale], arm2 = glove arm.
// leg1 = drive leg [thigh, shank, foot, scales...], leg2 = lead leg. anchor = the planted foot.
export const POSES = {
  set:      { label: 'Set',                   t: -1, sh: 1,    hp: 1,    anchor: { leg: 1, x: 80 },  leg1: [-3, -1, 90, 1, 1, 0.6],  leg2: [6, 2, 90, 1, 1, 0.6],      arm1: [10, 140, 1, 0.55], arm2: [-10, -140, 1, 0.55], gloveTop: true },
  balance:  { label: 'Balance point',         t: -4, sh: 1,    hp: 0.9,  anchor: { leg: 1, x: 80 },  leg1: [1, -1, 90, 1, 1, 0.6],   leg2: [96, 6, 62, 0.72, 0.95, 0.9], arm1: [12, 146, 1, 0.5], arm2: [-8, -146, 1, 0.5], gloveTop: true, legOver: true },
  contact:  { label: 'Foot contact',          t: -4, sh: 1,    hp: 0.75, anchor: { leg: 2, x: 214 }, leg1: [-44, -56, 28],          leg2: [60, 14, 92],             arm1: [-96, 176], arm2: [86, 108, 1, 0.9] },
  mer:      { label: 'Max external rotation', t: 13, sh: 0.4,  hp: 0.15, anchor: { leg: 2, x: 214 }, leg1: [-24, -72, -8],          leg2: [47, 8, 92],              arm1: [112, -102, 0.62, 1], arm2: [24, 150, 0.85, 0.6], armBehind: true },
  release:  { label: 'Ball release',          t: 33, sh: -0.15, hp: -0.2, anchor: { leg: 2, x: 214 }, leg1: [-12, -78, -18],         leg2: [35, 3, 92],              arm1: [106, 116], arm2: [8, 128, 0.9, 0.6] },
  mir:      { label: 'Max internal rotation', t: 45, sh: -0.5, hp: -0.4, anchor: { leg: 2, x: 214 }, leg1: [-4, -86, -30],          leg2: [31, 2, 92],              arm1: [62, 42], arm2: [0, 140, 0.9, 0.6], ball: false },
  finish:   { label: 'Finish',                t: 52, sh: -0.7, hp: -0.6, anchor: { leg: 2, x: 214 }, leg1: [-6, -40, 60],           leg2: [26, 0, 92],              arm1: [30, 12], arm2: [-15, 75, 0.9, 0.7], ball: false, head: 8 },
};
// Each phase runs from one event to the next.
export const PHASE_SPANS = { windup: ['set', 'balance'], stride: ['balance', 'contact'], cocking: ['contact', 'mer'], acceleration: ['mer', 'release'], deceleration: ['release', 'mir'], followthrough: ['mir', 'finish'] };
export const SEQUENCE = ['set', 'balance', 'contact', 'mer', 'release', 'mir', 'finish'];

// What to look at in each phase drawing. `at` is a joint of the end pose; `off` moves the marker clear of the body.
// The wording restates the phase data in delivery.json; it adds no new numbers.
export const CUES = {
  windup: { trace: ['leg2.K', -0.35], pins: [['leg2.K', [16, -12], 'Lead knee lifts to the balance point.'], ['P', [-28, 4], 'Center of mass stays stacked over the drive foot.'], ['leg1.K', [-20, 6], 'Drive leg balances the body (glutes, quadriceps, foot).']] },
  stride: { trace: ['leg2.A', 0.3], pins: [['leg2.A', [16, -22], 'Stride reaches about 80–85% of body height.'], ['P', [2, 28], 'Pelvis stays mostly closed as the body moves to the plate.'], ['arm1.E', [-8, -22], 'Hands separate and the throwing arm rises to about 90° of abduction.']] },
  cocking: { trace: ['arm1.H', -0.35], pins: [['arm1.E', [16, -22], 'Arm lays back to about 170–180° of external rotation.'], ['P', [-28, 6], 'Pelvis rotates toward the plate, then the trunk.'], ['leg2.K', [22, -6], 'Lead leg plants and firms up.']] },
  acceleration: { trace: ['arm1.H', -0.3], pins: [['arm1.S', [-20, -20], 'Shoulder rotates in at about 7000–7500°/s near release.'], ['arm1.E', [6, -24], 'Elbow extends at about 2300–2500°/s.'], ['leg2.K', [24, 0], 'Lead knee extends and brakes the pelvis.']] },
  deceleration: { trace: ['arm1.H', -0.3], pins: [['arm1.S', [-30, -4], 'Posterior cuff brakes the arm (eccentric).'], ['arm1.E', [22, -14], 'Biceps and brachialis slow elbow extension.'], ['leg2.K', [24, 6], 'Trunk flexes over the front leg to share the braking.']] },
  followthrough: { trace: ['arm1.H', -0.25], pins: [['S', [-22, -18], 'Trunk finishes flexed over a stable lead leg.'], ['leg1.A', [-18, -16], 'Drive leg swings through to a fielding position.'], ['arm1.H', [22, 14], 'Arm settles and shoulder activity drops.']] },
};

function scene(x0, x1) {
  const y0 = ground(x0), y1 = ground(x1), base = 262;
  const top = [[x0, y0], ...(x0 < 96 && x1 > 96 ? [[96, 232]] : []), [x1, y1]];
  const fmt = p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const rubber = x0 < 66 && x1 > 90 ? `<rect class="ath-rubber" x="70" y="229.4" width="17" height="4.2" rx="1"/>` : '';
  return `<path class="ath-dirt" d="M${top.map(fmt).join('L')}L${fmt([x1, base])}L${fmt([x0, base])}Z"/><path class="ath-groundline" d="M${top.map(fmt).join('L')}"/>${rubber}`;
}

/** Drawing for one phase: the event that starts it (faded) and the event that ends it, plus numbered cues. */
export function phaseFigure(phaseId, { pins = true, mirror = false } = {}) {
  const span = PHASE_SPANS[phaseId];
  if (!span) return '';
  const [from, to] = span.map(k => POSES[k]);
  const a = athlete(from, { mode: 'ghost', ground }), b = athlete(to, { ground });
  const cue = CUES[phaseId], marks = [], pts = [...extent(a.joints), ...extent(b.joints)];
  if (cue?.trace) marks.push(motionArrow(jointAt(a.joints, cue.trace[0]), jointAt(b.joints, cue.trace[0]), cue.trace[1]));
  if (pins) (cue?.pins || []).forEach(([at, off], i) => { const p = jointAt(b.joints, at); marks.push(pin(i + 1, p, off, mirror)); pts.push(add(add(p, off), [9, 0]), add(add(p, off), [-9, -9])); });
  const vb = frameFor(pts, { minWidth: 250, bottom: 256, top: 999 });
  return svg(scene(vb[0], vb[0] + vb[2]) + a.svg + b.svg + marks.join(''), vb, { cls: 'pitch-fig', mirror, label: `${from.label} (faded) to ${to.label}. ${mirror ? 'Left-handed pitcher seen from the first-base side.' : 'Right-handed pitcher seen from the third-base side.'}` });
}

/** Small drawing of a single event for the whole-delivery strip. */
export function eventFigure(key, { mirror = false } = {}) {
  const p = POSES[key], a = athlete(p, { ground }), vb = frameFor(extent(a.joints), { minWidth: 170, bottom: 250, padX: 14 });
  return svg(scene(vb[0], vb[0] + vb[2]) + a.svg, vb, { cls: 'pitch-fig ath-mini', mirror, label: p.label });
}

export const cueList = phaseId => (CUES[phaseId]?.pins || []).map(p => p[2]);
export const VIEW_NOTE = 'Right-handed pitcher from the third-base side. He starts chest-on to you and turns to face the plate.';
export const viewNote = lefty => lefty ? 'Left-handed pitcher from the first-base side. He starts chest-on to you and turns to face the plate.' : VIEW_NOTE;
export const HAND = { label: 'Throws', noun: 'pitcher', toward: 'To the plate', view: lefty => lefty ? 'From first base' : 'From third base' };

// Moving version. Step lengths are evened out so each phase can be seen; they are not real timing.
export function motion() {
  const m = createMotion({ poses: POSES, sequence: SEQUENCE, ground, durations: [1.1, 1.1, 0.8, 0.5, 0.5, 0.8],
    // Into layback the elbow stays near shoulder height while the trunk turns, so the arm slides across rather than swinging overhead.
    turns: { 'contact>mer': { arm1: 'across' } } });
  const rel = SEQUENCE.indexOf('release'), at = m.keys[rel], from = add(m.solved[rel].arm1.H, dir(at.arm1[1]), 3.2), vb = m.viewBox;
  return {
    ...m, scene: scene(vb[0], vb[0] + vb[2]),
    // After release the ball leaves the hand toward the plate.
    extra(f) {
      const dt = f.t - m.times[rel]; if (dt <= 0) return '';
      const c = [from[0] + dt * 520, from[1] + dt * 30];
      return c[0] > vb[0] + vb[2] + 6 ? '' : `<circle class="ath-ball" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.5"/>`;
    },
  };
}
