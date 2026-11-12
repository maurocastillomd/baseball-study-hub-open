// 3D baseball swing: a right-handed hitter seen from across the plate, pitcher toward +x.
// Positions follow the descriptions and the few published angles in data/swing.json.
// Teaching model, not motion-capture data.
import { createModel, V, arcBetween } from './figure3d.js';
import { makeFigures } from './figures3d-kit.js';

const ground = () => 0;
const REAR = { x: -0.3, yaw: 0 }, LEAD = { x: 0.64, yaw: 32, knee: [0.5, 0.3, 1] };

// pelvis = [x, height, z]. yawP / yawS = pelvis / shoulders turned toward the pitcher (0 = closed, 90 = facing the pitcher).
// lean = trunk [toward the pitcher, toward the plate]. grip = bottom hand in the chest frame [toward the rear side, up, forward];
// bat = direction of the barrel in the chest frame. foot1 = rear foot, foot2 = lead foot.
const KEYS = [
  { id: 'stance', label: 'Stance', event: true, at: 0, pelvis: [0, 0.925, 0], yawP: 0, yawS: -4, lean: [0, 12], plean: [0, 4], head: [78, 0], grip: [0.2, -0.04, 0.2], bat: [0.2, 0.95, -0.25], foot1: REAR, foot2: { x: 0.3, yaw: 6 } },
  { id: 'load', label: 'Lead foot off', event: true, at: 0.9, pelvis: [-0.07, 0.92, 0], yawP: -8, yawS: -16, lean: [-4, 12], plean: [-1, 4], head: [84, 0], grip: [0.24, -0.02, 0.17], bat: [0.12, 0.9, -0.4], foot1: REAR, foot2: { x: 0.28, lift: 0.13, yaw: 0, pitch: 18 } },
  { id: 'contact', label: 'Lead foot contact', event: true, at: 1.8, pelvis: [0.12, 0.85, 0], yawP: 2, yawS: -22, lean: [-5, 12], plean: [-1, 4], head: [88, 0], grip: [0.27, 0, 0.13], bat: [0.1, 0.85, -0.5], foot1: REAR, foot2: LEAD },
  { id: 'launch', label: 'Hands start forward', event: true, at: 2.5, pelvis: [0.17, 0.82, 0.02], yawP: 40, yawS: 4, lean: [-7, 12], plean: [-2, 4], head: [86, 0], grip: [0.22, -0.08, 0.2], bat: [0.55, 0.5, -0.65], foot1: { x: -0.28, lift: 0.03, yaw: 36, pitch: 24, knee: [0.8, 0, 0.6] }, foot2: LEAD },
  { id: 'impact', label: 'Ball contact', event: true, at: 3.0, pelvis: [0.21, 0.9, 0.03], yawP: 88, yawS: 76, lean: [-12, 8], plean: [-4, 2], head: [60, 14], grip: [0.13, -0.38, 0.3], bat: [0.95, -0.12, 0.2], pole1: [0.6, -1, -0.5], foot1: { x: -0.2, lift: 0.06, yaw: 88, pitch: 62, knee: [1, 0, 0.2] }, foot2: LEAD },
  { id: 'extension', at: 3.25, pelvis: [0.22, 0.91, 0.03], yawP: 96, yawS: 106, lean: [-11, 6], plean: [-4, 2], head: [50, 14], grip: [-0.04, -0.3, 0.5], bat: [-0.3, 0.1, 0.9], foot1: { x: -0.18, lift: 0.07, yaw: 92, pitch: 66, knee: [1, 0, 0.2] }, foot2: LEAD },
  { id: 'wrap', at: 3.5, pelvis: [0.22, 0.92, 0.03], yawP: 100, yawS: 132, lean: [-9, 4], plean: [-3, 1], head: [70, 6], grip: [-0.2, -0.1, 0.34], bat: [-0.9, 0.35, 0.1], foot1: { x: -0.17, lift: 0.07, yaw: 94, pitch: 68, knee: [1, 0, 0.2] }, foot2: LEAD },
  { id: 'finish', label: 'Finish', event: true, at: 3.8, pelvis: [0.22, 0.93, 0.03], yawP: 102, yawS: 150, lean: [-8, 2], plean: [-3, 1], head: [84, 0], grip: [-0.22, 0.02, 0.18], bat: [-0.35, -0.25, -0.9], foot1: { x: -0.16, lift: 0.07, yaw: 95, pitch: 68, knee: [1, 0, 0.2] }, foot2: LEAD },
];
export const model = () => createModel({ keys: KEYS, ground, kit: 'hitter' });

