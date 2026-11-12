// 3D ballplayer for the pitching and hitting pages. The body is a jointed model:
// each key position is written as joint angles and foot placements (in degrees and
// metres), the model works out every joint in space, and the same model is used for
// the still pictures, the phase strip and the moving view. Because it is a real 3D
// body it can be seen from the side, the front or above.
//
// These are teaching models set to published average positions. They are not
// motion-capture data and not a measurement of any one athlete.
//
// World axes: +x = toward the plate (pitcher) or toward the pitcher (hitter),
// +y = up, +z = toward the viewer in the default side view. Yaw 0 = chest toward +z,
// yaw 90 = chest toward +x. Side 1 = right (throwing arm, drive/rear leg), side 2 = left.
import * as THREE from 'three';

const D2R = Math.PI / 180;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Body sizes in metres (stands about 1.80 m tall with the cap).
export const DIM = { ankle: 0.085, shank: 0.43, thigh: 0.45, hip: 0.095, torso: 0.52, shoulder: 0.195, neck: 0.075, head: 0.108, upper: 0.30, fore: 0.265, hand: 0.075, foot: 0.25, bat: 0.86, height: 1.80 };

// ---------------------------------------------------------------- pose maths
const qYaw = d => new THREE.Quaternion().setFromAxisAngle(Y, d * D2R);
/** Lean of the trunk: `lx` degrees toward +x, `lz` degrees toward +z. */
const qLean = (lx, lz) => new THREE.Quaternion().setFromAxisAngle(Z, -lx * D2R).multiply(new THREE.Quaternion().setFromAxisAngle(X, lz * D2R));
const local = (q, r, u, f) => V(-r, u, f).applyQuaternion(q); // [toward the right side, up, forward] in a body frame

/** Arm directions in the chest frame from anatomical angles (degrees).
 * abd = elevation away from the side; hor = horizontal adduction (+ forward, - behind);
 * er = external rotation (0 forearm forward, 90 up, 180 back); flex = elbow flexion. */
function armDirs({ abd = 0, hor = 0, er = 0, flex = 0 }, side) {
  const s = side === 1 ? 1 : -1, L = V(-s, 0, 0), U = V(0, 1, 0), F = V(0, 0, 1);
  const a = U.clone().multiplyScalar(-Math.cos(abd * D2R)).add(L.clone().multiplyScalar(Math.cos(hor * D2R)).add(F.clone().multiplyScalar(Math.sin(hor * D2R))).multiplyScalar(Math.sin(abd * D2R))).normalize();
  let e1 = F.clone().addScaledVector(a, -F.dot(a));
  if (e1.length() < 0.15) e1 = U.clone().addScaledVector(a, -U.dot(a));
  e1.normalize();
  const e2 = a.clone().cross(e1).multiplyScalar(s);
  const b = a.clone().multiplyScalar(Math.cos(flex * D2R)).add(e1.clone().multiplyScalar(Math.cos(er * D2R)).add(e2.clone().multiplyScalar(Math.sin(er * D2R))).multiplyScalar(Math.sin(flex * D2R))).normalize();
  return { a, b, ref: e1, e2 };
}

/** Two-bone reach from `A` to `T`; the middle joint bends toward `pole`. */
function ik(A, T, l1, l2, pole) {
  const v = T.clone().sub(A); let d = v.length() || 1e-4; const dir = v.clone().multiplyScalar(1 / d);
  d = clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.004);
  const ca = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), h = l1 * Math.sqrt(1 - ca * ca);
  let p = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (p.length() < 1e-3) p = Y.clone().addScaledVector(dir, -dir.y);
  p.normalize();
  const mid = A.clone().addScaledVector(dir, l1 * ca).addScaledVector(p, h);
  return { mid, end: A.clone().addScaledVector(dir, d) };
}

