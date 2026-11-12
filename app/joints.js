// Joint ROM explorer: pick a joint, tap a movement, read its reference range.
// Self-contained: owns its listeners on the host and returns a cleanup function.

import { movementFigure } from './motion-figures.js';

const base = new URL('./', import.meta.url);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cache = null;

export async function loadJoints() {
  if (!cache) {
    const response = await fetch(new URL('data/joints.json', base));
    if (!response.ok) throw new Error(`Joint data: HTTP ${response.status}`);
    cache = await response.json();
  }
  return cache;
}

/** Degree gauge: the reference arc, a tick for each other source, and an optional measured value. */
function gauge(movement, measured) {
  const norms = movement.norms.filter(n => n.deg > 0);
  if (!norms.length) return '';
  const max = Math.max(180, ...norms.map(n => n.deg), measured || 0);
  const scale = deg => Math.PI * Math.min(deg, max) / max;
  // Geometry leaves room outside the arc: alternate-reference ticks sit just
  // outside the ring and the axis labels sit centred under each arc end, so
  // nothing collides with the round line caps.
  const cx = 120, cy = 106, r = 88, w = 240, h = 132;
  const point = (deg, rad = r) => [cx - rad * Math.cos(scale(deg)), cy - rad * Math.sin(scale(deg))];
  const arc = deg => { const [x, y] = point(deg); return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`; };
  const tick = (deg, cls, inner, outer) => { const [ix, iy] = point(deg, inner); const [x, y] = point(deg, outer); return `<line class="${cls}" x1="${ix.toFixed(1)}" y1="${iy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; };
  return `<svg class="rom-gauge" viewBox="0 0 ${w} ${h}" role="img" aria-label="Reference range 0 to ${norms[0].deg} degrees">
    <path class="rom-track" d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}"/>
    <path class="rom-arc" d="${arc(norms[0].deg)}"/>
    ${norms.slice(1).map(n => tick(n.deg, 'rom-alt', r + 9, r + 17)).join('')}
    ${measured > 0 ? tick(measured, 'rom-measured', r - 11, r + 11) : ''}
    <text x="${cx - r}" y="${cy + 24}" class="rom-axis" text-anchor="middle">0°</text><text x="${cx + r}" y="${cy + 24}" class="rom-axis" text-anchor="middle">${max}°</text>
  </svg>`;
}

// The workspace collapses to one column by container width (see layout-fit.css),
// so check the live grid rather than the viewport.
function singleColumnOf(host) { const ws = host.querySelector('.rom-workspace'); return !!ws && getComputedStyle(ws).gridTemplateColumns.trim().split(/\s+/).length === 1; }

export async function mountJoints(host, { joint = 'shoulder', onChange = () => {} } = {}) {
  let data;
  try { data = await loadJoints(); }
  catch (error) { host.innerHTML = `<div class="notice warning"><h2>Joint data could not load.</h2><p>Reload the page to retry.</p><p>${esc(error.message)}</p></div>`; return () => {}; }
  const joints = new Map(data.joints.map(j => [j.id, j]));
  const [jointId, moveId] = String(joint || '').split('/');
  let current = joints.get(jointId) || data.joints[0];
  let movementId = current.movements.some(m => m.id === moveId) ? moveId : current.movements[0].id;
  let recall = false;
  const revealed = new Set();
  const measured = {};
  const arcs = {};

  const src = id => data.sources[id] || { short: id, title: id };
  const primary = m => m.norms.find(n => n.deg > 0) || m.norms[0];
  const rangeText = (m, n = primary(m)) => !n ? '—' : n.label && n.deg === 0 && !m.zeroNorm ? n.label : `${m.zeroNorm ? '' : '0–'}${n.deg}°`;
  const band = pct => data.bands.find(b => pct >= b.min);

  function movementButton(m) {
    const hide = recall && !revealed.has(m.id);
    const value = m.norms.length ? rangeText(m) : 'no ° norm';
    return `<button type="button" class="rom-move" data-joint-move="${esc(m.id)}" aria-pressed="${m.id === movementId}"><span>${esc(m.name)}</span><strong>${hide ? '?' : esc(value)}</strong></button>`;
  }

  function movementList() {
    const groups = [];
    for (const m of current.movements) { const g = m.group || ''; let last = groups[groups.length - 1]; if (!last || last.name !== g) groups.push(last = { name: g, items: [] }); last.items.push(m); }
    return groups.map(g => `${g.name ? `<p class="rom-group">${esc(g.name)}</p>` : ''}<div class="rom-moves">${g.items.map(movementButton).join('')}</div>`).join('');
  }

  function checker(m) {
    const n = primary(m);
    if (!n || n.deg <= 0) return '';
    const value = Number(measured[m.id]);
    let result = '<p class="rom-check-result muted">Enter a measured value to compare it with the reference.</p>';
    if (value > 0) {
      const pct = Math.round(value / n.deg * 100), b = band(Math.min(pct, 100));
      result = `<p class="rom-check-result" data-tone="${b.tone}"><strong>${pct}% of ${esc(src(n.src).short)} reference</strong> · ${esc(b.label)}${value > n.deg ? ' · above the reference range' : ''}</p>`;
    }
    return `<div class="rom-check"><label>Measured <input type="number" inputmode="decimal" min="0" max="270" step="1" data-joint-measure="${esc(m.id)}" value="${esc(measured[m.id] ?? '')}" aria-label="Measured ${esc(m.name)} in degrees"> °</label>${result}</div>`;
  }

  function detail() {
    const m = current.movements.find(x => x.id === movementId);
    const hide = recall && !revealed.has(m.id);
    const n = primary(m);
    const norms = m.norms.length
      ? `<table class="rom-norms"><thead><tr><th>Reference</th><th>Normal</th></tr></thead><tbody>${m.norms.map(x => `<tr><td><abbr title="${esc(src(x.src).title)}">${esc(src(x.src).short)}</abbr></td><td>${esc(x.label || `${m.zeroNorm ? '' : '0–'}${x.deg}°`)}</td></tr>`).join('')}</tbody></table>`
      : '';
    // A picture of the movement replaces the abstract gauge: its arc is drawn at the reference degrees.
    const fig = movementFigure(m.id, { deg: n && n.deg > 0 ? n.deg : 0, alt: m.norms.filter(x => x !== n && x.deg > 0).map(x => x.deg), measured: Number(measured[m.id]) || 0, hide, zero: !!m.zeroNorm, name: `${current.name} ${m.name}` });
    const picture = fig ? `<figure class="rom-pic fig-stage"><span class="fig-chip">${esc(fig.view)}</span>${fig.svg}${fig.legend.length ? `<figcaption><ul class="fig-legend">${fig.legend.map(([k, t]) => `<li><i class="fig-key fig-key-${k}"></i>${esc(t)}</li>`).join('')}</ul></figcaption>` : ''}</figure>` : gauge(m, Number(measured[m.id]) || 0);
    const big = hide ? `<div class="rom-figure rom-figure-hidden">${picture}<button type="button" class="button rom-reveal" data-joint-reveal="1">Reveal the reference range</button></div>`
      : `<div class="rom-big">${n ? `<span class="rom-number">${esc(rangeText(m))}</span><span class="rom-source">${esc(src(n.src).short)}${n.label && n.deg > 0 ? ` · ${esc(n.label)}` : ''}</span>` : '<span class="rom-number rom-number-text">No degree norm</span>'}</div>${m.descriptor ? `<p class="rom-descriptor">${esc(m.descriptor)}</p>` : ''}<div class="rom-figure">${picture}${norms}</div>`;
    const refs = [...new Set([...m.norms.map(x => x.src), ...(m.baseballSrc || [])])];
    return `<p class="rom-plane">${esc(current.name)} · ${esc(m.plane)}</p><h3>${esc(m.name)}</h3>${big}
      ${hide ? '' : checker(m)}
      <dl class="rom-facts"><div><dt>How to measure</dt><dd>${esc(m.test)}</dd></div><div><dt>Normal end feel</dt><dd>${esc(m.endFeel)}</dd></div><div><dt>Prime movers</dt><dd>${esc(m.movers)}</dd></div></dl>
      ${m.baseball ? `<div class="rom-baseball"><strong>In baseball</strong><p>${esc(m.baseball)}</p></div>` : ''}
      <details class="rom-refs"><summary>References for this movement</summary><ul>${refs.map(id => `<li>${esc(src(id).title)} <span class="muted">· ${esc(src(id).type)}</span></li>`).join('')}</ul></details>`;
  }

  function arcTool() {
    const t = current.arcTool;
    if (!t) return '';
    const a = current.movements.find(m => m.id === t.a), b = current.movements.find(m => m.id === t.b);
    const la = t.aLabel || 'ER', lb = t.bLabel || 'IR';
    const v = arcs[current.id] || {};
    const field = (key, label) => `<label>${esc(label)} <input type="number" inputmode="decimal" min="0" max="200" data-joint-arc="${key}" value="${esc(v[key] ?? '')}"> °</label>`;
    const num = k => Number(v[k]);
    let out = `<p class="muted">Enter ${esc(la)} and ${esc(lb)} for both sides, measured the same way.</p>`;
    if ([`a1`, `b1`, `a2`, `b2`].every(k => num(k) > 0)) {
      const arc1 = num('a1') + num('b1'), arc2 = num('a2') + num('b2');
      const facts = { irDeficit: num('b2') - num('b1'), arcDeficit: arc2 - arc1, erGain: num('a1') - num('a2') };
      const flags = t.rules.filter(r => r.test === 'irDeficit' ? facts.irDeficit >= r.threshold : r.test === 'arcDeficit' ? facts.arcDeficit > r.threshold : r.test === 'erGainBelow' ? facts.erGain < r.threshold : false);
      out = `<div class="rom-arc-result"><div><span>${esc(t.sideA)} total arc</span><strong>${arc1}°</strong></div><div><span>${esc(t.sideB)} total arc</span><strong>${arc2}°</strong></div><div><span>Arc difference</span><strong>${arc1 - arc2 > 0 ? '+' : ''}${arc1 - arc2}°</strong></div><div><span>${esc(la)} difference</span><strong>${facts.erGain > 0 ? '+' : ''}${facts.erGain}°</strong></div><div><span>${esc(lb)} difference</span><strong>${-facts.irDeficit > 0 ? '+' : ''}${-facts.irDeficit}°</strong></div></div>${t.rules.length ? (flags.length ? `<ul class="rom-flags">${flags.map(r => `<li>${esc(r.text)} <span class="muted">(${esc(src(r.src).short)})</span></li>`).join('')}</ul>` : '<p class="rom-ok">No published throwing-shoulder threshold crossed.</p>') : '<p class="muted">No validated cut-off exists for hip rotation asymmetry; track change in the same player over time.</p>'}`;
    }
    return `<section class="rom-arc-tool"><h3>${esc(current.name)} total rotation arc</h3><p class="muted">${esc(a.name)} + ${esc(b.name)}</p><div class="rom-arc-grid"><fieldset><legend>${esc(t.sideA)}</legend>${field('a1', la)}${field('b1', lb)}</fieldset><fieldset><legend>${esc(t.sideB)}</legend>${field('a2', la)}${field('b2', lb)}</fieldset></div><div class="rom-arc-out" aria-live="polite">${out}</div></section>`;
  }

  function render() {
    host.innerHTML = `<section class="rom-lab">
      <div class="rom-joints" role="group" aria-label="Joint">${data.joints.map(j => `<button type="button" data-joint="${esc(j.id)}" aria-pressed="${j.id === current.id}">${esc(j.name)}</button>`).join('')}</div>
      <div class="rom-joint-head"><div><p class="eyebrow">${esc(current.joint)}</p><h2>${esc(current.name)}</h2><p class="rom-type">${esc(current.type)}</p></div>
        <label class="rom-recall"><input type="checkbox" data-joint-recall ${recall ? 'checked' : ''}> Recall mode: hide the numbers</label></div>
      <p class="rom-summary">${esc(current.summary)}</p>
      <details class="rom-mechanics"><summary>Close-packed, resting position and capsular pattern</summary><dl class="rom-facts"><div><dt>Close-packed</dt><dd>${esc(current.closePacked)}</dd></div><div><dt>Resting (loose-packed)</dt><dd>${esc(current.resting)}</dd></div><div><dt>Capsular pattern</dt><dd>${esc(current.capsular)}</dd></div></dl><p class="muted">Positions and capsular patterns follow Magee.</p></details>
      <div class="rom-workspace">
        <div class="rom-list"><p class="rom-hint">Tap a movement</p>${movementList()}<div class="rom-baseball rom-joint-baseball"><strong>Baseball lens</strong><p>${esc(current.baseball)}</p></div></div>
        <article class="rom-detail" aria-live="polite">${detail()}</article>
      </div>
      ${arcTool()}
      <details class="rom-about"><summary>About these reference values</summary><p>${esc(data.intro)}</p><p>${esc(data.bandNote)}</p><p>Reviewed ${esc(data.reviewed)}. AMA values follow the 5th edition tables as compiled in Norkin & White; check them against the edition you use.</p></details>
    </section>`;
  }

  function focusAfter(selector) { host.querySelector(selector)?.focus({ preventScroll: true }); }

  const onClick = e => {
    const j = e.target.closest('[data-joint]');
    if (j) { current = joints.get(j.dataset.joint) || current; movementId = current.movements[0].id; render(); onChange(current.id); focusAfter(`[data-joint="${current.id}"]`); return; }
    const m = e.target.closest('[data-joint-move]');
    if (m) {
      movementId = m.dataset.jointMove; render(); focusAfter(`[data-joint-move="${movementId}"]`);
      if (singleColumnOf(host)) host.querySelector('.rom-detail')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    if (e.target.closest('[data-joint-reveal]')) { revealed.add(movementId); render(); focusAfter('.rom-detail h3'); }
  };
  const onInput = e => {
    const t = e.target;
    if (t.matches('[data-joint-measure]')) {
      measured[t.dataset.jointMeasure] = t.value;
      const pos = t.selectionStart; host.querySelector('.rom-detail').innerHTML = detail();
      const input = host.querySelector('[data-joint-measure]'); input.focus(); try { input.setSelectionRange(pos, pos); } catch {}
    } else if (t.matches('[data-joint-arc]')) {
      (arcs[current.id] ||= {})[t.dataset.jointArc] = t.value;
      const key = t.dataset.jointArc; host.querySelector('.rom-arc-tool').outerHTML = arcTool();
      host.querySelector(`[data-joint-arc="${key}"]`)?.focus();
    }
  };
  const onChangeEvt = e => { if (e.target.matches('[data-joint-recall]')) { recall = e.target.checked; revealed.clear(); render(); focusAfter('[data-joint-recall]'); } };
  host.addEventListener('click', onClick);
  host.addEventListener('input', onInput);
  host.addEventListener('change', onChangeEvt);
  render();
  return () => { host.removeEventListener('click', onClick); host.removeEventListener('input', onInput); host.removeEventListener('change', onChangeEvt); };
}
