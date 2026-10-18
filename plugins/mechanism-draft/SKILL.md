---
name: mechanism-draft
description: Technical-drawing films of a mechanism from published evidence, drawn as a vector Paper sheet (section views, hatching, flat material colours, no lighting). Every number in the spec is tagged SPEC, MEASURED, DERIVED or ESTIMATED and the gate refuses a spec whose numbers do not close. Use for a section or drafting-sheet explainer of how a mechanism works, rendered to MP4 or PNG. Triggers on "technical drawing of X", "section view of X", "draft X", "/mechanism-draft".
---

# Mechanism Draft

A standalone part of Mechanism: the Paper engine, the evidence gate and the film pipeline, without the 3D Studio film or the Workflow engine. Run every command **from this folder** (cloned as a skill: `~/.claude/skills/mechanism-draft`). Work in the user's project, never inside this folder: renders and new objects go in a work folder such as `./mechanism-work`.

Needs Node 22+, Edge or Chrome, and `ffmpeg` (films only). No install step, no network, no API key.

## Quick start

1. **Check the install:** `node scripts/skill-doctor.mjs` (every file present and unchanged, the optional mesh pack, the tools).
2. **The example:** `node scripts/check-spec.mjs examples/lock/spec.js` (the gate), then `node scripts/preflight.mjs examples/lock/index.html --method paper --length short --aspect 9:16`, then a still and a film:
   `node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --still 9 --out <work>/lock.mp4` and the same without `--still`.
3. **Your object:** `node scripts/new.mjs <name> --dir <work> --title "..." --fig "Fig N"` creates `<work>/<name>/` with a draft `spec.js` that fails the gate until every TODO is replaced by researched, tagged numbers. Gate it, preflight it, render it as above.

## What it draws

- **Vector scenes** (no 3D model, no three.js): a spec with `paperScene: { kind: 'pin-section', ... }` is drawn as an animated section from the spec's own numbers (see `examples/lock`). `pin-section` is the only kind in this version; read `references/scenes.md` before writing one.
- **Mesh sheets** (optional): any other spec is drawn as front/top/side orthographic sheets projected from its parts. That needs the optional mesh pack (three.js); without it the page stops with a load error naming the missing file. `skill-doctor` says whether it is installed.

Options: `--background ivory|porcelain|graphite|blueprint`, `--aspect 9:16|4:5|1:1`, `--length short|normal|extended` (30, 60, 90 s), `--fps`, `--still <t>` (PNG), `--encoder jpeg|browser`. Outputs: MP4 (H.264, BT.709, stereo AAC) and PNG stills.

## What is checked, and what is not

The gate checks the numbers against their published sources; the preflight checks text and layout frame by frame. With a vector scene the mesh area check cannot run and is reported as `NOT RUN  GEOMETRY_AREA` with its reason: that is not a pass. A passing gate means the numbers agree with their sources, not that the sources are right, that the drawing is to scale (it is not) or that the user approved it. Details: `references/checks.md`.

Paper's look is fixed: strokes, hatching and flat fills; no gradients, shadows, filters or lighting.

## Report

End with: what was modelled and from which sources; what the gate compared; what is ESTIMATED (drawn dashed); what the preflight reported, NOT RUN lines included; the files made; anything not checked.
