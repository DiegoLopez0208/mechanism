# Performance and quality validation — 2026-10-16

Work started at `a0b5159` (0.8.1), on `perf-quality`. The existing `__paint` line was preserved and incorporated into the encoder path. No dependency, build step or TypeScript migration was added. The landing page and `docs/media` were not changed. No push, release or upload was performed.

Artifacts and scratch harnesses are outside the repository, in the sibling `mechanism-benchmark/perf-quality/` directory. The original investigation prototypes were read and left unchanged.

## 1. Render pipeline

Changed: `scripts/render.mjs`, `scripts/lib/encoding.mjs`, the existing canvas-only hook in `kit/core.js`, `scripts/validate-render.mjs`, `scripts/lib/{media-server,ssim}.mjs`, encoder/render/server tests, README and skill instructions.

JPEG now converts full-range BT.601 samples to limited-range BT.709. On FFmpeg 8.1, the proposed scale flags alone left a rounding bias; `accurate_rnd+full_chroma_int` fixed it. `setparams` is also necessary to propagate primaries/transfer through the JPEG frames into x264, and the browser copy path writes explicit H.264 VUI metadata. Container flags alone were insufficient after audio muxing.

`--encoder browser` uses software WebCodecs H.264, Annex B and `ffmpeg -f h264 -r 30 -i - -c:v copy`, bounded encoder queues, periodic chunk draining and backpressure. Capability checks fall back to JPEG. The bitrate budget scales with pixels, frame rate and part count; `--bitrate` can override it. Hardware encoding is not selected. Tests exercise clipping, draft mode, stills, STL/GLB, remux, stereo non-silent sound, timing, colour tags and a real page with VideoEncoder disabled.

**Default promotion is deferred.** JPEG remains the compatibility default. All encoder metrics passed, but the visual review found an existing clipped outro title in React, and the conservative browser bitrate increases file size. The fast path is available explicitly; this report does not call all 11 films visually defect-free.

### Timing: identical 300-frame clips

Windows, Node 26.4.0, Edge 155.0.4283.45, FFmpeg 8.1.2. The machine has an RTX 3060 Laptop GPU and AMD integrated graphics; browser launch requests the high-performance GPU. Both cuts were measured because the normal cut spends much of its first ten seconds on panels. Settings: 1080x1350, 30 fps, `--from 0 --to 10`, blur 4, shutter 0.5. Timings include encoding/flush and exclude startup and audio. One pass per cell, not a statistical benchmark.

| Cut | Film | Original JPEG ms/frame | Corrected JPEG | Browser | Browser speed-up |
|---|---|---:|---:|---:|---:|
| short | lock | 72.94 | 61.51 | 20.47 | 3.56x |
| short | winrar | 102.93 | 93.16 | 56.76 | 1.81x |
| normal | lock | 48.33 | 53.20 | 13.62 | 3.55x |
| normal | winrar | 78.17 | 55.03 | 18.57 | 4.21x |

The supplied 66/91.7 ms baseline was not reproduced exactly; the short cut is the comparable workload. The heavy short cut remains substantially more expensive to paint. The normal-cut numbers must not be used to claim that heavy moving scenes are now 4.21x faster.

The conservative bitrate costs space: short lock is 8.45 MiB versus 3.33 MiB originally; short winrar is 8.28 versus 3.41 MiB. This is not the investigation's fixed-3-Mbit/s/file-size-equivalent result. The selected targets are 19.41 Mbit/s for lock and 26.24 for winrar; actual output rates are lower because rate control is variable.

### Colour in Chromium

Eight reference PNGs at frame indices 19, 56, 94, 131, 169, 206, 244 and 281, compared with decoded MP4 frames. The table uses the investigation's every-seventh-pixel sampling; full-image measurements agree closely. Values are on a 0–255 scale.

| Short clip | Pipeline | Mean absolute error | Bias R | Bias G | Bias B |
|---|---|---:|---:|---:|---:|
| lock | original | 8.394 | -1.017 | -13.086 | -7.839 |
| lock | corrected JPEG | 1.090 | 0.495 | -0.083 | -0.038 |
| lock | browser | 0.998 | 0.291 | -0.048 | -0.078 |
| winrar | original | 8.609 | -1.321 | -13.463 | -7.281 |
| winrar | corrected JPEG | 1.115 | 0.483 | -0.136 | -0.058 |
| winrar | browser | 1.069 | 0.268 | -0.058 | -0.043 |

