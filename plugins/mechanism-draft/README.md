# Mechanism Draft 0.1

Technical-drawing films of a mechanism, from a spec whose every number names its source. Draft is the Paper engine of [Mechanism](https://github.com/DiegoLopez0208/mechanism) packaged on its own: the evidence gate, the vector Paper sheet and the film pipeline, without the 3D Studio film or the Workflow engine. This folder is self-contained: it runs with nothing else from the repository.

## Install

Pick one. Each gives you this folder and nothing else.

- **Claude Code plugin.** Draft is on the `ecosystem-foundation` branch until it is merged into `main`, so for now name the branch: `/plugin marketplace add DiegoLopez0208/mechanism#ecosystem-foundation`, then `/plugin install mechanism-draft@mechanism` (after the merge, `/plugin marketplace add DiegoLopez0208/mechanism`). Checked from GitHub on 2026-10-18 at commit `fdc416a`, in a scratch `CLAUDE_CONFIG_DIR` and outside any local copy: `claude plugin marketplace add 'DiegoLopez0208/mechanism#ecosystem-foundation' --sparse .claude-plugin plugins` then `claude plugin install mechanism-draft@mechanism`. Claude Code lists one skill and installs only this folder (36 files, 1.6 MB); the install passes `skill-doctor`, the gate gives the same verdict, and the lock film decodes to the same video and audio MD5 as the full repository renders. `--sparse .claude-plugin plugins` is fine for Draft alone; the full `mechanism` plugin needs the whole repository, so leave `--sparse` out if you want both.
- **Plain skill folder.** Copy this folder to `~/.claude/skills/mechanism-draft` (or a project's `.claude/skills/`). This is what `tests/draft-skill.test.mjs` does on every run: a fresh copy outside the repository that renders the example with no path back into it.
- **From a clone of the repository:** `node scripts/build-skill.mjs draft --out <dir>` writes the same folder anywhere (`--with mesh` adds the optional mesh pack).

Other agents: the folder follows the Agent Skills layout (a `SKILL.md` with `name` and `description`, plus scripts and references), and nothing in it needs Claude or any paid API. It has been run only with Claude Code; no other agent has been tried.

Then run `node scripts/skill-doctor.mjs` from the folder: it checks every file against `files.json` (sha256), says whether the optional mesh pack is there, and looks for Node, a browser and ffmpeg.

## Requirements

Node 22 or later, Edge or Chrome, and ffmpeg for films. No npm install, no network at run time.

## Use

From this folder (paths are examples):

```sh
node scripts/check-spec.mjs examples/lock/spec.js
node scripts/preflight.mjs examples/lock/index.html --method paper --length short --aspect 9:16
node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --still 9 --out ../work/lock.mp4
node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --out ../work/lock.mp4
node scripts/new.mjs gizmo --dir ../work --title "Gizmo"
```

## What it makes

MP4 films (H.264, 1080 wide, 30 fps by default, BT.709, stereo AAC) and PNG stills, in 9:16, 4:5 or 1:1, at 30, 60 or 90 s. The example film is the same, frame for frame and in its sound, as the full repository renders: the test compares the decoded MD5.

Drawn natively, with no 3D model: specs with a vector scene (`paperScene.kind: 'pin-section'`, see `references/scenes.md`). Anything else needs the optional mesh pack.

## What it checks, and what it does not

- The **gate** (`check-spec.mjs`) compares every published figure the spec computes with its source and classifies each check as independent or same-source (VERIFIED, CONSISTENT, ...). It reads the spec, not the drawing.
- The **preflight** (`preflight.mjs`) checks text overlap and clipping frame by frame. The mesh area check (`GEOMETRY_AREA_MISMATCH`) needs compiled meshes: with a vector scene it is reported as `NOT RUN  GEOMETRY_AREA  vector_scene_without_mesh_projection`, never as a pass.
- Not checked: whether a source is right, scale (Paper sheets are not to scale), whether the explanation is clear, the sound. Details in `references/checks.md`.

## Optional: the mesh pack

Front/top/side sheets projected from a spec's parts, for specs without a vector scene. It adds three.js and four kit modules (5 files, 1.2 MB). Without it such a spec stops with a load error that names the missing file (`kit/vendor/three.bundle.js`); with it (`build-skill.mjs draft --with mesh`) the sheet renders and the area check runs.

## Update

Re-install the same way (plugin: `/plugin marketplace update mechanism`, then reinstall; folder: copy the new folder over the old one). `skill-doctor` reports a file that changed or went missing.

## With the full repository

The full Mechanism skill contains everything Draft does plus the Studio 3D film, the Workflow engine, STL/GLB export and the other examples. Draft's `kit/`, `scripts/` and `examples/lock/` are generated copies of the repository's files (`scripts/build-skill.mjs`, file lists from `kit/manifest.js`), and the repository's test suite fails when the committed copy differs from a fresh build. Installing both is harmless: they are separate folders.
