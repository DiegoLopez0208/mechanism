---
name: mechanism-draft
description: Dimensioned technical drawings (engineering SVG) of flat mechanical parts - plates, brackets, flanges, PCB outlines, gaskets, panels with holes, slots, windows and bolt patterns - from declared 2D parametric geometry, exported at true scale 1:1 (1 unit = 1 mm) or on an A4 sheet, with every dimension tagged by where it comes from (printed by a source, given by the user, measured, derived, estimated) and an evidence gate that says what was checked and what was not. Also section-view drafting sheets and technical-drawing films (MP4/PNG) of how a mechanism works. Use when someone asks for a technical drawing, an engineering drawing, a dimensioned plan, a mechanical drawing, a "plano técnico" or "plano acotado", an SVG drawing with dimensions in mm, a 1:1 template, a drawing of a part from a datasheet, or a section view; or types /mechanism-draft. Reference drawings only: no tolerances, fits or manufacturing approval.
---

# Mechanism Draft

Engineering drawings of flat parts and drafting-sheet films, where every number says where it comes from and a gate says what was checked. A standalone part of Mechanism: the evidence gate, the 2D geometry, the SVG exporter and the Paper engine, without the 3D Studio film or the Workflow engine.

Run every command **from this skill's own folder** (installed as a Claude Code plugin it lives in the plugin cache, e.g. `~/.claude/plugins/cache/mechanism/mechanism-draft/<version>/`; copied as a plain skill, `~/.claude/skills/mechanism-draft`). Work in the user's project, never inside this folder: specs, SVGs and renders go in a work folder such as `./mechanism-work`.

Needs Node 22+. The SVG export and the gate need nothing else; Paper stills and films need Edge or Chrome, films also `ffmpeg`. No install step, no network, no API key.

## A dimensioned SVG of a flat part (the usual request)

1. **Check the install:** `node scripts/skill-doctor.mjs`.
2. **Read** `references/scenes.md` (section "Declared 2D geometry") and look at `examples/demo-plate/spec.js` (synthetic) and `examples/rpi4-board/spec.js` (a real part from a datasheet).
3. **Write the spec** in `<work>/<name>/spec.js`: a part of `kind: 'drawing'` whose `p` declares the geometry in mm (outline `rect` / `circle` / `polygon`, holes with ids, patterns, centre lines, an optional section), `paperScene: { kind: 'geometry' }`, and in `params` each dimension you were given, tied to the claim that states it. Where each number comes from decides its class:
   - numbers the person asking gave you: a source `{ id: 'request', kind: 'user', title: 'The request of <who>', received: '<date>', note: '<their words>' }` (no url; never invent one) and claims of `conf: 'user'`;
   - numbers printed in a datasheet or drawing: a source with its real `url` and `fetched` date, claims of `conf: 'spec'` that quote the number;
   - numbers you computed from those: `conf: 'derived'` with a `cross` check;
   - numbers you read off a figure or photo: `conf: 'measured'` with `error`, `method` and `uncertainty` (an extraction uncertainty, never a tolerance);
   - anything assumed: `conf: 'estimated'` with `why`.
   A minimal spec, numbers given by the person who asked (this exact file passes the gate):

   ```js
   (function () {
     window.SPEC = {
       id: 'bracket', title: 'Mounting plate 120 x 80',
       research: {
         // the request is the source: kind 'user', no url (never invent one)
         sources: [{ id: 'request', kind: 'user', title: 'The request of the person who asked', received: '2026-10-20', note: 'plate 120 x 80 mm, R4 corners' }],
         // a claim cites its sources with src: an ARRAY of source ids (not "source"); conf 'user' for the user's numbers; the text states each number
         claims: [
           { id: 'size', conf: 'user', src: ['request'], text: 'The plate is 120 mm wide and 80 mm high.' },
           { id: 'corner', conf: 'user', src: ['request'], text: 'Corner radius 4 mm.' },
         ],
       },
       parts: [{
         id: 'plate', name: 'Mounting plate', kind: 'drawing', conf: 'user', claims: ['size', 'corner'],
         p: { unit: 'mm', outline: { type: 'rect', w: 120, h: 80, r: 4 } },
         // params ties each named dimension to the claim that states it: value, unit, conf (the claim's class), claim (its id)
         params: {
           'outline.w': { value: 120, unit: 'mm', conf: 'user', claim: 'size' },
           'outline.h': { value: 80, unit: 'mm', conf: 'user', claim: 'size' },
           'outline.r': { value: 4, unit: 'mm', conf: 'user', claim: 'corner' },
         },
       }],
       paperScene: { kind: 'geometry' },
     };
   })();
   ```

   The gate says: `dimensions: 0 checked against a document, 0 derived, 0 measured (with uncertainty), 3 declared by the user, 0 estimated; 0 independently verified` and `verdict: CONSISTENT`. For a datasheet number use a source with `url` and `fetched`, `conf: 'spec'` in the claim and in `params`; holes, patterns and their dimension names (`<hole>.d`, `<hole>.x`, ...) are in `references/scenes.md`.