The lock colour baseline **does reproduce** to the reported precision. Both corrected paths meet error <=2 and absolute channel bias <1 on both films. Normal-cut continuous clips also pass. An early sparse sequence with abrupt jumps between unrelated times showed a blue bias slightly above 1; testing the continuous clips resolved that apparent failure. The sparse sequence is not the acceptance clip.

Chromium playback advanced and a Web Audio analyser measured non-zero RMS for both films and both encoders. ffprobe confirms 30 fps, exact video durations/frame counts, `yuv420p`, TV range, BT.709 matrix/primaries, sRGB transfer and stereo AAC on all 11 full outputs. No subjective full-length listening review is claimed.

### Full films, reference frames and panel review

The complete browser-encoder batch took **1166.529 seconds (19 min 26.5 s)**, including startup and audio. It ran alongside local validation/WSL checks, so this is an observed batch cost, not an isolated throughput benchmark. All outputs remain outside the repo.

316 decoded samples cover the opening clip, every mode/tour shot and all 68 panels, including every claims page, sources and receipt. SSIM below is the mean of local 8x8 luminance-window comparisons of Chromium-decoded RGB against fresh lossless frames at frame-aligned times. It is not the same metric as comparing native YUV planes before browser colour conversion. The supplied 0.939 SSIM baseline did not reproduce: a separate FFmpeg YUV comparison on the short clips gave about 0.995 for the original path. No numerical SSIM improvement over that different baseline is claimed.

| Film | Film seconds | Full render seconds | Mean RGB-window SSIM | Text-panel review |
|---|---:|---:|---:|---|
| lock | 112.5 | 94.475 | 0.99563 | reviewed |
| winrar | 117.0 | 229.013 | 0.99581 | reviewed |
| hub | 92.0 | 98.400 | 0.99439 | reviewed |
| switch | 78.5 | 73.538 | 0.99499 | reviewed |
| enigma | 106.0 | 148.956 | 0.99561 | reviewed |
| k20a | 87.5 | 79.346 | 0.99473 | reviewed |
| rubik | 94.0 | 93.262 | 0.99509 | reviewed |
| rtx4090 | 103.5 | 82.524 | 0.99435 | reviewed |
| mos6502 | 100.5 | 77.078 | 0.99461 | reviewed |
| rar5 | 126.5 | 130.239 | 0.99564 | reviewed |
| react | 82.5 | 59.679 | 0.99587 | **existing outro title clipped at the right edge** |

Every film meets SSIM >=0.93. All panel contact sheets were inspected. React's outro issue also exists in the initial checkout render; it was preserved under the instruction not to change the films' appearance. Intentional shortened source strings and very small long numeric rows were not re-laid out. This is sampled review, not inspection of every video frame.

## 2. Browser reliability

Changed: `scripts/lib/browser.mjs`, render, preflight, lint-film, probe, stranger and helper tests.

Each run owns a `mkdtemp` profile, launches with debugging port zero, reads `DevToolsActivePort`, and connects to its own `about:blank` target. Installed extensions had been opening extra authentication tabs; extensions/sync are disabled in these isolated sessions. Cleanup stops the owned PID tree, rejects pending CDP requests, awaits asynchronous profile removal and runs on errors, SIGINT/SIGTERM and normal completion. No process-name killing is used by the implementation.

Requests and rendering progress are bounded. A watchdog failure starts one fresh attempt; ordinary failures are not retried. Backpressure is covered by the frame watchdog as well as CDP calls. `--timeout` controls render seconds; `BROWSER_TIMEOUT_MS` controls other sessions.

Before: fixed/random-small-pool ports, collision/hang observations and no render watchdog. After: five concurrent private sessions had distinct ports/profiles; five actual runs on hub/switch/enigma/lock/winrar all finished successfully (three preflights and two still renders, distinct output paths). A page executing an infinite loop was killed, retried exactly once and reported. Stalled-consumer, ordinary-failure and SIGINT controls also pass.

Windows initially delayed profile deletion under parallel rendering. Asynchronous removal fixed the observed race; the final parallel suite retains the assertion that profiles must actually be gone. Final Get-CimInstance checks found no Edge processes from these runs. Probe and stranger smoke runs completed; lint-film reported no empty lock shots.

Profiles from earlier failed attempts remain in the system Temp directory. Automatic approval review blocked the requested manual recursive cleanup with only the reason "blocked by policy". The cleanup was not retried through another tool. Fresh-session cleanup tests pass; the retained old directories are not running browser processes.

