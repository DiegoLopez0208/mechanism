# Mechanism Draft

Dimensioned engineering drawings (SVG) of flat parts, at true scale 1:1 or on an A4 sheet, and technical-drawing films, from a spec whose every number says where it comes from. Draft is a part of [Mechanism](https://github.com/DiegoLopez0208/mechanism) packaged on its own: the evidence gate, the declared 2D geometry, the SVG exporter, the vector Paper sheet and the film pipeline, without the 3D Studio film or the Workflow engine. This folder is self-contained: it runs with nothing else from the repository.

Stages: 0.1 Paper sheets and films; 0.2 declared parametric 2D geometry; 0.3 the SVG export; 0.4 the first real part (`examples/rpi4-board`); BH-1 evidence classes (a number the user gave is never verified; DERIVED and MEASURED told apart from printed figures), the 1:1 legend fix and these docs.

## Install

Pick one. Each gives you this folder and nothing else.

- **Claude Code plugin.** Draft is not merged into `main` yet; each stage is on a development branch, and the marketplace must name it: `/plugin marketplace add DiegoLopez0208/mechanism#<branch>`, then `/plugin install mechanism-draft@mechanism`. Branches: `ecosystem-foundation` (0.1), `feature/draft-svg-03` (0.3), `feature/draft-real-rpi4-04` (0.4), `feature/draft-beta-hardening-05` (BH-1). The 0.4 install was checked from GitHub on 2026-10-19 in a scratch `CLAUDE_CONFIG_DIR`: one skill, 50 files, `skill-doctor --strict` OK. With `--sparse .claude-plugin plugins` only Draft is fetched; leave `--sparse` out for the full `mechanism` plugin too. A plugin skill is offered to Claude by its description; that does not guarantee Claude picks it for every drawing request (in the first stranger test it did not until the request named it). Naming it ("use Mechanism Draft") or typing `/mechanism-draft` does.
- **Plain skill folder.** Copy this folder to `~/.claude/skills/mechanism-draft` (or a project's `.claude/skills/`). This is what `tests/draft-skill.test.mjs` does on every run: a fresh copy outside the repository that runs the examples with no path back into it.
- **From a clone of the repository:** `node scripts/build-skill.mjs draft --out <dir>` writes the same folder anywhere (`--with mesh` adds the optional mesh pack).

Other agents: the folder follows the Agent Skills layout (a `SKILL.md` with `name` and `description`, plus scripts and references), and nothing in it needs Claude or any paid API. It has been run only with Claude Code; no other agent has been tried.

Then run `node scripts/skill-doctor.mjs` from the folder: it checks every file against `files.json` (sha256), says whether the optional mesh pack is there, and looks for Node, a browser and ffmpeg.

## Requirements

Node 22 or later for everything. The gate (`check-spec.mjs`) and the SVG export (`export-svg.mjs`) need nothing else. Paper stills, the preflight and films need Edge or Chrome; films also need ffmpeg. No npm install, no network at run time.

## Use

From this folder (paths are examples):

```sh
node scripts/check-spec.mjs examples/lock/spec.js
node scripts/preflight.mjs examples/lock/index.html --method paper --length short --aspect 9:16
node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --still 9 --out ../work/lock.mp4
node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --out ../work/lock.mp4
# piece drawings from declared 2D geometry (synthetic demonstrations: a plate, a flange, a stepped bracket in section)
node scripts/check-spec.mjs examples/demo-flange/spec.js
node scripts/render.mjs examples/demo-flange/index.html --length short --still 12 --out ../work/flange.mp4
# the same parts as SVG drawings: at 1:1 (1 unit = 1 mm) or fitted to an A4 sheet (scale written on it)
node scripts/export-svg.mjs examples/demo-plate/spec.js --mode geometry-1to1 --out ../work/svg
node scripts/export-svg.mjs examples/rpi4-board/spec.js --mode sheet-fit --out ../work/svg      # a real part, from Raspberry Pi's drawing
node scripts/new.mjs gizmo --dir ../work --title "Gizmo"
```

## What it makes

SVG drawings of each flat part (`kind: 'drawing'`): `geometry-1to1` (1 user unit = 1 mm, the document's size in mm) or `sheet-fit` (A4 landscape with a title block and its scale written as not 1:1). Exact circles and arcs, dimensions taken from the geometry and coloured by their evidence (teal printed by the source, blue derived, violet measured, ink given by the user or not verified, amber estimated), a legend that always fits the document, and the words "NOT A MANUFACTURING DRAWING".

MP4 films (H.264, 1080 wide, 30 fps by default, BT.709, stereo AAC) and PNG stills, in 9:16, 4:5 or 1:1, at 30, 60 or 90 s. The example film is the same, frame for frame and in its sound, as the full repository renders: the test compares the decoded MD5.

Drawn natively, with no 3D model: flat parts (`paperScene.kind: 'geometry'`) and vector scenes (`paperScene.kind: 'pin-section'`), see `references/scenes.md`. Anything else needs the optional mesh pack.

## What it checks, and what it does not

- The **gate** (`check-spec.mjs`) compares every published figure with the model and classifies each check: VERIFIED needs at least one check against a source independent of the inputs; a drawing whose numbers all come from one document, or from the person who asked, is at most CONSISTENT. Numbers the user gave are a source of `kind: 'user'` (no url) and claims of `conf: 'user'`; they are drawn and counted as "given by the person who asked", never as verified. Contract: `references/checks.md`. It reads the spec, not the drawing.
- **Not a manufacturing drawing:** no tolerances, fits, surface finish or material specification; a measured value's uncertainty is not a tolerance. The 1:1 file is true size in a viewer; a printer may rescale it.
- The **preflight** (`preflight.mjs`) checks text overlap and clipping frame by frame. The mesh area check (`GEOMETRY_AREA_MISMATCH`) needs compiled meshes: with a vector scene it is reported as `NOT RUN  GEOMETRY_AREA  vector_scene_without_mesh_projection`, never as a pass.
- Not checked: whether a source is right, scale (Paper sheets are not to scale), whether the explanation is clear, the sound. Details in `references/checks.md`.

## Optional: the mesh pack

Front/top/side sheets projected from a spec's parts, for specs without a vector scene. It adds three.js and four kit modules (5 files, 1.2 MB). Without it such a spec stops with a load error that names the missing file (`kit/vendor/three.bundle.js`); with it (`build-skill.mjs draft --with mesh`) the sheet renders and the area check runs.

## Update

Re-install the same way (plugin: `/plugin marketplace update mechanism`, then reinstall; folder: copy the new folder over the old one). `skill-doctor` reports a file that changed or went missing.

## With the full repository

The full Mechanism skill contains everything Draft does plus the Studio 3D film, the Workflow engine, STL/GLB export and the other examples. Draft's `kit/`, `scripts/` and `examples/lock/` are generated copies of the repository's files (`scripts/build-skill.mjs`, file lists from `kit/manifest.js`), and the repository's test suite fails when the committed copy differs from a fresh build. Installing both is harmless: they are separate folders.
