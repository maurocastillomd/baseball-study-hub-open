// Pictogram drawings for the Anatomy Lab: one picture per joint movement.
// Each figure shows the start position (faded), the end of the normal range
// (green), the arc between them and its degrees, so the picture and the number
// always agree. Drawings are schematic teaching aids, not measurement tools.
//
// Angle convention: θ is measured from "straight down" and grows toward screen
// right. dir(0) points down, dir(90) right, dir(180) up, dir(-90) left.

const RAD = Math.PI / 180;
export const dir = t => [Math.sin(t * RAD), Math.cos(t * RAD)];
export const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
export const along = (p, t, len) => add(p, dir(t), len);
const angleOf = v => Math.atan2(v[0], v[1]) / RAD;
export const rotateAbout = (pivot, p, d) => { const v = [p[0] - pivot[0], p[1] - pivot[1]]; return along(pivot, angleOf(v) + d, Math.hypot(v[0], v[1])); };
const n = v => Math.round(v * 10) / 10;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- shape helpers -------------------------------------------------------
export const seg = (a, b, w, cls) => ({ k: 'seg', a, b, w, cls });
export const dot = (c, r, cls) => ({ k: 'circle', c, r, cls });
export const poly = (pts, cls, closed = true) => ({ k: 'poly', pts, cls, closed });
export const curve = (a, c, b, w, cls) => ({ k: 'curve', a, c, b, w, cls });
export const text = (p, t, cls = 'fig-label', anchor = 'middle') => ({ k: 'text', p, t, cls, anchor });
export const ellipse = (c, rx, ry, cls) => ({ k: 'ellipse', c, rx, ry, cls });

/** Arc around a pivot from θ0 to θ1 with an arrowhead at θ1. */
export function arcArrow(pivot, r, t0, t1, cls = 'fig-arc', head = true) {
  const steps = Math.max(6, Math.ceil(Math.abs(t1 - t0) / 4));
  const pts = Array.from({ length: steps + 1 }, (_, i) => along(pivot, t0 + (t1 - t0) * i / steps, r));
  const out = [poly(pts, cls, false)];
  if (head && Math.abs(t1 - t0) > 2) out.push(arrowHead(pts[pts.length - 2], pts[pts.length - 1], cls));
  return out;
}
export function arrowHead(from, to, cls = 'fig-arc', size = 7) {
  const t = angleOf([to[0] - from[0], to[1] - from[1]]);
  return poly([to, along(to, t + 155, size), along(to, t - 155, size)], `${cls} fig-head`);
}
export function lineArrow(a, b, cls = 'fig-arc', both = false) {
  const out = [poly([a, b], cls, false), arrowHead(a, b, cls)];
  if (both) out.push(arrowHead(b, a, cls));
  return out;
}

