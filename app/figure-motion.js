// Moving version of the pitching and hitting sketches. It blends the hand-set key
// poses into in-between frames so the delivery or swing can be played and scrubbed.
// The frames are drawn, not measured: no timing or position here is motion-capture data.
import { athlete, solve, extent, frameFor, mix, B } from './athlete-figures.js';

const lerp = (a, b, k) => a + (b - a) * k, R = Math.PI / 180;
const FLAGS = ['gloveTop', 'legOver', 'armBehind', 'batLayer', 'armOrder', 'leadLegBack', 'face'];

// Fill in every default so two poses can be blended value by value.
function full(p) {
  const t = p.t || 0, q = { ...p, t, sh: p.sh ?? 1, hp: p.hp ?? 1, head: p.head ?? t * 0.45 };
  for (const k of ['leg1', 'leg2']) {
    const l = p[k];
    q[k] = Array.isArray(l) ? [l[0], l[1], l[2], l[3] ?? 1, l[4] ?? 1, l[5] ?? 1] : { foot: [l.foot[0], l.foot[1] ?? 0, l.foot[2] ?? 90, l.foot[3] ?? 0.6], knee: l.knee || [0, 0] };
  }
  for (const k of ['arm1', 'arm2']) if (p[k]) q[k] = [p[k][0], p[k][1], p[k][2] ?? 1, p[k][3] ?? 1];
  if (p.grip) Object.assign(q, { bat: [p.bat[0], p.bat[1] ?? 1], k1: p.k1 ?? 1, k2: p.k2 ?? 1, el1: p.el1 || 'down', el2: p.el2 || 'down' });
  return q;
}

/**
 * Build a player model from key poses.
 * durations: seconds (at 1x) for each step between events. turns: { 'from>to': { bat: 1 } }
 * forces which way an angle travels (1 = toward the right of the picture first, -1 = the other way);
 * without a hint an angle takes the shorter way round.
 */
export function createMotion({ poses, sequence, kit = 'pitcher', ground, durations, turns = {} }) {
  const keys = sequence.map(k => full(poses[k])), solved = keys.map(p => solve(p, ground));
  const times = [0]; durations.forEach(d => times.push(times[times.length - 1] + d));
  const total = times[times.length - 1];

  function blend(i, k) {
    const a = keys[i], b = keys[i + 1], hint = turns[`${sequence[i]}>${sequence[i + 1]}`] || {};
    const ang = (x, y, name) => {
      let d = ((y - x) % 360 + 540) % 360 - 180;
      if (hint[name] > 0 && d < 0) d += 360; else if (hint[name] < 0 && d > 0) d -= 360;
      return x + d * k;
    };
    const o = { t: lerp(a.t, b.t, k), sh: lerp(a.sh, b.sh, k), hp: lerp(a.hp, b.hp, k), head: lerp(a.head, b.head, k) };
    const side = k < 0.5 ? a : b;
    for (const f of FLAGS) if (side[f] !== undefined) o[f] = side[f];
    for (const L of ['leg1', 'leg2']) {
      const x = a[L], y = b[L];
      o[L] = Array.isArray(x)
        ? [ang(x[0], y[0], L + '.0'), ang(x[1], y[1], L + '.1'), ang(x[2], y[2], L + '.2'), lerp(x[3], y[3], k), lerp(x[4], y[4], k), lerp(x[5], y[5], k)]
        : { foot: [lerp(x.foot[0], y.foot[0], k), lerp(x.foot[1], y.foot[1], k), ang(x.foot[2], y.foot[2], L + '.ft'), lerp(x.foot[3], y.foot[3], k)], knee: mix(x.knee, y.knee, k) };
    }
    if (a.grip) {
      // Each elbow keeps the side it bends to, and slides across when the two events disagree.
      const elbow = A => ({ a: solved[i][A].bend, b: solved[i + 1][A].bend, k });
      Object.assign(o, { grip: mix(a.grip, b.grip, k), bat: [ang(a.bat[0], b.bat[0], 'bat'), lerp(a.bat[1], b.bat[1], k)], k1: lerp(a.k1, b.k1, k), k2: lerp(a.k2, b.k2, k), el1: elbow('arm1'), el2: elbow('arm2') });
    } else {
      // An arm hinted 'across' slides straight from one position to the other (it shortens as it turns
      // toward the viewer); otherwise each segment swings round by its angle.
      const vec = (x, kx, y, ky) => { const v = mix([Math.sin(x * R) * kx, Math.cos(x * R) * kx], [Math.sin(y * R) * ky, Math.cos(y * R) * ky], k); return [Math.atan2(v[0], v[1]) / R, Math.hypot(v[0], v[1])]; };
      for (const A of ['arm1', 'arm2']) {
        if (hint[A] === 'across') { const u = vec(a[A][0], a[A][2], b[A][0], b[A][2]), w = vec(a[A][1], a[A][3], b[A][1], b[A][3]); o[A] = [u[0], w[0], u[1], w[1]]; }
        else o[A] = [ang(a[A][0], b[A][0], A + '.0'), ang(a[A][1], b[A][1], A + '.1'), lerp(a[A][2], b[A][2], k), lerp(a[A][3], b[A][3], k)];
      }
      // The ball stays in the hand until the event that lets it go.
      o.ball = k === 0 ? a.ball !== false : a.ball !== false && b.ball !== false;
    }
    if (a.pelvis) o.pelvis = mix(a.pelvis, b.pelvis, k);
    else {
      // Keep the support foot of the starting event planted and let the body travel off it.
      const leg = a.anchor.leg, name = leg === 1 ? 'leg1' : 'leg2', A = mix(solved[i][name].A, solved[i + 1][name].A, k);
      o.anchor = { leg, x: A[0], lift: ground(A[0]) - B.ankle - A[1] };
    }
    return o;
  }

  /** Where a time falls: the step index and how far through it (0 to 1). */
  function locate(time) {
    const t = Math.max(0, Math.min(total, time));
    let i = times.findIndex((x, n) => n < times.length - 1 && t <= times[n + 1]);
    if (i < 0) i = times.length - 2;
    return { i, k: (t - times[i]) / (times[i + 1] - times[i] || 1), t };
  }
  function poseAt(time) { const { i, k } = locate(time); return k <= 0 ? keys[i] : k >= 1 ? keys[i + 1] : blend(i, k); }
  function frame(time) { const o = poseAt(time), a = athlete(o, { kit, ground }); return { svg: a.svg, joints: a.joints, pose: o, ...locate(time) }; }

  // One fixed window that fits the whole movement, so the picture does not jump while it plays.
  const pts = [];
  for (let i = 0; i < keys.length - 1; i++) for (let n = 0; n <= 8; n++) pts.push(...extent(solve(n === 0 ? keys[i] : n === 8 ? keys[i + 1] : blend(i, n / 8), ground)));
  const viewBox = frameFor(pts, { minWidth: 250, bottom: 256, top: 999, padX: 20 });
  return { times, total, viewBox, frame, locate, keys, solved };
}
