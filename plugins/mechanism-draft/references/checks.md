# What Draft checks (load when reporting results)

## The gate: `node scripts/check-spec.mjs <spec.js>`

Fails (exit 1) when a number has no source, a DERIVED claim has no cross-check, a MEASURED one no error, an ESTIMATED one no reason, or a published figure the model computes does not match. Verdicts: VERIFIED (a published figure was compared and at least one comes from a source independent of the model's inputs), CONSISTENT (everything matched but every compared figure shares its source with the inputs), ONLY CONVERSIONS, NOTHING CHECKED, INCOMPLETE, DOES NOT PASS. The gate reads the spec, not the drawing: it is the same with a vector scene or a mesh sheet. Do not render a spec that does not pass.

## The preflight: `node scripts/preflight.mjs <page> --method paper --length short --aspect 9:16`

Steps through the film without rendering it and reports text that overlaps (`LABEL_OVERLAP`) or runs past the edge (`LABEL_CLIPPED`), and, where meshes are compiled, flat parts whose mesh does not cover their outline (`GEOMETRY_AREA_MISMATCH`, FAIL above 5 %). Camera checks do not apply to Paper.

- With a vector scene no mesh is compiled: the report says `NOT RUN  GEOMETRY_AREA  vector_scene_without_mesh_projection` (JSON: `notRun`) and the summary says `not checked, not passed`. That is not a pass. The full Mechanism repository's Studio preflight checks a model's flat parts.
- A check that throws, or an omission the engine does not explain, is `GEOMETRY_AREA_NOT_RUN` (FAIL).
- `--skip shape` is reported as NOT RUN (`skipped_by_option`).

## What nothing here checks

That a source is right; that the drawing is to scale (Paper views are explanatory, not measured drawings); that an explanation is understandable; how the film sounds; anything you did not look at. Zero errors does not mean the content is right or that the user approved it.