function bbox(shapes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (p, m = 0) => { x0 = Math.min(x0, p[0] - m); y0 = Math.min(y0, p[1] - m); x1 = Math.max(x1, p[0] + m); y1 = Math.max(y1, p[1] + m); };
  for (const s of shapes) {
    if (s.k === 'seg' || s.k === 'curve') { grow(s.a, s.w / 2); grow(s.b, s.w / 2); if (s.c) grow(s.c, 0); }
    else if (s.k === 'circle') grow(s.c, s.r + 1);
    else if (s.k === 'ellipse') { grow([s.c[0] - s.rx, s.c[1] - s.ry], 2); grow([s.c[0] + s.rx, s.c[1] + s.ry], 2); }
    else if (s.k === 'poly') s.pts.forEach(p => grow(p, 2));
    else if (s.k === 'text') { const w = s.t.length * 3.6; const dx = s.anchor === 'start' ? [0, 2 * w] : s.anchor === 'end' ? [-2 * w, 0] : [-w, w]; grow([s.p[0] + dx[0], s.p[1] - 11]); grow([s.p[0] + dx[1], s.p[1] + 4]); }
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

/** Render shapes to an SVG string whose viewBox fits the drawing. */
export function toSVG(shapes, { label = '', pad = 8, cls = 'fig', minW = 0, minH = 0, viewBox = null } = {}) {
  let [x, y, w, h] = viewBox || bbox(shapes);
  if (viewBox) pad = 0;
  if (w < minW) { x -= (minW - w) / 2; w = minW; }
  if (h < minH) { y -= (minH - h) / 2; h = minH; }
  const body = shapes.map(s => {
    if (s.k === 'seg') return `<line class="${s.cls}" x1="${n(s.a[0])}" y1="${n(s.a[1])}" x2="${n(s.b[0])}" y2="${n(s.b[1])}" stroke-width="${s.w}"/>`;
    if (s.k === 'curve') return `<path class="${s.cls}" d="M${n(s.a[0])} ${n(s.a[1])}Q${n(s.c[0])} ${n(s.c[1])} ${n(s.b[0])} ${n(s.b[1])}" stroke-width="${s.w}"/>`;
    if (s.k === 'circle') return `<circle class="${s.cls}" cx="${n(s.c[0])}" cy="${n(s.c[1])}" r="${s.r}"/>`;
    if (s.k === 'ellipse') return `<ellipse class="${s.cls}" cx="${n(s.c[0])}" cy="${n(s.c[1])}" rx="${s.rx}" ry="${s.ry}"/>`;
    if (s.k === 'poly') return `<${s.closed ? 'polygon' : 'polyline'} class="${s.cls}" points="${s.pts.map(p => `${n(p[0])},${n(p[1])}`).join(' ')}"/>`;
    if (s.k === 'text') return `<text class="${s.cls}" x="${n(s.p[0])}" y="${n(s.p[1])}" text-anchor="${s.anchor}">${esc(s.t)}</text>`;
    return '';
  }).join('');
  return `<svg class="${cls}" viewBox="${n(x - pad)} ${n(y - pad)} ${n(w + 2 * pad)} ${n(h + 2 * pad)}" role="img" aria-label="${esc(label)}">${body}</svg>`;
}

// ---- body builders ---------------------------------------------------------
export const L = { torso: 58, neck: 9, head: 13, upper: 34, fore: 30, hand: 11, thigh: 46, shank: 44, foot: 17 };
export const W = { torso: 24, neck: 9, upper: 11, fore: 10, hand: 9, thigh: 16, shank: 12, foot: 8 };

/** Side view, facing right. Near side = 1 (drawn on top), far side = 2. Arm/leg angles are absolute θ. */
export function sidePose(o = {}) {
  const { P = [100, 140], t = 0, h = 0, a1 = 0, e1 = 0, w1 = 0, a2 = 0, e2 = 0, l1 = 0, k1 = 0, f1 = 90, l2 = 0, k2 = 0, f2 = 90 } = o;
  const S = along(P, 180 - t, L.torso);
  const neckDir = 180 - t - h;
  const Nk = along(S, neckDir, L.neck), HC = along(S, neckDir, L.neck + L.head);
  const Sa = along(S, -t, 5);
  const arm = (a, e, w) => { const E = along(Sa, a, L.upper), Wr = along(E, a + e, L.fore); return { E, Wr, H: along(Wr, a + e + w, L.hand) }; };
  const leg = (l, k, f) => { const K = along(P, l, L.thigh), A = along(K, l - k, L.shank); return { K, A, T: along(A, l - k + f, L.foot), heel: along(A, l - k + f, -3) }; };
  return { P, S, Sa, Nk, HC, face: neckDir - 90, arm1: arm(a1, e1, w1), arm2: arm(a2, e2, 0), leg1: leg(l1, k1, f1), leg2: leg(l2, k2, f2) };
}

/** Pick body parts of a side pose. Part names: torso, head, upper1, fore1, hand1, arm1 (all three), thigh1, shank1, foot1, leg1, and the same with 2. */
export function sideParts(p, names, cls) {
  const want = new Set(names.flatMap(x => x === 'arm1' ? ['upper1', 'fore1', 'hand1'] : x === 'arm2' ? ['upper2', 'fore2', 'hand2'] : x === 'leg1' ? ['thigh1', 'shank1', 'foot1'] : x === 'leg2' ? ['thigh2', 'shank2', 'foot2'] : x === 'all' ? ['leg2', 'arm2', 'torso', 'head', 'leg1', 'arm1'].flatMap(y => y.endsWith('1') || y.endsWith('2') ? (y.startsWith('arm') ? [`upper${y.at(-1)}`, `fore${y.at(-1)}`, `hand${y.at(-1)}`] : [`thigh${y.at(-1)}`, `shank${y.at(-1)}`, `foot${y.at(-1)}`]) : [y]) : [x]));
  const far = c => c === 'fig-body' ? 'fig-far' : c;
  const out = [];
  const limb = (i, c) => {
    const a = p[`arm${i}`], g = p[`leg${i}`];
    if (want.has(`thigh${i}`)) out.push(seg(p.P, g.K, W.thigh, c));
    if (want.has(`shank${i}`)) out.push(seg(g.K, g.A, W.shank, c));
    if (want.has(`foot${i}`)) out.push(seg(g.heel, g.T, W.foot, c));
    if (want.has(`upper${i}`)) out.push(seg(p.Sa, a.E, W.upper, c));
    if (want.has(`fore${i}`)) out.push(seg(a.E, a.Wr, W.fore, c));
    if (want.has(`hand${i}`)) out.push(seg(a.Wr, a.H, W.hand, c));
  };
  limb(2, far(cls));
  if (want.has('torso')) out.push(seg(p.P, p.S, W.torso, cls));
  if (want.has('head')) out.push(seg(p.S, p.Nk, W.neck, cls), dot(p.HC, L.head, cls), dot(along(p.HC, p.face, L.head + 1), 4, cls));
  limb(1, cls);
  return out;
}

/** Front view, facing the viewer: the person's right side is on screen left. */
export function frontPose(o = {}) {
  const { P = [100, 140], t = 0, h = 0, ar = 0, al = 0, lr = 0, ll = 0 } = o;
  const S = along(P, 180 + t, L.torso);
  const SR = along(along(S, -90 + t, 19), t, 5), SL = along(along(S, 90 + t, 19), t, 5);
  const HR = [P[0] - 10, P[1]], HL = [P[0] + 10, P[1]];
  const neckDir = 180 + t + h;
  const arm = (Sx, a) => { const E = along(Sx, a, L.upper), Wr = along(E, a, L.fore); return { E, Wr, H: along(Wr, a, L.hand) }; };
  const leg = (Hx, l) => { const K = along(Hx, l, L.thigh), A = along(K, l, L.shank); return { K, A }; };
  return { P, S, SR, SL, HR, HL, Nk: along(S, neckDir, L.neck), HC: along(S, neckDir, L.neck + L.head), armR: arm(SR, -ar + t), armL: arm(SL, al + t), legR: leg(HR, -lr), legL: leg(HL, ll) };
}
export function frontParts(p, names, cls) {
  const want = new Set(names.flatMap(x => x === 'all' ? ['legL', 'legR', 'pelvis', 'torso', 'head', 'armL', 'armR'] : [x]));
  const out = [];
  const leg = (H, g) => { out.push(seg(H, g.K, W.thigh, cls), seg(g.K, g.A, W.shank, cls), seg(along(g.A, angleOf([g.A[0] - g.K[0], g.A[1] - g.K[1]]) - 90, 4), along(g.A, angleOf([g.A[0] - g.K[0], g.A[1] - g.K[1]]) + 90, 4), W.foot + 1, cls)); };
  const arm = (Sx, a) => { out.push(seg(Sx, a.E, W.upper, cls), seg(a.E, a.Wr, W.fore, cls), seg(a.Wr, a.H, W.hand, cls)); };
  if (want.has('legL')) leg(p.HL, p.legL);
  if (want.has('legR')) leg(p.HR, p.legR);
  if (want.has('pelvis')) out.push(seg(p.HR, p.HL, 22, cls));
  if (want.has('torso')) out.push(seg(p.P, p.S, 30, cls), seg(p.SR, p.SL, 14, cls));
  if (want.has('head')) out.push(seg(p.S, p.Nk, W.neck, cls), dot(p.HC, L.head, cls));
  if (want.has('armL')) arm(p.SL, p.armL);
  if (want.has('armR')) arm(p.SR, p.armR);
  return out;
}

/** Top view (looking down), person facing up the screen; their right side is on screen right. */
function topBody(C, rot, cls, { pelvis = false, head = true } = {}) {
  const out = [];
  if (pelvis) out.push(seg(along(C, 90, 22), along(C, -90, 22), 26, 'fig-far'));
  out.push(seg(along(C, 90 - rot, 30), along(C, -90 - rot, 30), 18, cls));
  if (head) out.push(dot(C, L.head, cls), dot(along(C, 180 - rot, L.head + 2), 4.5, cls));
  return out;
}

// ---- movement specs ---------------------------------------------------------
// Each spec: view (caption), pivot, r (arc radius), theta(d) (direction of the
// moving part at d degrees), base() static shapes, at(d, cls) moving shapes.
// demo: degrees to draw when the movement has no degree norm.

const sideView = 'Side view', frontView = 'Front view', topView = 'From above';


function sideSpec({ part, pivotOf, theta, pose, baseOmit, view = sideView, r = 26, upper = false }) {
  const base = sidePose(pose(0));
  const keep = upper ? ['torso', 'head', 'arm2', 'arm1'] : ['all'];
  return ({
    view, r,
    pivot: pivotOf(base), theta,
    base: () => {
      const names = keep.flatMap(k => k === 'all' ? ['leg2', 'arm2', 'torso', 'head', 'leg1', 'arm1'] : [k]).flatMap(k => k === 'arm1' ? ['upper1', 'fore1', 'hand1'] : k === 'leg1' ? ['thigh1', 'shank1', 'foot1'] : k === 'arm2' ? ['upper2', 'fore2', 'hand2'] : k === 'leg2' ? ['thigh2', 'shank2', 'foot2'] : [k]).filter(k => !baseOmit.includes(k));
      return sideParts(base, names, 'fig-body');
    },
    at: (d, cls) => sideParts(sidePose(pose(d)), part, cls),
    ground: upper ? null : base,
  });
}

const SPECS = {
  'gh-flex': () => sideSpec({ part: ['arm1'], baseOmit: ['upper1', 'fore1', 'hand1'], pose: d => ({ a1: d }), pivotOf: p => p.Sa, theta: d => d }),
  'gh-ext': () => sideSpec({ part: ['arm1'], baseOmit: ['upper1', 'fore1', 'hand1'], pose: d => ({ a1: -d }), pivotOf: p => p.Sa, theta: d => -d }),
  'gh-abd': () => {
    const p0 = frontPose();
    return { view: frontView, r: 26, pivot: p0.SR, theta: d => -d, base: () => frontParts(p0, ['legL', 'legR', 'pelvis', 'torso', 'head', 'armL'], 'fig-body'), at: (d, cls) => frontParts(frontPose({ ar: d }), ['armR'], cls), groundY: p0.legR.A[1] + 6 };
  },
  'gh-er': () => rot9090(d => 90 + d),
  'gh-ir': () => rot9090(d => 90 - d),
  'gh-hadd': () => {
    const C = [100, 100], SR = along(C, 90, 30);
    const arm = (d, cls) => { const t = 90 + d; const E = along(SR, t, L.upper), Wr = along(E, t, L.fore); return [seg(SR, E, W.upper, cls), seg(E, Wr, W.fore, cls), seg(Wr, along(Wr, t, L.hand), W.hand, cls)]; };
    return { view: `${topView} (arm starts straight out to the side)`, r: 26, pivot: SR, theta: d => 90 + d, base: () => topBody(C, 0, 'fig-body'), at: arm };
  },
  'el-flex': () => sideSpec({ part: ['fore1', 'hand1'], baseOmit: ['fore1', 'hand1'], pose: d => ({ e1: d }), pivotOf: p => p.arm1.E, theta: d => d, r: 20 }),
  'el-ext': () => ({ ...sideSpec({ part: ['fore1', 'hand1'], baseOmit: ['fore1', 'hand1'], pose: d => ({ e1: d }), pivotOf: p => p.arm1.E, theta: d => d, r: 20 }), start: 90 }),
  'el-pron': () => pencil(d => 180 - d),
  'el-sup': () => pencil(d => 180 + d),
  'wr-flex': () => wristSide(d => 90 - d),
  'wr-ext': () => wristSide(d => 90 + d),
  'wr-rd': () => wristTop(d => 90 + d),
  'wr-ud': () => wristTop(d => 90 - d),
  'hip-flex': () => ({ ...sideSpec({ part: ['leg1'], baseOmit: ['thigh1', 'shank1', 'foot1'], pose: d => ({ l1: d, k1: d }), pivotOf: p => p.P, theta: d => d, r: 28 }), labelFrac: 0.25 }),
  'hip-ext': () => sideSpec({ part: ['leg1'], baseOmit: ['thigh1', 'shank1', 'foot1'], pose: d => ({ l1: -d }), pivotOf: p => p.P, theta: d => -d, r: 28 }),
  'hip-abd': () => {
    const p0 = frontPose();
    return { view: frontView, r: 30, pivot: p0.HR, theta: d => -d, base: () => frontParts(p0, ['legL', 'pelvis', 'torso', 'head', 'armL', 'armR'], 'fig-body'), at: (d, cls) => frontParts(frontPose({ lr: d }), ['legR'], cls), groundY: p0.legL.A[1] + 6 };
  },
  'hip-add': () => {
    const p0 = frontPose({ ll: 18 });
    return { view: `${frontView} (the other leg moves out of the way)`, r: 30, pivot: p0.HR, theta: d => d, base: () => frontParts(p0, ['legL', 'pelvis', 'torso', 'head', 'armL', 'armR'], 'fig-body'), at: (d, cls) => frontParts(frontPose({ lr: -d, ll: 18 }), ['legR'], cls), groundY: p0.legL.A[1] + 6 };
  },
  'hip-ir': () => seatedHip(d => -d),
  'hip-er': () => seatedHip(d => d),
  'st-upward': () => scapulaBack(),
  'st-posttilt': () => scapulaSide(),
  'st-er': () => scapulaTop(),
  'st-elev': () => scapulaElevation(),
  'st-protract': () => scapulaProtraction(),
  'c-flex': () => neckSide(d => 180 - d),
  'c-ext': () => neckSide(d => 180 + d),
  'c-lat': () => {
    const p0 = frontPose();
    return { view: frontView, r: 40, pivot: p0.S, theta: d => 180 + d, base: () => frontParts(p0, ['torso', 'armL', 'armR'], 'fig-body'), at: (d, cls) => { const t = 180 + d; return [seg(p0.S, along(p0.S, t, 16), W.neck, cls), dot(along(p0.S, t, 16 + L.head), L.head, cls)]; } };
  },
  'c-rot': () => {
    const C = [100, 100];
    return { view: topView, r: 30, pivot: C, theta: d => 180 - d, base: () => topBody(C, 0, 'fig-body', { head: false }), at: (d, cls) => [dot(C, L.head, cls), dot(along(C, 180 - d, L.head + 2), 4.5, cls)] };
  },
  'l-flex': () => trunkSide(d => d),
  'l-ext': () => trunkSide(d => -d),
  'l-lat': () => {
    const p0 = frontPose();
    return { view: `${frontView} (pelvis stays level)`, r: 40, pivot: p0.P, theta: d => 180 + d, base: () => frontParts(p0, ['legL', 'legR', 'pelvis'], 'fig-body'), at: (d, cls) => frontParts(frontPose({ t: d }), ['torso', 'head', 'armL', 'armR'], cls), groundY: p0.legL.A[1] + 6 };
  },
  'l-rot': () => trunkRotation('From above: shoulders turn over a fixed pelvis'),
  't-rot': () => trunkRotation('From above: shoulders turn over a fixed pelvis'),
  't-ext': () => thoracicCurve(-22),
  't-flex': () => thoracicCurve(24),
  't-ribs': () => ribs(),
  'kn-flex': () => sideSpec({ part: ['shank1', 'foot1'], baseOmit: ['shank1', 'foot1'], pose: d => ({ k1: d }), pivotOf: p => p.leg1.K, theta: d => -d, r: 22 }),
  'kn-ext': () => ({ ...sideSpec({ part: ['shank1', 'foot1'], baseOmit: ['shank1', 'foot1'], pose: d => ({ k1: d }), pivotOf: p => p.leg1.K, theta: d => -d, r: 22 }), start: 90 }),
  'kn-rot': () => footTop(),
  'an-df': () => ankleSide(d => 90 + d),
  'an-pf': () => ankleSide(d => 90 - d),
  'an-inv': () => ankleBack(d => -d),
  'an-ev': () => ankleBack(d => d),
};

function rot9090(theta) {
  // The arm is out to the side at 90°, so it points at the viewer: drawn as a short stub ending in the elbow.
  const p0 = sidePose();
  const E = add(p0.Sa, [12, 9]);
  const fore = (d, cls) => { const t = theta(d); const Wr = along(E, t, L.fore); return [seg(E, Wr, W.fore, cls), seg(Wr, along(Wr, t, L.hand), W.hand, cls)]; };
  return {
    view: `${sideView}, facing right. The upper arm is out to the side at 90° (pointing at you); the forearm turns around it`, r: 24, pivot: E, theta,
    base: () => [...sideParts(p0, ['upper2', 'fore2', 'hand2', 'torso', 'head'], 'fig-body'), seg(p0.Sa, E, W.upper + 3, 'fig-body'), dot(E, 9, 'fig-body'), dot(E, 4.5, 'fig-far')],
    at: fore,
  };
}
function pencil(theta) {
  const C = [100, 100];
  return {
    view: 'Elbow bent 90° at your side, forearm pointing at you. The pencil in the fist shows the rotation', r: 62, pivot: C, theta,
    base: () => [dot(C, 30, 'fig-far')],
    at: (d, cls) => { const t = theta(d); return [seg(along(C, t, 13), along(C, t + 180, 13), 34, cls), seg(along(C, t, 54), along(C, t + 180, 46), 5, `${cls} fig-pencil`), dot(along(along(C, t, 13), t - 90, 15), 6.5, cls)]; },
  };
}
function wristSide(theta) {
  const Wr = [130, 100];
  return { view: `${sideView}, palm down`, r: 64, pivot: Wr, theta, base: () => [seg([22, 100], Wr, 20, 'fig-body')], at: (d, cls) => [seg(Wr, along(Wr, theta(d), 50), 18, cls)] };
}
function wristTop(theta) {
  const Wr = [130, 100];
  return {
    view: `${topView}, palm down (thumb side at the top)`, r: 64, pivot: Wr, theta,
    base: () => [seg([22, 100], Wr, 20, 'fig-body')],
    at: (d, cls) => { const t = theta(d), base = along(Wr, t, 10); return [seg(Wr, along(Wr, t, 50), 18, cls), seg(base, along(base, t + 52, 22), 8, cls)]; },
  };
}
function seatedHip(theta) {
  const P = [100, 112], S = along(P, 180, L.torso);
  const HR = [P[0] - 12, P[1]], HL = [P[0] + 12, P[1]];
  const KR = add(HR, [0, 16]), KL = add(HL, [0, 16]);
  const shank = (K, t, cls) => { const A = along(K, t, L.shank); return [seg(K, A, W.shank, cls), seg(along(A, t - 90, 5), along(A, t + 90, 5), W.foot + 1, cls)]; };
  return {
    view: 'Seated, knee bent 90°, seen from the front. The shin swings like a pendulum: foot out = internal rotation', r: 26, pivot: KR, theta,
    base: () => [seg([44, KR[1] + 2], [156, KR[1] + 2], 4, 'fig-ground'), seg(P, S, 30, 'fig-body'), seg(along(S, -90, 19), along(S, 90, 19), 14, 'fig-body'), dot(along(S, 180, L.neck + L.head), L.head, 'fig-body'), seg(along(S, 180, 0), along(S, 180, L.neck), W.neck, 'fig-body'), seg(add(S, [-19, 5]), add(S, [-21, 60]), W.upper, 'fig-body'), seg(add(S, [19, 5]), add(S, [21, 60]), W.upper, 'fig-body'), seg(HR, HL, 22, 'fig-body'), seg(HR, KR, W.thigh + 2, 'fig-body'), seg(HL, KL, W.thigh + 2, 'fig-body'), ...shank(KL, 0, 'fig-body')],
    at: (d, cls) => shank(KR, theta(d), cls),
  };
}
const TORSO_BACK = [[52, 58], [148, 58], [138, 170], [62, 170]];
function scapulaPts(shift = [0, 0]) { return [[112, 70], [146, 72], [118, 124]].map(p => add(p, shift)); }
function scapulaBack() {
  const pivot = [122, 84], [, G0, I0] = scapulaPts();
  const t0 = angleOf([I0[0] - pivot[0], I0[1] - pivot[1]]);
  const shapes = (d, cls) => {
    const pts = scapulaPts().map(p => rotateAbout(pivot, p, d)); const G = rotateAbout(pivot, G0, d);
    const armT = d === 0 ? 0 : Math.min(180, d * 3.6);
    return [seg(G, along(G, armT, 72), W.upper, cls), poly(pts, `${cls} fig-plate`)];
  };
  return {
    view: 'From behind, right side. The lower tip swings out as the arm goes overhead', r: 46, pivot, theta: d => t0 + d,
    base: () => [poly(TORSO_BACK, 'fig-body fig-fill'), seg([100, 60], [100, 168], 3, 'fig-spine'), seg([100, 58], [100, 44], W.neck, 'fig-body'), dot([100, 30], L.head, 'fig-body'), seg(add(TORSO_BACK[0], [6, 8]), add(TORSO_BACK[0], [2, 80]), W.upper, 'fig-body'), poly(scapulaPts().map(p => [200 - p[0], p[1]]), 'fig-far fig-plate')],
    at: shapes,
  };
}
function scapulaSide() {
  const pivot = [70, 98], top = [77, 70], bot = [63, 128];
  const t0 = angleOf([bot[0] - pivot[0], bot[1] - pivot[1]]);
  return {
    view: 'Side view of the rib cage (facing right). The lower tip tips forward onto the ribs as the arm rises', r: 30, pivot, theta: d => t0 + d,
    base: () => [ellipse([100, 108], 36, 54, 'fig-body fig-fill'), seg([100, 54], [104, 40], W.neck, 'fig-body'), dot([106, 26], L.head, 'fig-body')],
    at: (d, cls) => [seg(rotateAbout(pivot, top, d), rotateAbout(pivot, bot, d), 9, cls)],
  };
}
function scapulaTop() {
  const C = [100, 100], M = [116, 134], G = [154, 114], pivot = [135, 124];
  const t0 = angleOf([G[0] - pivot[0], G[1] - pivot[1]]);
  return {
    view: `${topView}, right side. The glenoid turns toward the back while the inner border stays on the ribs`, r: 30, pivot, theta: d => t0 - d,
    base: () => [ellipse(C, 62, 40, 'fig-body fig-fill'), dot(C, L.head, 'fig-far'), dot(along(C, 180, L.head + 2), 4.5, 'fig-far'), seg([100, 136], [100, 142], 6, 'fig-spine'), seg([84, 134], [46, 114], 9, 'fig-far')],
    at: (d, cls) => [seg(rotateAbout(pivot, M, -d), rotateAbout(pivot, G, -d), 9, cls)],
  };
}
function scapulaElevation() {
  return {
    view: 'From behind, right side. A slide on the rib cage, measured in centimetres, not degrees', custom: true,
    build: (hide) => [poly(TORSO_BACK, 'fig-body fig-fill'), seg([100, 60], [100, 168], 3, 'fig-spine'), seg([100, 58], [100, 44], W.neck, 'fig-body'), dot([100, 30], L.head, 'fig-body'),
      poly(scapulaPts().map(p => [200 - p[0], p[1]]), 'fig-far fig-plate'), poly(scapulaPts(), 'fig-ghost fig-plate'),
      poly(scapulaPts([0, -16]), 'fig-move fig-plate'), poly(scapulaPts([0, 12]), 'fig-move2 fig-plate'),
      ...lineArrow([164, 86], [164, 56]), ...lineArrow([164, 104], [164, 132], 'fig-arc fig-arc2'),
      ...(hide ? [] : [text([170, 62], 'Elevation', 'fig-note', 'start'), text([170, 132], 'Depression', 'fig-note', 'start')])],
  };
}
function scapulaProtraction() {
  const C = [100, 100], blade = d => [rotateAbout(C, [116, 134], d), rotateAbout(C, [154, 114], d)];
  return {
    view: `${topView}, right side. The scapula slides around the rib cage`, custom: true,
    build: (hide) => [ellipse(C, 62, 40, 'fig-body fig-fill'), dot(C, L.head, 'fig-far'), dot(along(C, 180, L.head + 2), 4.5, 'fig-far'),
      seg(...blade(0), 9, 'fig-ghost'), seg(...blade(22), 9, 'fig-move'), seg(...blade(-12), 9, 'fig-move2'),
      ...arcArrow(C, 82, 52, 80), ...arcArrow(C, 82, 40, 24, 'fig-arc fig-arc2'),
      ...(hide ? [] : [text(along(C, 84, 92), 'Protraction', 'fig-note', 'start'), text(along(C, 24, 90), 'Retraction', 'fig-note', 'start')])],
  };
}
function neckSide(theta) {
  const p0 = sidePose();
  return {
    view: `${sideView}, facing right (C7 is the pivot)`, r: 40, pivot: p0.S, theta,
    base: () => sideParts(p0, ['upper2', 'fore2', 'hand2', 'torso', 'upper1', 'fore1', 'hand1'], 'fig-body'),
    at: (d, cls) => { const t = theta(d); const Nk = along(p0.S, t, 16), HC = along(p0.S, t, 16 + L.head); return [seg(p0.S, Nk, W.neck, cls), dot(HC, L.head, cls), dot(along(HC, t - 90, L.head + 1), 4.5, cls)]; },
  };
}
function trunkSide(sign) {
  const p0 = sidePose();
  return {
    view: `${sideView}. True lumbar motion is the part below the ribs; hips stay still`, r: 40, pivot: p0.P, theta: d => 180 - sign(d),
    base: () => sideParts(p0, ['thigh2', 'shank2', 'foot2', 'thigh1', 'shank1', 'foot1'], 'fig-body'),
    at: (d, cls) => sideParts(sidePose({ t: sign(d) }), ['upper2', 'fore2', 'hand2', 'torso', 'head', 'upper1', 'fore1', 'hand1'], cls),
    ground: p0,
  };
}
function trunkRotation(view) {
  const C = [100, 100];
  return { view, r: 48, pivot: C, theta: d => 180 - d, base: () => [seg(along(C, 90, 22), along(C, -90, 22), 26, 'fig-far')], at: (d, cls) => topBody(C, d, cls) };
}
function thoracicCurve(demo) {
  const P = [100, 140], L1 = [100, 112];
  const at = (d, cls) => {
    const T1 = along(L1, 180 - d, 46), ctrl = add(along(L1, 180 - d / 2, 24), dir(-90 + 0), 10 + Math.max(0, d) * 0.25);
    const tan = angleOf([T1[0] - ctrl[0], T1[1] - ctrl[1]]);
    const HC = along(T1, tan - 5, L.neck + L.head);
    const Sa = along(T1, tan + 180, 4);
    return [seg(Sa, along(Sa, 0, 74), W.upper, `${cls === 'fig-move' ? 'fig-move' : cls} fig-soft`), curve(L1, ctrl, T1, 22, cls), seg(T1, along(T1, tan - 5, L.neck), W.neck, cls), dot(HC, L.head, cls)];
  };
  return {
    view: `${sideView}. No single degree norm: judge the shape of the curve`, r: 30, pivot: L1, theta: d => 180 - d, demo,
    base: () => [seg(P, L1, W.torso, 'fig-body'), ...sideParts(sidePose({ P }), ['thigh2', 'shank2', 'foot2', 'thigh1', 'shank1', 'foot1'], 'fig-body')],
    at, ground: sidePose({ P }),
  };
}
function ribs() {
  const cage = k => [[100, 60 - k * 4], [124 + k * 2, 66 - k * 3], [138 + k * 9, 100], [134 + k * 8, 136], [116 + k * 4, 152], [100, 142], [84 - k * 4, 152], [66 - k * 8, 136], [62 - k * 9, 100], [76 - k * 2, 66 - k * 3]];
  return {
    view: 'Front view. Breathing in: the ribs swing out (bucket-handle) and the sternum lifts (pump-handle)', custom: true,
    build: (hide) => [seg([100, 56], [100, 40], W.neck, 'fig-body'), dot([100, 26], L.head, 'fig-body'), poly(cage(0), 'fig-ghost fig-outline'), poly(cage(1), 'fig-move fig-outline'), seg([100, 66], [100, 118], 5, 'fig-move'),
      ...lineArrow([150, 104], [170, 104]), ...lineArrow([50, 104], [30, 104]), ...lineArrow([100, 128], [100, 112]),
      ...(hide ? [] : [text([162, 92], 'out', 'fig-note'), text([38, 92], 'out', 'fig-note'), text([100, 140], 'up', 'fig-note')])],
  };
}
function footTop() {
  const C = [100, 120];
  const foot = (t, cls) => { const at = (k, s) => along(along(C, t, k), t + 90, s); return [poly([at(-12, -7), at(-12, 7), at(10, 11), at(34, 15), at(52, 12), at(60, 2), at(56, -12), at(34, -13), at(10, -10)], `${cls} fig-plate`)]; };
  return {
    view: `${topView}: seated, knee bent 90°. The foot turns with the shin`, custom: true,
    build: (hide) => [...foot(180, 'fig-ghost'), ...foot(152, 'fig-move'), ...foot(204, 'fig-move2'), dot(C, 12, 'fig-body'),
      ...arcArrow(C, 64, 172, 154), ...arcArrow(C, 64, 188, 201, 'fig-arc fig-arc2'),
      ...(hide ? [] : [text(along(C, 150, 82), 'External', 'fig-note'), text(along(C, 212, 80), 'Internal', 'fig-note')])],
  };
}
function ankleSide(theta) {
  const A = [100, 124];
  return { view: `${sideView}, right ankle (toes point right)`, r: 70, pivot: A, theta, base: () => [seg([100, 22], A, 20, 'fig-body')], at: (d, cls) => [seg(along(A, theta(d), -14), along(A, theta(d), 56), 16, cls)] };
}
function ankleBack(theta) {
  const A = [100, 112];
  const foot = (d, cls) => { const t = theta(d), Sc = along(A, t, 22); return [seg(A, Sc, 14, cls), seg(along(Sc, t + 90, 27), along(Sc, t - 90, 27), 12, cls)]; };
  return { view: 'Right foot from behind: the sole turns in (inversion) or out (eversion)', r: 40, pivot: A, theta, base: () => [seg([100, 18], A, 22, 'fig-body')], at: foot };
}


/** Pick the label spot near the arc that is farthest from every drawn shape. */
function placeLabel(shapes, spec, start, end) {
  const distSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const clearance = p => {
    let c = Infinity;
    for (const s of shapes) {
      if (s.k === 'seg' || s.k === 'curve') c = Math.min(c, distSeg(p, s.a, s.b) - s.w / 2);
      else if (s.k === 'circle') c = Math.min(c, Math.hypot(p[0] - s.c[0], p[1] - s.c[1]) - s.r);
      else if (s.k === 'ellipse') c = Math.min(c, Math.hypot((p[0] - s.c[0]) / s.rx, (p[1] - s.c[1]) / s.ry) < 1 ? -10 : 20);
      else if (s.k === 'poly') for (let i = 1; i < s.pts.length; i++) c = Math.min(c, distSeg(p, s.pts[i - 1], s.pts[i]) - 1);
    }
    return c;
  };
  const t0 = spec.theta(start), t1 = spec.theta(end), sgn = Math.sign(t1 - t0) || 1;
  let best = null;
  for (let t = t0 - sgn * 30; sgn * (t - (t1 + sgn * 45)) <= 0; t += sgn * 5) {
    for (const extra of [10, 16, 24, 34]) {
      const c = along(spec.pivot, t, spec.r + extra);
      // Text is ~26 x 14 units: sample its corners, not just its centre.
      const pts = [c, add(c, [-13, -6]), add(c, [13, -6]), add(c, [-13, 6]), add(c, [13, 6])];
      const clear = Math.min(...pts.map(clearance));
      const inside = sgn * (t - t0) >= 0 && sgn * (t1 - t) >= 0;
      const score = Math.min(clear, 8) - extra * 0.08 + (inside ? 1.5 : 0);
      if (!best || score > best.score) best = { score, c };
    }
  }
  return add(best.c, [0, 5]);
}

/** Arc radius: about 60% of the way out along the moving segment, never smaller than the spec asks for. */
function arcRadius(spec, end) {
  let reach = 0;
  const far = p => { reach = Math.max(reach, Math.hypot(p[0] - spec.pivot[0], p[1] - spec.pivot[1])); };
  for (const sh of spec.at(end, 'fig-move')) {
    if (sh.k === 'seg' || sh.k === 'curve') { far(sh.a); far(sh.b); } else if (sh.k === 'circle' || sh.k === 'ellipse') far(sh.c); else if (sh.k === 'poly') sh.pts.forEach(far);
  }
  return Math.max(spec.r, Math.min(64, Math.round(reach * 0.6)));
}

/** Shaded sector between two joint angles, a dashed zero line and ticks along the arc. */
function sweep(spec, start, end) {
  const t0 = spec.theta(start), t1 = spec.theta(end), span = Math.abs(end - start), r = spec.r;
  const steps = Math.max(6, Math.ceil(Math.abs(t1 - t0) / 4));
  const rim = Array.from({ length: steps + 1 }, (_, i) => along(spec.pivot, t0 + (t1 - t0) * i / steps, r));
  const out = [poly([spec.pivot, ...rim], 'fig-sweep'), seg(spec.pivot, along(spec.pivot, t0, r + 9), 1.4, 'fig-zero')];
  const every = span > 100 ? 30 : span > 45 ? 15 : span > 20 ? 10 : 5;
  for (let d = every; d < span - 1; d += every) {
    const t = spec.theta(start + Math.sign(end - start) * d), big = d % (every * 2) === 0 || every === 30;
    out.push(seg(along(spec.pivot, t, r - (big ? 5 : 3)), along(spec.pivot, t, r), 1.2, 'fig-tickmark'));
  }
  return out;
}


/**
 * SVG for one movement.
 * @param {string} id movement id from joints.json
 * @param {{deg?:number, alt?:number[], measured?:number, hide?:boolean, zero?:boolean}} o
 */
export function movementFigure(id, { deg = 0, alt = [], measured = 0, hide = false, zero = false, name = '' } = {}) {
  const make = SPECS[id];
  if (!make) return null;
  const spec = make();
  // Draw the arc well out along the moving segment, so the range is easy to see.
  if (!spec.custom) spec.r = arcRadius(spec, zero ? 0 : (deg > 0 ? deg : spec.demo ?? 25));
  let shapes = [];
  if (spec.custom) {
    shapes = spec.build(hide);
  } else {
    const start = zero ? (spec.start ?? 90) : 0;
    const end = zero ? 0 : (deg > 0 ? deg : spec.demo ?? 25);
    const showDeg = zero || deg > 0;
    shapes.push(...spec.base());
    const ground = spec.ground ? Math.max(spec.ground.leg1.A[1], spec.ground.leg2.A[1]) + 6 : spec.groundY;
    if (ground) shapes.unshift(seg([spec.pivot[0] - 70, ground], [spec.pivot[0] + 70, ground], 3, 'fig-ground'));
    shapes.push(...spec.at(start, 'fig-ghost'));
    // A shaded fan from the start to the end of the range, with protractor ticks, so the size of the range reads at a glance.
    if (!hide && Math.abs(end - start) >= 8) shapes.push(...sweep(spec, start, end));
    if (hide) {
      const step = Math.sign(end - start) * Math.min(28, Math.abs(end - start) || 28);
      shapes.push(...arcArrow(spec.pivot, spec.r, spec.theta(start), spec.theta(start + step)));
    } else {
      shapes.push(...spec.at(end, 'fig-move'));
      if (measured > 0 && !zero) shapes.push(...spec.at(measured, 'fig-measure'));
      shapes.push(...arcArrow(spec.pivot, spec.r, spec.theta(start), spec.theta(end)));
      for (const a of alt) if (a > 0 && a !== end) shapes.push(seg(along(spec.pivot, spec.theta(a), spec.r - 6), along(spec.pivot, spec.theta(a), spec.r + 6), 2.5, 'fig-tick'));
      if (showDeg) {
        const body = shapes.slice();
        shapes.push(text(placeLabel(body, spec, start, end), `${end}°`));
      }
    }
    shapes.push(dot(spec.pivot, 3.6, 'fig-joint'));
  }
  const label = `${name || id}: ${spec.view}${hide ? '' : deg > 0 ? `, drawn at ${deg} degrees` : ''}`;
  return {
    svg: toSVG(shapes, { label, cls: 'fig rom-pic-svg', minW: 150, minH: 150 }),
    view: spec.view,
    // What each mark means, for the legend under the picture.
    legend: spec.custom ? [] : hide ? [['start', 'Start position'], ['arrow', 'Direction of the movement']]
      : [['start', 'Start position'], ['zero', 'Zero line'], ['end', 'End of the normal range'], ['fan', 'The range, with a tick at regular steps'], ...(measured > 0 && !zero ? [['measure', 'Your measurement']] : [])],
  };
}

export const figureIds = Object.keys(SPECS).filter(k => SPECS[k]);
