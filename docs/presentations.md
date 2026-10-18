# Presentation methods

Studio, Workflow and Paper are independent of the Graphite, Blueprint, Porcelain and Ivory backgrounds. Existing films keep the legacy look/timeline unless a presentation is explicitly selected. The landing page and published media are unchanged.

## Independent engines (revision 2)

The first prototype reused Studio's shaded object under two new overlays. That did not meet the requested separation and is superseded. The current implementations share configuration, evidence, a deterministic clock/audio contract and small drawing helpers, not a common rendered scene:

| Engine | Renderer | Scene and motion | Studio images |
|---|---|---|---|
| Studio | WebGL product renderer | Real object, materials, light, assembly, operation and camera shots | Native |
| Workflow | `kit/workflow-engine.js`, CPU Canvas2D | With `workflowScene.kind: 'reconcile'`: the page, the state, the trees before/after, the node-by-node comparison and the one DOM change, all from spec data. Otherwise: operation stations and a moving carrier | Never |
| Paper | `kit/paper-engine.js`, CPU Canvas2D vector paths | With `paperScene.kind: 'pin-section'`: a side section driven by the published table (key insertion, splits on the shear line, wrong key), flat material colour coding. Otherwise: front/top/side orthographic construction views, numbered details and analytical exploded translation | Never |

Since 2026-10-18, the modules each engine needs are declared in `kit/manifest.js` (also read by `scripts/new.mjs` and `tests/manifest.test.mjs`). On a spec page, `boot.js` holds the 3D stack (three.js, `gl.js`, `figure.js`, `parts.js`) until just before the compiler; by then the page's spec has loaded, so the engine is resolved from the URL or else `spec.presentation`, with the same rule as `MX.presentation.resolve`. Workflow, selected either way, never loads the stack or `paper-engine.js`; Studio and Paper load it, and Paper adds `paper-engine.js`, whose generic path still projects the model meshes through three.js. Hand-built pages (no compiler in their list) load their scripts in their own order.

Workflow dispatches before any figure/mesh/stage compilation. Paper reuses parametric mesh geometry as model data through a mathematical scene adapter; it never constructs `WebGLRenderer`, lights a scene, draws materials or blits Studio's canvas. Hard edges and view-dependent silhouettes are projected once and cached; paths move analytically during the technical explosion. Paper retains the geometry-area preflight check. Camera/3D screen occupancy checks do not apply to these 2D engines.

The browser tests deliberately throw if Workflow or Paper requests a WebGL context. They also require byte-identical repeated frames from both CPU canvas engines, exercise all twelve combinations and the three aspect ratios, and check text bounds. The final full suite passed **76/76**, with zero skips, in 154.93 seconds. Studio and all 44 legacy goldens remain unchanged. Revised films and their own measurements live outside the repository in `mechanism-benchmark/presentation-engines-v2/`; the historical prototype measurements below do not describe those revised films.

Workflow/Paper keep their own playback canvas with `?explore`; they do not fall back to Studio's orbit viewer. Their output is film/stills. Use Studio to export STL/GLB. `boot.js` loads `presentation.js` after core and only the engine module the resolved method needs (see `kit/manifest.js`); direct script-tag consumers should load `presentation.js`, then the engine module they use. No runtime compilation, dependencies or vendor rebuild is required.

## Selection

```sh
node scripts/render.mjs examples/lock/index.html --method studio --background porcelain --length short --aspect 9:16 --encoder browser --out work/studio.mp4
node scripts/render.mjs examples/react/index.html --method workflow --background graphite --length short --aspect 9:16 --encoder browser --out work/workflow.mp4
node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --encoder browser --out work/paper.mp4
```

The corresponding URL is `?method=paper&background=ivory&length=short&aspect=9:16`. A spec may set `presentation: { method: 'paper', background: 'ivory' }`; URL/CLI options take precedence. Invalid names are rejected. With no explicit background, Studio uses Porcelain, Workflow Blueprint and Paper Ivory. Legacy `--style`/`--theme` options still work; they are not method names. Selecting a new engine overrides the legacy palette. `?explore` retains the orbit viewer only for Studio; the two 2D engines retain their own canvas playback.

