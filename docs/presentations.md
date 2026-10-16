# Presentation methods

Studio, Workflow and Paper are independent of the Graphite, Blueprint, Porcelain and Ivory backgrounds. Existing films keep the legacy look/timeline unless a presentation is explicitly selected. The landing page and published media are unchanged.

## Selection

```sh
node scripts/render.mjs examples/lock/index.html --method studio --background porcelain --length short --aspect 9:16 --encoder browser --out work/studio.mp4
node scripts/render.mjs examples/react/index.html --method workflow --background graphite --length short --aspect 9:16 --encoder browser --out work/workflow.mp4
node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --encoder browser --out work/paper.mp4
```

The corresponding URL is `?method=paper&background=ivory&length=short&aspect=9:16`. A spec may set `presentation: { method: 'paper', background: 'ivory' }`; URL/CLI options take precedence. Invalid names are rejected. With no explicit background, Studio uses Porcelain, Workflow Blueprint and Paper Ivory. Legacy `--style`/`--theme` options still work; they are not method names. Selecting a new presentation overrides the legacy palette. An interactive `?explore` keeps the existing viewer and applies the background, not the new film timeline.

`boot.js` loads `presentation.js` automatically after `core.js`. Pages loading scripts directly should include it in that position. Its configuration, text wrapping and timeline planner also run in Node/vm without browser globals.

## Behavior

- **Studio** names the existing normal 3D director: assembly, operation, explosion, part tour, evidence and closing card. The selected background supplies a clean sans-serif card and palette. The original short duration is retained (31 seconds for lock).
- **Workflow** builds stations from `mechanism.steps.label(i)` and advances the actual simulation on the corresponding step timeline. For mechanisms without steps, it follows the drive modes selected for that cut, preserving their original mode indices. It does not infer a dependency graph from arbitrary geometry. States are previous/active/next; progress and animated transfers illustrate the sequence, not measured execution latency. Large sequences page through station groups. The demo uses the existing React model/evidence, not invented process measurements.
- **Paper** follows actual tour parts, revealing mesh edges and camera-dependent silhouettes. It shows numbered anchored callouts, a projected vector detail and existing source-backed parameter values. Estimated parts use dashed amber drawing lines; confidence and drawn-size comparisons remain distinct. The exploded assembly is fitted from its posed bounds, then reassembled at the close. Details are explicitly not to scale.

Workflow/Paper durations are 30/60/90 seconds for short/normal/extended. The short selects up to four Paper tour parts (normal/extended up to eight). Their closing card uses the gate's actual verdict and published comparisons; a successful animation is not an independent evidence check. Sources and full evidence remain in the original spec/normal dossier. These directors are alternative explanations, not replacements for the complete evidence document.

New presentations render 3D at 1.5x (1620×2880 for 1080×1920 delivery), retain MSAA 4x, and downsample before composing overlays. `stage.renderScale` accepts 1–2. Workflow/Paper use no temporal averaging of their overlays and use deterministic state/timing and synchronized sound events. Higher raster resolution is not a claim of more detailed or better-sourced geometry.

## Local validation, 2026-10-16

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
