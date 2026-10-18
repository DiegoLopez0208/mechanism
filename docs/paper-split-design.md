# Design: Paper Vector Engine and Paper Mesh Adapter (2026-10-18)

Status: PV-1 committed (`e84b886`), PV-2 committed (`c52144d`), PV-3 implemented and uncommitted (section 8).

PV-1 as built differs from the sketch below in three details, all forced by what `draw()` reads: the view set is `{ entries, parts }`, where each entry also carries `anchor` (the first front-view edge point, where the callout leader starts) and `parts` holds the detail-panel data per part (`sizeLabel`, the first source-backed `param`) instead of a `params` field per entry; `MX.paperEngine.stage` stays as an alias of `MX.paperMesh.stage`, and `MX.paperEngine.run` still accepts `F` (it then asks the adapter), so no caller breaks. Validation: 54 sampled frames (lock, hub, rtx4090, switch; 9:16, 4:5, 1:1) byte-identical before and after; full 30 s Paper films of hub and lock decode to the same MD5; `__shapeCheck` and shot times unchanged; `tests/paper.test.mjs` (4 tests) and a `--method paper` area-check case in `tests/preflight.test.mjs` added.

## 1. Audit of `kit/paper-engine.js` (278 lines)

The file mixes three layers.

| Layer | What | three.js |
|---|---|---|
| Vector drawing | `E.project`, `E.fit`, `hatch`, `label`, `pill`, `sceneSteps`, `section()` (the pin-tumbler section), the sheet frame, zone letters, caption, title block, closing card, camera push and `P.motion` captions | none |
| Mesh adapter | `E.stage` (a fake stage so `MX.figure` can compile parts without WebGL), `silhouettes`, `meshEdges` (`THREE.EdgesGeometry`, threshold 35°), `worldLines` (matrixWorld, normal matrix), `prepare` (projects to front/top/side), `shapeCheck` (reads `geometry.userData.areaRatio` from `kit/parts.js`) | all of it |
| Orchestration | `E.run`: builds the mesh cache, poses the figure twice (assembled and exploded), prepares views, mounts the timeline; `draw()` picks the scene path or the generic sheet | mixed |

Couplings found:

1. **`E.run` always compiles meshes**, even for `paperScene`: line 170 runs `meshEdges(F.parts)`, then `F.apply` twice and `worldLines`/`prepare`, whose results the section scene never draws.
2. **`kit/spec.js` builds the whole figure before dispatching Paper** (line 71: `MX.figure(...)` with `vectorOnly`; line 153: `MX.paperEngine.run(..., F)`). Workflow dispatches before the figure (line 64); Paper cannot, because `E.run` needs `F`.
3. **`kit/figure.js:22` reaches into Paper** (`cfg.stage.vectorOnly ? MX.paperEngine.stage : G.stage`): the 3D figure depends on the 2D engine's module.
4. **`kit/manifest.js`** gives Paper the full 3D stack unconditionally (`engines.paper.stack3d: true`).
5. **Coverage gap (introduced on 2026-10-17):** `tests/presentation.test.mjs` exercises Paper only with `examples/lock`, and lock now has `paperScene`, so the generic mesh-projection path is no longer exercised by the browser test of the twelve combinations. The goldens do not cover Paper either (they are the legacy Studio films).
6. **`shapeCheck` is a model check, not a drawing check**: `GEOMETRY_AREA_MISMATCH` in `scripts/preflight.mjs` reads the area ratio that `kit/parts.js` computes on `THREE.Shape` outlines. A Paper render that compiles no meshes would return `[]` and the preflight would print nothing for that check, which reads like a pass.

## 2. Target split

```
kit/paper-engine.js   Paper Vector Engine   (no three.js)   sheet, timeline, captions, title block, vector scenes, drawing of 2D view sets
kit/paper-mesh.js     Paper Mesh Adapter    (three.js)      fake stage, edges/silhouettes, world transform, projection to a view set, shapeCheck
```

The boundary is a plain-data **view set**, the one thing both sides agree on:

```js
// one entry per part; numbers only, no three.js objects
{ id, conf,                                   // part id and its confidence (estimated parts draw dashed amber)
  views: { front|top|side: { points: Float32Array /* x0,y0,x1,y1,... segments in model mm */, bounds: [l, t, r, b], offset: [dx, dy] /* explode */ } },
  params }                                    // source-backed parameters already shown on the detail panel
```