## 3. Evidence gate disclosures

Changed: `kit/spec-core.js`, `kit/spec.js`, `kit/figure.js`, registry generator/output, gate tests, README, SKILL and CHANGELOG.

The verdict/warnings now list displayed calculations lacking published comparators, and inputs with no published mode comparator, including MOS 6502's unused `pins` count. Tooth counts outside meshing links are disclosed. Unknown spec/part keys warn. Confidence tags on part cards include `SIZE NOT COMPARED` or a comparison count. Registry JSON lists each part's compared/unchecked dimensions, including cubie side lengths. Neither source confidence nor a warning is promoted to a size verification.

The original mutation script was rerun **unchanged**. Its rejection counter only sees new errors or changed verdict states, so warnings intentionally do not increase its detection rate:

| Mutation category | Original | After |
|---|---:|---:|
| published figure | 41/41 | 41/41 |
| sourced params | 9/9 | 9/9 |
| calc input | 36/47 | 36/47 |
| teeth | 6/10 | 6/10 |
| sourced-part dimension without params | 3/364 | 3/364 |
| gear centre position | 2/7 | 2/7 |

A separate disclosure audit identifies whether the mutated datum was rejected **or already explicitly disclosed as unchecked**: calc inputs 46/47, teeth 10/10, dimensions 364/364. These are disclosure-coverage rates, not mutation rejection rates and not defect counts. The remaining calc mutation changes the lock's 0.003 clearance to 0.0033, still inside the published comparison tolerance; the tolerance was not tightened to make the counter increase.

Tests keep all 11 examples passing with their original verdicts, reject new typo fixtures through warnings without altering states, and check both checked/unchecked badge data. No existing VERIFIED/CONSISTENT or conversion rule was changed. The 364 count remains an upper bound on untested sizes, not 364 wrong dimensions.

## 4. Repeatable frames and visual regression

Changed: `kit/gl.js`, visual helper/CLI/tests, platform golden data and CI.

The rotating-GTAO hypothesis was not confirmed. The vendored pass has no per-call noise rotation. Its denoiser creates a simplex-noise texture from Math.random at construction: two initial process hashes differed. Only that synchronous texture factory is now seeded; the application's random function is restored and texture UUIDs remain unique. AO/denoiser sample counts, radii, blending and filters are unchanged.

Before, the same PNG often differed on repeated calls. After, the denoiser texture hash is stable across processes and the tested 360x450 RGB frames are identical across sessions (SSIM effectively 1). Full-resolution repeats still have bounded edge-sample differences: maximum 2 channel levels, at most 55 changed RGBA components out of 5,832,000 in the recorded lock/winrar samples; maximum recorded mean absolute residual 0.00000961 per RGBA component. Geometry snapshots are unchanged. Disabling AO, transmission or shadows did not eliminate the tiny intra-process residual. It is consistent with GPU raster/compositing rounding; the exact GPU operation is not identified. Full-resolution byte identity is **not** claimed, nor was the investigation's larger 0.9987 residual reproduced here.

Four compact lossless frames per example cover a mode, exploded view, claims and receipt. Windows/Linux sets together occupy about 6.0 MiB; no film is stored in git. Native platform fonts justify separate baselines. Comparison uses mean SSIM >=0.985, minimum tile >=0.35 and bad-tile fraction <=0.03. Controls in the real renderer catch injected overflowing text and a decor part moved away from the object. Regeneration requires `--update`; CI never regenerates.

All 44 Windows golden comparisons passed. All 44 Linux/SwiftShader comparisons passed (minimum mean SSIM about 0.99709); Linux also passed the injected-defect control. These golden samples do not automatically detect every unobserved timeline defect, including React's existing outro outside the selected golden times.

## Validation and remaining limits

Windows `npm test`: **67/67 passed**, zero skips (115.7 seconds in the final complete run). The final cubie-dimension metadata assertion also passed in the focused gate rerun. All example gates and the registry build pass, and an unfilled generated template still fails. Linux Node 22 shared/gate/encoder/helper tests, render/export/remux/fallback checks and golden comparisons were exercised locally. Hosted GitHub Actions was not run because nothing was pushed.

Task 5 was not undertaken: no coverage-improvement claim, schema migration, tsc setup or module split. No published MP4, poster or GIF was replaced. Raw benchmark JSON, ffprobe reports, frames, contact sheets and logs are retained outside git for review.
