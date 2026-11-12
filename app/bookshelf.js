// Free textbook shelf: a page listing the free books, the teaching sections
// those books add inside existing units and lessons, Python versions of the
// data labs, and small "free reading" panels.
// Data comes from data/free-books.json (built by scripts/build-free-books.py).
export function createBookshelf({ data, esc, safeURL, sourceLink, routeTitle = () => '' }) {
  const books = new Map(data.books.map(b => [b.id, b]));
  const bySource = new Map(data.books.map(b => [b.sourceId, b]));
  const external = b => `<a href="${esc(safeURL(b.url))}" target="_blank" rel="noopener">Open the book ↗</a>`;

  function card(b) {
    return `<article class="source-card shelf-book" id="book-${esc(b.id)}">
<div class="source-meta"><span class="badge">${esc(b.access.split('.')[0])}</span><span>${esc(b.edition)} · ${esc(b.year)}</span><span>${esc(b.language)}</span>${b.optional ? '<span class="badge shelf-optional">Optional</span>' : ''}</div>
<h3>${esc(b.title)}</h3><p class="shelf-authors">${esc(b.authors)}</p>
<p><strong>Why it is here:</strong> ${esc(b.why)}</p>
<p><strong>Watch out:</strong> ${esc(b.caution)}</p>
<div class="shelf-start"><p><strong>Start here:</strong> ${esc(b.start)}</p><p><strong>Do this:</strong> ${esc(b.task)}</p></div>
<p class="shelf-feeds-label"><strong>Where it feeds the hub</strong></p>
<ul class="shelf-feeds">${b.feeds.map(f => `<li><a href="${esc(f.route)}">${esc(f.label)} →</a></li>`).join('')}</ul>
<details><summary>License and access</summary><p>${esc(b.access)}</p><p>${esc(b.license)}</p></details>
<div class="actions">${external(b)}<a href="#source/${encodeURIComponent(b.sourceId)}" class="small">Source record →</a></div>
</article>`;
  }

  function page(tabs = '') {
    return `<div class="page-heading"><span class="eyebrow">FREE TEXTBOOK SHELF · CHECKED ${esc(data.reviewed)}</span><h1>${esc(data.title)}</h1><p class="lede">${esc(data.summary)}</p></div>${tabs}
<div class="notice">${esc(data.policy)}</div>
<p class="shelf-language">${esc(data.language)}</p>
${addedList()}
<nav class="shelf-jump" aria-label="Shelf sections">${data.tracks.map(t => `<a href="#bookshelf" data-shelf-jump="${esc(t.id)}">${esc(t.title)}</a>`).join('')}</nav>
${data.tracks.map(t => {
      const list = data.books.filter(b => b.track === t.id);
      return `<section class="shelf-track" id="shelf-${esc(t.id)}"><h2>${esc(t.title)}</h2><p class="muted">${esc(t.lede)}</p><div class="source-list">${list.map(card).join('')}</div></section>`;
    }).join('')}
<div class="actions"><a class="button" href="#library">Source library →</a><a class="button" href="#book-crosswalk">NSCA baseball cross-reference →</a></div>`;
  }

  const routeFor = key => '#' + key.replace(':', '/');
  const keyLabel = key => routeTitle(routeFor(key)) || key;
  const paras = list => list.map(t => `<p>${esc(t)}</p>`).join('');
  const codeBlock = (label, code, output) => `<figure class="shelf-code"><figcaption>${esc(label)}</figcaption><pre tabindex="0"><code>${esc(code)}</code></pre>${output ? `<p class="small"><strong>What you should see</strong> (spacing can differ slightly between pandas versions):</p><pre tabindex="0" class="shelf-output"><code>${esc(output)}</code></pre>` : ''}</figure>`;

  // Teaching sections that the free books add to an existing unit or lesson.
  function sections(key) {
    const list = data.sections[key] || [];
    if (!list.length) return '';
    return list.map(sec => `<section class="shelf-section"><span class="eyebrow">ADDED FROM THE FREE SHELF</span><h2>${esc(sec.heading)}</h2>${paras(sec.text)}${sec.example ? `<div class="shelf-example"><p class="shelf-example-title">${esc(sec.example.title)}</p><ol>${sec.example.lines.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}${sec.code ? codeBlock(sec.code.label, sec.code.text, sec.code.output) : ''}<details><summary>Where this comes from</summary>${sec.refs.map(sourceLink).join('')}<p class="small muted">Original teaching written for this hub. The book is cited by chapter; none of its text is copied.</p></details></section>`).join('');
  }

  // "Do it in Python" panel for a data lab.
  function labPanel(key) {
    const lab = data.labCode[key];
    if (!lab) return '';
    return `<section class="book-connection shelf-lab"><span class="eyebrow">DO IT IN PYTHON</span><h3>${esc(lab.title)}</h3><p>${esc(lab.intro)}</p>${codeBlock('Python · lab.py', lab.code, lab.output)}<details><summary>How to run it on your Mac</summary><ol>${lab.runOnMac.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details><details><summary>Where this comes from</summary>${lab.refs.map(sourceLink).join('')}</details></section>`;
  }

  function addedList() {
    const items = [...Object.keys(data.sections).map(k => [k, data.sections[k].map(x => x.heading)]), ...Object.keys(data.labCode).map(k => [k, [data.labCode[k].title]])];
    return `<section class="shelf-added"><h2>What the books added inside the hub</h2><p class="muted">New teaching sections, each with a worked example and a chapter citation, now sit inside these existing pages.</p><ul>${items.map(([k, heads]) => `<li><a href="${esc(routeFor(k))}">${esc(keyLabel(k))} →</a><span class="small muted">${heads.map(esc).join(' · ')}</span></li>`).join('')}</ul></section>`;
  }

  function entries(key) {
    return (data.links[key] || []).map(l => ({ ...l, book: books.get(l.bookId) })).filter(l => l.book);
  }

  // Full-width panel for unit pages.
  function panel(key) {
    const list = entries(key);
    if (!list.length) return '';
    return `<aside class="book-connection free-reading"><span class="eyebrow">FREE READING</span><h3>Go deeper at no cost.</h3><ul class="free-reading-list">${list.map(l => `<li><a href="${esc(safeURL(l.book.url))}" target="_blank" rel="noopener">${esc(l.book.title)} ↗</a><span class="small muted">${esc(l.chapters)}</span><span>${esc(l.why)}</span></li>`).join('')}</ul><a class="small" href="#bookshelf">See the whole free shelf →</a></aside>`;
  }

  // Compact block for the narrow lesson sidebar.
  function aside(key) {
    const list = entries(key);
    if (!list.length) return '';
    return `<div class="objectives free-reading-aside"><h3>Free reading</h3><ul>${list.map(l => `<li><a href="${esc(safeURL(l.book.url))}" target="_blank" rel="noopener">${esc(l.book.title)} ↗</a><br><span class="small muted">${esc(l.chapters)}</span></li>`).join('')}</ul><a class="small" href="#bookshelf">Free textbook shelf →</a></div>`;
  }

  // Where a free book's source record is used inside the hub.
  function context(sourceId) {
    const b = bySource.get(sourceId);
    if (!b) return '';
    return `<div class="free-reading-context"><p><strong>Start here:</strong> ${esc(b.start)}</p><ul class="shelf-feeds">${b.feeds.map(f => `<li><a href="${esc(f.route)}">${esc(f.label)} →</a></li>`).join('')}</ul><a class="small" href="#bookshelf">Free textbook shelf →</a></div>`;
  }

  function bind(root) {
    root.querySelectorAll('[data-shelf-jump]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      root.querySelector('#shelf-' + a.dataset.shelfJump)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
  }

  return { page, panel, aside, context, sections, labPanel, bind, sources: data.sources, count: data.books.length };
}