This is what `prepare()` already produces internally, made explicit. The vector engine draws a view set and never asks where it came from. Today one producer exists (the mesh adapter); later a parametric drawing module can produce the same structure from declared geometry, and dimensions and sections can be added as further fields (`dims: [{ a, b, offset, text, conf }]`, `sections: [{ outline, hatch, material }]`) without touching the adapter. No geometry is duplicated: the adapter derives the set from the meshes the spec already compiles, and a vector scene (`paperScene`) takes its numbers from the spec, where the gate checks them.

Paper's look stays as now: strokes, hatching and flat material colour coding; no lighting, gradients or shadows. A test asserts it (below).

## 3. Increments

Each one is a separate reviewable change. The first changes no pixel.

**PV-1 Extract the adapter, no behaviour change.**
- Move `E.stage`, `silhouettes`, `meshEdges`, `worldLines`, `prepare` and the `shapeCheck` body to `kit/paper-mesh.js` as `MX.paperMesh = { stage, viewSet(F), shapeCheck(F) }`.
- `E.run` receives `views` (the view set) and `shapeCheck` instead of reading `F` itself; `kit/spec.js` builds them with `MX.paperMesh` before calling it.
- `kit/figure.js:22` uses `MX.paperMesh.stage`.
- Manifest: `engines.paper.modules = ['paper-mesh.js', 'paper-engine.js']`, still `stack3d: true`.
- Add a browser test of the generic path (Paper on `examples/hub`, which has no `paperScene`).
- Accept: Paper frames byte-identical before and after for lock (scene) and hub (generic) at t = 0, 9, 20, 28 (2D frames are byte-identical between runs already, so this is a strict comparison); `presentation.test.mjs`, `manifest.test.mjs`, preflight with `--method paper` on lock and hub unchanged; `grep THREE kit/paper-engine.js` returns nothing.

**PV-2 Vector-only path for specs with a vector scene.**
- `kit/spec.js`: when the resolved method is Paper and the spec has a vector scene, dispatch before `MX.figure` (as Workflow does), with `views = null`.
- Manifest: Paper needs the 3D stack only when the spec has no vector scene. `boot.js` already knows the spec when it decides, so the rule becomes "stack only without a vector scene", kept as data (`stack3d: 'unless-vector-scene'`) with one resolver in the manifest.
- Accept: `lock?method=paper` loads no three.js, `gl.js`, `figure.js`, `parts.js` or `paper-mesh.js` (manifest browser test); its frames byte-identical to PV-1; hub with Paper still loads the stack and draws the same frames.

**PV-3 Honest checks on the vector path.**
- `__shapeCheck` on a vector-only render reports `{ applicable: false, reason: 'no meshes compiled in this method' }`; `preflight.mjs` prints `GEOMETRY_AREA: not applicable (vector scene), run the Studio preflight for the model` instead of nothing.
- A style test: on Paper frames the drawing context never receives `shadowBlur > 0` or `createLinearGradient/createRadialGradient` (hooked in the browser test, like the existing `fillText` hook).
- Accept: both tests fail on the code of `b4a0366` (lit cylinders) and pass now.

**PV-4 (later, not in this stage)** Dimensions and sections as view-set fields drawn by the vector engine, then a parametric producer. Not designed in detail here.

## 4. Risks

| Risk | Mitigation |
|---|---|
| Hidden reads of `F` inside `draw()` (`F.byId[a.item.id]`, part params, `active.info.sizeEvidence`) | PV-1 passes those values inside the view set; the byte-identical frame comparison catches any miss |
| The view cache (`viewCache`) and supersampling depend on the drawn views | unchanged code, moved not rewritten; frames compared at `--ss 1` and spot-checked at `--ss 2` |
| A spec with a vector scene but no Studio preflight loses the mesh area check | PV-3 makes the gap visible instead of silent |
| Script order: `paper-mesh.js` must load after `parts.js` and before the compiler | the manifest already orders modules; the manifest test checks order |
| Another example adds `paperScene` and the generic path loses coverage again | PV-1's test pins the generic path to an example chosen for having no scene |

## 5. Full tests on machines with little free RAM

