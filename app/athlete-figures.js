// Flat-illustration ballplayer built from joint angles. Shared by the pitching
// (pitch-figures.js) and hitting (swing-figures.js) sketches. These are teaching
// drawings, not motion-capture data.
//
// Angles are measured from straight down, positive toward the right of the picture.
// A pose gives the trunk lean `t`, how square the shoulders (`sh`) and pelvis (`hp`)
// are to the viewer (1 = chest toward the viewer, 0 = side-on, negative = back turning
// toward the viewer), and each limb either as angles or as a target to reach.

const rad = d => d * Math.PI / 180;
export const dir = t => [Math.sin(rad(t)), Math.cos(rad(t))];
export const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
export const along = (p, t, len) => add(p, dir(t), len);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const unit = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const lerp = (a, b, k) => a + (b - a) * k;
export const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const f = n => Math.round(n * 10) / 10;
const pt = p => `${f(p[0])} ${f(p[1])}`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Body sizes in drawing units (the figure stands about 173 units tall).
export const B = { head: 10, neck: 5, torso: 54, thigh: 45, shank: 43, ankle: 6, foot: 19, upper: 30, fore: 27, hand: 4.4, shoulder: 15, hip: 8, bat: 64 };

const path = (cls, d) => `<path class="${cls}" d="${d}"/>`;
const circle = (cls, c, r) => `<circle class="${cls}" cx="${f(c[0])}" cy="${f(c[1])}" r="${f(r)}"/>`;

