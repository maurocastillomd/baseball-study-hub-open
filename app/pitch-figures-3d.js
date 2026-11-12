// 3D pitching delivery: a right-handed pitcher, plate toward +x. Key positions are set
// to the published averages listed in data/delivery.json (stride length, lead knee
// flexion, shoulder abduction and external rotation, elbow flexion, hip-shoulder
// separation, trunk tilt). Teaching model, not motion-capture data.
import { createModel, DIM, V, arcBetween, arcPoints, jointAt } from './figure3d.js';
import { makeFigures } from './figures3d-kit.js';

const ground = x => x < 0.15 ? 0 : -(x - 0.15) * 0.083; // mound slopes about 1 inch per foot
const chest = { to: [0.02, -0.17, 0.2], pole: [0.7, -1, 0.1] }, gloveChest = { to: [-0.04, -0.16, 0.21], pole: [-0.7, -1, 0.1] };

// pelvis = [x, height, z]. yawP / yawS = pelvis / shoulders turned toward the plate (0 = closed, 90 = square to the plate).
// lean = trunk [toward the plate, toward third base]. arm1 = throwing arm, arm2 = glove arm, foot1 = drive foot, foot2 = lead foot.
const KEYS = [
  { id: 'set', label: 'Set', event: true, at: 0, pelvis: [0.21, 0.962, 0], yawP: 0, yawS: 0, lean: [0, 2], head: [62, 0], arm1: chest, arm2: gloveChest, foot1: { x: 0.06, yaw: 0 }, foot2: { x: 0.36, yaw: 8 } },
  { id: 'balance', label: 'Balance point', event: true, at: 1.1, pelvis: [0.11, 0.958, 0], yawP: -12, yawS: -14, lean: [-3, 2], head: [72, 0], arm1: { to: [0.02, -0.13, 0.2], pole: [0.7, -1, 0.1] }, arm2: { to: [-0.04, -0.12, 0.21], pole: [-0.7, -1, 0.1] }, foot1: { x: 0.06, yaw: 0 }, foot2: { x: 0.22, z: 0.36, lift: 0.56, yaw: 35, pitch: 25, knee: [0.15, 1, 0.5] } },
  { id: 'contact', label: 'Foot contact', event: true, at: 2.2, pelvis: [0.99, 0.63, 0.02], yawP: 30, yawS: -18, lean: [-4, 0], plean: [0, 0], head: [100, 0], arm1: { abd: 90, hor: -18, er: 52, flex: 90 }, arm2: { abd: 82, hor: 12, er: -15, flex: 62 }, foot1: { x: 0.1, lift: 0.07, yaw: 25, pitch: 38, knee: [0.5, 0.1, 1] }, foot2: { x: 1.56, z: 0.04, yaw: 78, knee: [0.6, 0.6, 0.5] } },
  { id: 'mer', label: 'Max external rotation', event: true, at: 3.0, pelvis: [1.17, 0.69, 0.02], yawP: 86, yawS: 84, lean: [10, -17], plean: [4, -4], head: [90, 0], arm1: { abd: 96, hor: 12, er: 175, flex: 94 }, arm2: { to: [-0.2, -0.3, 0.14], pole: [-1, -0.6, -0.2] }, foot1: { x: 0.42, z: 0.1, lift: 0.1, yaw: 80, pitch: 72, knee: [1, -0.2, 0.3] }, foot2: { x: 1.56, z: 0.04, yaw: 78, knee: [1, 0.6, 0.1] } },
  { id: 'release', label: 'Ball release', event: true, at: 3.5, pelvis: [1.25, 0.75, 0.02], yawP: 96, yawS: 108, lean: [35, -27], plean: [14, -6], head: [90, 8], arm1: { abd: 98, hor: 14, er: 112, flex: 22 }, arm2: { to: [-0.15, -0.3, 0.2], pole: [-1, -0.9, 0] }, foot1: { x: 0.72, z: 0.16, lift: 0.3, yaw: 85, pitch: 80, knee: [1, -0.3, 0.3] }, foot2: { x: 1.56, z: 0.04, yaw: 78, knee: [1, 0.6, 0.1] } },
  { id: 'mir', label: 'Max internal rotation', event: true, at: 4.0, ball: false, pelvis: [1.31, 0.79, 0.03], yawP: 104, yawS: 128, lean: [50, -18], plean: [22, -5], head: [92, 14], arm1: { abd: 72, hor: 58, er: 8, flex: 24 }, arm2: { to: [-0.14, -0.3, 0.22], pole: [-1, -1, 0.1] }, foot1: { x: 0.92, z: 0.3, lift: 0.72, yaw: 95, pitch: 60, knee: [0.4, -0.5, 1] }, foot2: { x: 1.56, z: 0.04, yaw: 78, knee: [1, 0.6, 0.1] } },
  { id: 'finish', label: 'Finish', event: true, at: 4.8, ball: false, pelvis: [1.4, 0.81, 0.16], yawP: 112, yawS: 142, lean: [60, -6], plean: [26, -2], head: [95, 30], arm1: { abd: 34, hor: 82, er: 0, flex: 18 }, arm2: { to: [-0.12, -0.3, 0.24], pole: [-1, -1, 0.1] }, foot1: { x: 1.3, z: 0.46, lift: 0.0, yaw: 80, pitch: 0, knee: [1, 0.4, 0.5] }, foot2: { x: 1.56, z: 0.04, yaw: 78, knee: [1, 0.6, 0.1] } },
];
export const model = () => createModel({ keys: KEYS, ground, kit: 'pitcher' });

