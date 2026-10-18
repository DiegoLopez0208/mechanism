# Design: Paper Vector Engine and Paper Mesh Adapter (2026-10-18)

Status: PV-1 implemented on `ecosystem-foundation` (uncommitted, on top of `5f90a14`); PV-2 and PV-3 not started.

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
