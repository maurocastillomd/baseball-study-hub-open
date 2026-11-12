// Movement breakdowns: the pitching delivery and the hitting swing.
// Each one goes phase → drawing → positions → muscles → tissue load → the ROM it borrows.
// Self-contained like joints.js: owns its listeners and returns a cleanup function.
import { loadJoints } from './joints.js';
import { mirrored } from './athlete-figures.js';

const base = new URL('./', import.meta.url);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const icon = d => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">${d}</svg>`;
const PLAY_ICONS = {
  play: icon('<path d="M8 5.2v13.6a.6.6 0 0 0 .92.5l10.6-6.8a.6.6 0 0 0 0-1L8.92 4.7a.6.6 0 0 0-.92.5z"/>'),
  pause: icon('<rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/>'),
  replay: icon('<path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M3.2 5.2l2.4 5 5-2.2z"/>'),
};

const TURN_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 3.2 0 1 0 8-3.2"/><path d="M9.5 5.6 12 8.8 8.6 11"/></svg>';

const KINDS = {
  delivery: { data: 'data/delivery.json', figures: './pitch-figures.js', figures3d: './pitch-figures-3d.js', noun: 'delivery', whole: 'Whole delivery', cls: 'pitch-fig', fallback: 'cocking', failed: 'The delivery breakdown could not load.' },
  swing: { data: 'data/swing.json', figures: './swing-figures.js', figures3d: './swing-figures-3d.js', noun: 'swing', whole: 'Whole swing', cls: 'swing-fig', fallback: 'acceleration', failed: 'The swing breakdown could not load.' },
};

// The 3D figures need WebGL. Without it (or if they fail to load) the flat drawings are used instead.
async function loadFigures(cfg) {
  try {
    const { webglOK } = await import('./figure3d.js');
    if (webglOK()) return (await import(cfg.figures3d)).default;
  } catch (error) { console.warn('3D figures unavailable, using flat drawings.', error); }
  return import(cfg.figures);
}