export const PHASE_SPANS = { windup: ['set', 'balance'], stride: ['balance', 'contact'], cocking: ['contact', 'mer'], acceleration: ['mer', 'release'], deceleration: ['release', 'mir'], followthrough: ['mir', 'finish'] };
export const SEQUENCE = KEYS.filter(k => k.event).map(k => k.id);
export const POSES = Object.fromEntries(KEYS.map(k => [k.id, { label: k.label }]));

// What to look at in each phase picture. `off` moves the marker clear of the body (picture pixels).
// The wording restates data/delivery.json; it adds no new numbers.
export const CUES = {
  windup: { trace: 'leg2.K', pins: [['leg2.K', [34, -18], 'Lead knee lifts to the balance point.'], ['P', [-52, 4], 'Center of mass stays stacked over the drive foot.'], ['leg1.K', [-40, 10], 'Drive leg balances the body (glutes, quadriceps, foot).']] },
  stride: { trace: 'leg2.A', pins: [['leg2.A', [52, 24], 'Stride reaches about 80–85% of body height.'], ['P', [0, 52], 'Pelvis stays mostly closed as the body moves to the plate.'], ['arm1.E', [-50, 30], 'Hands separate and the throwing arm rises to about 90° of abduction.']] },
  cocking: { trace: 'arm1.H', pins: [['arm1.E', [-64, 30], 'Arm lays back to about 170–180° of external rotation.'], ['P', [-50, 16], 'Pelvis rotates toward the plate, then the trunk.'], ['leg2.K', [44, -10], 'Lead leg plants and firms up.']] },
  acceleration: { trace: 'arm1.H', pins: [['arm1.S', [-120, 30], 'Shoulder rotates in at about 7000–7500°/s near release.'], ['arm1.E', [44, -44], 'Elbow extends at about 2300–2500°/s.'], ['leg2.K', [46, 4], 'Lead knee extends and brakes the pelvis.']] },
  deceleration: { trace: 'arm1.H', pins: [['arm1.S', [-50, -24], 'Posterior cuff brakes the arm (eccentric).'], ['arm1.E', [40, -30], 'Biceps and brachialis slow elbow extension.'], ['leg2.K', [46, 14], 'Trunk flexes over the front leg to share the braking.']] },
  followthrough: { trace: 'arm1.H', pins: [['S', [-40, -40], 'Trunk finishes flexed over a stable lead leg.'], ['leg1.A', [34, -34], 'Drive leg swings through to a fielding position.'], ['arm1.H', [-46, 20], 'Arm settles and shoulder activity drops.']] },
};

// Measured angles drawn on the body at each key event. Labels repeat data/delivery.json.
function arcs(id, j) {
  const out = [], L = j.leg2, A = j.arm1, up = V(0, 1, 0);
  const add = (points, label, from = null, k = 0.5) => out.push({ points, label, from, at: points[Math.round((points.length - 1) * k)].clone() });
  const knee = () => add(arcBetween(L.K, L.K.clone().sub(L.H), L.A.clone().sub(L.K), 0.2), 'Knee 45–50°', L.K);
  if (id === 'contact') {
    knee();
    const s0 = j.leg1.A.clone().setY(ground(j.leg1.A.x) + 0.01), s1 = L.A.clone().setY(ground(L.A.x) + 0.01);
    out.push({ points: [s0, s1], label: 'Stride ≈80–85% of height', from: null, at: s0.clone().lerp(s1, 0.45) });
    add(arcBetween(A.S, j.uc.clone().negate(), A.E.clone().sub(A.S), 0.2), 'Abduction ≈90°', A.S);
  }
  if (id === 'mer') add(arcPoints(A.E, A.db.clone().applyAxisAngle(A.da, -175 * Math.PI / 180), A.da, 175, 0.19), 'Layback 170–180°', A.E);
  if (id === 'release') {
    add([j.P.clone(), j.P.clone().addScaledVector(up, 0.62)], '', null); add(arcBetween(j.P, up, j.C.clone().sub(j.P), 0.5), 'Trunk tilt 30–40°', j.P);
  }
  return out;
}

const HAND = { label: 'Throws', noun: 'pitcher', toward: 'To the plate', view: lefty => lefty ? 'From first base' : 'From third base' };
const viewNote = lefty => `${lefty ? 'Left' : 'Right'}-handed pitcher from the ${lefty ? 'first' : 'third'}-base side. Each position is set to the published averages in the tables below.`;

export default makeFigures({
  kind: 'pitch', model, ground, PHASE_SPANS, SEQUENCE, POSES, CUES, arcs, HAND, viewNote,
  stage: { x0: -0.55, x1: 2.25, z0: -0.7, z1: 0.95 }, trail: 'arm1.H',
  // After release the ball leaves the hand toward the plate.
  ballFlight: M => { const t0 = M.events.find(e => e.id === 'release').at, from = jointAt(M.jointsAt(t0), 'arm1.H').clone(); return t => t <= t0 ? null : (t - t0) * 9 > 3 ? null : from.clone().add(V((t - t0) * 9, -(t - t0) * 0.5, 0)); },
});
export { DIM };