`boot.js` loads `presentation.js` right after `core.js` and the engine module of the resolved method just before the compiler (`kit/manifest.js`). Direct script-tag pages should include `presentation.js` after `core.js` and their engine module before `kit/spec.js`. Configuration, text wrapping, timeline planning, factory layout and orthographic projection helpers also run in Node/vm without browser globals.

## Behavior

- **Studio** names the existing normal 3D director: assembly, operation, explosion, part tour, evidence and closing card. The selected background supplies a clean sans-serif card and palette. The original short duration is retained (31 seconds for lock).
- **Workflow** builds a factory/process scene from `mechanism.steps.label(i)`, or the declared drive modes when there are no steps. It does not infer dependencies or a physical factory from arbitrary object geometry. Moving data carriers and operation indicators are explicitly illustrative, not measured execution latency or additional hardware evidence. Large sequences page through station groups. The demo uses existing React model/evidence data.
- **Paper** follows actual tour parts using orthographic vector paths. It shows front/top/side construction outlines, numbered anchored callouts, projected details and existing source-backed parameter values. Estimated parts use dashed amber lines; confidence and drawn-size comparisons remain distinct. The construction explodes and reassembles analytically. Views are explicitly not to scale; these are construction outlines, without hidden-surface removal.

Workflow/Paper durations are 30/60/90 seconds for short/normal/extended. The short selects up to four Paper tour parts (normal/extended up to eight). Their closing card uses the gate's actual verdict and published comparisons; a successful animation is not an independent evidence check. Sources and full evidence remain in the original spec/normal dossier. These directors are alternative explanations, not replacements for the complete evidence document.

Studio renders 3D at 1.5x (1620×2880 for 1080×1920 delivery), retains MSAA 4x, and downsamples before composing overlays. `stage.renderScale` accepts 1–2. Workflow/Paper rasterize their own vector scenes at delivery resolution with no temporal averaging, deterministic state and synchronized sound events. Higher raster resolution is not a claim of more detailed or better-sourced geometry.

## Revision 2 export validation

| Engine demo | Duration | File size | Mean local SSIM | Mean RGB error / 255 | Channel bias R / G / B |
|---|---:|---:|---:|---:|---|
| Studio / lock | 31 s | 17.44 MiB | 0.998390 | 0.613 | +0.122 / -0.011 / -0.071 |
| Workflow / React | 30 s | 6.53 MiB | 0.995891 | 0.668 | +0.918 / +0.032 / +0.018 |
| Paper / lock | 30 s | 5.76 MiB | 0.998581 | 0.770 | -0.073 / +0.002 / -0.870 |

Eight Chromium-decoded samples per film were compared with fresh lossless engine frames. These are export-fidelity measurements, not a numerical rating of artistic quality. Both revised films meet error <=2/255 and absolute bias <1/255. Decoded contact sheets were inspected. ffprobe and actual Chromium playback confirm 1080×1920, 30 fps, exact video durations, yuv420p/TV/BT.709/sRGB transfer, stereo AAC and non-silent advancing playback. No full subjective listening or hosted CI run is claimed.

An important export regression was caught before delivery: Chromium's CPU-backed RGB canvas encoding produced different YUV range values from the original GPU canvas path. Overwriting VUI tags alone crushed dark backgrounds and clipped the paper background (Workflow error 14.79, Paper 13.97/255). The final encoder explicitly converts CPU RGB pixels to limited-range BT.709 I420, with averaged 2×2 chroma and an explicit `VideoFrameBufferInit.colorSpace`. This uses the [WebCodecs buffer-frame API](https://www.w3.org/TR/webcodecs/#videoframe-interface); the measured correction is local evidence, not a guarantee inferred from tags. The deterministic drawing canvas is unchanged. A temporary GPU-staging experiment was superseded by this explicit buffer conversion.

