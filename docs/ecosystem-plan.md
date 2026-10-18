# Ecosystem plan: audit and ordered tasks (2026-10-18)

Branch `ecosystem-foundation`, cut from `perf-quality` at `5f2bb35`. Nothing pushed or merged. This file records what the audit found in the code, not what a plan hoped to find, and orders the work by dependency. Measurements live in `docs/perf-quality.md` (addendum of 2026-10-18).

## 1. Audit

### What exists and works (checked in this session)

| Area | Where | Evidence |
|---|---|---|
| Evidence gate: SPEC/MEASURED/DERIVED/ESTIMATED, provenance, VERIFIED vs CONSISTENT, conversions not counted | `kit/spec-core.js`, `scripts/check-spec.mjs`, `tests/gate.test.mjs` | `npm test` 76/76 at `5f2bb35` |
| Three presentation engines: Studio (WebGL), Workflow (Canvas2D), Paper (Canvas2D vector) | `kit/spec.js`, `kit/workflow-engine.js`, `kit/paper-engine.js`, `kit/presentation.js` | `tests/presentation.test.mjs`: 12 method/background combos, 3 aspects, text bounds, byte-identical 2D frames, no WebGL in 2D |
| Time-based, deterministic frames (`__frame(t)`), any fps | `kit/core.js` `MX.run`, `scripts/render.mjs --fps` | 60 fps render verified (1800 frames, 60/1) on 2026-10-17 |
| Aspect 4:5, 9:16, 1:1; lengths short/normal/extended | `kit/spec.js` `SIZES`, `P.plan` | tests above |
| Encoders: JPEG→x264 and WebCodecs H.264 with BT.709 limited range | `scripts/lib/encoding.mjs` | `tests/encoding.test.mjs`, `tests/render.test.mjs` |
| Supersampling `--ss N` (2D and Studio) | `kit/core.js` `MX.run` | measured, opt-in (see perf addendum) |
| Visual regression (44 goldens), preflight, film lint, stranger test, isolated browser sessions | `scripts/visual-regression.mjs`, `scripts/preflight.mjs`, `scripts/lint-film.mjs`, `scripts/stranger.mjs`, `scripts/lib/browser.mjs` | `npm test` |
| Export fidelity check against lossless frames | `scripts/validate-render.mjs` | reused by `scripts/bench.mjs` |
| Distribution as one Claude Code plugin / plain skill | `.claude-plugin/`, `SKILL.md`, README "Install" | README says `npx skills add ... --list` was checked |

### Partial

- **Flow independence.** Workflow returns before any 3D code runs (`kit/spec.js:64`), but every page loaded three.js, the WebGL stage, the figure and the parts library anyway. Fixed in this branch for `?method=workflow` (see P1-1). A method set only inside a spec still loads the full stack.
- **Draft independence.** The pin-section scene (`paperScene`) is pure Canvas2D, but the generic Paper path projects THREE meshes (`kit/paper-engine.js` `meshEdges`, `E.stage`), so Paper cannot drop three.js yet.
- **Adaptive layout.** Aspect changes re-run the layout with `H`-dependent constants (`tall`, `K`, `FS`); there is no layout model. 16:9 is not a supported aspect anywhere (`SIZES` has no landscape entry).
- **Styles.** `MX.styles` (legacy dossier/paper/night/studio) and `P.backgrounds` (graphite/blueprint/porcelain/ivory) are two separate tables.
- **Result contract.** The gate verdict separates states well, but there is no structured record of semantic review or human approval; benchmark READMEs say it in prose only.

### Missing

- Separate skills (Flow, Draft, 3D, Suite) with their own `SKILL.md`; today one 129-line `SKILL.md` loads everything for every task.
- 16:9, 720p and 4K profiles; a production-profile object shared by the three engines.
- Draft as a parametric drawing: dimensions derived from geometry, SVG/PDF/DXF export.
- Chapters for long videos.

### Findings by severity

| Severity | Finding | File |
|---|---|---|
| High | Browser encoder became the 2D default in `b4a0366` although `docs/perf-quality.md` had deferred that promotion; the 2D films grew 2.5-3x (Paper 6.8 → 19.3 MB, Workflow 6.3 → 15.8 MB). Reverted here after measuring | `scripts/render.mjs:21` |
| High | Paper contract says it never lights a scene or draws materials; `b4a0366` added lit cylinders, a lit key and a drop shadow. Fixed here: flat material colour coding, contract wording updated | `kit/paper-engine.js` `section()`; `docs/presentations.md` |
| Medium | `b4a0366` was committed with one test failing (fixed in `5f2bb35`); nothing stops a commit on a red suite | process |
| Medium | Docs describe Workflow as stations/conveyors only; the reconcile scene, `P.motion`, `--ss` and the 2D encoder default are undocumented | `SKILL.md:58,78`, `docs/presentations.md:12,36` |
| Medium | Every page loaded the 1.1 MB three.js bundle and ran it even for Workflow | `kit/boot.js` (fixed here) |
| Low | `plugin.json` says 0.7.0, `package.json` 0.8.1 | `.claude-plugin/plugin.json` |
| Low | Interrupted renders left `*.video-<pid>.mp4` files in the external benchmark folder (not touched: that folder is not cleaned by tooling) | `mechanism-benchmark/presentation-engines-v2/` |

