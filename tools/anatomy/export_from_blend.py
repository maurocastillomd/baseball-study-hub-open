"""Export the meshes the Anatomy Lab uses from the official Z-Anatomy Blender file.

Needs Blender's Python module (pip install "bpy>=4.2,<5" in a Python 3.11 venv) or Blender itself:
    python tools/anatomy/export_from_blend.py <Startup.blend> <out folder>
    blender -b <Startup.blend> --python tools/anatomy/export_from_blend.py -- <Startup.blend> <out folder>
Source: github.com/Z-Anatomy/Models-of-human-anatomy (Z-Anatomy.zip -> Startup.blend), CC BY-SA 4.0.
Writes <out folder>/z-anatomy.glb with only the meshes named in app/data/anatomy.json.
"""
import json
import sys
from pathlib import Path

import bpy

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
blend, out = Path(args[0]), Path(args[1])
root = Path(__file__).resolve().parents[2]
data = json.loads((root / "app/data/anatomy.json").read_text())
wanted = {m for s in data["structures"] for m in s.get("meshes", [])}

bpy.ops.wm.open_mainfile(filepath=str(blend))
bpy.ops.object.select_all(action="DESELECT") if bpy.context.view_layer.objects.active else None
found = set()
for ob in bpy.data.objects:
    ob.hide_set(False) if ob.name in bpy.context.view_layer.objects else None
    ob.hide_viewport = False
    try:
        ob.select_set(False)
    except RuntimeError:
        pass
for ob in bpy.data.objects:
    if ob.type == "MESH" and ob.name in wanted:
        try:
            ob.hide_set(False)
            ob.select_set(True)
            found.add(ob.name)
        except RuntimeError:
            pass  # object not in the active view layer
missing = sorted(wanted - found)
print(f"selected {len(found)} of {len(wanted)} meshes; missing: {missing}")
out.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(out / "z-anatomy.glb"), export_format="GLB", use_selection=True,
    export_apply=True, export_yup=True, export_materials="NONE", export_normals=False,
    export_texcoords=False, export_extras=False, export_animations=False,
)