async function mountBreakdown(host, kind, { phase, onChange = () => {} } = {}) {
  const cfg = KINDS[kind];
  let data, joints, fig;
  try {
    const response = await fetch(new URL(cfg.data, base));
    if (!response.ok) throw new Error(`${cfg.noun} data: HTTP ${response.status}`);
    [data, joints, fig] = await Promise.all([response.json(), loadJoints(), loadFigures(cfg)]);
  } catch (error) { host.innerHTML = `<div class="notice warning"><h2>${esc(cfg.failed)}</h2><p>Reload the page to retry.</p><p>${esc(error.message)}</p></div>`; return () => {}; }
  const { phaseFigure, eventFigure, cueList, PHASE_SPANS, SEQUENCE, POSES, viewNote, HAND, motion } = fig;
  const moves = new Map(joints.joints.flatMap(j => j.movements.map(m => [m.id, { joint: j, move: m }])));
  phase = phase || cfg.fallback;
  let index = Math.max(0, data.phases.findIndex(p => p.id === phase));
  let recall = false, revealed = new Set(), all = phase === 'all', play = phase === 'play';
  // Left-handed view: every drawing is mirrored. Remembered on this device only.
  const HAND_KEY = `baseball-performance-hub.lefty.${kind}`;
  let lefty = false; try { lefty = localStorage.getItem(HAND_KEY) === '1'; } catch { /* private window */ }
  // Player state survives re-renders so switching hands keeps your place.
  const pl = { time: 0, speed: 1, loop: false, playing: false, raf: 0, last: 0, seg: -1, model: null, player: null, cam: 'side' };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const src = id => data.sources[id] || { short: id, title: id, type: '' };
  const cite = ids => (ids || []).length ? ` <span class="dl-cite">${ids.map(id => esc(src(id).short)).join(', ')}</span>` : '';
  const events = p => (PHASE_SPANS[p.id] || []).map(k => POSES[k].label);

  function romChip(r) {
    const hit = moves.get(r.move); if (!hit) return '';
    const n = hit.move.norms.find(x => x.deg > 0);
    const norm = n ? `${hit.move.zeroNorm ? '' : '0–'}${n.deg}°` : '';
    return `<a class="dl-rom" href="#joints/${esc(hit.joint.id)}/${esc(hit.move.id)}"><span><strong>${esc(hit.joint.name)} · ${esc(hit.move.name)}</strong><small>${esc(r.why)}</small></span>${norm ? `<em>${esc(norm)}</em>` : ''}</a>`;
  }

  // The drawing: start event faded, end event in color, numbered cues listed underneath.
  function picture(p, hide) {
    const ev = events(p);
    if (!ev.length) return '';
    const cues = cueList(p.id);
    return `<figure class="dl-pic"><div class="fig-stage dl-pic-stage"><span class="fig-chip">${esc(HAND.view(lefty))}</span><span class="fig-chip fig-chip-dir">${lefty ? `← ${esc(HAND.toward)}` : `${esc(HAND.toward)} →`}</span>${phaseFigure(p.id, { pins: !hide, mirror: lefty })}</div>
      <figcaption>${hide ? '<p class="dl-pic-hidden">Recall mode: say what each body part is doing, then reveal.</p>' : `<ol class="dl-cues">${cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>`}
        <p class="dl-legend"><span><i class="dl-key dl-key-start"></i>${esc(ev[0])}</span><span><i class="dl-key dl-key-end"></i>${esc(ev[1])}</span><span><i class="dl-key dl-key-path"></i>Path</span></p>
        <p class="dl-pic-note">${esc(viewNote(lefty))} ${fig.three ? 'Teaching model' : 'Teaching sketch'}, not motion capture.</p></figcaption></figure>`;
  }

  function detail(p, i, whole = false) {
    const hide = recall && !revealed.has(p.id);
    const refs = [...new Set([...p.positions.map(x => x.src), ...(p.muscleSrc || []), ...(p.tissueSrc || []), ...(p.watchSrc || []), ...(p.scSrc || [])])];
    const Tag = whole ? 'h3' : 'h2';
    return `<div class="dl-hero"><div class="dl-hero-text">
        <p class="eyebrow">Phase ${i + 1} of ${data.phases.length} · ${esc(p.timing)}</p>
        <${Tag} class="dl-title">${esc(p.name)}</${Tag}>
        <p class="dl-span">${esc(p.span)}</p>
        <p class="dl-summary">${esc(p.summary)}</p>
        <div class="rom-baseball dl-sc"><strong>S&amp;C takeaway</strong><p>${esc(p.sc)}${cite(p.scSrc)}</p></div>
      </div>${picture(p, hide)}</div>
      <div class="dl-grid">
        <section class="dl-card dl-positions"><h3>Key positions and loads</h3>${hide ? `<button type="button" class="button" data-dl-reveal="${esc(p.id)}">Reveal the values</button>` : `<table><tbody>${p.positions.map(x => `<tr><th scope="row">${esc(x.measure)}</th><td>${esc(x.value)}${cite([x.src])}</td></tr>`).join('')}</tbody></table>`}</section>
        <section class="dl-card"><h3>Muscles at work</h3><ul class="dl-muscles">${p.muscles.map(m => `<li><strong>${esc(m.name)}</strong><span>${esc(m.role)}</span></li>`).join('')}</ul>${(p.muscleSrc || []).length ? `<p class="dl-note">Activity pattern from${cite(p.muscleSrc)}</p>` : ''}</section>
        <div class="dl-stack">
          <section class="dl-card dl-tissue"><h3>Tissue under load</h3><p>${esc(p.tissue)}${cite(p.tissueSrc)}</p></section>
          <section class="dl-card dl-watch"><h3>Watch for</h3><p>${esc(p.watch)}${cite(p.watchSrc)}</p></section>
        </div>
        <section class="dl-card dl-range"><h3>Range this phase borrows</h3><p class="dl-note">Tap to open the normal range of motion.</p><div class="dl-roms">${p.rom.map(romChip).join('')}</div></section>
      </div>
      <details class="rom-refs"><summary>References for this phase</summary><ul>${refs.map(id => `<li>${esc(src(id).title)} <span class="muted">· ${esc(src(id).type)}</span></li>`).join('')}</ul></details>
      ${whole ? '' : `<div class="dl-step">${i > 0 ? `<button type="button" class="button" data-dl-step="-1">← ${esc(data.phases[i - 1].name)}</button>` : '<span></span>'}${i < data.phases.length - 1 ? `<button type="button" class="button primary" data-dl-step="1">${esc(data.phases[i + 1].name)} →</button>` : ''}</div>`}`;
  }

  // Whole view: every event as one strip, with each phase spanning the two events that bound it.
  function strip() {
    const cols = SEQUENCE.length * 2;
    const cells = SEQUENCE.map((k, i) => `<li class="dl-frame" style="grid-column:${2 * i + 1} / span 2"><i class="dl-tick" aria-hidden="true"></i>${eventFigure(k, { mirror: lefty })}<span>${esc(POSES[k].label)}</span></li>`).join('');
    const bands = data.phases.map((p, i) => `<li class="dl-band" style="grid-column:${2 * i + 2} / span 2"><button type="button" data-dl-jump="${esc(p.id)}"><span class="dl-num">${i + 1}</span>${esc(p.name)}</button></li>`).join('');
    return `<div class="dl-strip-wrap" style="--dl-cols:${cols};--dl-n:${SEQUENCE.length};--dl-min:${cols * 48}px;--dl-min-phone:${cols * 64}px" tabindex="0" role="group" aria-label="${esc(cfg.whole)}, key events in order"><ol class="dl-bands" aria-label="Phases">${bands}</ol><ol class="dl-strip" aria-label="Key events of the ${cfg.noun}">${cells}</ol></div>`;
  }

  function allView() {
    return `<section class="dl-all">${strip()}<p class="dl-note dl-strip-note">Tap a phase to jump to it. ${esc(viewNote(lefty))}</p>
      ${data.phases.map((p, i) => `<article class="dl-detail dl-section" id="dl-phase-${esc(p.id)}">${detail(p, i, true)}</article>`).join('')}</section>`;
  }

  function timeline() {
    return `<ol class="dl-timeline" style="--dl-n:${data.phases.length}" aria-label="Phases of the ${cfg.noun}">${data.phases.map((x, i) => { const ev = events(x); return `<li><button type="button" data-dl-phase="${i}" aria-current="${i === index ? 'step' : 'false'}"><span class="dl-num">${i + 1}</span><span class="dl-step-name">${esc(x.name)}</span>${ev.length ? `<small>${esc(ev[0])} → ${esc(ev[1])}</small>` : ''}</button></li>`; }).join('')}</ol>`;
  }

  function render() {
    const p = data.phases[index];
    stop(); pl.player?.dispose(); pl.player = null;
    host.innerHTML = `<section class="rom-lab dl-lab">
      <p class="rom-summary dl-lead">${esc(data.intro)}</p>
      <div class="dl-top"><div class="dl-views" role="group" aria-label="Layout"><button type="button" data-dl-view="phase" aria-pressed="${!all && !play}">Phase by phase</button><button type="button" data-dl-view="all" aria-pressed="${all}">${esc(cfg.whole)}</button><button type="button" data-dl-view="play" aria-pressed="${play}">Play it</button></div>
        <div class="dl-hand"><span id="dl-hand-label">${esc(HAND.label)}</span><div class="dl-views" role="group" aria-labelledby="dl-hand-label"><button type="button" data-dl-hand="0" aria-pressed="${!lefty}">Right</button><button type="button" data-dl-hand="1" aria-pressed="${lefty}">Left</button></div></div>
        ${play ? '' : `<label class="rom-recall"><input type="checkbox" data-dl-recall ${recall ? 'checked' : ''}> Recall mode: hide the values</label>`}</div>
      ${play ? playView() : all ? allView() : `${timeline()}<article class="dl-detail" aria-live="polite">${detail(p, index)}</article>`}
    </section>`;
    if (play && fig.three) {
      const el = host.querySelector('[data-dl-3d]');
      const mark = name => { pl.cam = name; host.querySelectorAll('[data-dl-cam]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dlCam === name))); };
      try { pl.player = fig.player(el, { lefty, onView: mark }); if (pl.cam && pl.cam !== 'side') pl.player.setView(pl.cam); }
      catch (error) { el.innerHTML = `<p class="dl-note">The 3D view could not start on this device.</p>`; console.warn(error); }
    }
    if (play) { pl.seg = -1; paint(); }
  }

  // ---- Play view: the key events blended into a moving sketch you can play and scrub. ----
  function model3d() {
    const times = fig.times(), total = times[times.length - 1];
    const locate = time => { const t = Math.max(0, Math.min(total, time)); let i = times.findIndex((x, n) => n < times.length - 1 && t <= times[n + 1]); if (i < 0) i = times.length - 2; return { i, k: (t - times[i]) / (times[i + 1] - times[i] || 1), t }; };
    return { three: true, times, total, locate };
  }
  function playView() {
    const M = pl.model || (pl.model = fig.three ? model3d() : motion());
    const label = `Moving ${fig.three ? '3D model' : 'sketch'} of the ${cfg.noun}. ${viewNote(lefty)}`;
    let stage;
    if (fig.three) {
      stage = `<div class="fig-stage f3-wrap"><div class="f3-stage" data-dl-3d tabindex="0" role="img" aria-label="${esc(label)} Drag, or use the arrow keys, to turn it."></div>
        <div class="f3-bar"><div class="dl-views f3-cams" role="group" aria-label="View">${[['side', 'Side'], ['front', 'Front'], ['top', 'Above']].map(([v, t]) => `<button type="button" data-dl-cam="${v}" aria-pressed="${pl.cam === v}">${t}</button>`).join('')}</div><span class="f3-hint">${TURN_ICON}Drag to turn</span></div></div>`;
    } else {
      const vb = M.viewBox, inner = `${M.scene}<g data-dl-frame></g>`;
      stage = `<div class="fig-stage dl-pic-stage"><span class="fig-chip">${esc(HAND.view(lefty))}</span><span class="fig-chip fig-chip-dir">${lefty ? `← ${esc(HAND.toward)}` : `${esc(HAND.toward)} →`}</span><svg class="ath-fig ${cfg.cls}" viewBox="${vb.map(v => v.toFixed(1)).join(' ')}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${lefty ? mirrored(inner, vb) : inner}</svg></div>`;
    }
    return `<section class="dl-play">
      <div class="dl-stage">${stage}
        <div class="dl-play-bar">
          <button type="button" class="button primary dl-toggle" data-dl-toggle aria-label="Play" title="Play">${PLAY_ICONS.play}</button>
          <input type="range" class="dl-scrub" min="0" max="1000" step="1" value="0" data-dl-scrub aria-label="Position in the ${cfg.noun}">
          <div class="dl-views dl-speed" role="group" aria-label="Speed">${[[1, '1×'], [0.5, '½×'], [0.25, '¼×']].map(([v, t]) => `<button type="button" data-dl-speed="${v}" aria-pressed="${pl.speed === v}">${t}</button>`).join('')}</div>
        </div>
        <ol class="dl-events" aria-label="Jump to a key event">${SEQUENCE.map((k, i) => `<li><button type="button" data-dl-event="${i}"><span class="dl-num">${i + 1}</span>${esc(POSES[k].label)}</button></li>`).join('')}</ol>
        <label class="rom-recall dl-loop"><input type="checkbox" data-dl-loop ${pl.loop ? 'checked' : ''}> Repeat</label>
        <p class="dl-pic-note">${fig.three ? 'Key positions set to published averages, blended into frames and slowed so every phase is visible. The blue arcs appear when you stop on a key event.' : 'Hand-drawn key positions blended into frames and slowed so every phase is visible.'} This is not real timing and not motion-capture data.${fig.three ? '' : ` ${esc(viewNote(lefty))}`}</p>
      </div>
      <article class="dl-card dl-now" data-dl-now aria-live="off"></article>
    </section>`;
  }
  function nowCard(i) {
    const p = data.phases[i]; if (!p) return '';
    const ev = events(p);
    return `<p class="eyebrow">Phase ${i + 1} of ${data.phases.length} · ${esc(p.timing)}</p><h2 class="dl-title">${esc(p.name)}</h2>
      <p class="dl-span">${ev.length ? `${esc(ev[0])} → ${esc(ev[1])}` : esc(p.span)}</p><p class="dl-summary">${esc(p.summary)}</p>
      <div class="rom-baseball dl-sc"><strong>S&amp;C takeaway</strong><p>${esc(p.sc)}${cite(p.scSrc)}</p></div>
      <button type="button" class="button" data-dl-phase="${i}">Open this phase →</button>`;
  }
  function paint() {
    const M = pl.model, g = host.querySelector(M?.three ? '[data-dl-3d]' : '[data-dl-frame]'); if (!M || !g) return;
    // With reduced motion on, show the key events one at a time rather than a smooth blend.
    let t = pl.time;
    if (reduced() && pl.playing) { const at = M.locate(t); t = M.times[at.i]; }
    let f;
    if (M.three) { pl.player?.setTime(t); f = M.locate(t); }
    else { f = M.frame(t); g.innerHTML = f.svg + M.extra(f); }
    const scrub = host.querySelector('[data-dl-scrub]');
    if (scrub && document.activeElement !== scrub) scrub.value = String(Math.round(pl.time / M.total * 1000));
    scrub?.setAttribute('aria-valuetext', `${POSES[SEQUENCE[f.i]].label} to ${POSES[SEQUENCE[f.i + 1]].label}`);
    const seg = f.k >= 1 && f.i < data.phases.length - 1 && pl.time < M.total ? f.i + 1 : f.i;
    if (seg !== pl.seg) { pl.seg = seg; const now = host.querySelector('[data-dl-now]'); if (now) now.innerHTML = nowCard(seg); }
    const near = M.times.findIndex(x => Math.abs(x - pl.time) < 0.02);
    host.querySelectorAll('[data-dl-event]').forEach((b, i) => b.setAttribute('aria-current', i === near ? 'step' : 'false'));
    const btn = host.querySelector('[data-dl-toggle]');
    if (btn) { const k = pl.playing ? 'pause' : pl.time >= M.total ? 'replay' : 'play', name = k[0].toUpperCase() + k.slice(1); if (btn.dataset.icon !== k) { btn.dataset.icon = k; btn.innerHTML = PLAY_ICONS[k]; btn.setAttribute('aria-label', name); btn.title = name; } }
  }
  function tick(now) {
    if (!pl.playing) return;
    const M = pl.model, dt = Math.min(0.1, (now - pl.last) / 1000); pl.last = now;
    pl.time += dt * pl.speed;
    if (pl.time >= M.total) { if (pl.loop) pl.time = 0; else { pl.time = M.total; pl.playing = false; } }
    paint();
    if (pl.playing) pl.raf = requestAnimationFrame(tick);
  }
  function stop() { pl.playing = false; cancelAnimationFrame(pl.raf); }
  function start() {
    if (!pl.model) return;
    if (pl.time >= pl.model.total) pl.time = 0;
    pl.playing = true; pl.last = performance.now(); pl.raf = requestAnimationFrame(tick); paint();
  }
  function seek(t) { stop(); pl.time = Math.max(0, Math.min(pl.model.total, t)); paint(); }

  function go(i, focusSel) {
    all = false; play = false;
    index = Math.max(0, Math.min(data.phases.length - 1, i));
    render(); onChange(data.phases[index].id);
    const btn = host.querySelector(focusSel || `[data-dl-phase="${index}"]`);
    btn?.focus({ preventScroll: true });
  }
  const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const onClick = e => {
    const v = e.target.closest('[data-dl-view]');
    if (v) { all = v.dataset.dlView === 'all'; play = v.dataset.dlView === 'play'; render(); onChange(all ? 'all' : play ? 'play' : data.phases[index].id); host.querySelector(`[data-dl-view="${v.dataset.dlView}"]`)?.focus({ preventScroll: true }); return; }
    const hand = e.target.closest('[data-dl-hand]');
    if (hand) {
      lefty = hand.dataset.dlHand === '1'; try { localStorage.setItem(HAND_KEY, lefty ? '1' : '0'); } catch { /* private window */ }
      const y = window.scrollY; render(); window.scrollTo(0, y); host.querySelector(`[data-dl-hand="${lefty ? 1 : 0}"]`)?.focus({ preventScroll: true }); return;
    }
    if (e.target.closest('[data-dl-toggle]')) { if (pl.playing) { stop(); paint(); } else start(); return; }
    const evb = e.target.closest('[data-dl-event]'); if (evb) { seek(pl.model.times[Number(evb.dataset.dlEvent)]); return; }
    const cam = e.target.closest('[data-dl-cam]'); if (cam) { pl.player?.setView(cam.dataset.dlCam); return; }
    const sp = e.target.closest('[data-dl-speed]');
    if (sp) { pl.speed = Number(sp.dataset.dlSpeed); host.querySelectorAll('[data-dl-speed]').forEach(b => b.setAttribute('aria-pressed', String(b === sp))); return; }
    const jump = e.target.closest('[data-dl-jump]');
    if (jump) { host.querySelector(`#dl-phase-${CSS.escape(jump.dataset.dlJump)}`)?.scrollIntoView({ block: 'start', behavior: smooth() }); return; }
    const ph = e.target.closest('[data-dl-phase]'); if (ph) { go(Number(ph.dataset.dlPhase)); return; }
    const st = e.target.closest('[data-dl-step]');
    if (st) { go(index + Number(st.dataset.dlStep)); host.querySelector('.dl-timeline')?.scrollIntoView({ block: 'start', behavior: smooth() }); return; }
    const rv = e.target.closest('[data-dl-reveal]');
    if (rv) {
      const id = rv.dataset.dlReveal || data.phases[index].id; revealed.add(id);
      const y = window.scrollY; render(); window.scrollTo(0, y);
      host.querySelector(all ? `#dl-phase-${CSS.escape(id)} .dl-positions h3` : '.dl-positions h3')?.focus?.();
    }
  };
  const onInput = e => { if (e.target.matches('[data-dl-scrub]')) seek(Number(e.target.value) / 1000 * pl.model.total); };
  const onChangeEvt = e => { if (e.target.matches('[data-dl-loop]')) { pl.loop = e.target.checked; return; } if (e.target.matches('[data-dl-recall]')) { recall = e.target.checked; revealed = new Set(); const y = window.scrollY; render(); window.scrollTo(0, y); host.querySelector('[data-dl-recall]')?.focus({ preventScroll: true }); } };
  const onKey = e => {
    if (play && e.target.matches?.('[data-dl-3d]') && pl.player) {
      const turn = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] }[e.key];
      if (turn) { e.preventDefault(); pl.player.turn(...turn); }
      return;
    }
    if (all || play || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'ArrowRight') go(index + 1); else if (e.key === 'ArrowLeft') go(index - 1);
  };
  host.addEventListener('click', onClick);
  host.addEventListener('change', onChangeEvt);
  host.addEventListener('input', onInput);
  host.addEventListener('keydown', onKey);
  render();
  return () => { stop(); pl.player?.dispose(); host.removeEventListener('input', onInput); host.removeEventListener('click', onClick); host.removeEventListener('change', onChangeEvt); host.removeEventListener('keydown', onKey); };
}

export const mountDelivery = (host, opts) => mountBreakdown(host, 'delivery', opts);
export const mountSwing = (host, opts) => mountBreakdown(host, 'swing', opts);
