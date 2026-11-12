# Anatomy Lab build tools

The deployed app only uses `app/data/anatomy.json` and `app/assets/anatomy/regions/*.glb`. These tools rebuild them.

1. Edit the cards in `build_anatomy_data.py`, then run `python3 tools/anatomy/build_anatomy_data.py` from the repo root.
2. Rebuild the region models: `cd tools/anatomy && npm install`, then from the repo root
   `node tools/anatomy/extract-regions.mjs <folder with skeletal.glb, muscular.glb, joints.glb> [region]`.
   Add a region id (for example `ankle`) to rebuild only that region; the manifest keeps the other rows.

Schematic structures: when the atlas has no mesh for a structure (the ATFL, CFL and PTFL, and the
talocrural and subtalar joint axes), the card gives `schematic: [[[x,y,z], [x,y,z], radius], ...]` in model
meters and the extractor draws a plain tube between those two points. The card text says it is a
simple band. Coordinates were picked from bone landmarks (malleoli, talus, calcaneus), so treat them
as approximate.

Model source (since 2026-11-12): the official Z-Anatomy Blender file, CC BY-SA 4.0, built on BodyParts3D
(CC BY-SA 2.1 Japan). To rebuild from scratch:

1. `git clone https://github.com/Z-Anatomy/Models-of-human-anatomy` and unzip `Z-Anatomy.zip` (gives `Startup.blend`, about 300 MB).
2. Make a Python 3.11 venv with Blender's module: `uv venv -p 3.11 bpyenv && uv pip install -p bpyenv/bin/python "bpy>=4.2,<5"`
   (or use Blender itself: `blender -b Startup.blend --python tools/anatomy/export_from_blend.py -- Startup.blend <out>`).
3. `bpyenv/bin/python tools/anatomy/export_from_blend.py <path>/Startup.blend <out>`. It should print
   `selected 232 of 232 meshes; missing: []` and write `<out>/z-anatomy.glb`.
4. `node tools/anatomy/extract-regions.mjs <out>` (step 2 above).

Known quirk: in the official file the trapezius "Ascending" and "Descending" part names are swapped
(the "Ascending" mesh is the upper fibres). The cards map them by position; see the comment in
`build_anatomy_data.py`.

The 2026-11-09 models came from a third-party export (github.com/nqwrc/3d-anatomy) whose bundle is
labelled CC BY-NC-SA. They were replaced on 2026-11-12; all 164 structures sit within 5 mm of the old positions.

`scripts/download_anatomy.py` is the older BodyParts3D OBJ downloader. It is no longer used by the app.
