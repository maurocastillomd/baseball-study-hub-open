// Builds one small .glb per Anatomy Lab region from the Z-Anatomy glTF exports.
// Usage (repo root): node tools/anatomy/extract-regions.mjs <folder with the Z-Anatomy .glb export(s)> [region,region]
// The optional second argument rebuilds only the listed regions and keeps the others' files and manifest rows.
// Source since 2026-11-12: z-anatomy.glb made by tools/anatomy/export_from_blend.py from the official Z-Anatomy Startup.blend.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, weld, unpartition, mergeDocuments, simplify } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const srcDir = process.argv[2];
if (!srcDir) { console.error('Pass the folder that holds the Z-Anatomy .glb export(s)'); process.exit(1); }
const srcFiles = readdirSync(srcDir).filter(f => f.endsWith('.glb')).sort();
if (!srcFiles.length) { console.error(`No .glb files in ${srcDir}`); process.exit(1); }
const data = JSON.parse(readFileSync(join(root, 'app/data/anatomy.json'), 'utf8'));
const structures = new Map(data.structures.map(s => [s.id, s]));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const outDir = join(root, 'app/assets/anatomy/regions');
mkdirSync(outDir, { recursive: true });
const only = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const manifestPath = join(outDir, 'manifest.json');
const previous = only && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).regions : [];
const report = previous.filter(r => !only.has(r.region) && data.regions.some(x => x.id === r.region));

/** A closed tube between two points (model coordinates), used for structures the atlas has no mesh for. */
function tube(doc, buffer, [a, b, radius], sides = 12) {
  const d = b.map((v, i) => v - a[i]), len = Math.hypot(...d), u = d.map(v => v / len);
  const ref = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  const n1 = norm(cross(u, ref)), n2 = cross(u, n1);
  const pos = [], idx = [];
  for (const end of [a, b]) for (let i = 0; i < sides; i++) {
    const t = i / sides * Math.PI * 2, c = Math.cos(t) * radius, s = Math.sin(t) * radius;
    pos.push(end[0] + n1[0] * c + n2[0] * s, end[1] + n1[1] * c + n2[1] * s, end[2] + n1[2] * c + n2[2] * s);
  }
  pos.push(...a, ...b);
  const ca = sides * 2, cb = sides * 2 + 1;
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    idx.push(i, j, sides + i, j, sides + j, sides + i, ca, j, i, cb, sides + i, sides + j);
  }
  const position = doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer);
  const indices = doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(idx)).setBuffer(buffer);
  return doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION', position).setIndices(indices));
}

for (const region of data.regions) {
  if (only && !only.has(region.id)) continue;
  const ids = [...region.joints, ...region.bones, ...region.ligaments, ...region.muscles];
  const wanted = new Map(); // za_name -> [structure ids]
  for (const id of ids) for (const mesh of structures.get(id).meshes) wanted.set(mesh, [...(wanted.get(mesh) || []), id]);
  // Each mesh is written once per structure that uses it, so a click maps to exactly one structure.
  const doc = await io.read(join(srcDir, srcFiles[0]));
  for (const file of srcFiles.slice(1)) {
    mergeDocuments(doc, await io.read(join(srcDir, file)));
  }
  const scene = doc.getRoot().listScenes()[0];
  const found = new Set();
  const keep = [];
  for (const node of doc.getRoot().listNodes()) {
    const name = node.getExtras()?.za_name || node.getName();
    if (node.getMesh() && wanted.has(name) && !found.has(name)) { found.add(name); keep.push([node, name, node.getWorldMatrix()]); }
  }
  const kept = new Set();
  // Detach every kept mesh to the scene root with its world transform baked into the node.
  for (const [node, name, world] of keep) {
    for (const parent of node.listParents()) if (parent !== doc.getRoot() && parent.removeChild) parent.removeChild(node);
    node.setMatrix(world);
    const owners = wanted.get(name);
    node.setExtras({ structureId: owners[0] }); node.setName(owners[0]); scene.addChild(node); kept.add(node);
    for (const extra of owners.slice(1)) { const copy = node.clone(); copy.setExtras({ structureId: extra }); copy.setName(extra); scene.addChild(copy); kept.add(copy); }
  }
  for (const node of doc.getRoot().listNodes()) if (!kept.has(node)) node.dispose();
  for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
  doc.getRoot().setDefaultScene(scene);
  const usedMeshes = new Set([...kept].map(n => n.getMesh()));
  for (const mesh of doc.getRoot().listMeshes()) if (!usedMeshes.has(mesh)) mesh.dispose();
  for (const m of doc.getRoot().listMaterials()) m.dispose();
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
  await doc.transform(prune({ keepExtras: true }));
  for (const a of doc.getRoot().listAccessors()) if (a.listParents().filter(p => p !== doc.getRoot()).length === 0) a.dispose();
  // Normals are recomputed in the browser; dropping them lets seams weld and halves the file.
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) prim.setAttribute('NORMAL', null);
  await doc.transform(prune({ keepExtras: true }));
  await doc.transform(unpartition(), dedup(), weld({ tolerance: 0.0001 }), simplify({ simplifier: MeshoptSimplifier, ratio: 0.4, error: 0.0004 }), quantize({ quantizePosition: 14 }));
  // Schematic structures (no atlas mesh): tubes in model coordinates, added after simplification so they keep their shape.
  const buffer = doc.getRoot().listBuffers()[0];
  let schematic = 0;
  for (const id of ids) for (const part of structures.get(id).schematic || []) {
    scene.addChild(doc.createNode(id).setMesh(tube(doc, buffer, part)).setExtras({ structureId: id })); schematic++;
  }
  const missing = [...wanted.keys()].filter(n => !found.has(n));
  const glb = await io.writeBinary(doc);
  writeFileSync(join(outDir, `${region.id}.glb`), glb);
  report.push({ region: region.id, meshes: found.size, schematic, bytes: glb.byteLength, missing });
}
report.sort((x, y) => data.regions.findIndex(r => r.id === x.region) - data.regions.findIndex(r => r.id === y.region));
writeFileSync(manifestPath, JSON.stringify({ built: new Date().toISOString().slice(0, 10), source: 'Official Z-Anatomy Startup.blend (github.com/Z-Anatomy/Models-of-human-anatomy), exported by tools/anatomy/export_from_blend.py', license: 'CC BY-SA 4.0 (Z-Anatomy); BodyParts3D CC BY-SA 2.1 Japan', regions: report }, null, 1) + '\n');
console.table(report.map(r => ({ ...r, missing: r.missing.join(', ') })));