const FOOT0 = { x: 0, z: 0, lift: 0, yaw: 0, pitch: 0 };
/** Fill in a hand-written key pose so every key has the same fields. */
function normalize(o, ground) {
  const lean = o.lean || [0, 0], pl = o.plean || [lean[0] * 0.35, lean[1] * 0.35];
  const n = {
    label: o.label, ball: o.ball !== false, s: {
      px: o.pelvis[0], py: o.pelvis[1], pz: o.pelvis[2] || 0, yawP: o.yawP || 0, yawS: o.yawS ?? o.yawP ?? 0,
      lx: lean[0], lz: lean[1], plx: pl[0], plz: pl[1], headYaw: o.head?.[0] ?? 0, headPitch: o.head?.[1] ?? 0,
    }, v: {},
  };
  for (const [k, side] of [['foot1', 1], ['foot2', 2]]) {
    const f = { ...FOOT0, ...o[k] };
    for (const key of Object.keys(FOOT0)) n.s[`${k}.${key}`] = f[key];
    n.v[`knee${side}`] = V(...(f.knee || [0, 0, 0]));
  }
  if (o.grip) { n.grip = true; n.v.grip = V(...o.grip); n.v.bat = V(...o.bat).normalize(); n.v.pole1 = V(...(o.pole1 || [0.5, -1, -0.1])).normalize(); n.v.pole2 = V(...(o.pole2 || [-0.4, -1, 0.1])).normalize(); }
  else for (const [k, side] of [['arm1', 1], ['arm2', 2]]) {
    const spec = o[k];
    if (spec.to) {
      // Reach to a point given in the chest frame, then keep the two segment directions.
      const s = side === 1 ? 1 : -1, S = V(-s * DIM.shoulder, -0.02, 0), T = V(-spec.to[0], spec.to[1], spec.to[2]);
      const pole = spec.pole ? V(-spec.pole[0], spec.pole[1], spec.pole[2]) : V(-s * 0.5, -1, -0.1);
      const r = ik(S, T, DIM.upper, DIM.fore, pole);
      n.v[`${k}a`] = r.mid.clone().sub(S).normalize(); n.v[`${k}b`] = r.end.clone().sub(r.mid).normalize();
    } else { const d = armDirs(spec, side); n.v[`${k}a`] = d.a; n.v[`${k}b`] = d.b; }
  }
  return n;
}

/** Work out every joint of a normalized pose. */
export function solve(n, ground) {
  const s = n.s, P = V(s.px, s.py, s.pz);
  const Qp = qLean(s.plx, s.plz).multiply(qYaw(s.yawP)), Qc = qLean(s.lx, s.lz).multiply(qYaw(s.yawS));
  const up = Y.clone().applyQuaternion(Qp), uc = Y.clone().applyQuaternion(Qc);
  const C = P.clone().addScaledVector(up, DIM.torso * 0.4).addScaledVector(uc, DIM.torso * 0.6);
  const Qh = qLean(s.lx * 0.45, s.lz * 0.45).multiply(qYaw(s.headYaw)).multiply(new THREE.Quaternion().setFromAxisAngle(X, s.headPitch * D2R));
  const HC = C.clone().addScaledVector(uc, DIM.neck).addScaledVector(Y.clone().applyQuaternion(Qh), DIM.head + 0.02);
  const j = { P, C, S: C, Qp, Qc, Qh, HC, up, uc };
  for (const side of [1, 2]) {
    const sg = side === 1 ? 1 : -1, k = `foot${side}`;
    const H = P.clone().add(local(Qp, sg * DIM.hip, -0.02, 0));
    const x = s[`${k}.x`], z = s[`${k}.z`], yaw = s[`${k}.yaw`] * D2R, pitch = s[`${k}.pitch`] * D2R;
    const flat = V(Math.sin(yaw), 0, Math.cos(yaw));
    const toe = flat.clone().multiplyScalar(Math.cos(pitch)).addScaledVector(Y, -Math.sin(pitch));
    const A = V(x, ground(x) + DIM.ankle + s[`${k}.lift`], z);
    const hint = n.v[`knee${side}`];
    const pole = hint.lengthSq() > 1e-4 ? hint.clone() : flat.clone().multiplyScalar(0.6).add(local(Qp, 0, 0.1, 0.5));
    const r = ik(H, A, DIM.thigh, DIM.shank, pole);
    j[`leg${side}`] = { H, K: r.mid, A: r.end, toe, footUp: Y.clone().addScaledVector(toe, -toe.y).normalize() };
  }
  const sh = side => C.clone().add(local(Qc, (side === 1 ? 1 : -1) * DIM.shoulder, -0.02, 0));
  if (n.grip) {
    const G = C.clone().add(local(Qc, n.v.grip.x, n.v.grip.y, n.v.grip.z)), bd = local(Qc, n.v.bat.x, n.v.bat.y, n.v.bat.z).normalize();
    const hands = { 2: G, 1: G.clone().addScaledVector(bd, 0.085) };
    for (const side of [1, 2]) {
      const S = sh(side), p = n.v[`pole${side}`], r = ik(S, hands[side], DIM.upper, DIM.fore + DIM.hand * 0.5, local(Qc, p.x, p.y, p.z));
      const W = r.mid.clone().lerp(r.end, DIM.fore / (DIM.fore + DIM.hand * 0.5));
      j[`arm${side}`] = { S, E: r.mid, W, H: r.end };
    }
    const knob = j.arm2.H.clone().addScaledVector(bd, -0.07);
    j.bat = { knob, mid: knob.clone().addScaledVector(bd, DIM.bat * 0.55), tip: knob.clone().addScaledVector(bd, DIM.bat), d: bd };
  } else for (const side of [1, 2]) {
    const S = sh(side), a = n.v[`arm${side}a`], b = n.v[`arm${side}b`];
    const da = local(Qc, -a.x, a.y, a.z), db = local(Qc, -b.x, b.y, b.z);
    const E = S.clone().addScaledVector(da, DIM.upper), W = E.clone().addScaledVector(db, DIM.fore);
    j[`arm${side}`] = { S, E, W, H: W.clone().addScaledVector(db, DIM.hand), da, db };
  }
  j.S1 = j.arm1.S; j.S2 = j.arm2.S; j.ball = n.ball;
  return j;
}
/** Look up a joint by name, e.g. 'leg2.K', 'arm1.E', 'P', 'S', 'bat.tip'. */
export const jointAt = (j, key) => key.split('.').reduce((o, k) => o?.[k], j);

