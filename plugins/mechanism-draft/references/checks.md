# What Draft checks (load when reporting results)

## The gate: `node scripts/check-spec.mjs <spec.js>`

Fails (exit 1) when a number has no source, a DERIVED claim has no cross-check, a MEASURED one no error, an ESTIMATED one no reason, or a published figure the model computes does not match. The gate reads the spec, not the drawing: it is the same with a vector scene or a mesh sheet. Do not render or export a spec that does not pass.

A claim names its sources in `src`, an array of source ids (`src: ['request']`); a dimension in `params` names its claim in `claim` (one id) and repeats the claim's class in `conf`. A complete minimal spec that passes is in `SKILL.md` (step 3).

### Where a number comes from (`conf`)

| Class | Meaning | Needs |
|---|---|---|
| `spec` | printed by a document someone else can open | a source with its real `url` and `fetched` date; on a 2D drawing the claim must state the number |
| `user` | given by the person who asked (DECLARED BY USER) | a source `{ id, kind: 'user', title, received, note }` with **no url**; the claim must state the number |
| `measured` | measured, or read off a figure or photo | `error`; on a 2D drawing also `method` and `uncertainty` (an extraction uncertainty, never a tolerance) |
| `derived` | computed from other numbers (61.5 = 3.5 + 58) | `cross`: a second figure it agrees with |
| `estimated` | assumed | `why` nobody publishes it |

Refused: a `spec` or `measured` claim citing the user's request; a `user` claim citing a document; a document with no url (declare `kind: 'user'` instead of inventing one); placeholder addresses (`example.com/.org/.net` and their subdomains, any `.invalid`, `.test` or `.example` host, `localhost`); on a 2D drawing, a `spec` or `user` dimension its claim does not state (it is `derived`), a dimension whose class differs from its claim's, a `measured` dimension without `method` and `uncertainty`.

### Verdicts

- **VERIFIED**: everything matched and at least one check compares the model with a figure from a source independent of the inputs it was computed from.
- **CONSISTENT**: everything matched, none independent. The gate says why: the checks share their source with the inputs, or compare a drawn dimension with the figure it was drawn from (a transcription, including every number the user gave), or have inputs it cannot trace.
- ONLY CONVERSIONS, NOTHING CHECKED, INCOMPLETE, DOES NOT PASS.

A drawing made only from the user's numbers is CONSISTENT: the file reproduces them, it does not verify them. Say so; never call them verified. The `dimensions:` line counts the dimensions by class (`checked against a document`, `derived`, `measured`, `declared by the user`, `estimated`) and always ends `0 independently verified`: a drawn dimension is compared only with the figure it was drawn from. The `provenance:` line counts each kind of check.

## The preflight: `node scripts/preflight.mjs <page> --method paper --length short --aspect 9:16`

Steps through the film without rendering it and reports text that overlaps (`LABEL_OVERLAP`) or runs past the edge (`LABEL_CLIPPED`), and, where meshes are compiled, flat parts whose mesh does not cover their outline (`GEOMETRY_AREA_MISMATCH`, FAIL above 5 %). Camera checks do not apply to Paper.

- With a vector scene no mesh is compiled: the report says `NOT RUN  GEOMETRY_AREA  vector_scene_without_mesh_projection` (JSON: `notRun`) and the summary says `not checked, not passed`. That is not a pass. The full Mechanism repository's Studio preflight checks a model's flat parts.
- A check that throws, or an omission the engine does not explain, is `GEOMETRY_AREA_NOT_RUN` (FAIL).
- `--skip shape` is reported as NOT RUN (`skipped_by_option`).

## What nothing here checks

That a source is right; that two sources are really independent (it trusts `derives`); that a Paper sheet is to scale (Paper views are explanatory; the SVG `geometry-1to1` export is the true-size file); fitness for manufacture (no tolerances, fits, finish or material); that an explanation is understandable; how the film sounds; anything you did not look at. Zero errors does not mean the content is right or that the user approved it.
