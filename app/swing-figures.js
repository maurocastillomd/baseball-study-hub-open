// Drawings of the baseball swing: a right-handed hitter seen from across the plate
// (the first-base side), so his chest faces the viewer in the stance and the pitcher
// is off to the right. The pelvis and shoulders narrow as they turn toward the pitcher.
// Teaching sketches, not motion-capture data.
import { athlete, extent, frameFor, jointAt, motionArrow, pin, svg, add } from './athlete-figures.js';
import { createMotion } from './figure-motion.js';

const ground = () => 232;
const REAR = 96; // rear foot stays near this spot through contact

// pelvis = [x, height above ground]. leg1 = rear leg, leg2 = lead leg, each placed by its foot:
// foot = [x, lift, toe direction, shoe length scale], knee = sideways nudge of the knee.
// grip = bottom-hand position relative to the shoulder line; bat = [direction, length scale].
export const POSES = {
  stance:  { label: 'Stance',              t: 0,  sh: 1,     hp: 1,    pelvis: [128, 79], leg1: { foot: [REAR, 0, -90, 0.5], knee: [-3, 2] },  leg2: { foot: [160, 0, 90, 0.5], knee: [3, 2] },   grip: [-21, 3],  bat: [196, 1],    k1: 0.62, el1: 'left', el2: 'down', batLayer: 'front' },
  load:    { label: 'Lead foot off',       t: -4, sh: 1,     hp: 0.95, pelvis: [122, 80], leg1: { foot: [REAR, 0, -90, 0.5], knee: [-2, 2] },  leg2: { foot: [150, 13, 115, 0.6], knee: [-5, -4] }, grip: [-25, 2],  bat: [202, 1],    k1: 0.62, el1: 'left', el2: 'down', batLayer: 'front' },
  contact: { label: 'Lead foot contact',   t: -3, sh: 1,     hp: 0.85, pelvis: [138, 75], leg1: { foot: [REAR, 0, -90, 0.5], knee: [2, 3] },   leg2: { foot: [182, 0, 90, 0.6], knee: [4, 1] },   grip: [-26, 1],  bat: [208, 1],    k1: 0.62, el1: 'left', el2: 'down', batLayer: 'front' },
  launch:  { label: 'Hands start forward', t: -2, sh: 0.85,  hp: 0.5,  pelvis: [145, 72], leg1: { foot: [REAR + 2, 3, -40, 0.7], knee: [9, 2] }, leg2: { foot: [182, 0, 90, 0.65], knee: [6, 0] },  grip: [-16, 9],  bat: [236, 0.95], k1: 0.7,  el1: 'down', el2: 'down', batLayer: 'mid' },
  impact:  { label: 'Ball contact',        t: -9, sh: 0.25,  hp: 0.1,  pelvis: [152, 80], leg1: { foot: [REAR + 12, 7, 18, 0.9], knee: [16, 4] }, leg2: { foot: [182, 0, 90, 0.75], knee: [0, 0] },  grip: [27, 33],  bat: [58, 0.82],  k1: 1,    el1: 'down', el2: 'right', batLayer: 'front', ball: true },
  finish:  { label: 'Finish',              t: -5, sh: -0.75, hp: -0.6, pelvis: [154, 84], leg1: { foot: [REAR + 16, 8, 12, 0.9], knee: [14, 4] }, leg2: { foot: [182, 0, 90, 0.8], knee: [0, 0] },   grip: [25, -3],  bat: [-62, 0.9],  k1: 0.8,  el1: 'down', el2: 'down', batLayer: 'back', armOrder: 'lead-first' },
};
export const PHASE_SPANS = { load: ['stance', 'load'], stride: ['load', 'contact'], transition: ['contact', 'launch'], acceleration: ['launch', 'impact'], followthrough: ['impact', 'finish'] };
export const SEQUENCE = ['stance', 'load', 'contact', 'launch', 'impact', 'finish'];

// Numbered cues for each phase drawing. The wording restates swing.json; it adds no new numbers.
export const CUES = {
  load: { trace: ['leg2.A', -0.4], pins: [['leg1.K', [-22, 2], 'Weight shifts toward the rear foot.'], ['S', [26, -8], 'The trunk coils away from the pitcher.'], ['leg2.A', [20, -4], 'Lead foot comes off the ground.']] },
  stride: { trace: ['leg2.A', -0.3], pins: [['leg2.A', [18, -18], 'Lead foot lands; the stride sets the base.'], ['arm2.H', [-20, -16], 'Hands stay back while the body moves forward.'], ['P', [0, 26], 'Pelvis is still mostly closed at foot contact.']] },
  transition: { trace: ['bat.tip', -0.3], pins: [['leg2.K', [22, -4], 'Lead knee flexes (about 31° in adult hitters).'], ['P', [-26, 6], 'Pelvis starts to open toward the pitcher.'], ['S', [24, -14], 'Upper torso stays more closed than the pelvis.']] },
  acceleration: { trace: ['bat.tip', 0.45], pins: [['leg2.K', [22, -2], 'Lead knee extends (about 59° in adult hitters).'], ['S1', [-22, 10], 'Upper torso turns at about 857°/s.'], ['bat.mid', [14, 18], 'Bat reaches about 30 m/s at contact.']] },
  followthrough: { trace: ['arm2.H', -0.45], pins: [['P', [-30, -2], 'Trunk keeps rotating; obliques stay highly active.'], ['leg2.K', [22, 0], 'Weight finishes against a firm lead leg.'], ['arm2.H', [26, 6], 'Arms and bat slow down around the body.']] },
};

