/* Hub-wide page navigation helpers, applied after every render of #main:
   1. Groups of applied decisions scroll inside their own panel (wide screens),
      and keep their scroll position when an answer re-renders the page.
   2. Every page ends with two icon buttons: go back, and back to the top.
   3. Section colors: every week, chapter, lab and case carries its part's color
      (from data/study-plan.json "parts") wherever it appears in the hub. */
const main = document.getElementById('main');
const panelScroll = new Map();
const trail = [location.hash]; // in-app history, so Back never leaves the hub

const icon = d => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BACK = icon('M19 12H5M11 6l-6 6 6 6');
const TOP = icon('M12 19V5M6 11l6-6 6 6');

function panelKey(i) { return location.hash + '|' + i; }

/* Wrap each run of 2+ sibling .question blocks in one scroll panel. */
function wrapDecisions() {
  const active = document.activeElement;
  const parents = new Set([...main.querySelectorAll('.question')].map(q => q.parentElement));
  for (const parent of parents) {
    if (!parent || parent.classList.contains('decision-scroll')) continue;
    let run = [];
    const flush = () => {
      if (run.length >= 2) {
        const panel = document.createElement('div');
        panel.className = 'decision-scroll';
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-label', 'Applied decisions');
        panel.tabIndex = 0;
        run[0].before(panel);
        panel.append(...run);
      }
      run = [];
    };
    for (const child of [...parent.children]) {
      if (child.classList.contains('question')) run.push(child); else flush();
    }
    flush();
  }
  main.querySelectorAll('.decision-scroll').forEach((panel, i) => { panel.dataset.panel = String(i); });
  for (const panel of main.querySelectorAll('.decision-scroll')) {
    const saved = panelScroll.get(panelKey(panel.dataset.panel));
    if (saved) panel.scrollTop = saved;
  }
  if (active && active !== document.activeElement && main.contains(active)) active.focus({ preventScroll: true });
}

