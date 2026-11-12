// Daily recall: one queue across the hub. It turns content that already exists
// (chapter recall prompts, ROM norms, delivery and swing phases, 3D structure cards)
// into question/answer cards and spaces them out by how well you knew each one.
// Ratings are self-assessed. The spacing is a simple rule, not a measured memory model.
const base = new URL('./', import.meta.url);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const DECKS = [
  { id: 'chapter', name: 'Chapters you have started' },
  { id: 'rom', name: 'Joint range of motion' },
  { id: 'delivery', name: 'Pitching delivery' },
  { id: 'swing', name: 'Hitting swing' },
  { id: 'structure', name: 'Muscles and ligaments' },
];
const NEW_CHOICES = [5, 8, 15], MAX_IVL = 180;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (n, from = new Date()) => { const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n); return today(d); };
const niceDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); };
const span = n => n === 0 ? 'later today' : n === 1 ? '1 day' : n < 30 ? `${n} days` : `${Math.round(n / 30)} mo`;

/** Keep only well-formed recall records, so an imported backup cannot break the queue. */
export function sanitizeReview(input) {
  const x = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const cards = {};
  for (const [id, c] of Object.entries(x.cards && typeof x.cards === 'object' ? x.cards : {}).slice(0, 2000)) {
    if (!/^[a-z]+:[A-Za-z0-9_-]{1,80}$/.test(id) || !c || !DAY.test(c.due)) continue;
    cards[id] = { due: c.due, ivl: Number.isInteger(c.ivl) ? Math.max(0, Math.min(MAX_IVL, c.ivl)) : 0, reps: Number.isInteger(c.reps) ? Math.max(0, Math.min(10000, c.reps)) : 0, lapses: Number.isInteger(c.lapses) ? Math.max(0, Math.min(10000, c.lapses)) : 0 };
  }
  const decks = {};
  for (const d of DECKS) decks[d.id] = x.decks?.[d.id] !== false;
  const day = x.day && DAY.test(x.day.date) && Number.isInteger(x.day.fresh) ? { date: x.day.date, fresh: Math.max(0, Math.min(500, x.day.fresh)), done: Number.isInteger(x.day.done) ? Math.max(0, Math.min(5000, x.day.done)) : 0 } : { date: today(), fresh: 0, done: 0 };
  return { cards, decks, newPerDay: NEW_CHOICES.includes(x.newPerDay) ? x.newPerDay : 8, day };
}

let anatomyCards = null;
async function loadAnatomyCards() {
  if (anatomyCards) return anatomyCards;
  const get = async f => { const r = await fetch(new URL(f, base)); if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return r.json(); };
  const [joints, delivery, swing, anatomy] = await Promise.all(['data/joints.json', 'data/delivery.json', 'data/swing.json', 'data/anatomy.json'].map(get));
  const out = [];
  const srcName = id => joints.sources?.[id]?.short || id;
  for (const j of joints.joints) for (const m of j.movements) {
    const n = (m.norms || []).find(x => x.deg > 0);
    if (!n) continue;
    out.push({ id: `rom:${m.id}`, deck: 'rom', context: `${j.name} · Joints & ROM`, front: `${j.name}: ${m.name}. What is the normal range, what stops it at end range, and what moves it?`, back: [['Normal range', `${m.zeroNorm ? '' : '0–'}${n.deg}° (${srcName(n.src)})`], ['End feel', m.endFeel], ['Prime movers', m.movers], ['In baseball', m.baseball]], href: `#joints/${j.id}/${m.id}` });
  }
  for (const [data, deck, label, route] of [[delivery, 'delivery', 'Pitching delivery', 'delivery'], [swing, 'swing', 'Hitting swing', 'swing']])
    for (const p of data.phases) out.push({ id: `${deck}:${p.id}`, deck, context: label, front: `${label}: ${p.name}. Which two events bound this phase, which tissue takes the load, and what is the S&C takeaway?`, back: [['Runs from', p.span], ['Tissue under load', p.tissue], ['S&C takeaway', p.sc], ['Watch for', p.watch]], href: `#${route}/${p.id}` });
  const byId = new Map(anatomy.structures.map(s => [s.id, s])), seen = new Set();
  for (const r of anatomy.regions) for (const layer of ['muscles', 'ligaments']) for (const id of r[layer] || []) {
    const s = byId.get(id);
    if (!s || seen.has(id) || !(s.action || s.baseball)) continue;
    seen.add(id);
    out.push({ id: `structure:${id}`, deck: 'structure', context: `${r.name} · 3D anatomy`, front: `${s.name}. ${layer === 'muscles' ? 'Where does it attach, what does it do, and why does it matter in baseball?' : 'What does it connect, what does it resist, and why does it matter in baseball?'}`, back: [['Origin', s.origin], ['Insertion', s.insertion], ['Attachments', s.attachments], ['Action', s.action], ['Function', s.function], ['Nerve', s.innervation], ['In baseball', s.baseball]], href: `#anatomy/${r.id}/${id}` });
  }
  return (anatomyCards = out);
}