function scene(x0, x1, plateX) {
  const y = 232, base = 262;
  return `<path class="ath-dirt" d="M${x0} ${y}L${x1} ${y}L${x1} ${base}L${x0} ${base}Z"/><path class="ath-groundline" d="M${x0} ${y}L${x1} ${y}"/><rect class="ath-plate" x="${plateX - 13}" y="${y + 6}" width="26" height="4" rx="1"/>`;
}
const pitched = c => `<circle class="ath-ball" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.5" style="stroke:var(--ath-ink);stroke-width:1.3"/>`;

/** Drawing for one phase: the event that starts it (faded) and the event that ends it, plus numbered cues. */
export function phaseFigure(phaseId, { pins = true, mirror = false } = {}) {
  const span = PHASE_SPANS[phaseId];
  if (!span) return '';
  const [from, to] = span.map(k => POSES[k]);
  const a = athlete(from, { kit: 'hitter', mode: 'ghost', ground }), b = athlete(to, { kit: 'hitter', ground });
  const cue = CUES[phaseId], marks = [], pts = [...extent(a.joints), ...extent(b.joints)];
  if (to.ball) marks.push(pitched(add(b.joints.bat.tip, b.joints.bat.d, -9)));
  if (cue?.trace) marks.push(motionArrow(jointAt(a.joints, cue.trace[0]), jointAt(b.joints, cue.trace[0]), cue.trace[1]));
  if (pins) (cue?.pins || []).forEach(([at, off], i) => { const p = jointAt(b.joints, at); marks.push(pin(i + 1, p, off, mirror)); pts.push(add(add(p, off), [9, 0]), add(add(p, off), [-9, -9])); });
  const vb = frameFor(pts, { minWidth: 250, bottom: 256, top: 999 });
  return svg(scene(vb[0], vb[0] + vb[2], 140) + a.svg + b.svg + marks.join(''), vb, { cls: 'swing-fig', mirror, label: `${from.label} (faded) to ${to.label}. ${mirror ? 'Left-handed' : 'Right-handed'} hitter seen from across the plate.` });
}

/** Small drawing of a single event for the whole-swing strip. */
export function eventFigure(key, { mirror = false } = {}) {
  const p = POSES[key], a = athlete(p, { kit: 'hitter', ground }), vb = frameFor(extent(a.joints), { minWidth: 170, bottom: 250, padX: 14 });
  return svg(scene(vb[0], vb[0] + vb[2], 140) + a.svg + (p.ball ? pitched(add(a.joints.bat.tip, a.joints.bat.d, -9)) : ''), vb, { cls: 'swing-fig ath-mini', mirror, label: p.label });
}

export const cueList = phaseId => (CUES[phaseId]?.pins || []).map(p => p[2]);
export const VIEW_NOTE = 'Right-handed hitter from across the plate, pitcher to the right. He starts chest-on to you and turns toward the pitcher.';
export const viewNote = lefty => lefty ? 'Left-handed hitter from across the plate, pitcher to the left. He starts chest-on to you and turns toward the pitcher.' : VIEW_NOTE;
export const HAND = { label: 'Bats', noun: 'hitter', toward: 'To the pitcher', view: () => 'From across the plate' };

// Moving version. Step lengths are evened out so each phase can be seen; they are not real timing.
export function motion() {
  // The barrel drops behind the hitter and comes around, then finishes up and over the lead shoulder.
  const m = createMotion({ poses: POSES, sequence: SEQUENCE, kit: 'hitter', ground, durations: [0.9, 0.9, 0.7, 0.5, 0.8], turns: { 'launch>impact': { bat: 1 }, 'impact>finish': { bat: 1 } } });
  const hit = SEQUENCE.indexOf('impact'), bat = m.solved[hit].bat, c = add(bat.tip, bat.d, -9), vb = m.viewBox, T = m.times[hit];
  return {
    ...m, scene: scene(vb[0], vb[0] + vb[2], 140),
    // The pitch comes in from the pitcher's side, meets the barrel at ball contact, and leaves.
    extra(f) {
      const dt = f.t - T, p = dt <= 0 ? [c[0] - dt * 420, c[1] + dt * 26] : [c[0] + dt * 460, c[1] - dt * 190];
      return p[0] > vb[0] + vb[2] + 6 || p[1] < vb[1] - 6 ? '' : pitched(p);
    },
  };
}