/* Section (part) lookup built from the study plan. */
const partOfWeek = new Map(), partOfRoute = new Map();
let partsById = new Map();
fetch('data/study-plan.json').then(r => r.ok ? r.json() : null).then(plan => {
  if (!plan?.parts) return;
  plan.parts.forEach((p, i) => { partsById.set(p.id, { ...p, n: i + 1 }); p.weeks.forEach(w => partOfWeek.set(w, p.id)); });
  const add = (route, part) => { if (route && /^#(lesson|unit|lab|case)\//.test(route) && !partOfRoute.has(route)) partOfRoute.set(route, part); };
  // Primary placement first, then review links, so a chapter keeps the part it is taught in.
  for (const w of plan.weeks) { const part = partOfWeek.get(w.id); if (!part) continue; [...w.theory, ...w.applied].forEach(x => add(x.route, part)); w.sessions?.forEach(s => s.routes.forEach(r => add(r, part))); }
  for (const w of plan.weeks) { const part = partOfWeek.get(w.id); if (part) (w.review || []).forEach(x => add(x.route, part)); }
  afterRender();
}).catch(() => {});

function partFor(route) {
  if (!route) return null;
  route = route.startsWith('#') ? route : '#' + route;
  if (partOfRoute.has(route)) return partOfRoute.get(route);
  const m = route.match(/^#(week|theory|applied)\/(week-\d+)/);
  return m ? partOfWeek.get(m[2]) || null : null;
}

const CARDS = '.study-item,.study-session,.study-week-row,.study-week-group,.lesson-card,.search-result,.study-resume';
function paintParts() {
  if (!partsById.size) return;
  let current = partFor(decodeURIComponent(location.hash || ''));
  if (current) main.dataset.part = current; else delete main.dataset.part;
  for (const card of main.querySelectorAll(CARDS)) {
    if (card.closest('.study-part') && card.matches('.study-week-row,.study-week-group')) continue;
    const link = card.matches('a') ? card : card.querySelector('[data-study-open],a[href^="#"]');
    const route = card.dataset.studyWeek ? '#week/' + card.dataset.studyWeek : link?.dataset?.studyOpen || link?.getAttribute('href');
    const part = partFor(route);
    if (part) card.dataset.part = part; else delete card.dataset.part;
  }
  const trail = main.querySelector('.study-trail');
  if (current && trail && !trail.querySelector('.part-chip')) {
    const p = partsById.get(current), chip = document.createElement('span');
    chip.className = 'part-chip'; chip.dataset.part = current;
    chip.textContent = 'Part ' + p.n + ' · ' + p.title;
    trail.prepend(chip);
  }
}

function addPageEnd() {
  if (main.querySelector(':scope > .page-end')) return;
  if (main.querySelector(':scope > .loading')) return;
  const bar = document.createElement('nav');
  bar.className = 'page-end reader-no-select';
  bar.setAttribute('aria-label', 'Page navigation');
  bar.innerHTML = `<button type="button" class="page-end-btn" data-page-end="back" aria-label="Go back" title="Go back">${BACK}</button><button type="button" class="page-end-btn" data-page-end="top" aria-label="Back to top" title="Back to top">${TOP}</button>`;
  main.append(bar);
}

/* 4. Parts fold: each Part on the theory, applied and plan lists can be hidden or shown.
      The choice is remembered on this device. */
const FOLD_KEY = 'baseball-performance-hub.parts-closed';
let closedParts = new Set();
try { closedParts = new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || '[]')); } catch { /* private window */ }
const keepFolds = () => { try { localStorage.setItem(FOLD_KEY, JSON.stringify([...closedParts])); } catch { /* best effort */ } };
function restoreFolds() { for (const d of main.querySelectorAll('details[data-part-fold]')) d.open = !closedParts.has(d.dataset.partFold); }
main.addEventListener('toggle', e => {
  const d = e.target; if (!d?.matches?.('details[data-part-fold]')) return;
  if (d.open) closedParts.delete(d.dataset.partFold); else closedParts.add(d.dataset.partFold);
  keepFolds();
}, true);
main.addEventListener('click', e => {
  const b = e.target.closest?.('[data-parts-all]'); if (!b) return;
  for (const d of main.querySelectorAll('details[data-part-fold]')) d.open = b.dataset.partsAll === 'open';
});

/* 5. Floating "back to top": appears once you have scrolled down, on every page. */
const toTop = document.createElement('button');
toTop.type = 'button'; toTop.className = 'to-top'; toTop.hidden = true;
toTop.setAttribute('aria-label', 'Back to top'); toTop.title = 'Back to top'; toTop.innerHTML = TOP;
document.body.append(toTop);
const smoothScroll = () => !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
toTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: smoothScroll() ? 'smooth' : 'auto' }); main.focus({ preventScroll: true }); });
let topTick = false;
const showTop = () => { topTick = false; toTop.hidden = window.scrollY < Math.max(500, innerHeight * 0.8); };
addEventListener('scroll', () => { if (!topTick) { topTick = true; requestAnimationFrame(showTop); } }, { passive: true });

function afterRender() {
  observer.disconnect();
  try { wrapDecisions(); paintParts(); addPageEnd(); restoreFolds(); showTop(); }
  finally { observer.observe(main, { childList: true }); }
}

const observer = new MutationObserver(afterRender);
observer.observe(main, { childList: true });

main.addEventListener('scroll', e => {
  const panel = e.target;
  if (panel?.classList?.contains('decision-scroll')) panelScroll.set(panelKey(panel.dataset.panel), panel.scrollTop);
}, true);

main.addEventListener('click', e => {
  const b = e.target.closest?.('[data-page-end]');
  if (!b) return;
  e.stopPropagation();
  if (b.dataset.pageEnd === 'top') {
    const smooth = !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    for (const panel of main.querySelectorAll('.decision-scroll')) panel.scrollTop = 0;
    main.focus({ preventScroll: true });
    return;
  }
  if (trail.length > 1) history.back();
  else location.hash = 'overview';
}, true);

addEventListener('hashchange', () => {
  if (trail.length > 1 && trail[trail.length - 2] === location.hash) trail.pop();
  else if (trail[trail.length - 1] !== location.hash) trail.push(location.hash);
  panelScroll.clear();
});
afterRender();