// ------------------------------------------------------------- interpolation
function slerpDir(a, b, k) {
  const dot = clamp(a.dot(b), -1, 1), th = Math.acos(dot);
  if (th < 1e-4) return a.clone();
  const s = Math.sin(th);
  return a.clone().multiplyScalar(Math.sin((1 - k) * th) / s).addScaledVector(b, Math.sin(k * th) / s).normalize();
}
/** Smooth curve through the key values that never overshoots (so a planted foot stays planted). */
function monotone(ts, ys) {
  const n = ys.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (ts[i + 1] - ts[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]);
  return (i, k) => {
    const h = ts[i + 1] - ts[i], k2 = k * k, k3 = k2 * k;
    return (2 * k3 - 3 * k2 + 1) * ys[i] + (k3 - 2 * k2 + k) * h * m[i] + (-2 * k3 + 3 * k2) * ys[i + 1] + (k3 - k2) * h * m[i + 1];
  };
}

/**
 * Build a moving model from key poses.
 * keys: [{ id, at (seconds), event (true for a named key event), ...pose }]
 */
export function createModel({ keys, ground = () => 0, kit = 'pitcher' }) {
  const N = keys.map(k => normalize(k, ground)), ts = keys.map(k => k.at), total = ts[ts.length - 1];
  const curves = {}; for (const name of Object.keys(N[0].s)) curves[name] = monotone(ts, N.map(n => n.s[name]));
  const locate = time => {
    const t = clamp(time, 0, total); let i = ts.findIndex((x, n) => n < ts.length - 1 && t <= ts[n + 1]);
    if (i < 0) i = ts.length - 2;
    return { i, k: (t - ts[i]) / (ts[i + 1] - ts[i] || 1), t };
  };
  function poseAt(time) {
    const { i, k } = locate(time), a = N[i], b = N[i + 1], out = { s: {}, v: {}, grip: a.grip };
    for (const name of Object.keys(curves)) out.s[name] = curves[name](i, k);
    for (const name of Object.keys(a.v)) out.v[name] = name.startsWith('knee') ? a.v[name].clone().lerp(b.v[name], k) : name === 'grip' ? a.v[name].clone().lerp(b.v[name], k) : slerpDir(a.v[name], b.v[name], k);
    out.ball = k >= 1 ? b.ball : a.ball && (b.ball || k < 0.999);
    return out;
  }
  const jointsAt = time => solve(poseAt(time), ground);
  const events = keys.map((k, i) => ({ ...k, index: i })).filter(k => k.event);
  return { keys, ts, total, kit, ground, locate, poseAt, jointsAt, events, eventTimes: events.map(e => e.at), jointsOf: id => jointsAt(keys.find(k => k.id === id).at) };
}

// ------------------------------------------------------------------ drawing
const cssVar = (name, fallback) => { try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch { return fallback; } };
export function palette() {
  return {
    ink: cssVar('--ath-ink', '#25322c'), jersey: cssVar('--ath-jersey', '#fcfcf8'), pants: cssVar('--ath-pants', '#e2e6df'), team: cssVar('--ath-team', '#2f6b4f'),
    skin: cssVar('--ath-skin', '#b98a66'), shoe: cssVar('--ath-shoe', '#25322c'), leather: cssVar('--ath-leather', '#a9743f'), wood: cssVar('--ath-wood', '#d6b078'),
    dirt: cssVar('--ath-dirt', '#e4dcc9'), ghost: cssVar('--ath-ghost-line', '#a9b6ad'), motion: cssVar('--fig-motion', '#a85a0c'), measure: cssVar('--fig-measure', '#2b5c8f'), stage: cssVar('--fig-stage', '#f1f4ef'),
    dark: document.documentElement.dataset.theme === 'dark', ghostFill: cssVar('--f3-ghost', '#e3e8e2'),
  };
}