## 2. Tasks in dependency order

Each task is one reviewable change with its own tests.

**P0-1 Benchmark harness and baseline** (this branch). `scripts/bench.mjs` renders real films over a grid (encoder, bitrate, fps, ss) and reuses `validate-render.mjs` for SSIM/colour. Accept: a reproducible table in `docs/perf-quality.md`; videos stay outside the repo.

**P0-2 Encoder default decided by the measurement** (this branch). Accept: the 2D default is the setting that keeps SSIM within the measured noise of the best encoder at the smallest file; documented with numbers. Done: JPEG + x264 won on both size and SSIM for Workflow and Paper, so the default is JPEG for every method again (`docs/perf-quality.md`, addendum 2026-10-18).

**P0-3 Paper back to its contract** (this branch). Flat material colours, no lighting or shadows. Accept: presentation tests green, frames inspected.

**P0-4 Docs match the code** (this branch). SKILL.md and presentations.md describe the reconcile scene, `P.motion`, `--ss`, the encoder default and the Flow profile.

**P1-1 Flow loads without the 3D stack** (this branch). `kit/boot.js` skips three.js, gl, figure, parts and paper-engine for `?method=workflow`. Accept: test asserts `typeof THREE === 'undefined'` and none of those scripts in the page, with all Workflow checks still green.

**P1-2 Script manifest per capability.** Move the lists of which `kit/` files each engine needs out of the `boot.js` regex into one table that `boot.js`, `scripts/new.mjs` and a packaging test read. Accept: a test fails if a Flow page would load a 3D file. Done (`kit/manifest.js`, `tests/manifest.test.mjs`): the engine is resolved from the URL or `spec.presentation` just before the compiler, so Workflow loads no three.js either way. Validation, 2026-10-18: every test file passed on its own; the 44 Studio goldens matched at SSIM 1.000000 without regeneration; hand-built pages were compared against `5f2bb35` stills (the differences are within the run-to-run GPU noise of the old version itself). Workflow time to `__frame` (median of 9, two rounds): 162 ms before, 138 ms by URL, 139 ms by spec only. Full suite: serial (`node --test --test-concurrency=1 tests/*.test.mjs`) 81/81 in 226 s; `npm test` with its default parallel file concurrency 81/81 in 133 s, with 5.8 GB of RAM free at the start and 1.24 GB at the lowest point (up to 110 test browser processes at once). An earlier parallel attempt with about 2.5 GB free was stopped by the session's low-memory guard: the parallel suite needs roughly 4.5 GB of free RAM on this machine, which is a limit of the environment, not a defect of the manifest.

**P1-3 Draft without three.js for drawn scenes.** Split `paper-engine.js` into the vector sheet (no THREE) and the mesh-projection adapter (THREE). Accept: `?method=paper` on a spec with `paperScene` loads no three.js; generic Paper keeps working. Done in two steps: PV-1 (`e84b886`, `kit/paper-mesh.js` extracted, byte-identical) and PV-2 (uncommitted: Paper with a vector scene loads no three.js; area check reported as NOT RUN instead of silently missing; see `docs/paper-split-design.md` sections 6-7).

**P1-4 Skill split, layout only.** `skills/mechanism-flow/SKILL.md`, `skills/mechanism-draft/SKILL.md`, `skills/mechanism-3d/SKILL.md` as short entry points that point to the shared `kit/` and `scripts/`; the root `SKILL.md` becomes the Suite. Verify the real install paths (plugin marketplace with several plugins, `npx skills add`) before documenting commands. Accept: each skill installs alone and its quick start runs from a clean sparse checkout.

**P2 Universal presentation engine.** Production profile (`fps`, size, aspect including 16:9, length) passed to all engines; adaptive layout rules for 16:9 per engine; one style table. Accept: each profile rendered and probed (ffprobe) in a test.

**P3 Quality and evidence record.** A per-render JSON next to the film: `structural`, `geometry`, `semantic`, `human_approval`, `limitations`, filled from the gate, preflight and the bench; `semantic` stays `NEEDS_REVIEW` until a review is recorded, `human_approval` only by the user. Accept: no field can be set to PASS by a script that did not run the corresponding check.

**P4 Specialised engines.** Draft first (parametric geometry, derived dimensions, SVG/PDF), then Flow (auto-layout, routing), then 3D.

**P5 Suite. P6 Generative design lab.** Not started; no contracts are added for them yet.

## 3. What the checks do not prove

Zero gate errors, a green test suite and a clean preflight do not mean the content is right, that an explanation is understandable, that a film looks good, or that Diego approved it. Bench SSIM measures export fidelity against the engine's own lossless frame, not the quality of the design. Audio has not been listened to in any of these runs.
