# Native technical views: scope and quality contract

The first light editorial layout was rejected. The approved direction is the
Enigma depth pilot: the original blue Mechanism identity, native 3D perspective,
moving mechanisms and short annotations. The published collection contains
34 films: 22 Studio, six Workflow and six Paper. Studio includes the revised
bearing and fifteen new 12-second construction films. Historical assets are preserved.

`kit/production-film.js` is the production director; `kit/technical-film.js`
remains an earlier experiment. Studio uses the original compositor, including
SSR, AO, shadows and bloom, with a stable camera fit per chapter. It preserves
the source's cutaway opacity so housings do not conceal the mechanism. Nine
poses and real mesh vertices determine each fit. Complete native mode intervals
are retimed into the chapter; a superflip is not reduced to a short excerpt.
The original soundtrack is retimed with the same source clock and boundary fades.
It is illustrative audio, not a physical recording or measurement.

The gallery replaces the old homepage players while retaining its existing hero,
styles, viewer and historical run reports. Workflow is a real 2D process renderer;
Paper is a real vector renderer. They complement the Studio films and are not
labelled as 3D. The archived reports no longer play the old films on the homepage.

The folder website package reads its local `media/technical-2026-10/` files.
On the repository's GitHub Pages hostname the same players use release assets
from tag `technical-2026-10`. Upload and verify those assets before deploying the
new HTML. The generated films are kept outside Git. A local complete package does
not by itself mean the public site has been deployed.

## Earlier native study API

## Native rendering

- **Studio:** `F.studyBounds()` gathers visible mesh bounds, excluding very faint
  context geometry. `F.drawStudy(ctx, rect, bounds)` renders a fresh view through
  `st.studyImage()`. It fits the mesh-space bound corners in camera coordinates,
  preserving the camera direction, and uses a stable bound per chapter. A separate
  renderer with 2x spatial supersampling, neutral tone mapping and its own studio environment keep
  the legacy camera, resolution and composer untouched. It retains physical
  materials and shadows, without the legacy SSR/AO/bloom chain. This is a clarity
  profile, not a claim that every subject looks better without postprocessing.
  Long-lived consumers can call `st.disposeStudy()` to release those resources.
  The study reuses one camera: Three's transmission render targets are cached by
  camera ID, so cloning a camera per frame caused unbounded GPU texture growth.
  A steady-view regression checks that texture count does not increase.
- **Workflow:** `MX.workflowEngine.study()` draws source operations directly into
  its viewport. React shows the before/after trees and the scoped observed counts.
  A token stream shows neighbouring recorded steps. Independent spec calculations
  use inputs, expression and published comparator; they are not portrayed as
  physical factory stations or as dependent calculations.
- **Paper:** `MX.paperEngine.study()` draws source vector geometry, the pin
  section, or projected construction views directly into its viewport. Font and
  line sizes are defined in delivery pixels. Study-view leader labels avoid the
  occupied dimension-label boxes; the existing drawing and SVG layouts keep
  their prior behaviour. Screen fit does not establish physical scale.

`window.__drawStudy(ctx, rect, nativeTime)` is the 2D-engine bridge used by the
technical director. It is a vector drawing call, not a captured Studio image.
`window.__studyDiagnostics()` reports the last study render. The existing
portrait film route is preserved; this does not add general landscape layouts to
every legacy panel, viewer or manual example.

## Export

`node scripts/render.mjs <page> --encoder png --out <external/file.mp4>` feeds PNG
RGB frames into ffmpeg, avoiding intermediate JPEG compression. The final H.264
delivery is still lossy. JPEG remains the default and browser H.264 retains its
fallback. PNG and JPEG use their respective input colour conversions.

The requested output `--fps` is propagated to the frame generator's shutter.
`__frameInfo` exposes the actual frame dimensions and fps. The technical director
draws labels after its native scene and does not temporally average them.

## Repeatable checks

```sh
node scripts/build-films.mjs
node --test tests/study-quality.test.mjs tests/encoding.test.mjs
node scripts/audit-film-quality.mjs --out <external/audit-folder>
node --test --test-concurrency=1 tests/*.test.mjs
node scripts/lint.mjs
```

Use `BROWSER` to select a specific installed Chromium browser. The quality audit
samples every second, visits chapters out of order and returns to the first
sample. It records clipping, overlapping text, minimum font size, scene variance,
native bounds, fps propagation, GPU-context creation and repeat-frame differences.
These checks do not certify physical truth or artistic quality. They do not cover
every frame of a final encoded movie or replace listening.

The audit fingerprints the source spec, its optional `data.js`, generated page,
fonts, native modules, vendor bundle, director and export code. Production refuses
a missing, failed or stale audit. Passing an automated audit does not manufacture
human approval. The release/media upload and public-page replacement are later
steps, after the quality stage is reviewed.

## Evidence and existing assets

Gate errors block a study. CONSISTENT and synthetic NOTHING CHECKED states are
preserved; changing a renderer never promotes them to VERIFIED. Existing golden
frames and their comparison thresholds are not regenerated or loosened. The
technical collection uses the existing models; it does not claim that every model
was rebuilt or every source independently remeasured.

## Revised Studio collection

The active catalogue is built from `films/catalog.mjs` (18 preserved themes)
and `films/revision-catalog.mjs` (16 revised construction studies). The earlier
14 synthetic studies remain archived in source and are excluded from the active
homepage. Their automated checks did not establish artistic acceptance.

The revised assemblies use the original Studio renderer. Their cited facts and
estimated geometry are documented separately in
[the source notes](../films/studio-revision/notes/). They are educational models,
not manufacturer CAD or load/flow simulations. The bearing pilot established
the visual direction; publication does not claim individual user approval of
every new film. The 16 revised films are silent, 1600 x 900, 30 fps, 12 seconds.

To reproduce the fifteen additions, install the optional image-processing tool
`sharp` locally (`npm install --no-save --package-lock=false sharp`), provide
ffmpeg/ffprobe and a Chromium browser, then run:

```sh
node scripts/render-studio-revision.mjs --render --out /external/studio-revision
node scripts/build-film-gallery.mjs
```

The renderer writes per-film receipts, source fingerprints, framing and geometry
checks, three chapter stills, and complete-decode results. It reuses a previous
export only when its fingerprint matches. Encoding comparisons and the corrected
thread-crest mesh check are recorded in
[the publication audit](publication/technical-2026-10/).

The media release contains only the 34 active films, a SHA-256 manifest and checksums. Videos are not committed to Git. GitHub Pages
publishes the repository root from main; the gallery resolves its film URLs to
the technical-2026-10 release on the public Pages hostname.