let ramp;
function toonRamp() {
  if (ramp) return ramp;
  ramp = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 214, 214, 214, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
  return ramp;
}
const outlineMat = (color, t = 0.011) => new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { c: { value: new THREE.Color(color) }, t: { value: t } },
  vertexShader: 'uniform float t; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal); mv.xyz += n * t; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 c;\nvoid main(){ gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}',
});

const UNIT_CYL = {}, SPHERE = new THREE.SphereGeometry(1, 20, 14);
function cylGeo(ra, rb) {
  const key = `${ra}|${rb}`;
  if (!UNIT_CYL[key]) { const g = new THREE.CylinderGeometry(rb, ra, 1, 18, 1, true); g.translate(0, 0.5, 0); UNIT_CYL[key] = g; }
  return UNIT_CYL[key];
}

/** Elliptical tube through a list of rings: the trunk. Rebuilt every frame so it can twist. */
class Loft {
  constructor(count, seg = 22) {
    this.count = count; this.seg = seg;
    const g = this.geometry = new THREE.BufferGeometry(), nv = count * seg + 2;
    this.pos = new Float32Array(nv * 3); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = [];
    for (let r = 0; r < count - 1; r++) for (let s = 0; s < seg; s++) {
      const a = r * seg + s, b = r * seg + (s + 1) % seg, c = a + seg, d = b + seg;
      idx.push(a, c, b, b, c, d);
    }
    const bottom = count * seg, top = bottom + 1;
    for (let s = 0; s < seg; s++) { idx.push(bottom, s, (s + 1) % seg); idx.push(top, (count - 1) * seg + (s + 1) % seg, (count - 1) * seg + s); }
    g.setIndex(idx);
  }
  update(rings) {
    const { seg, pos } = this, v = V();
    rings.forEach((ring, r) => {
      for (let s = 0; s < seg; s++) {
        const th = s / seg * Math.PI * 2;
        v.set(Math.cos(th) * ring.a, 0, Math.sin(th) * ring.b).applyQuaternion(ring.q).add(ring.c);
        pos.set([v.x, v.y, v.z], (r * seg + s) * 3);
      }
    });
    const first = rings[0].c, last = rings[rings.length - 1].c, n = this.count * seg;
    pos.set([first.x, first.y, first.z], n * 3); pos.set([last.x, last.y, last.z], (n + 1) * 3);
    this.geometry.attributes.position.needsUpdate = true; this.geometry.computeVertexNormals(); this.geometry.computeBoundingSphere();
  }
}

