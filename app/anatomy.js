import * as THREE from 'three';
import { GLTFLoader } from './vendor/three/GLTFLoader.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';

const base = new URL('./', import.meta.url);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// Layers group structure types. Ligament-like tissue shares one layer.
const LAYERS = [
  { id: 'muscle', label: 'Muscles', types: ['muscle'] },
  { id: 'ligament', label: 'Ligaments & tissue', types: ['ligament', 'cartilage', 'bursa', 'fascia', 'tendon'] },
  { id: 'joint', label: 'Joints', types: ['joint'] },
  { id: 'bone', label: 'Bones', types: ['bone'] },
];
const layerOf = type => LAYERS.find(l => l.types.includes(type))?.id || 'bone';
const COLORS = { muscle: '#a95b52', ligament: '#d7d2c4', cartilage: '#9cc3d3', bursa: '#b7a2c8', fascia: '#cdbf8f', tendon: '#e6dcc2', joint: '#5f93b3', bone: '#e2d9bc' };
const TYPE_NAMES = { muscle: 'Muscle', ligament: 'Ligament', cartilage: 'Fibrocartilage', bursa: 'Bursa', fascia: 'Fascia', tendon: 'Tendon', joint: 'Joint', bone: 'Bone' };
// One-click camera views. Model axes: +z = front, -x = the right side's outer (lateral) face, +y = up.
const VIEWS = [
  { id: 'front', label: 'Front', dir: [0, 0, 1] },
  { id: 'back', label: 'Back', dir: [0, 0, -1] },
  { id: 'lateral', label: 'Lateral', dir: [-1, 0, 0], title: 'Outer side' },
  { id: 'medial', label: 'Medial', dir: [1, 0, 0], title: 'Inner side, toward the midline' },
  { id: 'top', label: 'Top', dir: [0, 1, 0.02], title: 'Axial view, looking down' },
  { id: 'angle', label: 'Angle', dir: [-0.62, 0.32, 0.72], title: 'Three-quarter view from the front and outside' },
];
const TABS = [['muscle', 'Muscles', 'muscles'], ['ligament', 'Ligaments & tissue', 'ligaments'], ['joint', 'Joints', 'joints'], ['bone', 'Bones', 'bones']];
const SELECTED = '#2039C4';

