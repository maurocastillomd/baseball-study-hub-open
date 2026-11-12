// Resume reading: remembers which section of a long chapter you reached, offers a
// one-tap "Continue at…" on that page, and shows the same place on the Today page.
// It stores a section number and its heading text only, never the text you read.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TRACKED = /^(lesson|unit|case|lab|interview|project)\//;
const MAX = 40;

export function sanitizeResume(input, validRoute = () => true) {
  const x = input && typeof input === 'object' && !Array.isArray(input) ? input : {}, places = {};
  for (const [route, p] of Object.entries(x.places && typeof x.places === 'object' ? x.places : {}).slice(0, MAX)) {
    if (typeof route !== 'string' || route.length > 300 || !TRACKED.test(route) || !validRoute(route) || !p || !Number.isInteger(p.i) || p.i < 1 || p.i > 400 || !Number.isInteger(p.n) || p.n < p.i || typeof p.t !== 'string') continue;
    places[route] = { i: p.i, n: Math.min(400, p.n), t: p.t.slice(0, 140), at: typeof p.at === 'string' && !isNaN(Date.parse(p.at)) ? p.at : new Date(0).toISOString() };
  }
  return { places, last: typeof x.last === 'string' && places[x.last] ? x.last : null };
}

export function createResume({ getState, save, routeTitle }) {
  let timer = null, jumpTo = null, mounted = false;
  const st = () => { const s = getState(); if (!s.resume || !s.resume.places) s.resume = sanitizeResume(s.resume); return s.resume; };
  const route = () => String(location.hash || '').replace(/^#/, '');
  const headings = () => [...document.querySelectorAll('#main .reading h2, #main article h2')].filter(h => h.offsetParent !== null && !h.closest('details:not([open]), .lesson-aside, .recall-lab'));
  const label = h => h.textContent.trim().replace(/\s+/g, ' ').slice(0, 140);

  function record() {
    const r = route(); if (!TRACKED.test(r)) return;
    const hs = headings(); if (hs.length < 3) return;
    const line = innerHeight * 0.4; let i = -1;
    hs.forEach((h, k) => { if (h.getBoundingClientRect().top < line) i = k; });
    const s = st(), cur = s.places[r];
    if (i < 1) return; // still in the first section: keep any earlier place, so a trip back to the top does not lose it
    const t = label(hs[i]);
    if (cur && cur.i === i + 1 && cur.t === t) return;
    s.places[r] = { i: i + 1, n: hs.length, t, at: new Date().toISOString() }; s.last = r;
    const keys = Object.keys(s.places);
    if (keys.length > MAX) keys.sort((a, b) => s.places[a].at.localeCompare(s.places[b].at)).slice(0, keys.length - MAX).forEach(k => delete s.places[k]);
    save();
  }
  const target = p => { const h = headings()[p.i - 1]; return h && label(h) === p.t ? h : null; };
  const go = h => { h.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); };

  /** Call after every render: offers the saved place on the page it belongs to. */
  function afterRender() {
    document.querySelector('.resume-pill')?.remove();
    const r = route(), p = st().places[r]; if (!p) { jumpTo = null; return; }
    const h = target(p); if (!h) return;
    if (jumpTo === r) { jumpTo = null; setTimeout(() => { if (route() === r && h.isConnected) go(h); }, 60); return; }
    if (scrollY > 300) return;
    const first = headings()[0], pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'resume-pill reader-no-select';
    pill.innerHTML = `<span>Continue at</span> <strong>${esc(p.t)}</strong> <span class="resume-meta">section ${p.i} of ${p.n}</span> <span aria-hidden="true">↓</span>`;
    pill.addEventListener('click', () => { const again = target(p); pill.remove(); if (again) go(again); });
    // Near the top of the page, right under the title block, so it shows without scrolling.
    const h1 = document.querySelector('#main h1'), lede = h1?.nextElementSibling?.matches?.('.lede') ? h1.nextElementSibling : h1;
    if (lede) lede.insertAdjacentElement('afterend', pill); else first?.parentNode?.insertBefore(pill, first);
  }

  /** Line for the Today page: the last place you stopped. */
  function todayHTML() {
    const s = st(), r = s.last, p = r && s.places[r]; if (!p) return '';
    return `<a class="resume-today" href="#${esc(r)}" data-resume-jump="${esc(r)}"><span class="eyebrow">PICK UP WHERE YOU STOPPED</span><strong>${esc(routeTitle(r) || 'Your last chapter')}</strong><span>${esc(p.t)} · section ${p.i} of ${p.n}</span><span class="recall-go" aria-hidden="true">→</span></a>`;
  }

  function mount() {
    if (mounted) return; mounted = true;
    addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(record, 350); }, { passive: true });
    document.addEventListener('click', e => { const a = e.target.closest?.('[data-resume-jump]'); if (a) jumpTo = a.dataset.resumeJump; });
  }
  return { mount, afterRender, todayHTML };
}