export const PHASE_SPANS = { load: ['stance', 'load'], stride: ['load', 'contact'], transition: ['contact', 'launch'], acceleration: ['launch', 'impact'], followthrough: ['impact', 'finish'] };
export const SEQUENCE = KEYS.filter(k => k.event).map(k => k.id);
export const POSES = Object.fromEntries(KEYS.map(k => [k.id, { label: k.label }]));

// Numbered cues for each phase picture. The wording restates data/swing.json; it adds no new numbers.
export const CUES = {
  load: { trace: 'leg2.A', pins: [['leg1.K', [-46, 6], 'Weight shifts toward the rear foot.'], ['S', [56, -10], 'The trunk coils away from the pitcher.'], ['leg2.A', [44, -8], 'Lead foot comes off the ground.']] },
  stride: { trace: 'leg2.A', pins: [['leg2.A', [36, -40], 'Lead foot lands; the stride sets the base.'], ['arm2.H', [-44, -34], 'Hands stay back while the body moves forward.'], ['P', [0, 58], 'Pelvis is still mostly closed at foot contact.']] },
  transition: { trace: 'bat.tip', pins: [['leg2.K', [46, -8], 'Lead knee flexes (about 31° in adult hitters).'], ['P', [-56, 12], 'Pelvis starts to open toward the pitcher.'], ['S', [52, -30], 'Upper torso stays more closed than the pelvis.']] },
  acceleration: { trace: 'bat.tip', pins: [['leg2.K', [46, -4], 'Lead knee extends (about 59° in adult hitters).'], ['S1', [-48, -30], 'Upper torso turns at about 857°/s.'], ['bat.mid', [10, 44], 'Bat reaches about 30 m/s at contact.']] },
  followthrough: { trace: 'bat.tip', pins: [['P', [-60, -4], 'Trunk keeps rotating; obliques stay highly active.'], ['leg2.K', [46, 0], 'Weight finishes against a firm lead leg.'], ['arm2.H', [54, 12], 'Arms and bat slow down around the body.']] },
};

// Published back-arm position at contact (Dowling 2016, pro hitters off a tee).
function arcs(id, j) {
  if (id !== 'impact') return [];
  const A = j.arm1, points = arcBetween(A.E, A.E.clone().sub(A.S), A.W.clone().sub(A.E), 0.15);
  return [{ points, label: 'Back elbow ≈78°', from: A.E, at: points[Math.round(points.length / 2)].clone() }];
}
const contactPoint = j => j.bat.knob.clone().addScaledVector(j.bat.d, 0.72).add(V(0.045, 0.01, 0));

const HAND = { label: 'Bats', noun: 'hitter', toward: 'To the pitcher', view: () => 'From across the plate' };
const viewNote = lefty => `${lefty ? 'Left' : 'Right'}-handed hitter from across the plate, pitcher to the ${lefty ? 'left' : 'right'}.`;

export default makeFigures({
  kind: 'hit', model, ground, PHASE_SPANS, SEQUENCE, POSES, CUES, arcs, HAND, viewNote,
  stage: { x0: -0.95, x1: 1.25, z0: -0.6, z1: 1.1 }, trail: 'bat.tip', view: { az: 36, el: 20 },
  stillBall: (id, j) => id === 'impact' ? contactPoint(j) : null,
  // The pitch comes in from the right, meets the barrel at contact, and leaves.
  ballFlight: M => { const t0 = M.events.find(e => e.id === 'impact').at, hit = contactPoint(M.jointsAt(t0)); return t => { const dt = t - t0; return dt < -0.5 || dt > 0.45 ? null : dt <= 0 ? hit.clone().add(V(-dt * 5, -dt * 0.4, 0)) : hit.clone().add(V(dt * 6, dt * 1.6, 0)); }; },
});