/** Mount the regional anatomy viewer. */
export async function mountAnatomy(host, { region = 'shoulder', select: wanted = '', onNavigateLesson = () => {}, onChange = () => {} } = {}) {
  if (!document.querySelector('link[data-anatomy-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = new URL('anatomy.css', base); link.dataset.anatomyStyle = '';
    document.head.append(link);
  }
  host.innerHTML = '<section class="anatomy-lab"><p role="status">Opening the Anatomy Lab…</p></section>';
  let data;
  try {
    const response = await fetch(new URL('data/anatomy.json', base));
    if (!response.ok) throw new Error(`Metadata: HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    host.innerHTML = `<section class="anatomy-lab anatomy-error"><h2>Anatomy could not open</h2><p>Reload this page to retry loading the anatomy data.</p><p>${escapeHTML(error.message)}</p></section>`;
    return () => {};
  }
  let active = true, generation = 0, selectedId = '', currentRegion, query = '';
  let quiz = false, quizIndex = 0, quizTarget = '', quizOrder = [], tab = 'muscle', view = '', tween = null;
  let isolated = false, boneOpacity = 0.55, muscleOpacity = 1, dirty = true, radius = 1;
  const hidden = new Set();
  const layersOn = new Set(LAYERS.map(l => l.id));
  const structureMap = new Map(data.structures.map(item => [item.id, item]));
  const objects = new Map(); // structureId -> [Object3D]
  const disposables = new Set();
  const xray = new THREE.MeshBasicMaterial({ color: SELECTED, transparent: true, opacity: 0.32, depthTest: false, depthWrite: false });
  const overlays = [];
  const listeners = [];
  let frame = 0, renderer, controls, observer, atlasGroup;
  const on = (node, event, fn) => { node.addEventListener(event, fn); listeners.push(() => node.removeEventListener(event, fn)); };
  const root = document.createElement('section'); root.className = 'anatomy-lab';
  root.innerHTML = `
    <div class="anatomy-regions" role="group" aria-label="Body region">${data.regions.map(r => `<button type="button" data-region="${escapeHTML(r.id)}" aria-pressed="false">${escapeHTML(r.name)}</button>`).join('')}</div>
    <div class="anatomy-workspace">
      <div class="anatomy-visual-column">
        <div class="anatomy-stage"><div class="anatomy-canvas-mount"></div><span class="anatomy-selection-label"></span><p class="anatomy-status" role="status" aria-live="polite">Loading model…</p><p class="anatomy-gesture">Drag to rotate · scroll or pinch to zoom · right-drag to pan</p></div>
        <div class="anatomy-views" role="group" aria-label="Camera view"><span>View</span>${VIEWS.map(v => `<button type="button" data-view="${v.id}" aria-pressed="false"${v.title ? ` title="${v.title}"` : ''}>${v.label}</button>`).join('')}</div>
        <div class="anatomy-layers" role="group" aria-label="Show layers">${LAYERS.map(l => `<button type="button" data-layer="${l.id}" aria-pressed="true"><span class="anatomy-dot ${l.id}"></span>${l.label}</button>`).join('')}</div>
        <div class="anatomy-toolbar" aria-label="Model controls"><button type="button" data-action="isolate">Isolate selected</button><button type="button" data-action="hide">Hide selected</button><button type="button" data-action="focus">Zoom to selected</button><button type="button" data-action="reset">Reset view</button></div>
        <div class="anatomy-sliders">
          <label class="anatomy-opacity">Muscle opacity <input type="range" data-slider="muscle" min="10" max="100" value="100" step="5"><output>100%</output></label>
          <label class="anatomy-opacity">Bone opacity <input type="range" data-slider="bone" min="15" max="100" value="55" step="5"><output>55%</output></label>
        </div>
      </div>
      <div class="anatomy-side">
        <div class="anatomy-browse">
          <h3 class="anatomy-region-title"></h3><p class="anatomy-region-subtitle"></p>
          <label class="anatomy-search">Find a structure <input type="search" placeholder="e.g. UCL, oblique, labrum"></label>
          <div class="anatomy-type-tabs" role="group" aria-label="Structure type"></div>
          <div class="anatomy-structure-list" role="group" aria-label="Select a structure"></div>
        </div>
        <aside class="anatomy-panel" aria-label="Structure card">
          <div class="anatomy-details" aria-live="polite"></div>
          <button class="anatomy-lesson-link" type="button">Study this region →</button>
        </aside>
        <div class="anatomy-quiz"><div class="anatomy-quiz-heading"><strong>Identify the structure</strong><button type="button" data-action="quiz">Start recall</button></div><div class="anatomy-quiz-body" hidden><p>Names are hidden. Name the highlighted muscle or ligament.</p><label>Your answer <select></select></label><div class="anatomy-quiz-buttons"><button type="button" data-action="check">Check answer</button><button type="button" data-action="next">Next structure</button></div><p class="anatomy-feedback" aria-live="polite"></p></div></div>
      </div>
    </div>
    <p class="anatomy-study-prompt"></p>
    <details class="anatomy-sources"><summary>Model limits, sources & attribution</summary><p>${escapeHTML(data.limits)}</p><p><a href="${escapeHTML(data.licenseUrl)}" target="_blank" rel="noopener">${escapeHTML(data.attribution)}</a></p><p>Model files keep the atlas coordinates. Colors and visibility are teaching overlays. One male atlas does not show normal anatomical variation.</p><p>Cards drafted ${escapeHTML(data.reviewed)} from the references below.</p><ul>${Object.values(data.sources).map(s => `<li><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title)}</a> · ${escapeHTML(s.type)}</li>`).join('')}</ul><a href="./assets/anatomy/regions/manifest.json" target="_blank">View model manifest</a> · <a href="./assets/anatomy/regions/Z-ANATOMY-LICENSE.txt" target="_blank">Z-Anatomy license</a></details>`;
  host.replaceChildren(root);
  const $ = selector => root.querySelector(selector);
  const stage = $('.anatomy-stage'), mount = $('.anatomy-canvas-mount'), status = $('.anatomy-status');
  const details = $('.anatomy-details'), list = $('.anatomy-structure-list'), answer = $('.anatomy-quiz select');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#F1F1F0');
  const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100);
  scene.add(new THREE.HemisphereLight('#ffffff', '#646470', 2.0));
  const keyLight = new THREE.DirectionalLight('#ffffff', 2.4); keyLight.position.set(2, 4, 5); scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight('#dfe4ff', 1.3); fillLight.position.set(-3, 2, -4); scene.add(fillLight);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const loader = new GLTFLoader();

  const regionIds = () => [...currentRegion.joints, ...currentRegion.ligaments, ...currentRegion.muscles, ...currentRegion.bones];
  function setStatus(message, error = false) { status.textContent = message; status.classList.toggle('is-error', error); status.hidden = !message; }
  function setModelReady(ready) { root.querySelectorAll('.anatomy-toolbar button, [data-view], [data-action="quiz"], .anatomy-sliders input').forEach(c => { c.disabled = !ready; }); }
  const row = (key, value) => value ? `<div><dt>${escapeHTML(key)}</dt><dd>${escapeHTML(value)}</dd></div>` : '';

  function displayDetails() {
    const item = structureMap.get(selectedId);
    const label = $('.anatomy-selection-label');
    if (!item) { details.innerHTML = '<p class="anatomy-note">Select a structure on the model or in the list.</p>'; label.textContent = ''; return; }
    label.textContent = quiz ? 'Name the highlighted structure' : `${item.name}${hidden.has(item.id) ? ' · hidden' : ''}${item.meshes.length || item.schematic ? '' : ' · no mesh'}`;
    if (quiz) { details.innerHTML = '<p class="anatomy-quiz-note">Recall mode: the name and card are hidden. Answer below the model, or end recall to explore again.</p>'; return; }
    let rows = '';
    if (item.type === 'muscle') rows = row('Origin', item.origin) + row('Insertion', item.insertion) + row('Main actions', item.action) + row('Innervation', item.innervation);
    else if (item.type === 'joint') rows = row('Type', item.classification) + row('Motion', item.motion) + row('Close-packed position', item.closePacked) + row('Stabilizers', item.stabilizers);
    else if (item.type !== 'bone') rows = row('Attachments', item.attachments) + row('Function', item.function);
    details.innerHTML = `<p class="anatomy-type"><span class="anatomy-dot ${layerOf(item.type)}"></span>${escapeHTML(TYPE_NAMES[item.type])} · right side</p><h3>${escapeHTML(item.name)}</h3>${rows ? `<dl>${rows}</dl>` : ''}${item.baseball ? `<div class="anatomy-baseball"><strong>Baseball link</strong><p>${escapeHTML(item.baseball)}</p></div>` : ''}${item.rom ? `<a class="anatomy-rom-link" href="#joints/${escapeHTML(item.rom)}">See range of motion norms →</a>` : ''}${item.note ? `<p class="anatomy-note">${escapeHTML(item.note)}</p>` : ''}<div class="anatomy-card-sources">${item.sourceIds.map(id => { const s = data.sources[id]; return s ? `<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener">${escapeHTML(s.title)}</a>` : ''; }).join('')}</div>`;
  }
  // Picker: one tab per structure type keeps the list short; a search shows matches from every type.
  function refreshList() {
    const q = query.trim().toLowerCase();
    const match = id => quiz || !q || structureMap.get(id).name.toLowerCase().includes(q) || id.includes(q);
    const groups = TABS.map(([id, label, key]) => ({ id, label, ids: currentRegion[key].filter(match) }));
    if (!groups.find(g => g.id === tab)?.ids.length && !q) tab = groups.find(g => g.ids.length)?.id || 'muscle';
    $('.anatomy-type-tabs').innerHTML = groups.map(g => `<button type="button" data-tab="${g.id}" aria-pressed="${!q && g.id === tab}" ${g.ids.length ? '' : 'disabled'}>${g.label} <small>${g.ids.length}</small></button>`).join('');
    let index = 0;
    const chip = id => { const item = structureMap.get(id); index++; return `<button type="button" data-structure="${escapeHTML(id)}" aria-pressed="${id === selectedId}" ${quiz ? 'disabled' : ''}><span class="anatomy-dot ${layerOf(item.type)}"></span><span>${escapeHTML(quiz ? `Structure ${index}` : item.name)}</span></button>`; };
    const shown = q ? groups.filter(g => g.ids.length) : groups.filter(g => g.id === tab);
    list.innerHTML = shown.map(g => `<div class="anatomy-group">${q ? `<h4>${g.label} <small>${g.ids.length}</small></h4>` : ''}<div class="anatomy-chips">${g.ids.map(chip).join('')}</div></div>`).join('')
      || '<p class="anatomy-note">No structure in this region matches. Try another word or region.</p>';
    list.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  function updateAppearance() {
    const selected = structureMap.get(selectedId);
    const ghostMuscles = selected && !quiz && ['ligament', 'joint'].includes(layerOf(selected.type)) && muscleOpacity === 1 && layersOn.has('muscle');
    for (const [id, list3d] of objects) {
      const item = structureMap.get(id), layer = layerOf(item.type), chosen = id === selectedId;
      const visible = !hidden.has(id) && (chosen || layersOn.has(layer)) && (!isolated || chosen);
      for (const object of list3d) {
        object.visible = visible;
        object.traverse(mesh => {
          if (!mesh.isMesh || mesh.material === xray) return;
          const m = mesh.material;
          m.color.set(chosen ? SELECTED : COLORS[item.type]);
          m.emissive.set(chosen ? '#101d66' : '#000000'); m.emissiveIntensity = chosen ? 0.2 : 0;
          let opacity = 1;
          if (!chosen && item.type === 'bone') opacity = boneOpacity;
          if (!chosen && item.type === 'muscle') opacity = ghostMuscles ? 0.22 : muscleOpacity;
          if (!chosen && item.type === 'joint') opacity = 0.55;
          m.opacity = opacity; m.transparent = opacity < 1; m.depthWrite = !m.transparent;
          mesh.renderOrder = chosen ? 2 : m.transparent ? 1 : 0;
        });
      }
    }
    for (const o of overlays.splice(0)) o.parent?.remove(o);
    for (const object of objects.get(selectedId) || []) {
      if (!object.visible) continue;
      const ghost = new THREE.Mesh(object.geometry, xray); ghost.renderOrder = 10; ghost.raycast = () => {};
      object.add(ghost); overlays.push(ghost);
    }
    $('[data-action="isolate"]').textContent = isolated ? 'Show context' : 'Isolate selected';
    $('[data-action="hide"]').textContent = hidden.has(selectedId) ? 'Show selected' : 'Hide selected';
    $('[data-action="hide"]').disabled = quiz || !renderer || !atlasGroup;
    root.querySelectorAll('[data-layer]').forEach(b => b.setAttribute('aria-pressed', String(layersOn.has(b.dataset.layer))));
    dirty = true;
  }
  function select(id) {
    selectedId = id;
    const item = structureMap.get(id);
    if (item && !query.trim()) tab = layerOf(item.type);
    updateAppearance(); refreshList(); displayDetails();
  }
  function disposeAtlas() {
    if (atlasGroup) scene.remove(atlasGroup);
    for (const d of disposables) d.dispose();
    disposables.clear(); objects.clear(); atlasGroup = null;
  }
  function resize() {
    if (!renderer) return;
    const width = Math.max(1, mount.clientWidth), height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true;
  }
  function framing(ids, pad) {
    // A region can name the structures to frame (the elbow model runs down to the fingers).
    let box = new THREE.Box3();
    for (const id of ids) for (const o of objects.get(id) || []) box.expandByObject(o);
    if (box.isEmpty()) box = new THREE.Box3().setFromObject(atlasGroup);
    const center = box.getCenter(new THREE.Vector3()), r = Math.max(box.getSize(new THREE.Vector3()).length() / 2 * pad, radius * 0.08);
    const aspect = Math.max(0.4, camera.aspect);
    const distance = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(1, 1 / aspect) * 1.02;
    return { center, r, distance };
  }
  /** Move the camera to look at the framed structures from a direction; animated unless the user prefers reduced motion. */
  function fitView(ids = currentRegion.frame || [], pad = 1, direction = [-0.33, 0.05, 1], animate = false) {
    if (!renderer || !atlasGroup) return;
    const { center, r, distance } = framing(ids, pad);
    camera.near = Math.max(radius / 500, 0.0005); camera.far = (distance + radius) * 30; camera.updateProjectionMatrix();
    controls.minDistance = r * 0.15; controls.maxDistance = (distance + radius) * 4;
    const toDir = new THREE.Vector3(...direction).normalize();
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const offset = camera.position.clone().sub(controls.target);
      tween = { start: performance.now(), fromDir: offset.clone().normalize(), fromDist: offset.length(), fromTarget: controls.target.clone(), toDir, toDist: distance, toTarget: center };
      tween.turn = new THREE.Quaternion().setFromUnitVectors(tween.fromDir, toDir);
    } else {
      tween = null;
      camera.position.copy(center).addScaledVector(toDir, distance); controls.target.copy(center);
    }
    controls.update(); dirty = true;
  }
  function stepTween(now) {
    if (!tween) return;
    const t = Math.min(1, (now - tween.start) / 450), k = t * t * (3 - 2 * t);
    const dirNow = tween.fromDir.clone().applyQuaternion(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), tween.turn, k));
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
    camera.position.copy(controls.target).addScaledVector(dirNow, tween.fromDist + (tween.toDist - tween.fromDist) * k);
    dirty = true;
    if (t >= 1) tween = null;
  }
  function setView(id) {
    const v = VIEWS.find(x => x.id === id); if (!v) return;
    view = id; fitView(currentRegion.frame || [], 1, v.dir, true);
    root.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  }
  function clearView() { if (!view) return; view = ''; root.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false')); }
  function showQuestion() {
    if (!quizOrder.length) return;
    quizTarget = quizOrder[quizIndex % quizOrder.length];
    hidden.clear(); isolated = false;
    answer.innerHTML = '<option value="">Choose a structure…</option>' + [...quizOrder].sort((a, b) => structureMap.get(a).name.localeCompare(structureMap.get(b).name)).map(id => `<option value="${escapeHTML(id)}">${escapeHTML(structureMap.get(id).name)}</option>`).join('');
    $('.anatomy-feedback').textContent = '';
    select(quizTarget);
  }
  function setQuiz(enabled) {
    quiz = enabled; $('.anatomy-quiz-body').hidden = !quiz;
    $('[data-action="quiz"]').textContent = quiz ? 'End recall' : 'Start recall';
    if (quiz) {
      quizOrder = currentRegion.quiz.filter(id => objects.has(id)).sort(() => Math.random() - 0.5);
      quizIndex = 0; showQuestion();
    } else { refreshList(); displayDetails(); updateAppearance(); }
  }
  async function loadRegion(id) {
    const token = ++generation;
    currentRegion = data.regions.find(r => r.id === id) || data.regions[0];
    quiz = false; hidden.clear(); isolated = false; query = ''; $('.anatomy-search input').value = '';
    // A deep link such as #anatomy/shoulder/infraspinatus opens that structure once.
    const inRegion = ['muscles', 'ligaments', 'joints', 'bones'].some(k => (currentRegion[k] || []).includes(wanted));
    selectedId = inRegion ? wanted : currentRegion.defaultSelection; wanted = ''; tab = layerOf(structureMap.get(selectedId)?.type || 'muscle'); clearView();
    $('.anatomy-quiz-body').hidden = true; $('[data-action="quiz"]').textContent = 'Start recall';
    $('.anatomy-region-title').textContent = currentRegion.name;
    $('.anatomy-region-subtitle').textContent = currentRegion.subtitle;
    $('.anatomy-study-prompt').textContent = currentRegion.prompt;
    $('.anatomy-lesson-link').hidden = !currentRegion.lesson;
    root.querySelectorAll('[data-region]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.region === currentRegion.id)));
    disposeAtlas(); refreshList(); displayDetails(); setModelReady(false);
    onChange(currentRegion.id);
    if (!renderer) return;
    setStatus(`Loading ${currentRegion.name.toLowerCase()} model…`);
    try {
      const gltf = await loader.loadAsync(new URL(currentRegion.model, base).href);
      const group = gltf.scene;
      if (!active || token !== generation) { group.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); return; }
      group.traverse(object => {
        if (!object.isMesh) return;
        let owner = object; while (owner && !owner.userData?.structureId) owner = owner.parent;
        const sid = owner?.userData?.structureId;
        if (!sid || !structureMap.has(sid)) { object.visible = false; return; }
        object.userData.structureId = sid;
        object.geometry.computeVertexNormals();
        object.material?.dispose?.();
        object.material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
        disposables.add(object.geometry); disposables.add(object.material);
        objects.set(sid, [...(objects.get(sid) || []), object]);
      });
      atlasGroup = group; scene.add(atlasGroup); atlasGroup.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(atlasGroup), center = box.getCenter(new THREE.Vector3());
      atlasGroup.position.sub(center); atlasGroup.updateMatrixWorld(true); radius = box.getSize(new THREE.Vector3()).length() / 2;
      resize(); setModelReady(true);
      if (currentRegion.view) setView(currentRegion.view); else fitView();
      if (tween) { tween = null; const v = VIEWS.find(x => x.id === currentRegion.view); fitView(currentRegion.frame || [], 1, v.dir); }
      select(selectedId); setStatus('');
    } catch (error) {
      if (active && token === generation) { setModelReady(false); setStatus('The 3D model could not load. The structure list and cards still work; reload the hub to retry.', true); }
      console.warn('Anatomy model loading failed:', error);
    }
  }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label', 'Interactive right-side anatomy model. The structure list beside it is an accessible alternative.');
    renderer.domElement.setAttribute('role', 'img');
    mount.append(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.addEventListener('change', () => { dirty = true; });
    controls.addEventListener('start', () => { tween = null; clearView(); });
    observer = new ResizeObserver(resize); observer.observe(mount);
    let start = null;
    on(renderer.domElement, 'pointerdown', event => { start = [event.clientX, event.clientY]; });
    on(renderer.domElement, 'pointerup', event => {
      if (quiz || !start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const candidates = [...objects.values()].flat().filter(o => o.visible && !(o.material.transparent && o.material.opacity < 0.3));
      const hit = raycaster.intersectObjects(candidates, false)[0];
      if (hit) select(hit.object.userData.structureId);
    });
    function animate(now) {
      if (!active) return;
      stepTween(now ?? performance.now());
      controls.update();
      if (dirty && !document.hidden) { renderer.render(scene, camera); dirty = false; }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
  } catch (error) {
    renderer?.dispose(); renderer = null;
    stage.classList.add('anatomy-no-webgl');
    setStatus('3D rendering is unavailable in this browser. The structure list and cards still work.', true);
    setModelReady(false);
    console.warn('Anatomy WebGL unavailable:', error);
  }
  on(root, 'click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.region) { loadRegion(button.dataset.region); return; }
    if (button.dataset.tab) { tab = button.dataset.tab; refreshList(); $(`[data-tab="${tab}"]`)?.focus(); return; }
    if (button.dataset.view) { setView(button.dataset.view); return; }
    if (button.dataset.structure && !quiz) {
      select(button.dataset.structure);
      // Phones jump back to the model so the highlight is visible; wide screens keep the picker and card in place
      // and only scroll if the card's top is below the fold.
      const phone = window.matchMedia('(max-width: 800px)').matches;
      const target = phone ? stage : $('.anatomy-panel');
      const box = target.getBoundingClientRect();
      if (phone ? (box.top < 60 || box.bottom > window.innerHeight) : box.top > window.innerHeight - 120) target.scrollIntoView({ block: phone ? 'start' : 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    if (button.dataset.layer) { const l = button.dataset.layer; layersOn.has(l) ? layersOn.delete(l) : layersOn.add(l); updateAppearance(); return; }
    const action = button.dataset.action;
    if (action === 'isolate') { isolated = !isolated; updateAppearance(); }
    if (action === 'hide' && !quiz) { hidden.has(selectedId) ? hidden.delete(selectedId) : hidden.add(selectedId); updateAppearance(); refreshList(); displayDetails(); }
    if (action === 'reset') { hidden.clear(); isolated = false; LAYERS.forEach(l => layersOn.add(l.id)); updateAppearance(); refreshList(); displayDetails(); clearView(); fitView(undefined, 1, undefined, true); }
    if (action === 'focus' && controls) { const dir = camera.position.clone().sub(controls.target).normalize(); fitView([selectedId], 3, dir.toArray(), true); }
    if (action === 'quiz') setQuiz(!quiz);
    if (action === 'next') { quizIndex++; showQuestion(); }
    if (action === 'check') {
      if (!answer.value) { $('.anatomy-feedback').textContent = 'Choose an answer first.'; return; }
      const correct = answer.value === quizTarget;
      $('.anatomy-feedback').textContent = correct ? `Correct: ${structureMap.get(quizTarget).name}. End recall to read its card.` : 'Not this one. Rotate the model, compare where it attaches, and try again.';
    }
    if (button.classList.contains('anatomy-lesson-link')) onNavigateLesson(currentRegion.lesson);
  });
  on(root, 'input', event => {
    const t = event.target;
    if (t.matches('.anatomy-search input')) { query = t.value; refreshList(); return; }
    if (t.dataset.slider) {
      const v = Number(t.value) / 100; t.nextElementSibling.textContent = `${t.value}%`;
      if (t.dataset.slider === 'bone') boneOpacity = v; else muscleOpacity = v;
      updateAppearance();
    }
  });
  on(document, 'visibilitychange', () => { dirty = true; });
  loadRegion(region);
  return () => {
    active = false; generation++; cancelAnimationFrame(frame); observer?.disconnect();
    listeners.forEach(remove => remove()); controls?.dispose(); disposeAtlas(); xray.dispose(); renderer?.dispose(); renderer?.forceContextLoss();
    root.remove();
  };
}

export const anatomyRegionIds = ['shoulder', 'scapula', 'elbow', 'trunk', 'hip', 'hamstring', 'ankle'];
