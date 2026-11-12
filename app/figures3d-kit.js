// Shared wiring for the 3D pitching and hitting figures: still pictures with numbered
// markers, the strip of key events, and the live view. See figure3d.js for the model.
import { snapshot, createPlayer, tube, ballMesh, jointAt, bodyPoints, VIEWS } from './figure3d.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f = n => Math.round(n * 10) / 10;

export function makeFigures({ kind, model, ground, PHASE_SPANS, SEQUENCE, POSES, CUES, arcs, HAND, viewNote, stage, trail, ballFlight, stillBall, view = VIEWS.side }) {
  let M; const get = () => M || (M = model());
  const cache = new Map(), theme = () => document.documentElement.dataset.theme || 'light';
  const memo = (key, make) => { const k = `${theme()}|${key}`; if (!cache.has(k)) cache.set(k, make()); return cache.get(k); };
  const kit = () => get().kit;
  const pinSvg = (n, at, off) => {
    const c = [at[0] + off[0], at[1] + off[1]];
    return `<path class="ath-leader" d="M${f(at[0])} ${f(at[1])}L${f(c[0])} ${f(c[1])}"/><circle class="ath-leader-dot" cx="${f(at[0])}" cy="${f(at[1])}" r="3"/><circle class="ath-pin f3-pin" cx="${f(c[0])}" cy="${f(c[1])}" r="13"/><text class="ath-pin-n f3-pin-n" x="${f(c[0])}" y="${f(c[1] + 5.5)}" text-anchor="middle">${n}</text>`;
  };
  const wrap = (shot, inner, label, cls = '') => `<svg class="ath-fig f3-fig ${cls}" viewBox="0 0 ${shot.width} ${shot.height}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet"><image href="${shot.url}" width="${shot.width}" height="${shot.height}"/>${inner}</svg>`;

  /** Picture for one phase: where it starts (pale), where it ends, the path between, and numbered cues. */
  function phaseFigure(phaseId, { pins = true, mirror = false } = {}) {
    const span = PHASE_SPANS[phaseId]; if (!span) return '';
    return memo(`phase|${phaseId}|${pins}|${mirror}`, () => {
      const m = get(), [a, b] = span.map(id => m.keys.find(k => k.id === id)), ja = m.jointsAt(a.at), jb = m.jointsAt(b.at);
      const cue = CUES[phaseId] || {}, path = [];
      if (cue.trace) for (let i = 0; i <= 24; i++) path.push(jointAt(m.jointsAt(a.at + (b.at - a.at) * i / 24), cue.trace).clone());
      const extras = [];
      if (path.length && path[0].distanceTo(path[path.length - 1]) > 0.12) extras.push(tube(path, getComputedStyle(document.documentElement).getPropertyValue('--fig-motion').trim() || '#a85a0c', 0.011));
      const measure = getComputedStyle(document.documentElement).getPropertyValue('--fig-measure').trim() || '#2b5c8f';
      const arcList = pins && arcs ? arcs(b.id, jb) : [];
      for (const arc of arcList) extras.push(tube(arc.points, measure, 0.008));
      const loose = stillBall?.(b.id, jb); if (loose) extras.push(ballMesh(loose));
      const shot = snapshot({ kit: kit(), kind, ground, view, lefty: mirror, figures: [{ joints: ja, mode: 'ghost' }, { joints: jb, mode: 'solid' }], extras, stage, width: 560, height: 520, minHeight: 2.2, framePts: [...bodyPoints(ja), ...bodyPoints(jb), ...path] });
      let inner = '';
      for (const arc of arcList) {
        // Push each label away from the joint it measures so it sits clear of the body.
        const p = shot.project(arc.at), c = shot.project(arc.from || arc.at), d = [p[0] - c[0], p[1] - c[1]], len = Math.hypot(d[0], d[1]) || 1;
        if (!arc.label) continue;
        const q = arc.from ? [p[0] + d[0] / len * 44, p[1] + d[1] / len * 26] : [p[0], p[1] + 26];
        inner += `<text class="f3-measure" x="${f(Math.max(96, Math.min(shot.width - 96, q[0])))}" y="${f(q[1] + 5)}" text-anchor="middle">${esc(arc.label)}</text>`;
      }
      if (pins) (cue.pins || []).forEach(([key, off], i) => { inner += pinSvg(i + 1, shot.project(jointAt(jb, key)), mirror ? [-off[0], off[1]] : off); });
      return wrap(shot, inner, `${POSES[b.id].label}: end of this phase`, 'f3-phase');
    });
  }
  /** Small picture of one key event for the strip. */
  function eventFigure(key, { mirror = false } = {}) {
    return memo(`event|${key}|${mirror}`, () => {
      const m = get(), j = m.jointsOf(key);
      const loose = stillBall?.(key, j);
      const shot = snapshot({ kit: kit(), kind, ground, view, lefty: mirror, figures: [{ joints: j, mode: 'solid' }], extras: loose ? [ballMesh(loose)] : [], stage, width: 240, height: 290, minHeight: 2.25, minWidth: 1.5 });
      return wrap(shot, '', POSES[key].label, 'f3-event');
    });
  }
  const cueList = phaseId => (CUES[phaseId]?.pins || []).map(p => p[2]);
  /** Live view for the Play tab. Returns { times, total, setTime, setView, turn, dispose }. */
  function player(host, { lefty = false, onView } = {}) {
    const m = get();
    const p = createPlayer(host, { model: m, kind, stage, trail, view, arcsAt: arcs, lefty, onView, ballFlight: ballFlight ? ballFlight(m) : null });
    return { ...p, times: m.eventTimes, total: m.total };
  }
  const times = () => get().eventTimes;
  return { three: true, phaseFigure, eventFigure, cueList, PHASE_SPANS, SEQUENCE, POSES, viewNote, VIEW_NOTE: viewNote(false), HAND, player, times, VIEWS, model: get };
}