Unit tests verify actual Y/U/V values for black, white and red inputs. A real CPU Workflow clip is decoded against its lossless reference in the render test suite, preventing a return to the range mismatch. The GPU/Studio input path is unchanged. Final revised exports took approximately 42 seconds for Workflow and 77 seconds for Paper while other local work was active; these are observed export costs, not isolated speed benchmarks. Paper caches its own vector view layers at stable poses; it never caches a Studio image.

Workflow preflight sampled every second and Paper every two seconds: zero failures/warnings on these demos. Text checks apply to both; camera checks are inapplicable. Paper preserves the source-mesh area-ratio diagnostic. The first concurrent full test attempt during rendering hit a browser launch failure and its test harness retained late launches. The concurrency test now awaits all launch attempts before cleanup, preserving every assertion; the failed attempt was stopped by its identified PID tree and retained in the local logs. The subsequent isolated full suite passed all 76 tests, including five concurrent browser launches, actual CPU-frame colour regression and legacy visual regressions.

## Archived first-prototype validation, 2026-10-16 (superseded)

Three review MP4s were generated outside the repository. No push, upload or published-media replacement was performed.

| Demo | Background | Duration / frames | Size | Mean local SSIM | Mean RGB error / 255 |
|---|---|---:|---:|---:|---:|
| Studio / lock | Porcelain | 31 s / 930 | 17.44 MiB | 0.998390 | 0.613 |
| Workflow / React | Graphite | 30 s / 900 | 7.08 MiB | 0.998183 | 0.832 |
| Paper / lock | Ivory | 30 s / 900 | 6.69 MiB | 0.998296 | 0.710 |

SSIM/error compare eight Chromium-decoded samples per film against lossless engine frames at frame-aligned times, using the existing local 8×8 SSIM implementation. These numbers describe export fidelity, not an aesthetic improvement over the legacy films. All absolute channel biases were below 0.34/255. ffprobe confirmed 1080×1920, 30 fps, exact video duration, yuv420p, TV range, BT.709 matrix/primaries, sRGB transfer and stereo AAC. Actual Chromium playback advanced and Web Audio measured non-zero RMS for each file. Full subjective listening is not claimed.

Decoded contact sheets were inspected across all three shorts. A cropped key in an early Paper prototype was corrected by fitting the exploded geometry. The Paper contour renderer includes silhouette edges so a smooth pin's detail has its side contours, not only end circles. A fit using off-axis screen offsets produced a blank postprocessed scene during development; the final fit centers the camera target in world space instead. A pixel-content test guards against that blank-scene failure.

All twelve method/background combinations, plus 4:5 and 1:1 layouts for each method, were exercised in a real browser. Tests check configuration, actual step/tour data, time-based state, text bounds, physical supersampling dimensions and bounded GPU edge rounding. Sampled Paper scenes must contain the assembly. One-second preflight sampling on the final Workflow/Paper demos reported zero failures and zero warnings. Studio had zero failures and one offscreen warning at 5–6 seconds: review of the decoded frames confirms the key bow enters from outside the frame during insertion, retaining the existing director's shot. These are sampled checks; arbitrary text lengths and every possible spec are not certified.

The existing 44 Windows golden frames matched at SSIM 1.000000 without regeneration. All eleven example gates pass and the registry rebuilds. The first heavily concurrent full test run had one failure in the existing synthetic near-plane camera test; that test passed in isolation. The final full run passed 73/73 tests with no skips (132.99 seconds). After a final mode-index synchronization adjustment, all five presentation tests passed again (38.37 seconds). Hosted CI and the new cases on Linux were not executed in this local run; the presentation suite is included in CI with the existing browser setup. A final Windows process inventory found no Edge sessions using this task's `mx-cdp-` profiles.

Run `npm test`, `node scripts/visual-regression.mjs`, every example gate and `node scripts/registry.mjs` after changes. Use preflight with matching `--method`, `--background`, `--length` and `--aspect`. Do not regenerate legacy goldens to approve a new look. No new dependency, vendor rebuild or runtime compilation is required.