/** Tapered limb: two round ends of different size joined by straight sides. */
function capsule(a, b, ra, rb) {
  const u = unit(sub(b, a)), n = [-u[1], u[0]];
  return `M${pt(add(a, n, ra))}L${pt(add(b, n, rb))}A${f(rb)} ${f(rb)} 0 0 0 ${pt(add(b, n, -rb))}L${pt(add(a, n, -ra))}A${f(ra)} ${f(ra)} 0 0 0 ${pt(add(a, n, ra))}Z`;
}
/** Closed smooth outline through the points (Catmull-Rom). */
function blob(ps, tension = 1) {
  const n = ps.length; let d = `M${pt(ps[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = ps[(i - 1 + n) % n], p1 = ps[i], p2 = ps[(i + 1) % n], p3 = ps[(i + 2) % n];
    d += `C${pt(add(p1, sub(p2, p0), tension / 6))} ${pt(add(p2, sub(p3, p1), -tension / 6))} ${pt(p2)}`;
  }
  return d + 'Z';
}

// Two-segment reach from `from` to `to`. Returns the middle joint; `prefer` picks which way it bends:
// a side ('down', 'up', 'left', 'right'), or { a, b, k } to blend from bend `a` to bend `b` (each 1 or -1)
// so a moving elbow can change sides without a jump. The result carries `.bend` (1, -1, or 0 when straight).
function reach(from, to, l1, l2, prefer = 'down') {
  const v = sub(to, from), d0 = Math.hypot(v[0], v[1]) || 0.001, u = [v[0] / d0, v[1] / d0];
  const tag = (p, bend) => { p.bend = bend; return p; };
  if (d0 >= l1 + l2 - 0.5) return tag(mix(from, to, l1 / (l1 + l2)), 0);
  const d = Math.max(d0, Math.abs(l1 - l2) + 0.5);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const rot = s => [u[0] * Math.cos(a) - s * u[1] * Math.sin(a), s * u[0] * Math.sin(a) + u[1] * Math.cos(a)];
  const e1 = add(from, rot(1), l1), e2 = add(from, rot(-1), l1), at = s => s < 0 ? e2 : e1;
  if (prefer && typeof prefer === 'object') { const sa = prefer.a || prefer.b || 1, sb = prefer.b || sa; return tag(sa === sb ? [...at(sa)] : mix(at(sa), at(sb), prefer.k), prefer.k < 0.5 ? sa : sb); }
  const pick = { down: e1[1] > e2[1], up: e1[1] < e2[1], left: e1[0] < e2[0], right: e1[0] > e2[0] }[prefer];
  return tag(pick ? e1 : e2, pick ? 1 : -1);
}

/** Work out every joint of a pose. `ground(x)` gives the ground height under x. */
export function solve(o, ground) {
  const sh = o.sh ?? 1, hp = o.hp ?? 1, hw = B.hip * hp;
  const legFK = (H, [th, s, ft, kt = 1, ks = 1, kf = 1]) => {
    const K = along(H, th, B.thigh * kt), A = along(K, s, B.shank * ks);
    return { H, K, A, ft, kf };
  };
  const legIK = (H, spec) => {
    const [x, lift = 0, ft = 90, kf = 0.6] = spec.foot;
    const A = [x, ground(x) - B.ankle - lift];
    const K = add(mix(H, A, 0.5), spec.knee || [0, 0]);
    return { H, K, A, ft, kf };
  };
  let P;
  if (o.pelvis) P = [o.pelvis[0], ground(o.pelvis[0]) - o.pelvis[1]];
  else {
    const spec = o.anchor.leg === 1 ? o.leg1 : o.leg2, side = o.anchor.leg === 1 ? -1 : 1;
    const A = [o.anchor.x, ground(o.anchor.x) - B.ankle - (o.anchor.lift || 0)];
    const probe = legFK([0, 0], spec);
    P = [A[0] - probe.A[0] - side * hw, A[1] - probe.A[1]];
  }
  const H1 = [P[0] - hw, P[1]], H2 = [P[0] + hw, P[1]];
  const leg = (H, spec) => Array.isArray(spec) ? legFK(H, spec) : legIK(H, spec);
  const leg1 = leg(H1, o.leg1), leg2 = leg(H2, o.leg2);
  const t = o.t || 0, up = dir(180 - t), across = dir(90 - t);
  const S = add(P, up, B.torso);
  const S1 = add(S, across, -B.shoulder * sh), S2 = add(S, across, B.shoulder * sh);
  const headUp = dir(180 - t + (o.head ?? t * 0.45));
  const HC = add(add(S, up, 2), headUp, B.neck + B.head);
  const armFK = (Sh, [u, fo, ku = 1, kf = 1]) => { const E = along(Sh, u, B.upper * ku), Wr = along(E, fo, B.fore * kf); return { S: Sh, E, W: Wr, H: along(Wr, fo, B.hand) }; };
  const armIK = (Sh, to, k = 1, prefer = 'down') => { const E = reach(Sh, to, B.upper * k, B.fore * k, prefer); return { S: Sh, E, W: mix(E, to, 0.86), H: to, bend: E.bend }; };
  let arm1, arm2, bat = null;
  if (o.grip) {
    // Two hands on a bat: the bottom (lead) hand sits at the grip point, the top hand just above it.
    const bd = dir(o.bat[0]), G = add(S, o.grip), len = B.bat * (o.bat[1] ?? 1);
    arm2 = armIK(S2, G, o.k2 ?? 1, o.el2);
    arm1 = armIK(S1, add(G, bd, 5.5), o.k1 ?? 1, o.el1);
    bat = { knob: add(G, bd, -5), mid: add(G, bd, len * 0.42), tip: add(G, bd, len), d: bd };
  } else { arm1 = armFK(S1, o.arm1); arm2 = armFK(S2, o.arm2); }
  return { P, S, S1, S2, H1, H2, HC, headUp, up, across, t, sh, hp, leg1, leg2, arm1, arm2, bat };
}

function shoe(l, cls) {
  const e = dir(l.ft), s = unit(sub(l.A, l.K));
  let n = [-e[1], e[0]]; if (n[0] * s[0] + n[1] * s[1] < 0) n = [e[1], -e[0]];
  const L = B.foot * l.kf, q = (x, y) => add(add(l.A, e, x), n, y);
  return path(cls, blob([q(-5.5, -1.5), q(-6, 4.2), q(-4, 6), q(L * 0.5, 6), q(L - 1, 6), q(L + 1.5, 3.8), q(L - 3, 1), q(4.5, -3.2), q(-1.5, -4.6)], 0.8));
}

function legParts(l) {
  const cuff = mix(l.K, l.A, 0.34);
  return [
    path('ath-sock', capsule(l.K, l.A, 6.2, 4.1)),
    shoe(l, 'ath-shoe'),
    path('ath-pants', capsule(l.K, cuff, 6.9, 6.1)),
    path('ath-pants', capsule(l.H, l.K, 9.6, 7.1)),
  ];
}

function armParts(a, { hand = 'ath-skin' } = {}) {
  const sleeve = mix(a.S, a.E, 0.46);
  return [
    path('ath-under', capsule(a.E, a.W, 5, 3.7)),
    path('ath-under', capsule(a.S, a.E, 6.2, 5.1)),
    path('ath-jersey', capsule(a.S, sleeve, 6.9, 6)),
    circle(hand, a.H, B.hand),
  ];
}

function torsoParts(j) {
  const a = j.up, u = j.across, q = (h, w) => add(add(j.P, a, h), u, w);
  const ws = lerp(10.5, 20, Math.abs(j.sh)), wc = lerp(11, 17.5, Math.abs(j.sh));
  const ww = lerp(9.5, 13.5, (Math.abs(j.sh) + Math.abs(j.hp)) / 2), wh = lerp(10.5, 15, Math.abs(j.hp));
  const T = B.torso;
  // The seat of the pants follows the pelvis, which leans about half as much as the trunk.
  const pa = dir(180 - j.t * 0.45), pu = dir(90 - j.t * 0.45), h = (y, w) => add(add(j.P, pa, y), pu, w);
  const hip = path('ath-pants', blob([h(6, wh), h(-4, wh + 0.8), h(-10, wh * 0.55), h(-10, -wh * 0.55), h(-4, -wh - 0.8), h(6, -wh)], 0.8));
  const body = path('ath-jersey', blob([q(T + 3.5, -ws * 0.55), q(T + 3.5, ws * 0.55), q(T - 1, ws), q(T * 0.72, wc), q(T * 0.34, ww), q(1, wh * 0.98), q(-3.5, wh * 0.7), q(-3.5, -wh * 0.7), q(1, -wh * 0.98), q(T * 0.34, -ww), q(T * 0.72, -wc), q(T - 1, -ws)], 0.85));
  const belt = path('ath-belt', `M${pt(q(-1.2, -wh * 0.82))}L${pt(q(-1.2, wh * 0.82))}`);
  return { hip, body, belt };
}

function headParts(j, kit, face = 1) {
  const h = j.headUp, fw = [-h[1] * face, h[0] * face], C = j.HC, r = B.head;
  const q = (x, y) => add(add(C, fw, x), h, y);
  const arc = (from, to, rr, lift = 0) => { const out = []; for (let i = 0; i <= 12; i++) { const th = rad(lerp(from, to, i / 12)); out.push(q(Math.cos(th) * rr, Math.sin(th) * rr + lift)); } return out; };
  const neck = path('ath-skin', capsule(add(j.S, j.up, 1), add(C, h, -r * 0.5), 4.3, 4.1));
  const headC = circle('ath-skin', C, r);
  if (kit === 'hitter') {
    // Batting helmet: deep shell, ear flap on the side the viewer sees, short bill.
    const shell = [...arc(-8, 205, r + 1.4, 0.6), q(-(r + 1.2), -5.5), q(-3, -6.5), q(1.5, -1.5)];
    return [neck, headC, path('ath-cap', capsule(q(r - 1, 1.2), q(r + 6.5, 0.2), 1.9, 1.5)), path('ath-cap', `M${shell.map(pt).join('L')}Z`), circle('ath-cap-dot', q(-3.2, -2.6), 1.5)];
  }
  const crown = arc(2, 178, r + 0.9, 1.2);
  return [neck, headC, path('ath-cap', capsule(q(r - 2, 2), q(r + 8.5, 0.6), 2, 1.5)), path('ath-cap', `M${crown.map(pt).join('L')}Z`)];
}

const glove = H => [circle('ath-glove', add(H, [-4.6, -4.2]), 3.6), circle('ath-glove', H, 7.4)];
const ball = c => [circle('ath-ball', c, 3.5), path('ath-seam', `M${pt(add(c, [-2.4, -1.6]))}Q${pt(add(c, [0, 1.2]))} ${pt(add(c, [2.4, -1.6]))}`)];
function batParts(b) {
  return [path('ath-bat', capsule(b.knob, b.mid, 1.5, 2.1)), path('ath-bat', capsule(b.mid, b.tip, 2.1, 3.5)), circle('ath-bat', b.knob, 2.3)];
}

/**
 * Draw one player. Returns { svg, joints }.
 * kit: 'pitcher' (cap, glove, ball) or 'hitter' (helmet, bat). mode: 'solid' or 'ghost'.
 */
export function athlete(o, { kit = 'pitcher', mode = 'solid', ground = () => 232 } = {}) {
  const j = solve(o, ground), out = [], torso = torsoParts(j);
  const legs = o.leadLegBack ? [j.leg2, j.leg1] : [j.leg1, j.leg2];
  if (j.bat && o.batLayer === 'back') out.push(...batParts(j.bat));
  out.push(torso.hip, ...legParts(legs[0]));
  if (!o.legOver) out.push(...legParts(legs[1]));
  if (kit === 'hitter') {
    out.push(torso.body, torso.belt);
    if (o.legOver) out.push(...legParts(legs[1]));
    if (j.bat && o.batLayer === 'mid') out.push(...batParts(j.bat));
    out.push(...headParts(j, kit, o.face ?? 1));
    const arms = o.armOrder === 'lead-first' ? [j.arm2, j.arm1] : [j.arm1, j.arm2];
    out.push(...arms.flatMap(a => armParts(a).slice(0, 3)));
    if (j.bat && (o.batLayer ?? 'front') === 'front') out.push(...batParts(j.bat));
    out.push(circle('ath-bglove', j.arm2.H, B.hand + 0.4), circle('ath-bglove', j.arm1.H, B.hand + 0.4));
  } else {
    const throwing = [...armParts(j.arm1), ...(o.ball === false ? [] : ball(add(j.arm1.H, dir(o.arm1[1]), 3.2)))];
    const gloved = [...armParts(j.arm2).slice(0, 3), ...glove(j.arm2.H)];
    // At layback the throwing arm is on the far side, so it passes behind the trunk and head.
    if (o.armBehind) out.push(...throwing);
    out.push(torso.body, torso.belt);
    if (o.legOver) out.push(...legParts(legs[1]));
    if (o.armBehind) out.push(...headParts(j, kit, o.face ?? 1), ...gloved);
    else out.push(...headParts(j, kit, o.face ?? 1), ...(o.gloveTop ? [...throwing, ...gloved] : [...gloved, ...throwing]));
  }
  return { svg: `<g class="ath ath-${mode}">${out.join('')}</g>`, joints: j };
}

/** All the points worth framing for a solved pose. */
export function extent(j) {
  const pts = [j.P, j.S, j.S1, j.S2, add(j.HC, [0, -B.head - 2]), add(j.HC, [B.head + 9, 0]), add(j.HC, [-B.head - 2, 0]), j.leg1.K, j.leg1.A, j.leg2.K, j.leg2.A, add(j.leg1.A, dir(j.leg1.ft), B.foot * j.leg1.kf), add(j.leg2.A, dir(j.leg2.ft), B.foot * j.leg2.kf), j.arm1.E, j.arm1.H, j.arm2.E, j.arm2.H];
  if (j.bat) pts.push(j.bat.tip, j.bat.knob);
  return pts;
}

/** Curved arrow from a to b; `bulge` pushes the curve sideways (sign picks the side). */
export function motionArrow(a, b, bulge = 0.25) {
  const v = sub(b, a), len = Math.hypot(v[0], v[1]);
  if (len < 12) return '';
  const n = [-v[1] / len, v[0] / len], c = add(mix(a, b, 0.5), n, len * bulge);
  const start = mix(mix(a, c, 0.12), mix(c, b, 0.12), 0.12), tan = unit(sub(b, c)), end = add(b, tan, -5);
  const hn = [-tan[1], tan[0]], h1 = add(add(end, tan, -7.5), hn, 4.2), h2 = add(add(end, tan, -7.5), hn, -4.2);
  return `<path class="ath-arrow" d="M${pt(start)}Q${pt(c)} ${pt(add(end, tan, -5))}"/><path class="ath-arrow-head" d="M${pt(end)}L${pt(h1)}L${pt(h2)}Z"/>`;
}

/** Numbered marker beside a joint, tied to it with a short leader line. */
export function pin(n, at, off = [0, 0], flip = false) {
  const c = add(at, off), far = Math.hypot(off[0], off[1]) > 9;
  return `${far ? `<path class="ath-leader" d="M${pt(at)}L${pt(c)}"/><circle class="ath-leader-dot" cx="${f(at[0])}" cy="${f(at[1])}" r="1.8"/>` : ''}<circle class="ath-pin" cx="${f(c[0])}" cy="${f(c[1])}" r="7.4"/><text class="ath-pin-n" x="${f(c[0])}" y="${f(c[1] + 3.3)}" text-anchor="middle"${flip ? ` transform="matrix(-1 0 0 1 ${f(2 * c[0])} 0)"` : ''}>${n}</text>`;
}

/** Look up a joint by name, e.g. 'leg2.K', 'arm1.E', 'S', 'P', 'HC', 'bat.tip'. */
export const jointAt = (j, key) => key.split('.').reduce((o, k) => o?.[k], j);

/** Mirror a drawing left-to-right about the middle of its viewBox (for the left-handed view). */
export const mirrored = (inner, viewBox) => `<g transform="matrix(-1 0 0 1 ${f(2 * viewBox[0] + viewBox[2])} 0)">${inner}</g>`;

export function svg(inner, viewBox, { cls = '', label = '', mirror = false } = {}) {
  if (mirror) inner = mirrored(inner, viewBox);
  return `<svg class="ath-fig ${cls}" viewBox="${viewBox.map(f).join(' ')}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

/** Horizontal window around the given points, with a fixed vertical window so the ground lines up. */
export function frameFor(points, { minWidth = 220, top = 30, bottom = 250, padX = 22 } = {}) {
  let lo = Infinity, hi = -Infinity, y0 = top;
  for (const p of points) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); y0 = Math.min(y0, p[1] - 10); }
  const w = Math.max(minWidth, hi - lo + padX * 2), cx = (lo + hi) / 2;
  return [cx - w / 2, y0, w, bottom - y0];
}
