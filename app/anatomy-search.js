// Search over the Anatomy Lab, so the top search box also finds joints and movements,
// pitching and swing phases, and the 3D structures. Loaded only when a search runs.
const base = new URL('./', import.meta.url);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SKIP = new Set(['id', 'meshes', 'sourceIds', 'src', 'move', 'joint', 'model', 'schematic', 'quiz', 'defaultSelection', 'arcTool', 'lesson']);
const LAYERS = { muscles: 'Muscle', ligaments: 'Ligament or soft tissue', joints: 'Joint', bones: 'Bone' };
const MAX = 18;
let index = null;

// Every readable string inside an object, so a card is found by any of its lines.
function strings(o, out = []) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach(x => strings(x, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!SKIP.has(k)) strings(v, out);
  return out;
}
const firstSentence = (t, n = 150) => { const s = String(t || '').split(/(?<=[.!?])\s/)[0]; return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

async function load() {
  if (index) return index;
  const get = async f => { const r = await fetch(new URL(f, base)); if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return r.json(); };
  const [joints, delivery, swing, anatomy] = await Promise.all(['data/joints.json', 'data/delivery.json', 'data/swing.json', 'data/anatomy.json'].map(get));
  const items = [];
  const push = (tag, title, sub, href, source) => items.push({ tag, title, sub, href, title_l: title.toLowerCase(), text: strings(source).join(' ').toLowerCase() });
  for (const j of joints.joints) {
    push('Joints & ROM', j.name, firstSentence(j.summary), `#joints/${j.id}`, { ...j, movements: [] });
    for (const m of j.movements) {
      const n = (m.norms || []).find(x => x.deg > 0);
      push('Joints & ROM', `${j.name} · ${m.name}`, `${n ? `${m.zeroNorm ? '' : '0–'}${n.deg}° normal range. ` : ''}Movers: ${m.movers || 'see the card'}`, `#joints/${j.id}/${m.id}`, [j.name, m]);
    }
  }
  for (const [data, tag, route] of [[delivery, 'Pitching delivery', 'delivery'], [swing, 'Hitting swing', 'swing']])
    for (const p of data.phases) push(tag, p.name, p.span || firstSentence(p.summary), `#${route}/${p.id}`, p);
  const byId = new Map(anatomy.structures.map(s => [s.id, s]));
  for (const r of anatomy.regions)
    for (const [layer, label] of Object.entries(LAYERS))
      for (const id of r[layer] || []) {
        const s = byId.get(id); if (!s) continue;
        push(`3D anatomy · ${r.name}`, s.name, `${label}. ${firstSentence(s.action || s.baseball || s.note || '')}`, `#anatomy/${r.id}/${s.id}`, s);
      }
  return (index = items);
}

/** Fill `host` with Anatomy Lab matches for `query`. Returns how many were found. */
export async function fillAnatomySearch(host, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!host || !words.length) return 0;
  const items = await load();
  const hits = items.filter(i => words.every(w => i.text.includes(w) || i.title_l.includes(w)));
  if (!hits.length) return 0;
  // Names first: a match in the title is usually what the reader meant.
  const score = i => words.every(w => i.title_l.includes(w)) ? 0 : words.some(w => i.title_l.includes(w)) ? 1 : 2;
  hits.sort((a, b) => score(a) - score(b));
  const shown = hits.slice(0, MAX);
  host.innerHTML = `<h2 class="search-group">Anatomy Lab · ${hits.length} ${hits.length === 1 ? 'match' : 'matches'}</h2>${shown.map(i => `<a class="search-result" href="${esc(i.href)}"><span class="tag">${esc(i.tag.toUpperCase())}</span><h3>${esc(i.title)}</h3><p>${esc(i.sub)}</p></a>`).join('')}${hits.length > shown.length ? `<p class="small muted">Showing the first ${shown.length}. Add a word to narrow it down.</p>` : ''}`;
  return hits.length;
}