/**
 * The recall engine. `lessons` and `record` come from the app, so chapter cards
 * only appear for chapters that have been opened.
 */
export function createReview({ getState, save, lessons, record }) {
  const st = () => { const s = getState(); if (!s.review || !s.review.cards) s.review = sanitizeReview(s.review); if (s.review.day.date !== today()) s.review.day = { date: today(), fresh: 0, done: 0 }; return s.review; };
  const chapterCards = () => lessons().filter(l => l.recall?.prompt && l.recall?.answer && record(l.id).status !== 'new').map(l => ({ id: `chapter:${l.id}`, deck: 'chapter', context: `${l.title} · Chapter`, front: l.recall.prompt, back: [['Answer', l.recall.answer]], href: `#lesson/${encodeURIComponent(l.id)}` }));
  const allCards = async () => [...chapterCards(), ...await loadAnatomyCards()].filter(c => /^[a-z]+:[A-Za-z0-9_-]{1,80}$/.test(c.id));

  /** Today's queue: everything due, then new cards up to the daily allowance, mixed across decks. */
  function plan(cards, extraNew = 0) {
    const r = st(), t = today(), on = cards.filter(c => r.decks[c.deck]);
    const due = on.filter(c => r.cards[c.id] && r.cards[c.id].due <= t).sort((a, b) => r.cards[a.id].due.localeCompare(r.cards[b.id].due));
    const fresh = on.filter(c => !r.cards[c.id]);
    const room = Math.max(0, r.newPerDay - r.day.fresh) + extraNew;
    const groups = DECKS.map(d => fresh.filter(c => c.deck === d.id)), mixed = [];
    for (let i = 0; mixed.length < Math.min(room, fresh.length); i++) for (const g of groups) if (g[i] && mixed.length < room) mixed.push(g[i]);
    const upcoming = on.filter(c => r.cards[c.id] && r.cards[c.id].due > t).map(c => r.cards[c.id].due).sort();
    return { due, fresh: mixed, freshLeft: fresh.length - mixed.length, learned: on.filter(c => r.cards[c.id]).length, total: on.length, nextDue: upcoming[0] || null, nextCount: upcoming.filter(d => d === upcoming[0]).length };
  }
  const nextIvl = (c, grade) => { const i = c?.ivl || 0; return grade === 'again' ? 0 : grade === 'good' ? (i === 0 ? 1 : i === 1 ? 3 : Math.min(MAX_IVL, Math.round(i * 2.2))) : Math.min(MAX_IVL, i === 0 ? 4 : Math.round(Math.max(i, 1) * 3.5)); };

  async function counts() { const p = plan(await allCards()); return { due: p.due.length, fresh: p.fresh.length, done: st().day.done, nextDue: p.nextDue }; }

  /** Small card for the Today page. */
  async function fillToday(host) {
    if (!host) return;
    const c = await counts(), n = c.due + c.fresh;
    host.innerHTML = `<a class="recall-today" href="#review"><span class="eyebrow">DAILY RECALL</span><strong>${n ? `${n} ${n === 1 ? 'card' : 'cards'} for today` : c.done ? 'Done for today' : 'Nothing due today'}</strong><span>${n ? `${c.due} due · ${c.fresh} new. About ${Math.max(1, Math.round(n * 0.5))} min.` : c.nextDue ? `Next cards are due ${niceDate(c.nextDue)}.` : 'Open a chapter or turn on a deck to add cards.'}</span><span class="recall-go" aria-hidden="true">→</span></a>`;
  }
  async function badge(el) { if (!el) return; const c = await counts(), n = c.due + c.fresh; el.textContent = n ? String(n) : ''; el.hidden = !n; }

  /** The recall page. Returns a cleanup function. */
  async function mount(host, { onChange = () => {} } = {}) {
    let cards;
    try { cards = await allCards(); } catch (e) { host.innerHTML = `<div class="notice warning"><h2>Daily recall could not load.</h2><p>Reload the page to retry.</p><p>${esc(e.message)}</p></div>`; return () => {}; }
    const byId = new Map(cards.map(c => [c.id, c]));
    let extraNew = 0, queue = [], shown = false, last = null;
    const refill = () => { const p = plan(cards, extraNew); queue = [...p.due, ...p.fresh].map(c => c.id); };
    refill();

    function render(focus) {
      const r = st(), p = plan(cards, extraNew), cur = byId.get(queue[0]);
      const stats = `<div class="stats-strip recall-stats"><div class="stat"><strong>${queue.length}</strong><span>left today</span></div><div class="stat"><strong>${r.day.done}</strong><span>answered today</span></div><div class="stat"><strong>${p.learned}/${p.total}</strong><span>cards started</span></div></div>`;
      let body;
      if (cur) {
        const rec = r.cards[cur.id];
        const answer = cur.back.filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
        body = `<article class="recall-card" data-deck="${esc(cur.deck)}"><p class="eyebrow">${esc(cur.context)}${rec ? '' : ' · new'}</p><h2 class="recall-front">${esc(cur.front)}</h2>
          ${shown ? `<dl class="recall-back">${answer}</dl><p class="recall-open"><a href="${esc(cur.href)}">Open the full card →</a></p>
            <div class="recall-grades" role="group" aria-label="How well did you know it?">${[['again', 'Again', 'Missed it'], ['good', 'Good', 'Got it'], ['easy', 'Easy', 'Knew it cold']].map(([g, label, hint], i) => `<button type="button" class="button${g === 'good' ? ' primary' : ''}" data-recall-grade="${g}"><strong>${label}</strong><small>${hint} · ${span(nextIvl(rec, g))}</small><kbd>${i + 1}</kbd></button>`).join('')}</div>`
            : `<p class="recall-hint">Say the answer out loud or write it down first.</p><button type="button" class="button primary recall-show" data-recall-show>Show answer <kbd>Space</kbd></button>`}
        </article>`;
      } else {
        body = `<article class="recall-card recall-done"><h2>${r.day.done ? 'Done for today.' : 'Nothing is due today.'}</h2><p>${p.nextDue ? `Next: ${p.nextCount} ${p.nextCount === 1 ? 'card' : 'cards'} due ${esc(niceDate(p.nextDue))}.` : 'No cards are scheduled yet.'}${p.freshLeft ? ` ${p.freshLeft} new ${p.freshLeft === 1 ? 'card is' : 'cards are'} waiting.` : ''}</p>${p.freshLeft ? `<button type="button" class="button" data-recall-more>Study 5 more new cards</button>` : ''}${!cards.some(c => c.deck === 'chapter') ? '<p class="small muted">Chapter cards appear once you open a chapter.</p>' : ''}</article>`;
      }
      const settings = `<details class="recall-settings"><summary>Decks and pace</summary><div class="recall-decks">${DECKS.map(d => { const n = cards.filter(c => c.deck === d.id).length; return `<label><input type="checkbox" data-recall-deck="${d.id}" ${r.decks[d.id] ? 'checked' : ''}> ${esc(d.name)} <span class="muted">(${n})</span></label>`; }).join('')}</div><label class="recall-pace">New cards per day <select data-recall-pace>${NEW_CHOICES.map(n => `<option value="${n}" ${r.newPerDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><p class="small muted">You rate yourself. Again brings the card back today. Good and Easy push it further out each time, up to ${MAX_IVL} days. This is a simple spacing rule, not a measured memory model. Answers come from the hub's own cards; open the full card for its sources.</p></details>`;
      host.innerHTML = `<section class="recall-lab">${stats}${body}${last ? `<p class="recall-undo"><button type="button" class="inline-link" data-recall-undo>Undo last rating</button></p>` : ''}${settings}</section>`;
      if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
      onChange();
    }

    function grade(g) {
      const r = st(), id = queue[0]; if (!id || !shown) return;
      const prev = r.cards[id] ? { ...r.cards[id] } : null, wasNew = !prev, n = nextIvl(prev, g);
      last = { id, prev, wasNew, day: { ...r.day }, queue: [...queue] };
      r.cards[id] = { due: addDays(n), ivl: n, reps: (prev?.reps || 0) + 1, lapses: (prev?.lapses || 0) + (g === 'again' && prev ? 1 : 0) };
      if (wasNew) r.day.fresh++;
      r.day.done++;
      queue.shift(); if (g === 'again') queue.push(id);
      shown = false; save(); render('[data-recall-show],[data-recall-more]');
    }
    function undo() {
      if (!last) return; const r = st();
      if (last.prev) r.cards[last.id] = last.prev; else delete r.cards[last.id];
      r.day = last.day; queue = last.queue; last = null; shown = true; save(); render('[data-recall-grade="good"]');
    }
    const onClick = e => {
      if (e.target.closest('[data-recall-show]')) { shown = true; render('[data-recall-grade="good"]'); return; }
      const g = e.target.closest('[data-recall-grade]'); if (g) { grade(g.dataset.recallGrade); return; }
      if (e.target.closest('[data-recall-undo]')) { undo(); return; }
      if (e.target.closest('[data-recall-more]')) { extraNew += 5; shown = false; refill(); render('[data-recall-show]'); }
    };
    const onChangeEvt = e => {
      const r = st();
      if (e.target.matches('[data-recall-deck]')) { r.decks[e.target.dataset.recallDeck] = e.target.checked; save(); shown = false; last = null; refill(); render(); host.querySelector('.recall-settings').open = true; host.querySelector(`[data-recall-deck="${e.target.dataset.recallDeck}"]`)?.focus(); }
      else if (e.target.matches('[data-recall-pace]')) { const n = Number(e.target.value); if (NEW_CHOICES.includes(n)) { r.newPerDay = n; save(); shown = false; last = null; refill(); render(); host.querySelector('.recall-settings').open = true; host.querySelector('[data-recall-pace]')?.focus(); } }
    };
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '') || !host.isConnected) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter') && queue.length && !e.target.closest?.('button,a,summary')) { e.preventDefault(); shown = true; render('[data-recall-grade="good"]'); }
      else if (shown && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); grade(['again', 'good', 'easy'][Number(e.key) - 1]); }
    };
    host.addEventListener('click', onClick); host.addEventListener('change', onChangeEvt); document.addEventListener('keydown', onKey);
    render();
    return () => { host.removeEventListener('click', onClick); host.removeEventListener('change', onChangeEvt); document.removeEventListener('keydown', onKey); };
  }
  return { mount, fillToday, badge, counts };
}