Measured on this machine (12 logical cores, 14 GB): `npm test` runs the test files in parallel (Node's default concurrency is the number of cores minus one). With 5.8 GB free it passed 81/81 in 133 s and free RAM fell to 1.24 GB, with up to 110 browser processes of the tests at once. With about 2.5 GB free the same command was stopped by the session's low-memory guard. Serially (`--test-concurrency=1`) it passed 81/81 in 226 s and free RAM fell to 0.46 GB at one point, during the browser tests of the presentation engines.

Proposal, without changing any test:

1. **A runner, `scripts/test.mjs`, behind `npm test`.** It runs exactly `node --test --test-concurrency=<N> tests/*.test.mjs`. `N` comes from `MX_TEST_CONCURRENCY` or `--concurrency` when given; otherwise it is computed from free memory at start, `clamp(floor((os.freemem() - 1.5 GB) / 1 GB), 1, cores - 1)`, and printed in the first line so a log says how it ran. The constants come from the measurement above and are re-measured, not guessed, before the runner is merged.
2. **`npm run test:serial`** as the explicit low-RAM command (`N = 1`).
3. **Coverage stays identical.** Same files, same tests, same assertions; the five-concurrent-sessions test still opens five browsers (serial file order means nothing else runs beside it). The runner refuses `N = 0` and never skips a file.
4. **Optional, only if (1) is not enough:** a per-process cap on simultaneous browsers inside `scripts/lib/browser.mjs`, applied to tests that launch several sessions in a loop. It must not apply to the concurrency test, whose point is five at once.
5. CI keeps its current command; the runner's output is the same TAP/spec stream.

Accept: on this machine, `MX_TEST_CONCURRENCY=1 npm test` and `npm test` with ~2.5 GB free both finish 81/81 without the low-memory guard stopping them, and the printed concurrency matches the free memory at start.

## 6. PV-2 detailed design: Paper with a vector scene and no three.js (proposal, 2026-10-18, on top of `e84b886`)

### What the code shows

- **The gate does not need the 3D model.** `V = S.validate(spec)` (`kit/spec-core.js`) runs at `kit/spec.js:55`, before any figure exists, and computes every published comparison, provenance and drawn-size check from spec data (`d.p` parameters). After line 70, `kit/spec.js` adds no error or warning. Skipping the figure skips no gate check: Workflow already does exactly that (`kit/spec.js:64`).
- **What only exists with compiled meshes:** the preflight area check (`__shapeCheck`, from `geometry.userData.areaRatio`, computed by `kit/parts.js` on `THREE.Shape` outlines), the STL/GLB exports and the camera diagnostics (`__geom`), which Paper already reports as not applicable.
- **The vector scene does not read the view set**: `draw()` returns from the `if(scene)` branch before any use of `entries` or `details`, except `active=details[a.item.id]`, evaluated at the top of `draw()` and unused in that branch.
- **Today a missing area check is silent in two places:** `P.mount` defaults to `shapeCheck = () => []` (`kit/presentation.js:108`), so Workflow returns `[]`, and `scripts/preflight.mjs:50` turns a missing `__shapeCheck` into `[]` too. PV-2 would add a third case (Paper with a vector scene). Doing PV-2 without fixing this would disable a check silently, so the "not run" signal moves from PV-3 into PV-2.

### Contracts

1. **Which specs are vector-only.** One predicate, declared once in `kit/manifest.js` (boot needs it before any engine module loads): `paperScenes: ['pin-section']` and `M.vectorScene(spec) = !!spec?.paperScene && paperScenes.includes(spec.paperScene.kind)`. `kit/paper-engine.js` keeps its own list of the scene kinds it can draw; a test asserts both lists are equal, so a kind the engine cannot draw never skips the stack.
2. **Engine needs, per spec.** `engines.paper` becomes `{ stack3d: 'unless-vector-scene', modules: ['paper-engine.js', 'paper-mesh.js'], vectorModules: ['paper-engine.js'] }`, resolved by one function `M.needsFor(engine, spec) -> { stack3d, modules }` that `boot.js`, `modulesFor` and the tests all call. Workflow and Studio keep their current static entries.
3. **Compiler dispatch.** In `kit/spec.js`, next to the Workflow early return: when the resolved method is Paper and `M.vectorScene(spec)`, call `MX.paperEngine.run({ spec, validation, config, views: null, shapeCheck: null, W, H, length })` before `MX.figure`. Every other Paper spec goes through the figure and the adapter as now.
4. **`run({ views: null })`.** Allowed only with a drawable vector scene; otherwise `run` throws `Paper: no view set and no vector scene` (a loud failure instead of a blank sheet). `details` defaults to `{}`.
5. **A check that did not run says so.** `P.mount` takes `shapeCheck: null` to mean "not applicable" and publishes `window.__checks = { geometryArea: { run: false, reason: 'no meshes are compiled in this method' } }` (or `{ run: true }` when a real check is mounted). `__shapeCheck()` keeps returning an array for old callers. `scripts/preflight.mjs` reads `__checks` and prints `NOT RUN  GEOMETRY_AREA  <reason>  (run the Studio preflight to check the model's flat parts)`; in `--json` it adds `notRun: [{ check, reason }]`, never counted as PASS, WARN or FAIL. Workflow gets the same signal, which closes the silent skip it has today.

### Files

`kit/manifest.js` (predicate, per-spec needs), `kit/boot.js` (call `needsFor` with `window.SPEC`), `kit/spec.js` (early dispatch), `kit/paper-engine.js` (`views: null`, scene-kind list), `kit/presentation.js` (`shapeCheck: null`, `__checks`), `scripts/preflight.mjs` (NOT RUN line and `notRun`), tests below, `SKILL.md`, `docs/presentations.md`. Not touched: `kit/paper-mesh.js`, `kit/figure.js`, `kit/parts.js`, Studio and Workflow drawing code.

### Tests

- **Equivalence:** lock with Paper (vector path, no three.js) against the `e84b886` captures: the same 18 lock frames byte-identical, and the full 30 s film decodes to the same MD5 (`bf74967c...`). Hub, rtx4090 and switch (generic) also byte-identical: their path does not change.
- **Loading (manifest browser test):** `lock?method=paper` and lock with `presentation: { method: 'paper' }` only in the spec load no three.js, `gl.js`, `figure.js`, `parts.js` or `paper-mesh.js`; `hub?method=paper` loads the stack and both Paper modules; a spec with an unknown `paperScene.kind` loads the stack and draws the generic sheet.
- **Predicate:** the manifest's scene kinds equal the engine's; `run({ views: null })` without a scene throws.
- **Area check, by design changed:** the existing `--method paper` preflight case uses lock, which becomes vector-only. It is replaced, not loosened: lock with Paper must report `notRun` with the reason and no `GEOMETRY_AREA_MISMATCH`, and a new hub variant with the bad plate and `--method paper` must still report the FAIL. `tests/paper.test.mjs` keeps its generic-path checks on hub; the lock case asserts `__checks.geometryArea.run === false`.
- **Workflow:** preflight with `--method workflow` reports `notRun` for the area check (new), and nothing else changes.
- Regression: presentation (12 combinations), goldens (44, unchanged), render, gate, the whole suite serially in one run.

### Risks

| Risk | Mitigation |
|---|---|
| The predicate in boot and in the engine disagree, so a page loads no stack and then needs it | one declared list, an equality test, and `run` throws instead of drawing a blank sheet |
| A future vector scene starts reading part data from the figure | the scene receives no figure at all; any such read fails in the test with `views: null` |
| Someone reads "PASS: nothing found" from a vector-only Paper preflight as "the flat parts were checked" | the NOT RUN line in the human output and `notRun` in JSON; docs name Studio as the place that checks them |
| The preflight JSON gains a field | additive (`notRun`); existing consumers read `findings`, `fail`, `warn` unchanged |
| Lock's Studio film, STL and GLB | untouched: Studio never takes the vector path |

### Acceptance

1. `lock?method=paper` (URL or spec only) loads no three.js or mesh adapter, and its frames and film are byte-identical to `e84b886`.
2. Generic Paper (hub, rtx4090, switch) is unchanged, byte for byte.
3. Every gate check still runs (same `V.lines`, warnings and errors as before for every example).
4. The area check never disappears silently: it runs where meshes are compiled and says NOT RUN everywhere else, Workflow included.
5. Whole suite passes in one serial run; goldens unchanged.
6. Load time of `lock?method=paper` measured before and after (median of 9).

## 7. PV-2 as built (2026-10-18, uncommitted, on top of `e84b886`)

Differences from section 6, all small:

- The manifest keeps Paper's vector needs as data inside the engine entry (`engines.paper.vector = { stack3d: false, modules: ['paper-engine.js'] }`) rather than a string rule; `M.needsFor(engine, spec)` picks it when `M.vectorScene(spec)`. `boot.js`, `M.modulesFor(engine, listed, spec)` and the tests call the same function.
- `MX.paperEngine.scenes` is the implementation map (`{ 'pin-section': { steps, draw } }`), not a second list; `tests/manifest.test.mjs` asserts its keys equal `M.paperScenes`. Lookups use `Object.hasOwn`, so `constructor` or any inherited name is not a scene.
- Reasons are snake_case codes: `vector_scene_without_mesh_projection`, `workflow_draws_no_model_meshes`, `skipped_by_option`. `__checks.geometryArea.expected` separates a declared omission (NOT RUN) from an undeclared one (`no_area_check_from_the_engine`, reported as `GEOMETRY_AREA_NOT_RUN`, FAIL). A page that publishes no `__checks` (hand-built pages) is `GEOMETRY_AREA_UNREPORTED` (WARN), not a pass.
- `kit/spec.js` uses `MX_MANIFEST.vectorScene` when the manifest is loaded (every `boot.js` page) and falls back to `MX.paperEngine.scenes` for a page that loads scripts directly.

Results: lock with Paper (URL or spec only) loads 14 scripts, no three.js, no `paper-mesh.js`, builds no figure and no view set; time to `__frame` 111-120 ms (two rounds of 9) against 1641-1682 ms at `e84b886`; JS heap 9.5 MB against 391 MB; render time unchanged (52.98 against 52.35-52.65 ms/frame: encoding dominates). The 54 sampled frames of section 3 are byte-identical to `e84b886`; the full 30 s lock film decodes to the same video MD5 (`bf74967c…`) and audio MD5 (`493ffeb3…`). The CLI gate of all 11 examples and the page-side gate of 7 pages (Paper on lock, hub, rtx4090, switch; Workflow on react; Studio and the legacy film on lock) are identical before and after.

## 8. PV-3 as built: Paper reliability and visual contract (2026-10-18, uncommitted, on top of `c52144d`)

No code in `kit/` or `scripts/` changed: PV-3 adds tests and documentation only, so frames, films and gates are those of `c52144d`.

- **Visual contract** (`tests/paper-contract.test.mjs`). During 21 frames from 0 to 29 s, on lock (vector scene) and hub (mesh projection), every 2D context records any gradient (`createLinearGradient`, `createRadialGradient`, `createConicGradient`), any `shadowBlur > 0` or non-zero shadow offset, any `filter` other than `none` and any lighting blend (`lighter`, `screen`, `overlay`, `color-dodge`, `hard-light`, `soft-light`, `plus-lighter`). Paper must record none. The test also injects a shadow into every stroke and requires the detector to catch it. Run against the lit Paper of `b4a0366`, the same detector reports 258 violations (gradients, `shadowBlur`, `shadowOffsetY`); against the current code, 0. Flat fills and hatching are allowed: that is Paper's rule, and the test does not change it.
- **Pages without `boot.js`** (same file). A page that lists its scripts itself has no `MX_MANIFEST`; the compiler then picks Paper's path from `MX.paperEngine.scenes`. Lock built that way runs with no three.js and no mesh adapter and reports NOT RUN; hub built that way loads three.js and the adapter and runs the area check.
- **Hand-built pages** (audit). `phones`, `rpi4` and `s25-vs-s26` expose no `__geom`, so the preflight refuses them before any check (exit code 1, "the page did not expose __frame/__geom"); it prints no PASS. `GEOMETRY_AREA_UNREPORTED` therefore never fires on a real page today; it is reachable on a spec page that does not publish `__checks`, which a test now simulates (WARN, not a pass). The refusal message mentions the gate, which is misleading on a page without a spec; left as it is (pending).
- **Every report says what ran** (`tests/preflight.test.mjs`): Studio has `notRun: []` and runs the check; a page with no `__checks` gets the WARN; a hand-built page is refused with no PASS line.

Still not covered: other tools (`lint-film`, `stranger`, `validate-render`) do not read `__checks` because they run no geometry check; the preflight refusal message for hand-built pages; the style contract covers Paper only (Workflow and Studio use shadows and gradients by design).