/** One drawn player. mode 'solid' = full colour; 'ghost' = pale start position. */
export class Figure {
  constructor({ kit = 'pitcher', mode = 'solid', pal = palette() } = {}) {
    this.kit = kit; this.root = new THREE.Group(); this.parts = {};
    const ghost = mode === 'ghost';
    const mat = c => ghost ? new THREE.MeshBasicMaterial({ color: pal.ghostFill }) : new THREE.MeshToonMaterial({ color: c, gradientMap: toonRamp() });
    const M = this.M = { jersey: mat(pal.jersey), pants: mat(pal.pants), team: mat(pal.team), skin: mat(pal.skin), shoe: mat(pal.shoe), leather: mat(pal.leather), wood: mat(pal.wood), ink: mat(pal.ink), ball: mat('#ffffff') };
    this.line = outlineMat(ghost ? pal.ghost : pal.ink, ghost ? 0.007 : 0.011);
    const mesh = (geo, material) => { const m = new THREE.Mesh(geo, material); m.add(new THREE.Mesh(geo, this.line)); this.root.add(m); return m; };
    const limb = (name, ra, rb, material) => { this.parts[name] = { seg: mesh(cylGeo(ra, rb), material), a: mesh(SPHERE, material), b: mesh(SPHERE, material), ra, rb }; };
    const ball = (name, material) => { this.parts[name] = mesh(SPHERE, material); };
    for (const s of [1, 2]) {
      limb(`thigh${s}`, 0.086, 0.062, M.pants); limb(`calf${s}`, 0.062, 0.052, M.pants); limb(`sock${s}`, 0.054, 0.04, M.team);
      ball(`shoe${s}`, M.shoe);
      limb(`sleeve${s}`, 0.062, 0.05, M.jersey); limb(`upper${s}`, 0.046, 0.041, M.team); limb(`fore${s}`, 0.041, 0.031, M.team);
      ball(`hand${s}`, kit === 'hitter' ? M.ink : M.skin);
    }
    limb('neck', 0.045, 0.043, M.skin); ball('head', M.skin);
    const dome = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, kit === 'hitter' ? Math.PI * 0.6 : Math.PI * 0.5);
    this.parts.cap = mesh(dome, M.team); ball('brim', M.team);
    if (kit === 'hitter') { ball('flap', M.team); for (const k of ['batA', 'batB', 'batC']) limb(k, 0.02, 0.02, M.wood); this.parts.batA.seg.geometry = cylGeo(0.014, 0.016); this.parts.batB.seg.geometry = cylGeo(0.016, 0.031); this.parts.batC.seg.geometry = cylGeo(0.031, 0.031); for (const k of ['batA', 'batB', 'batC']) this.parts[k].seg.children[0].geometry = this.parts[k].seg.geometry; ball('knob', M.wood); }
    else { ball('glove', M.leather); ball('ballObj', M.ball); }
    this.pantsLoft = new Loft(3); this.beltLoft = new Loft(2); this.jerseyLoft = new Loft(6);
    mesh(this.pantsLoft.geometry, M.pants); mesh(this.beltLoft.geometry, M.ink); mesh(this.jerseyLoft.geometry, M.jersey);
    this.root.traverse(o => { o.frustumCulled = false; });
  }
  _limb(name, a, b) {
    const p = this.parts[name], d = b.clone().sub(a), len = d.length() || 1e-4;
    p.seg.position.copy(a); p.seg.quaternion.setFromUnitVectors(Y, d.multiplyScalar(1 / len)); p.seg.scale.set(1, len, 1);
    p.a.position.copy(a); p.a.scale.setScalar(p.ra); p.b.position.copy(b); p.b.scale.setScalar(p.rb);
  }
  _basis(m, pos, xAxis, yAxis, scale) {
    const zAxis = xAxis.clone().cross(yAxis).normalize(), x2 = yAxis.clone().cross(zAxis).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x2, yAxis, zAxis)); m.position.copy(pos); m.scale.set(...scale);
  }
  apply(j) {
    const p = this.parts, mix = (a, b, k) => a.clone().lerp(b, k);
    for (const s of [1, 2]) {
      const L = j[`leg${s}`], A = j[`arm${s}`], cuff = mix(L.K, L.A, 0.36);
      this._limb(`thigh${s}`, L.H, L.K); this._limb(`calf${s}`, L.K, cuff); this._limb(`sock${s}`, cuff, L.A);
      const side = L.toe.clone().cross(L.footUp).normalize();
      this._basis(p[`shoe${s}`], L.A.clone().addScaledVector(L.toe, 0.062).addScaledVector(L.footUp, -0.036), side, L.toe.clone().normalize(), [0.052, DIM.foot / 2, 0.048]);
      const sl = mix(A.S, A.E, 0.5);
      this._limb(`sleeve${s}`, A.S, sl); this._limb(`upper${s}`, sl, A.E); this._limb(`fore${s}`, A.E, A.W);
      p[`hand${s}`].position.copy(mix(A.W, A.H, 0.55)); p[`hand${s}`].scale.setScalar(0.043);
    }
    // Trunk: pants, belt and jersey as one twisting tube from the pelvis to the shoulders.
    const at = h => {
      if (h <= 0) return { c: j.P.clone().addScaledVector(j.up, h), q: j.Qp };
      if (h >= DIM.torso) return { c: j.C.clone().addScaledVector(j.uc, h - DIM.torso), q: j.Qc };
      const k = h / DIM.torso, e = k * k * (3 - 2 * k), ctrl = j.P.clone().addScaledVector(j.up, DIM.torso * 0.4);
      const c = j.P.clone().multiplyScalar((1 - k) * (1 - k)).addScaledVector(ctrl, 2 * k * (1 - k)).addScaledVector(j.C, k * k);
      return { c, q: j.Qp.clone().slerp(j.Qc, e) };
    };
    const ring = (h, a, b) => ({ ...at(h), a, b });
    this.pantsLoft.update([ring(-0.115, 0.07, 0.07), ring(-0.03, 0.172, 0.118), ring(0.075, 0.162, 0.11)]);
    this.beltLoft.update([ring(0.075, 0.164, 0.112), ring(0.105, 0.16, 0.109)]);
    this.jerseyLoft.update([ring(0.105, 0.158, 0.107), ring(0.2, 0.15, 0.102), ring(0.34, 0.178, 0.118), ring(0.45, 0.19, 0.118), ring(0.515, 0.16, 0.098), ring(0.56, 0.06, 0.055)]);
    const neck0 = j.C.clone().addScaledVector(j.uc, 0.02);
    this._limb('neck', neck0, j.HC);
    const hu = Y.clone().applyQuaternion(j.Qh), hf = Z.clone().applyQuaternion(j.Qh), hr = X.clone().applyQuaternion(j.Qh);
    p.head.position.copy(j.HC); p.head.scale.set(DIM.head * 0.92, DIM.head * 1.06, DIM.head);
    this._basis(p.cap, j.HC.clone().addScaledVector(hu, 0.012).addScaledVector(hf, -0.004), hr, hu, [DIM.head * 1.04, DIM.head * 1.12, DIM.head * 1.1]);
    this._basis(p.brim, j.HC.clone().addScaledVector(hu, 0.02).addScaledVector(hf, DIM.head * 1.02), hr, hu, [DIM.head * 0.72, 0.012, DIM.head * 0.72]);
    if (this.kit === 'hitter') {
      // Ear flap on the side facing the pitcher (the lead ear).
      this._basis(p.flap, j.HC.clone().addScaledVector(hr, DIM.head * 0.86).addScaledVector(hu, -0.035), hr, hu, [0.03, 0.06, 0.055]);
      const b = j.bat, at2 = k => b.knob.clone().addScaledVector(b.d, DIM.bat * k);
      this._limb('batA', b.knob, at2(0.42)); this._limb('batB', at2(0.42), at2(0.68)); this._limb('batC', at2(0.68), b.tip);
      p.knob.position.copy(b.knob); p.knob.scale.setScalar(0.024);
    } else {
      const g = j.arm2, gd = g.H.clone().sub(g.W).normalize();
      this._basis(p.glove, g.H.clone().addScaledVector(gd, 0.045), gd.clone().cross(Y).lengthSq() > 0.01 ? gd.clone().cross(Y).normalize() : X.clone(), gd, [0.085, 0.105, 0.055]);
      p.ballObj.visible = p.ballObj.children[0].visible = j.ball !== false;
      p.ballObj.position.copy(j.arm1.H.clone().addScaledVector(j.arm1.H.clone().sub(j.arm1.W).normalize(), 0.03)); p.ballObj.scale.setScalar(0.037);
    }
  }
}

