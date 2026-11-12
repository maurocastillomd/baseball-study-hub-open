/* Reader state is part of the hub backup. It contains plain text and guarded anchors only. */
export function createReaderTools({esc, getState, save, toast, rerender, resolveRoute, getProgress, download, getLegacyBookmarks = () => []}) {
  const COLORS = ['yellow', 'blue', 'rose'];
  const MAX_ITEMS = 1000, MAX_TEXT = 12000, MAX_SEGMENTS = 30;
  const BLOCKS = 'p,li,dt,dd,blockquote,figcaption,h2,h3,h4,td,th';
  const EXCLUDE = 'button,input,textarea,select,option,nav,form,svg,canvas,script,style,[contenteditable],#reader-tools,#selection-toolbar,.reader-saved,.reader-no-select,.lesson-aside,.sidebar';
  let mounted = false, pending = null, jump = null, jumpAttempts = 0, lastRoute = '', currentBlocks = [], view = [], selectionTimer;
  const $ = s => document.querySelector(s);
  const route = () => String(location.hash || '#overview').replace(/^#/, '').slice(0, 600);
  const SIZES = [17,19,21,23], FONTS = ['sans','book'];
  let sheetOpen = false, picking = null;
  const icon = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  const HL_ICON = icon('<path d="m9 11-4 4v3h3l4-4"/><path d="m13 7 4 4"/><path d="M9 11 15.5 4.5a2.1 2.1 0 0 1 3 3L12 14"/><path class="hl-ink" d="M4 21h16" stroke-width="3"/>');
  const BM_ICON = icon('<path d="M6 3h12v18l-6-4-6 4z"/>');
  const TRASH_ICON = icon('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v6m4-6v6"/>');
  let lastAdded = null; // the most recent highlight or bookmark, so it can be undone
  const text = (x,n = MAX_TEXT) => typeof x === 'string' ? x.slice(0,n) : '';
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h,16777619); } return (h >>> 0).toString(36); };
  const validRoute = r => { try { return typeof r === 'string' && r.length <= 600 && !/[\s<>"']/u.test(r) && resolveRoute(r)?.valid === true; } catch { return false; } };
  const state = () => { const s = getState(); if (!s.reader || !s.reader.settings || !Array.isArray(s.reader.items)) s.reader = sanitize(s.reader); return s.reader; };
  const commit = () => { save(); toolbar(); };
  function cleanView(v) { return (Array.isArray(v) ? v : []).slice(0,4).filter(x=>x && ['lesson','lab','graduate','rehab','baseball'].includes(x.kind) && Number.isInteger(x.index) && x.index >= 0 && x.index <= 100).map(x=>({kind:x.kind,index:x.index})); }
  function sanitize(input) {
    const x = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const settings = {sidebarHidden:x.settings?.sidebarHidden===true,focus:x.settings?.focus===true,theme:x.settings?.theme==='dark'?'dark':'light',size:SIZES.includes(x.settings?.size)?x.settings.size:19,font:FONTS.includes(x.settings?.font)?x.settings.font:'sans'};
    const used = new Set(), items = [];
    for (const r of (Array.isArray(x.items) ? x.items : []).slice(0,MAX_ITEMS)) {
      if (!r || typeof r !== 'object' || !validRoute(r.route) || !['page','passage'].includes(r.kind)) continue;
      const id = text(r.id,80); if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || used.has(id)) continue;
      const item = {id,kind:r.kind,route:r.route,title:text(r.title,240) || text(resolveRoute(r.route)?.title,240) || r.route,note:text(r.note,5000),createdAt:typeof r.createdAt==='string' && !isNaN(Date.parse(r.createdAt)) ? new Date(r.createdAt).toISOString() : new Date(0).toISOString(),bookmarked:r.bookmarked===true,color:COLORS.includes(r.color)?r.color:null,view:cleanView(r.view)};
      if (r.kind === 'passage') {
        item.segments = (Array.isArray(r.segments)?r.segments:[]).slice(0,MAX_SEGMENTS).filter(s=>s && /^[a-zA-Z0-9_-]{1,100}$/.test(s.anchor) && Number.isInteger(s.start) && s.start >= 0 && s.start <= 100000 && Number.isInteger(s.end) && s.end > s.start && s.end-s.start <= MAX_TEXT && typeof s.quote==='string' && s.quote.length===s.end-s.start && /^[a-z0-9]{1,20}$/.test(s.blockHash) && typeof s.context==='string' && s.context.length<=180).map(s=>({anchor:s.anchor,start:s.start,end:s.end,quote:s.quote,prefix:text(s.prefix,50),suffix:text(s.suffix,50),blockHash:s.blockHash,context:s.context}));
        if (!item.segments.length || item.segments.map(s=>s.quote).join('\n\n').length > MAX_TEXT) continue;
        item.quote = item.segments.map(s=>s.quote).join('\n\n');
      }
      used.add(id); items.push(item);
    }
    return {settings,items};
  }
  function layout() {
    const s = state().settings;
    document.documentElement?.setAttribute('data-theme',s.theme||'light');
    document.documentElement?.setAttribute('data-reader-sidebar',s.sidebarHidden || s.focus ? 'hidden' : 'visible');
    document.documentElement?.setAttribute('data-reader-focus',s.focus ? 'true' : 'false');
    document.documentElement?.setAttribute('data-reading-font',s.font);
    document.documentElement?.style?.setProperty('--reading-size',s.size+'px');
  }
  function toolbar() {
    layout(); const el = $('#reader-tools'); if (!el) return;
    const s = state(), p = getProgress?.() || {}, total = Math.max(0,Math.round(Number(p.total)||0)), done = Math.min(total,Math.max(0,Math.round(Number(p.done)||0))), pct = total ? Math.round(done/total*100) : 0;
    const bookmarked = s.items.some(i=>i.kind==='page' && i.route===route()), allowed = validRoute(route()) && !['saved','bookmarks'].includes(route());
    const svg=(body)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    const quick=$('#quick-tools');if(quick)quick.innerHTML=`<button type="button" data-reader-action="sidebar" aria-controls="study-sidebar" aria-expanded="${!s.settings.sidebarHidden&&!s.settings.focus}" aria-label="${s.settings.sidebarHidden?'Show sidebar':'Hide sidebar'}" title="${s.settings.sidebarHidden?'Show sidebar':'Hide sidebar'}" aria-pressed="${s.settings.sidebarHidden}" ${s.settings.focus?'disabled':''}>${svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m7-13-4 4 4 4"/>')}</button><button type="button" data-reader-action="focus" aria-pressed="${s.settings.focus}" aria-label="${s.settings.focus?'Exit focus mode':'Focus mode'}" title="${s.settings.focus?'Exit focus · Esc':'Focus mode'}">${svg(s.settings.focus?'<path d="M9 4v5H4m11-5v5h5M9 20v-5H4m11 5v-5h5"/>':'<path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>')}</button><button type="button" data-reader-action="page" aria-pressed="${bookmarked}" aria-label="${bookmarked?'Page bookmarked':'Bookmark this page'}" title="${bookmarked?'Page bookmarked':'Bookmark this page'}" ${allowed?'':'disabled'}>${svg(bookmarked?'<path d="M6 3h12v18l-6-4-6 4Z" fill="currentColor"/>':'<path d="M6 3h12v18l-6-4-6 4Z"/>')}</button><button type="button" class="aa-button" data-reader-action="aa" aria-expanded="${sheetOpen}" aria-controls="aa-sheet" aria-label="Text and page" title="Text and page">Aa</button>`;
    const opt=(action,value,label,on)=>`<button type="button" data-reader-action="${action}" data-value="${value}" aria-pressed="${on}">${label}</button>`;
    el.innerHTML = `<div class="read-progress" aria-hidden="true"><span></span></div><div id="aa-sheet" class="aa-sheet" role="dialog" aria-modal="false" aria-labelledby="aa-title" ${sheetOpen?'':'hidden'}><div class="aa-head"><h2 id="aa-title">Text and page</h2><button type="button" class="aa-close" data-reader-action="aa" aria-label="Close">×</button></div><h3>Text size</h3><div class="aa-options">${SIZES.map((n,i)=>opt('size',n,`<span aria-hidden="true" style="font-size:${13+i*3}px">A</span><span class="sr-only">${['Small','Medium','Large','Extra large'][i]}</span>`,s.settings.size===n)).join('')}</div><h3>Reading font</h3><div class="aa-options">${opt('font','sans','Clean',s.settings.font==='sans')}${opt('font','book','<span class="aa-book">Book</span>',s.settings.font==='book')}</div><h3>Page</h3><div class="aa-options">${opt('theme','light','Day',s.settings.theme!=='dark')}${opt('theme','dark','Night',s.settings.theme==='dark')}</div><p class="aa-progress"><strong>${done} / ${total}</strong> ${esc(p.label || 'Study items reviewed')} · <a href="#progress">Progress</a></p><p class="aa-tip">Select any text to highlight it. Tap a highlight to change its color or remove it.</p></div>`;
    readProgress();
  }
  function readProgress() {
    const bar=document.querySelector('.read-progress span');if(!bar)return;
    const max=Math.max(1,(document.documentElement.scrollHeight||0)-(window.innerHeight||0)),pct=Math.min(100,Math.max(0,(window.scrollY||0)/max*100));
    bar.style.width=pct.toFixed(1)+'%';
  }
  function activeView() {
    const out = [];
    for (const el of document.querySelectorAll('#main [aria-current="step"],#main [aria-current="true"]')) {
      const d = el.dataset || {};
      if(d.bbAction==='stage' && Number.isInteger(Number(d.index))) out.push({kind:'baseball',index:Number(d.index)});
      else if (d.action==='step' && Number.isInteger(Number(d.step))) out.push({kind:'lesson',index:Number(d.step)});
      else if (d.labAction==='stage' && Number.isInteger(Number(d.stage))) out.push({kind:'lab',index:Number(d.stage)});
      else if (d.labAction==='rehab-checkpoint' && Number.isInteger(Number(d.index))) out.push({kind:'rehab',index:Number(d.index)});
      else if ((d.grad==='stage' || d.graduateAction==='stage') && Number.isInteger(Number(d.stage))) out.push({kind:'graduate',index:Number(d.stage)});
    }
    return cleanView(out);
  }
  function clearMarks() {
    for (const mark of document.querySelectorAll('#main mark[data-reader-mark]')) { const parent = mark.parentNode; mark.replaceWith(...Array.from(mark.childNodes)); parent?.normalize?.(); }
  }
  function anchorBlocks() {
    const main = $('#main'); if (!main?.querySelectorAll) return [];
    const nodes = Array.from(main.querySelectorAll(BLOCKS)).filter(el=>!el.closest(EXCLUDE) && !el.querySelector(EXCLUDE) && !el.querySelector(BLOCKS) && el.textContent.trim());
    const occurrences = new Map(), scope = JSON.stringify(view);
    return nodes.map((el,i)=>{
      const full = el.textContent, blockHash = hash(full), key = `r-${hash(route()+'|'+scope+'|'+el.tagName+'|'+full)}`, occurrence = occurrences.get(key)||0;
      occurrences.set(key,occurrence+1);
      const anchor = key+'-'+occurrence;
      const context = `${hash(nodes[i-1]?.textContent || '')}:${hash(nodes[i+1]?.textContent || '')}`;
      el.dataset.readerAnchor = anchor;
      return {el,anchor,full,blockHash,context};
    });
  }
  const match = (s,b) => b && s.blockHash===b.blockHash && s.context===b.context && s.end <= b.full.length && b.full.slice(s.start,s.end)===s.quote && b.full.slice(Math.max(0,s.start-50),s.start)===s.prefix && b.full.slice(s.end,s.end+50)===s.suffix;
  function textNodes(el) {
    if (!document.createTreeWalker) return [];
    const walker = document.createTreeWalker(el,4); const out = []; let n; while ((n=walker.nextNode())) out.push(n); return out;
  }
  function applyMarks() {
    const items = state().items.filter(i=>i.kind==='passage' && i.route===route() && i.color && JSON.stringify(i.view)===JSON.stringify(view));
    for (const b of currentBlocks) {
      const ranges = items.flatMap(i=>i.segments.filter(s=>s.anchor===b.anchor && match(s,b)).map(s=>({...s,color:i.color,id:i.id})));
      if (!ranges.length) continue;
      let offset = 0;
      for (const node of textNodes(b.el)) {
        const start = offset, end = offset+node.textContent.length; offset=end;
        const relevant = ranges.filter(s=>s.start<end && s.end>start); if (!relevant.length) continue;
        const cuts = Array.from(new Set([0,end-start,...relevant.flatMap(s=>[Math.max(0,s.start-start),Math.min(end-start,s.end-start)])])).sort((a,b)=>a-b);
        const fragment = document.createDocumentFragment();
        for (let j=0;j<cuts.length-1;j++) {
          const from=cuts[j],to=cuts[j+1],str=node.textContent.slice(from,to), covering=relevant.filter(s=>s.start<=start+from && s.end>=start+to);
          if (!covering.length) fragment.appendChild(document.createTextNode(str));
          else { const mark=document.createElement('mark'),top=covering[covering.length-1];mark.dataset.readerMark=covering.map(s=>s.id).join(' ');mark.className='reader-highlight reader-'+top.color;mark.textContent=str;mark.title='Highlighted. Tap to change the color or remove it.';fragment.appendChild(mark); }
        }
        node.replaceWith(fragment);
      }
    }
  }
  function captureSelection(notify = false) {
    const fail = message => { pending=null; hideSelection(); if (notify) toast(message); return null; };
    const selection = window.getSelection?.(), main = $('#main');
    if (!selection || selection.isCollapsed || selection.rangeCount!==1) return fail('Select a passage in the learning text first.');
    const range = selection.getRangeAt(0);
    if (!main?.contains(range.commonAncestorContainer) || ['saved','bookmarks'].includes(route())) return fail('Select learning text within this page.');
    const quote = selection.toString();
    if (!quote.trim() || quote.length>MAX_TEXT) return fail('Select between 1 and 12,000 characters of learning text.');
    const segments = [];
    for (const b of currentBlocks) {
      let offset=0, start=null, end=null;
      for (const node of textNodes(b.el)) {
        const len=node.textContent.length;
        if (range.intersectsNode(node)) {
          const a=node===range.startContainer?range.startOffset:0, z=node===range.endContainer?range.endOffset:len;
          if (z>a) { if (start===null) start=offset+a;end=offset+z; }
        }
        offset+=len;
      }
      if (start!==null && end>start) segments.push({anchor:b.anchor,start,end,quote:b.full.slice(start,end),prefix:b.full.slice(Math.max(0,start-50),start),suffix:b.full.slice(end,end+50),blockHash:b.blockHash,context:b.context});
    }
    if (!segments.length || segments.length>MAX_SEGMENTS) return fail('Select up to 30 paragraphs of learning text, without controls or diagrams.');
    // Text from navigation, controls, and mixed non-prose containers must never be saved accidentally.
    const selected = segments.map(s=>s.quote).join('').replace(/\s/g,'');
    if (selected!==quote.replace(/\s/g,'')) return fail('This selection includes controls or a diagram. Select only the text paragraphs, then try again.');
    let rect=null; try { rect=range.getBoundingClientRect(); } catch {}
    pending={route:route(),title:text(resolveRoute(route())?.title,240)||text($('#main h1')?.textContent,240)||route(),quote:segments.map(s=>s.quote).join('\n\n'),segments,view:cleanView(view),rect};
    return pending;
  }
  function hideSelection() { const bar=$('#selection-toolbar');if(bar){bar.hidden=true;bar.removeAttribute('style');} }
  function showSelection(focus = false) {
    const bar=$('#selection-toolbar');if(!pending || !bar)return;
    bar.innerHTML=`<div class="reader-selection-actions" role="group" aria-label="Highlight or bookmark the selected text"><button type="button" class="reader-icon-btn reader-hl-btn" data-reader-action="highlight" data-color="yellow" aria-label="Highlight" title="Highlight">${HL_ICON}</button><button type="button" class="reader-icon-btn" data-reader-action="bookmark-passage" aria-label="Bookmark" title="Bookmark">${BM_ICON}</button></div>`;
    bar.classList.remove('reader-picking');
    bar.hidden=false;
    placeBar(bar,pending.rect);
    if(focus)bar.querySelector('button')?.focus();
  }
  /* Keep the small icon bar just under the selection, inside the viewport. */
  function placeBar(bar,r) {
    const width=bar.getBoundingClientRect?.().width || 120;
    bar.style.left=Math.max(12,Math.min((window.innerWidth||1024)-width-12,(r?.left||12)))+'px';
    const height=Math.max(48,bar.getBoundingClientRect?.().height || 56);
    const top=r && r.bottom>0 ? Math.min((window.innerHeight||800)-height-12,Math.max(12,r.bottom+10)) : 100;
    bar.style.top=Math.max(12,top)+'px';
  }
  /* After a highlight is saved (yellow by default), or when an existing one is tapped, offer the three colors and a remove button. */
  function showColors(item,rect) {
    const bar=$('#selection-toolbar');if(!bar||!item)return;
    picking=item.id;
    bar.innerHTML=`<div class="reader-selection-actions" role="group" aria-label="Highlight color">${COLORS.map(c=>`<button type="button" class="reader-dot reader-${c}" data-reader-action="recolor" data-id="${esc(item.id)}" data-color="${c}" aria-label="${c[0].toUpperCase()+c.slice(1)}" title="${c[0].toUpperCase()+c.slice(1)}" aria-pressed="${item.color===c}"></button>`).join('')}<span class="reader-bar-sep" aria-hidden="true"></span><button type="button" class="reader-icon-btn reader-remove-btn" data-reader-action="unmark" data-id="${esc(item.id)}" aria-label="Remove highlight" title="Remove highlight">${TRASH_ICON}</button></div>`;
    bar.classList.add('reader-picking');bar.hidden=false;placeBar(bar,rect);
    bar.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
  }
  function closeBar(){picking=null;pending=null;hideSelection();}
  function remark(){clearMarks();currentBlocks=anchorBlocks();applyMarks();}
  function addPassage(color=null,bookmarked=false) {
    if (!pending || pending.route!==route()) { toast('Select the passage again before saving it.');return; }
    const valid = pending.segments.every(s=>match(s,currentBlocks.find(b=>b.anchor===s.anchor)));
    if(!valid){pending=null;hideSelection();toast('The reading content changed. Select the passage again.');return;}
    const rect=pending.rect,s=state(),key=JSON.stringify(pending.segments),existing=s.items.find(i=>i.kind==='passage' && i.route===pending.route && JSON.stringify(i.segments)===key && JSON.stringify(i.view)===JSON.stringify(pending.view));
    // Every highlight or bookmark is saved to Saved reading and starred.
    let item=existing;
    lastAdded=existing?{id:existing.id,created:false,color:existing.color,bookmarked:existing.bookmarked,route:pending.route}:null;
    if(existing){if(color)existing.color=color;existing.bookmarked=true;}
    else {if(s.items.length>=MAX_ITEMS){toast('Saved reading is full. Export your notes, then remove items you no longer need.');return;}item={id:'read-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),kind:'passage',route:pending.route,title:pending.title,quote:pending.quote,segments:pending.segments,view:pending.view,note:'',color,bookmarked:true,createdAt:new Date().toISOString()};s.items.push(item);lastAdded={id:item.id,created:true,route:item.route};}
    pending=null;if(color)picking=item.id;window.getSelection?.()?.removeAllRanges?.();hideSelection();commit();remark();
    if(color)showColors(item,rect);
    toast(color?'Highlighted and saved. Tap the highlight to change or remove it.':'Bookmarked in Saved reading.');
  }
  /* Removing a highlight deletes the saved passage, unless it carries a note: then only the color goes. */
  function removeHighlight(i) {
    const s=state(),keep=!!i.note;
    if(keep)i.color=null;else s.items=s.items.filter(x=>x.id!==i.id);
    lastAdded=null;closeBar();commit();remark();
    toast(keep?'Highlight removed. Your note stays in Saved reading.':'Highlight removed.');
  }
  /* Ctrl/Cmd+Z right after a highlight or bookmark puts things back the way they were. */
  function undoLast() {
    const u=lastAdded,s=state(),i=u&&s.items.find(x=>x.id===u.id);
    if(!i||u.route!==route())return false;
    if(u.created)s.items=s.items.filter(x=>x.id!==u.id);else{i.color=u.color;i.bookmarked=u.bookmarked;}
    lastAdded=null;closeBar();commit();remark();toast('Undone.');return true;
  }
  function bookmarkPage() {
    const s=state(),r=route();if(!validRoute(r)||['saved','bookmarks'].includes(r))return;
    const existing=s.items.find(i=>i.kind==='page'&&i.route===r);
    if(existing)s.items=s.items.filter(i=>i.id!==existing.id);
    else {if(s.items.length>=MAX_ITEMS){toast('Saved reading is full. Remove an item first.');return;}s.items.push({id:'page-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),kind:'page',route:r,title:text(resolveRoute(r)?.title,240)||r,note:'',color:null,bookmarked:true,view:cleanView(view),createdAt:new Date().toISOString()});}
    commit();toast(existing?'Page bookmark removed.':'Page saved to Saved reading.');
  }
  function page() {
    const s=state(),legacy=getLegacyBookmarks().filter(x=>validRoute(x.route)),sort=[...s.items].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return `<section class="reader-saved"><span class="eyebrow">YOUR PERSONAL READING SHELF</span><h1>Saved reading</h1><p class="lede">Return to pages, highlighted passages, and ideas you want to use. Your notes and selections stay in this browser and travel with your progress backup.</p><div class="actions"><button class="button" data-reader-action="export">Export saved reading ↓</button><a class="button" href="#progress">Back up or import all progress</a></div><div class="reader-filter"><label for="reader-filter">Show</label><select id="reader-filter"><option value="all">All saved reading (${s.items.length})</option><option value="page">Page bookmarks</option><option value="passage">Passages and highlights</option><option value="bookmarked">Starred passages</option></select></div><div id="reader-saved-items">${sort.length?sort.map(i=>savedCard(i)).join(''):'<p class="notice">Nothing saved yet. Bookmark a page, or select a passage and tap the highlighter or bookmark icon.</p>'}</div><p id="reader-filter-empty" hidden>No saved items in this group.</p>${legacy.length?`<section class="reader-legacy"><h2>Your existing lesson bookmarks</h2><p class="small muted">These are the bookmarks you saved using the lesson’s original bookmark button.</p><ul>${legacy.map(i=>`<li><a href="#${esc(i.route)}">${esc(i.title)}</a></li>`).join('')}</ul></section>`:''}</section>`;
  }
  function savedCard(i) {
    return `<article class="reader-saved-card" data-reader-item="${esc(i.id)}" data-kind="${i.kind}" data-bookmarked="${i.bookmarked}"><div class="reader-saved-heading"><span class="eyebrow">${i.kind==='page'?'BOOKMARKED PAGE':i.color?esc(i.color.toUpperCase())+' HIGHLIGHT':i.bookmarked?'STARRED PASSAGE':'SAVED PASSAGE'}</span><button type="button" data-reader-action="remove" data-id="${esc(i.id)}" aria-label="Delete saved item from ${esc(i.title)}">Delete</button></div><h2>${esc(i.title)}</h2>${i.kind==='passage'?`<blockquote class="${i.color?'reader-'+i.color:''}">${esc(i.quote).replace(/\n/g,'<br>')}</blockquote>`:''}<div class="actions"><button type="button" class="button" data-reader-action="jump" data-id="${esc(i.id)}">${i.kind==='page'?'Open page':'Return to passage'} →</button>${i.kind==='passage'?`<button type="button" class="icon-toggle" data-reader-action="star" data-id="${esc(i.id)}" aria-pressed="${i.bookmarked}" aria-label="${i.bookmarked?'Remove bookmark':'Bookmark passage'}" title="${i.bookmarked?'Remove bookmark':'Bookmark passage'}"><svg class="icon-bm" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z" fill="${i.bookmarked?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>`:''}</div>${i.kind==='passage'?`<label class="reader-color-label" for="color-${esc(i.id)}">Highlight color</label><select id="color-${esc(i.id)}" data-reader-color="${esc(i.id)}"><option value="none" ${!i.color?'selected':''}>No highlight</option>${COLORS.map(c=>`<option value="${c}" ${i.color===c?'selected':''}>${c[0].toUpperCase()+c.slice(1)}</option>`).join('')}</select>`:''}<label class="reader-note-label" for="note-${esc(i.id)}">Your note <span>(saved automatically)</span></label><textarea id="note-${esc(i.id)}" data-reader-note="${esc(i.id)}" maxlength="5000" rows="3" placeholder="Why does this matter? How would you use it?">${esc(i.note)}</textarea></article>`;
  }
  function exportNotes() {
    const saved=[...state().items].sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    return '# Baseball Performance — Saved Reading\n\n'+(saved.length?saved.map(i=>`## ${i.title}\n\nPage: #${i.route}\nType: ${i.kind}${i.color?' · '+i.color+' highlight':''}${i.bookmarked?' · bookmarked':''}\n${i.quote?'\n'+i.quote.split('\n').map(l=>'> '+l).join('\n')+'\n':''}${i.note?'\nYour note:\n'+i.note+'\n':''}`).join('\n'):'No saved reading yet.')+'\n';
  }
  function focusSheet(action,value) { document.querySelector(`#aa-sheet [data-reader-action="${action}"][data-value="${value}"]`)?.focus(); }
  function focusButton(action) { document.querySelector(`#quick-tools [data-reader-action="${action}"],#reader-tools [data-reader-action="${action}"]`)?.focus(); }
  function updateFilter() {
    const selected=$('#reader-filter')?.value||'all';let shown=0;
    for(const card of document.querySelectorAll('[data-reader-item]')){card.hidden=selected==='bookmarked'?(card.dataset.kind!=='passage'||card.dataset.bookmarked!=='true'):selected!=='all'&&card.dataset.kind!==selected;if(!card.hidden)shown++;}
    if($('#reader-filter-empty'))$('#reader-filter-empty').hidden=shown>0||state().items.length===0;
  }
  function onClick(e) {
    const b=e.target?.closest?.('[data-reader-action]');
    if(!b){
      // Tapping an existing highlight opens the same small bar: three colors and remove.
      const m=e.target?.closest?.('#main mark[data-reader-mark]');
      if(m&&!m.closest('a,button,summary,label')&&window.getSelection?.()?.isCollapsed!==false){const ids=m.dataset.readerMark.split(' '),it=state().items.find(x=>x.id===ids[ids.length-1]);if(it){pending=null;showColors(it,m.getBoundingClientRect());}}
      return;
    }
    const action=b.dataset.readerAction,id=b.dataset.id,s=state(),i=s.items.find(x=>x.id===id);
    if(action==='sidebar'){if(s.settings.focus)return;s.settings.sidebarHidden=!s.settings.sidebarHidden;commit();focusButton('sidebar');}
    else if(action==='theme'){s.settings.theme=b.dataset.value==='dark'||(!b.dataset.value&&s.settings.theme!=='dark')?'dark':'light';commit();focusSheet('theme',s.settings.theme);}
    else if(action==='aa'){sheetOpen=!sheetOpen;toolbar();if(sheetOpen)$('#aa-sheet [aria-pressed="true"]')?.focus();else focusButton('aa');}
    else if(action==='size'){const n=Number(b.dataset.value);if(SIZES.includes(n)){s.settings.size=n;commit();focusSheet('size',n);}}
    else if(action==='font'){if(FONTS.includes(b.dataset.value)){s.settings.font=b.dataset.value;commit();focusSheet('font',b.dataset.value);}}
    else if(action==='focus'){s.settings.focus=!s.settings.focus;commit();focusButton('focus');}
    else if(action==='page'){bookmarkPage();focusButton('page');}
    else if(action==='selection'){if(captureSelection(true))showSelection(true);}
    else if(action==='dismiss'){pending=null;hideSelection();focusButton('selection');}
    else if(action==='highlight'&&COLORS.includes(b.dataset.color))addPassage(b.dataset.color);
    else if(action==='bookmark-passage')addPassage(null,true);
    else if(action==='recolor'&&i&&COLORS.includes(b.dataset.color)){i.color=b.dataset.color;closeBar();commit();remark();}
    else if(action==='unmark'&&i)removeHighlight(i);
    else if(action==='export')download('Baseball-Saved-Reading.md',exportNotes(),'text/markdown');
    else if(action==='remove'&&i){s.items=s.items.filter(x=>x.id!==id);commit();Promise.resolve(rerender()).then(()=>$('#reader-filter')?.focus());toast('Saved item removed.');}
    else if(action==='star'&&i){i.bookmarked=!i.bookmarked;save();b.setAttribute('aria-pressed',String(i.bookmarked));b.querySelector('path')?.setAttribute('fill',i.bookmarked?'currentColor':'none');b.setAttribute('aria-label',i.bookmarked?'Remove bookmark':'Bookmark passage');b.title=i.bookmarked?'Remove bookmark':'Bookmark passage';b.closest('[data-reader-item]')?.setAttribute('data-bookmarked',String(i.bookmarked));updateFilter();}
    else if(action==='jump'&&i){jump=i;jumpAttempts=0;if(route()===i.route)rerender();else location.hash=i.route;}
  }
  function restoreJump() {
    if(!jump||jump.route!==route())return;
    const target=jump;
    if(JSON.stringify(view)!==JSON.stringify(target.view)&&jumpAttempts<5){
      for(const v of target.view){if(view.some(x=>x.kind===v.kind&&x.index===v.index))continue;
        const selector=v.kind==='baseball'?`[data-bb-action="stage"][data-index="${v.index}"]`:v.kind==='lesson'?`[data-action="step"][data-step="${v.index}"]`:v.kind==='lab'?`[data-lab-action="stage"][data-stage="${v.index}"]`:v.kind==='rehab'?`[data-lab-action="rehab-checkpoint"][data-index="${v.index}"]`:`[data-grad="stage"][data-stage="${v.index}"],[data-graduate-action="stage"][data-stage="${v.index}"]`;
        const button=$('#main '+selector);if(button&&!button.disabled){jumpAttempts++;button.click();return;}
      }
    }
    jump=null;
    if(target.kind==='page'){ $('#main')?.focus?.({preventScroll:true});return; }
    const segments=target.segments.map(s=>({s,b:currentBlocks.find(b=>b.anchor===s.anchor)}));
    if(!segments.every(({s,b})=>match(s,b))){toast('Your saved text is safe in Saved reading. This passage is unavailable in the current view or the source text has changed.');return;}
    for(const {b} of segments){let parent=b.el.parentElement;while(parent&&parent.id!=='main'){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}}
    const el=segments[0].b.el;el.classList.add('reader-jump-target');el.setAttribute('tabindex','-1');
    // Parent route/stage handlers also focus the main region. Apply the precise target after they finish.
    setTimeout(()=>{if(route()===target.route && el.isConnected){el.scrollIntoView?.({block:'center',behavior:'auto'});el.focus?.({preventScroll:true});}},0);
    setTimeout(()=>el.classList.remove('reader-jump-target'),3500);
  }
  function afterRender() {
    if(lastRoute!==route()){pending=null;lastAdded=null;hideSelection();lastRoute=route();}
    clearMarks();view=activeView();currentBlocks=anchorBlocks();applyMarks();toolbar();restoreJump();
  }
  function mount() {
    if(mounted)return;mounted=true;toolbar();
    document.addEventListener('click',onClick);
    document.addEventListener('input',e=>{const id=e.target?.dataset?.readerNote;if(!id)return;const item=state().items.find(i=>i.id===id);if(item){item.note=text(e.target.value,5000);save();}});
    document.addEventListener('change',e=>{if(e.target?.id==='reader-filter')updateFilter();const id=e.target?.dataset?.readerColor;if(id){const item=state().items.find(i=>i.id===id);if(item){item.color=COLORS.includes(e.target.value)?e.target.value:null;save();Promise.resolve(rerender()).then(()=>document.getElementById('color-'+id)?.focus());}}});
    document.addEventListener('pointerdown',e=>{if(e.target?.closest?.('#selection-toolbar,[data-reader-action="selection"]'))e.preventDefault();else if(picking)closeBar();});
    document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(()=>{const a=document.activeElement;if(a?.closest?.('#selection-toolbar'))return;if(picking&&window.getSelection?.()?.isCollapsed!==false)return;picking=null;if(captureSelection())showSelection();},120);});
    document.addEventListener('keydown',e=>{if(e.altKey&&e.shiftKey&&(e.code==='KeyS'||e.key?.toLowerCase()==='s')){e.preventDefault();if(captureSelection(true))showSelection(true);return;}if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&!e.altKey&&e.key?.toLowerCase()==='z'&&lastAdded&&!e.target?.closest?.('input,textarea,select,[contenteditable]')){if(undoLast())e.preventDefault();return;}if(e.key!=='Escape')return;if(sheetOpen){sheetOpen=false;toolbar();focusButton('aa');return;}if($('#selection-toolbar')&&!$('#selection-toolbar').hidden){closeBar();focusButton('selection');return;}if(state().settings.focus){state().settings.focus=false;commit();focusButton('focus');}});
    window.addEventListener?.('resize',()=>{if(pending&&!$('#selection-toolbar')?.hidden)showSelection();});
    window.addEventListener?.('scroll',()=>{hideSelection();readProgress();},{passive:true});
    document.addEventListener('pointerdown',e=>{if(sheetOpen&&!e.target?.closest?.('#aa-sheet,[data-reader-action="aa"]')){sheetOpen=false;toolbar();}});
  }
  return {sanitize,mount,afterRender,page,exportNotes,refreshToolbar:toolbar,count:()=>state().items.length,captureSelection,showSelection};
}