4. **Gate it, before exporting:** `node scripts/check-spec.mjs <work>/<name>/spec.js`. Fix every error (the export refuses a spec that does not pass). Read the `dimensions:`, `provenance:` and `verdict:` lines.
5. **Export:** `node scripts/export-svg.mjs <work>/<name>/spec.js --mode geometry-1to1 --out <work>/svg` (true size; also `--mode sheet-fit` for an A4 sheet). One SVG per drawing part.
6. Optionally a Paper still: `node scripts/render.mjs <work>/<name>/index.html --length short --still 12 --out <work>/<name>.mp4` (copy `index.html` and `run.js` from an example).

## What the verdict means

- `VERIFIED` only when at least one check compares the model with a figure from a source independent of its inputs (a value the model computes, compared with a figure from another source). A drawing whose numbers all come from one datasheet, or from the user, is at most `CONSISTENT`: the file reproduces those numbers exactly, nothing more. A drawn dimension in `params` is only ever compared with the figure it was drawn from, so it never makes a drawing VERIFIED.
- Numbers the user gave are drawn in ink and counted as "given by the person who asked": never as compared with a source, never as verified.
- `NOTHING CHECKED`: nothing was compared (every number estimated or only declared). The full contract: `references/checks.md`.

Say this plainly in the report. Never call a user's numbers "verified".

## Films and section sheets

- **Vector scenes:** a spec with `paperScene: { kind: 'pin-section', ... }` is drawn as an animated section from the spec's own numbers (see `examples/lock`).
- **Mesh sheets** (optional pack): any other spec as front/top/side sheets projected from its parts; without the pack the page stops with a load error naming the missing file. `skill-doctor` says whether it is installed.
- The example: `node scripts/check-spec.mjs examples/lock/spec.js`, `node scripts/preflight.mjs examples/lock/index.html --method paper --length short --aspect 9:16`, then `node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --still 9 --out <work>/lock.mp4` (a PNG still) and the same without `--still` (the film).
- `node scripts/new.mjs <name> --dir <work> --title "..." --fig "Fig N"` starts a mechanism spec that fails the gate until every TODO is replaced by researched, tagged numbers.

Options: `--background ivory|porcelain|graphite|blueprint`, `--aspect 9:16|4:5|1:1`, `--length short|normal|extended` (30, 60, 90 s), `--fps`, `--still <t>` (PNG), `--encoder jpeg|browser`.

## What is checked, and what is not

The gate checks that the numbers agree with what their claims state and that the geometry is valid (closed contours, holes inside the material, no overlap, net area). It does not know whether a source is right, and it never makes a drawing fit for manufacture: there are no tolerances, fits, surface finish or material specification, and every SVG says "NOT A MANUFACTURING DRAWING". The 1:1 SVG is at true size in a viewer; a printer may scale it (check with a rule). A flat part is never given an invented side view or 3D model. The preflight checks text and layout frame by frame; with a vector scene the mesh area check is reported `NOT RUN  GEOMETRY_AREA` with its reason, which is not a pass. Details: `references/checks.md`.

## Report

End with: what was drawn and from which sources (say which numbers the user gave); the gate's verdict and why (independent, same source, user-declared, transcriptions); what is ESTIMATED or MEASURED and how; what was left out (and why); the files made with their paths; what was not checked. Never present a CONSISTENT drawing, or the user's own numbers, as verified.