/** Ground slab the player stands on. `profile(x)` is the ground height. */
export function buildStage({ kind, ground, pal = palette(), x0, x1, z0 = -0.75, z1 = 0.95 }) {
  const g = new THREE.Group(), steps = 24, shape = new THREE.Shape();
  shape.moveTo(x0, -0.5);
  for (let i = 0; i <= steps; i++) { const x = x0 + (x1 - x0) * i / steps; shape.lineTo(x, ground(x)); }
  shape.lineTo(x1, -0.5); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false }); geo.translate(0, 0, z0);
  const dirt = new THREE.Color(pal.dirt), side = dirt.clone().multiplyScalar(pal.dark ? 0.8 : 0.9);
  const slab = new THREE.Mesh(geo, [new THREE.MeshBasicMaterial({ color: side }), new THREE.MeshBasicMaterial({ color: dirt })]);
  // Extrude puts caps in group 0 and the walls in group 1; the top wall is the playing surface.
  g.add(slab);
  const white = new THREE.MeshBasicMaterial({ color: pal.dark ? '#d9ded8' : '#ffffff' });
  if (kind === 'pitch') { const r = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.61), white); r.position.set(-0.09, 0.012, 0); g.add(r); }
  else {
    const s = new THREE.Shape(), w = 0.216; // home plate, point toward the catcher (-x)
    s.moveTo(w, w); s.lineTo(w, -w); s.lineTo(0, -w); s.lineTo(-w, 0); s.lineTo(0, w); s.closePath();
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }), white);
    plate.rotation.x = -Math.PI / 2; plate.position.set(0.12, 0.002, 0.74); g.add(plate);
  }
  return g;
}

/** Thin tube through points, for the hand path and the angle arcs. */
export function tube(points, color, radius = 0.009, opacity = 1) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), radius, 6, false), new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthTest: false }));
  m.renderOrder = 5; m.frustumCulled = false;
  return m;
}
/** A loose baseball at `pos`. */
export function ballMesh(pos, pal = palette()) {
  const m = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.scale.setScalar(0.037); m.position.copy(pos);
  const line = new THREE.Mesh(SPHERE, outlineMat(pal.ink, 0.008)); m.add(line); m.frustumCulled = line.frustumCulled = false;
  return m;
}
/** Points of an arc at `center`, turning `from` about `axis` by `deg`. */
export function arcPoints(center, from, axis, deg, radius = 0.2) {
  const n = Math.max(6, Math.ceil(Math.abs(deg) / 6)), out = [], f = from.clone().normalize(), ax = axis.clone().normalize();
  for (let i = 0; i <= n; i++) out.push(center.clone().addScaledVector(f.clone().applyAxisAngle(ax, deg * D2R * i / n), radius));
  return out;
}
/** Arc for the angle between two directions at a joint. */
export function arcBetween(center, d1, d2, radius = 0.2) {
  const a = d1.clone().normalize(), b = d2.clone().normalize(), axis = a.clone().cross(b);
  if (axis.lengthSq() < 1e-6) return [center.clone().addScaledVector(a, radius), center.clone().addScaledVector(a, radius * 1.001)];
  return arcPoints(center, a, axis, Math.acos(clamp(a.dot(b), -1, 1)) / D2R, radius);
}
export const angleBetween = (a, b) => Math.acos(clamp(a.clone().normalize().dot(b.clone().normalize()), -1, 1)) / D2R;

