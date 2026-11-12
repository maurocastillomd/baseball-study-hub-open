/* Public edition: device sync needs your own Cloudflare Worker + Access. See HOSTING.md in the private repo. */
// Sync between devices: keeps one copy of your study progress on the hub's own server so the
// phone and the Mac show the same thing. Off until you turn it on, once per device.
// It only works on the live hub, where Cloudflare Access knows who you are.
//
// Rules: a device only uploads on top of the copy it last saw. If the cloud copy moved on while
// this device also changed, nothing is overwritten: you choose, and the other copy is kept as a backup.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const META = 'baseball-performance-hub.sync', BACKUP = 'baseball-performance-hub.sync-backup', API = 'api/progress';
const PUSH_DELAY = 4000, PULL_GAP = 20000;

function deviceName() {
  const ua = navigator.userAgent || '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux|CrOS/.test(ua)) return 'computer';
  return 'device';
}
const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };

/**
 * getEnvelope(): the same object "Export progress" writes. applyEnvelope(envelope): replace this
 * device's progress with it (must throw if the data is not valid). hasLocal(): true if this
 * browser already holds study progress. toast(text): short message.
 */
export function createSync({ getEnvelope, applyEnvelope, hasLocal, toast }) {
  let meta = { on: false, version: 0, dirty: false, at: '' }, state = 'off', detail = '', timer = null, lastPull = 0, busy = false, pending = null, applying = false;
  try { const m = JSON.parse(localStorage.getItem(META) || 'null'); if (m && typeof m === 'object') meta = { on: m.on === true, version: Number.isInteger(m.version) ? m.version : 0, dirty: m.dirty === true, at: typeof m.at === 'string' ? m.at : '' }; } catch { /* start fresh */ }
  if (meta.on) state = 'idle';
  const keep = () => { try { localStorage.setItem(META, JSON.stringify(meta)); } catch { /* storage full or blocked */ } };
  const set = (s, d = '') => { state = s; detail = d; paint(); };

  async function call(method, body) {
    let r;
    try { r = await fetch(API, { method, cache: 'no-store', credentials: 'same-origin', keepalive: method === 'PUT', headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); }
    catch { return { fail: 'offline' }; }
    if (!/json/.test(r.headers.get('content-type') || '')) return { fail: r.status === 401 || r.redirected ? 'signin' : 'unavailable', code: `${r.status} not-json${r.redirected ? ' / redirected' : ''}` };
    let j; try { j = await r.json(); } catch { return { fail: 'unavailable' }; }
    if (r.status === 409) return { conflict: j.current };
    if (!r.ok) return { fail: j.error === 'no-access' || j.error === 'no-identity' ? 'signin' : j.error === 'no-store' ? 'unavailable' : 'error', code: `${r.status} ${j.error || ''}${j.reason ? ' / ' + j.reason : ''}` };
    return { ok: j };
  }
  const WHY = { offline: 'No connection. It will retry when you are back online.', signin: 'Cloudflare sign-in was not found. Reload the page to sign in again.', unavailable: 'Sync is not set up at this address. It works on the live hub.', error: 'The server could not save. It will retry.' };
  // `code` is the server's short reason (for example "401 no-access / expired"), shown so a screenshot is enough to troubleshoot.
  const failed = (f, code) => set(f === 'offline' ? 'offline' : f === 'unavailable' ? 'unavailable' : 'error', (WHY[f] || WHY.error) + (code ? ` (Code: ${code})` : ''));

  function backup(envelope, from) { try { localStorage.setItem(BACKUP, JSON.stringify({ at: new Date().toISOString(), from, envelope })); } catch { /* best effort */ } }
  function adopt(row) {
    applying = true;
    try { applyEnvelope(row.data); } finally { applying = false; }
    meta.version = row.version; meta.dirty = false; meta.at = new Date().toISOString(); keep();
  }

  async function push() {
    clearTimeout(timer); timer = null;
    if (!meta.on || !meta.dirty || busy || pending) return;
    busy = true; set('working');
    meta.dirty = false; keep(); // a change made while the upload is in flight sets it again
    const res = await call('PUT', { base: meta.version, device: deviceName(), data: getEnvelope() });
    busy = false;
    if (res.ok) { meta.version = res.ok.version; meta.at = new Date().toISOString(); keep(); set('idle'); if (meta.dirty) schedule(); return; }
    meta.dirty = true; keep();
    if (res.conflict) return conflict(res.conflict);
    failed(res.fail, res.code);
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(push, PUSH_DELAY); };

  async function pull(force = false) {
    if (!meta.on || busy || pending || (!force && Date.now() - lastPull < PULL_GAP)) return;
    lastPull = Date.now(); busy = true; set('working');
    const res = await call('GET'); busy = false;
    if (!res.ok) return failed(res.fail, res.code);
    const row = res.ok;
    if (row.version > meta.version) {
      if (meta.dirty) return conflict(row);
      try { adopt(row); toast(`Progress updated from your ${row.device}.`); } catch { return set('error', 'The cloud copy could not be read, so this device was left as it is.'); }
    } else if (row.version < meta.version) { meta.version = row.version; meta.dirty = true; keep(); } // cloud copy was deleted: upload again
    set('idle');
    if (meta.dirty) push();
  }

  function conflict(row) { pending = row; set('conflict'); showDialog(); }
  async function resolve(choice) {
    const row = pending; if (!row) return;
    closeDialog();
    if (choice === 'cloud') {
      backup(getEnvelope(), 'this device');
      try { adopt(row); toast('This device now matches the cloud copy. The replaced copy was kept as a backup.'); } catch { pending = null; return set('error', 'The cloud copy could not be read, so this device was left as it is.'); }
      pending = null; set('idle');
    } else {
      backup(row.data, `your ${row.device}`);
      meta.version = row.version; meta.dirty = true; keep(); pending = null;
      await push();
      if (state === 'idle') toast('The cloud copy now matches this device. The replaced copy was kept as a backup.');
    }
  }

  async function turnOn() {
    if (busy) return;
    busy = true; set('working');
    const res = await call('GET'); busy = false;
    if (!res.ok) return failed(res.fail, res.code);
    meta = { on: true, version: 0, dirty: false, at: '' };
    const row = res.ok;
    if (row.version === 0) { meta.dirty = true; keep(); await push(); if (state === 'idle') toast('Sync is on. This device was uploaded.'); return; }
    if (hasLocal()) { meta.dirty = true; keep(); return conflict(row); }
    try { adopt(row); toast(`Sync is on. Progress loaded from your ${row.device}.`); set('idle'); } catch { meta.on = false; keep(); set('off', 'The cloud copy could not be read.'); }
  }
  function turnOff() { clearTimeout(timer); meta.on = false; meta.dirty = false; keep(); pending = null; closeDialog(); set('off'); toast('Sync is off on this device. Your progress stays here and in the cloud.'); }
  async function wipe() {
    if (!confirm('Delete the cloud copy? Progress on this device stays. Other devices keep what they already have.')) return;
    const res = await call('DELETE');
    if (!res.ok) return failed(res.fail, res.code);
    clearTimeout(timer); meta.on = false; meta.version = 0; meta.dirty = false; keep(); set('off'); toast('The cloud copy was deleted and sync is off on this device.');
  }
  function restore() {
    let b; try { b = JSON.parse(localStorage.getItem(BACKUP) || 'null'); } catch { b = null; }
    if (!b?.envelope) return toast('There is no replaced copy to restore.');
    if (!confirm(`Restore the copy from ${b.from} that was replaced on ${when(b.at)}? What is on this device now is kept as the new backup.`)) return;
    const now = getEnvelope();
    try { applying = true; applyEnvelope(b.envelope); } catch { applying = false; return toast('That backup could not be read.'); }
    applying = false; backup(now, 'this device');
    if (meta.on) { meta.dirty = true; keep(); schedule(); }
    toast('The replaced copy was restored.'); paint();
  }

  // ---- What you see ----
  function panelHTML() {
    const hasBackup = (() => { try { return !!localStorage.getItem(BACKUP); } catch { return false; } })();
    const line = { off: 'Off on this device.', idle: meta.at ? `On. Last synced ${when(meta.at)}.` : 'On.', working: 'Syncing…', offline: meta.on ? 'On, waiting for a connection.' : 'No connection.', error: meta.on ? 'On, but the last try failed.' : 'Could not turn on.', unavailable: 'Not available here.', conflict: 'Waiting for your choice.' }[state];
    const on = meta.on;
    return `<h2>Sync between devices</h2>
      <p class="sync-line"><span class="sync-dot sync-${esc(on ? state : 'off')}" aria-hidden="true"></span><strong>${esc(line)}</strong>${meta.dirty && on && state !== 'working' ? ' <span class="muted">Changes waiting to upload.</span>' : ''}</p>
      ${detail ? `<p class="sync-detail">${esc(detail)}</p>` : ''}
      <p class="small muted">Keeps one copy of your progress, notes, highlights and recall cards on this hub's own server, behind your Cloudflare sign-in. Turn it on once on each device. It never overwrites a device without asking when both have changed.</p>
      <div class="actions">${on ? `<button class="button primary" data-sync="now">Sync now</button><button class="button" data-sync="off">Turn off on this device</button><button class="button" data-sync="wipe">Delete the cloud copy</button>` : `<button class="button primary" data-sync="on">Turn on sync on this ${esc(deviceName())}</button>`}${hasBackup ? '<button class="button" data-sync="restore">Restore the replaced copy</button>' : ''}</div>`;
  }
  function paint() { const host = document.getElementById('sync-panel'); if (host) host.innerHTML = panelHTML(); }
  function closeDialog() { document.getElementById('sync-dialog')?.remove(); }
  function showDialog() {
    closeDialog();
    const row = pending; if (!row) return;
    const d = document.createElement('div');
    d.id = 'sync-dialog'; d.className = 'sync-dialog'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'sync-dialog-title');
    d.innerHTML = `<div class="sync-sheet"><h2 id="sync-dialog-title">Two copies of your progress</h2>
      <p>This ${esc(deviceName())} has progress that is not in the cloud, and the cloud has a newer copy from your <strong>${esc(row.device)}</strong> (${esc(when(row.updatedAt))}).</p>
      <p>Pick the one to keep. The other is saved as a backup you can restore from the Progress page.</p>
      <div class="actions"><button class="button primary" data-sync="keep-cloud">Use the copy from my ${esc(row.device)}</button><button class="button" data-sync="keep-local">Keep this ${esc(deviceName())}</button><button class="button" data-sync="later">Decide later</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector('button')?.focus();
  }

  function mount() {
    document.addEventListener('click', e => {
      const b = e.target.closest?.('[data-sync]'); if (!b) return;
      const a = b.dataset.sync;
      if (a === 'on') turnOn(); else if (a === 'off') turnOff(); else if (a === 'wipe') wipe(); else if (a === 'restore') restore();
      else if (a === 'now') { if (pending) showDialog(); else pull(true); }
      else if (a === 'keep-cloud') resolve('cloud'); else if (a === 'keep-local') resolve('local'); else if (a === 'later') closeDialog();
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pull(); else if (meta.on && meta.dirty && !pending) push(); });
    addEventListener('online', () => pull(true));
    if (meta.on) pull(true);
  }
  /** Call from save(): marks this device as changed and uploads shortly after. */
  function changed() { if (!meta.on || applying) return; if (!meta.dirty) { meta.dirty = true; keep(); } if (!pending) schedule(); }
  return { mount, changed, paint, slot: () => '<section class="sync-panel" id="sync-panel"></section>' };
}