// ----------------------------------------------------------------- viewing
export const VIEWS = { side: { az: 12, el: 7 }, front: { az: 84, el: 6 }, back: { az: -96, el: 6 }, top: { az: 0, el: 86 } };

function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d0, 1.5));
  const d = new THREE.DirectionalLight(0xffffff, 2.0); d.position.set(-1.2, 3, 2.4); scene.add(d);
  return d;
}
/** Point an orthographic camera at the given points from direction (az, el), fitting them in a w:h frame. */
function fit(cam, pts, { az, el }, aspect, { pad = 0.12, minHeight = 0, minWidth = 0, light } = {}) {
  const a = az * D2R, e = el * D2R, dir = V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const right = V(Math.cos(a), 0, -Math.sin(a)), upv = dir.clone().cross(right).normalize();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { const x = p.dot(right), y = p.dot(upv); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  let w = Math.max(x1 - x0 + pad * 2, minWidth), h = Math.max(y1 - y0 + pad * 2, minHeight);
  if (w / h > aspect) h = w / aspect; else w = h * aspect;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, target = right.clone().multiplyScalar(cx).addScaledVector(upv, cy);
  cam.left = -w / 2; cam.right = w / 2; cam.top = h / 2; cam.bottom = -h / 2; cam.near = 0.1; cam.far = 60; cam.zoom = 1;
  cam.position.copy(target).addScaledVector(dir, 20); cam.up.copy(Math.abs(el) > 80 ? V(-Math.sin(a), 0, -Math.cos(a)) : Y); cam.lookAt(target); cam.updateProjectionMatrix();
  if (light) light.position.copy(cam.position).addScaledVector(right, -6).addScaledVector(upv, 9);
  return { target, w, h };
}
export function bodyPoints(j) {
  const pts = [j.P, j.C, j.HC.clone().add(V(0, DIM.head + 0.05, 0)), j.HC.clone().add(V(0.14, 0, 0)), j.HC.clone().add(V(-0.14, 0, 0))];
  for (const s of [1, 2]) { const L = j[`leg${s}`], A = j[`arm${s}`]; pts.push(L.K, L.A.clone().addScaledVector(Y, -DIM.ankle), L.A.clone().addScaledVector(L.toe, DIM.foot * 0.8), A.S, A.E, A.H); }
  if (j.bat) pts.push(j.bat.tip, j.bat.knob);
  return pts;
}
const mirrorAz = (view, lefty) => lefty ? { az: 180 - view.az, el: view.el } : view;

let snap;
export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
/**
 * Render a still picture and return a data URL plus a function that maps a 3D point to
 * picture pixels (for the numbered markers drawn on top).
 * figures: [{ joints, mode }], extras: THREE objects, lefty mirrors the scene.
 */
export function snapshot({ kit, kind, ground, figures, extras = [], lefty = false, view = VIEWS.side, width = 420, height = 420, stage, framePts, minHeight = 2.15, minWidth = 0, pad = 0.12 }) {
  if (!snap) { const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setClearColor(0x000000, 0); snap = { renderer, cam: new THREE.OrthographicCamera() }; }
  const { renderer, cam } = snap, pal = palette(), scene = new THREE.Scene(), world = new THREE.Group(), light = lights(scene);
  // The pale start position is drawn first on its own layer, so the end position always sits in front of it.
  const back = new THREE.Scene(), backWorld = new THREE.Group(); back.add(backWorld);
  scene.add(world); world.scale.z = backWorld.scale.z = lefty ? -1 : 1;
  for (const f of figures) { const fig = new Figure({ kit, mode: f.mode, pal }); fig.apply(f.joints); (f.mode === 'ghost' ? backWorld : world).add(fig.root); }
  if (stage) backWorld.add(buildStage({ kind, ground, pal, ...stage }));
  for (const e of extras) world.add(e);
  const flip = p => lefty ? V(p.x, p.y, -p.z) : p;
  const pts = (framePts || figures.flatMap(f => bodyPoints(f.joints))).map(flip);
  renderer.setPixelRatio(2); renderer.setSize(width, height, false);
  fit(cam, pts, mirrorAz(view, lefty), width / height, { pad, minHeight, minWidth, light });
  renderer.autoClear = false; renderer.clear(); renderer.render(back, cam); renderer.clearDepth(); renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  const project = p => { const v = flip(p).clone().project(cam); return [(v.x + 1) / 2 * width, (1 - v.y) / 2 * height]; };
  const scale = height / (cam.top - cam.bottom);
  for (const sc of [scene, back]) sc.traverse(o => { if (o.isMesh && o.geometry && !Object.values(UNIT_CYL).includes(o.geometry) && o.geometry !== SPHERE) o.geometry.dispose(); });
  return { url, project, width, height, scale };
}

/**
 * Live view: one figure that can be played, scrubbed and turned.
 * model: createModel(...). trail: joint name whose path is drawn. arcsAt(index, joints) -> [{ points, label, at }]
 */
export function createPlayer(host, { model, kind, stage, trail, arcsAt, lefty = false, ballFlight = null, view: home = VIEWS.side, onView = () => {} }) {
  const pal = palette(), renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement; canvas.className = 'f3-canvas'; host.append(canvas);
  const labels = document.createElement('div'); labels.className = 'f3-labels'; labels.setAttribute('aria-hidden', 'true'); host.append(labels);
  const scene = new THREE.Scene(), world = new THREE.Group(), cam = new THREE.OrthographicCamera(), light = lights(scene);
  scene.add(world); world.scale.z = lefty ? -1 : 1;
  const fig = new Figure({ kit: model.kit, pal }); world.add(fig.root);
  world.add(buildStage({ kind, ground: model.ground, pal, ...stage }));
  // Path of the hand or bat over the whole movement.
  const N = 140, path = []; for (let i = 0; i <= N; i++) path.push(jointAt(model.jointsAt(model.total * i / N), trail).clone());
  const faint = tube(path, pal.motion, 0.005, 0.22), done = tube(path, pal.motion, 0.011, 1); world.add(faint, done);
  const perSeg = done.geometry.index.count / (done.geometry.parameters.tubularSegments);
  const flight = ballMesh(V(), pal); flight.visible = false; world.add(flight);
  // Angle arcs for each key event, shown when the figure rests on that event.
  const arcSets = model.events.map((ev, n) => {
    const g = new THREE.Group(), list = arcsAt ? arcsAt(ev.id, model.jointsAt(ev.at)) : [];
    for (const a of list) g.add(tube(a.points, pal.measure, 0.008));
    g.visible = false; world.add(g);
    const els = list.map(a => { const el = document.createElement('span'); el.className = 'f3-label'; el.textContent = a.label; el.hidden = true; if (a.label) labels.append(el); return el; });
    return { g, list, els, at: ev.at };
  });
  // All positions over the movement, to keep the picture steady while it plays.
  const all = []; for (let i = 0; i <= 28; i++) all.push(...bodyPoints(model.jointsAt(model.total * i / 28)));
  const flip = p => lefty ? V(p.x, p.y, -p.z) : p, framePts = all.map(flip);
  let view = { ...home }, time = 0, size = [1, 1], raf = 0, alive = true;
  const draw = () => {
    raf = 0; if (!alive) return;
    const j = model.jointsAt(time); fig.apply(j);
    done.geometry.setDrawRange(0, Math.round(time / model.total * done.geometry.parameters.tubularSegments) * perSeg);
    if (ballFlight) { const p = ballFlight(time); flight.visible = !!p; if (p) flight.position.copy(p); }
    fit(cam, framePts, mirrorAz(view, lefty), size[0] / size[1], { pad: 0.1, light });
    for (const set of arcSets) {
      const on = Math.abs(time - set.at) < 0.035; set.g.visible = on;
      set.els.forEach((el, i) => {
        el.hidden = !on || !set.list[i].label; if (el.hidden) return;
        const v = flip(set.list[i].at).clone().project(cam);
        el.style.left = `${((v.x + 1) / 2 * 100).toFixed(2)}%`; el.style.top = `${((1 - v.y) / 2 * 100).toFixed(2)}%`;
      });
    }
    renderer.render(scene, cam);
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const resize = () => { const r = host.getBoundingClientRect(); if (r.width < 2) return; size = [r.width, r.height]; renderer.setSize(r.width, r.height, false); queue(); };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  // Drag to turn the figure.
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    view = { az: drag.az - (lefty ? -1 : 1) * dx * 0.45, el: clamp(drag.el + dy * 0.35, -5, 88) }; onView(null); queue();
  });
  const end = () => { drag = null; }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  return {
    setTime(t) { time = clamp(t, 0, model.total); queue(); },
    setView(name) { view = { ...(name === 'side' ? home : VIEWS[name]) }; onView(name); queue(); },
    turn(daz, del = 0) { view = { az: view.az + daz, el: clamp(view.el + del, -5, 88) }; onView(null); queue(); },
    dispose() { alive = false; ro.disconnect(); cancelAnimationFrame(raf); renderer.dispose(); renderer.forceContextLoss?.(); canvas.remove(); labels.remove(); },
  };
}
