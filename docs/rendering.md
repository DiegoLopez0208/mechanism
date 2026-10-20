# Rendering: engines, lengths, encoders and the visual tests

The technical side of the films, moved out of the README. Nothing here changes what the gate checks.

## Presentation methods and backgrounds

Choose a rendering engine independently of its background.

- **Studio** is the WebGL product film: assembly, lighting, materials and operation.
- **Workflow** is an independent Canvas2D factory/process engine with stations, conveyors and moving data carriers; it does not build or show the Studio object.
- **Paper** is an independent Canvas2D drafting engine: orthographic front/top/side drawings, progressive strokes, exploded construction, numbered details, and the declared 2D geometry of Draft. It reuses model geometry as data, never a shaded Studio image.

```sh
node scripts/render.mjs examples/lock/index.html --method studio --background porcelain --length short --aspect 9:16 --encoder browser --out work/studio.mp4
node scripts/render.mjs examples/react/index.html --method workflow --background graphite --length short --aspect 9:16 --encoder browser --out work/workflow.mp4
node scripts/render.mjs examples/lock/index.html --method paper --background ivory --length short --aspect 9:16 --encoder browser --out work/paper.mp4
```

Methods: `studio`, `workflow`, `paper`. Backgrounds: `graphite`, `blueprint`, `porcelain`, `ivory` (all twelve combinations). Use the same names in `?method=paper&background=blueprint` or `presentation: { method: 'paper', background: 'ivory' }` in the spec; query options override the spec. Old `style`/`theme` films keep their appearance when no presentation option is given. Studio has the orbit/explore viewer; Workflow and Paper use their own playback canvas even with `?explore`.

Studio renders 3D at 1.5x and downsamples to delivery resolution, keeping MSAA 4x (`stage.renderScale`: 1-2). Workflow and Paper create no WebGL context: their graphics and type are rasterized from vector paths on a deterministic CPU Canvas2D surface, with no 3D shading or temporal blur. Their short/normal/extended cuts are 30/60/90 s; Studio keeps the object's own timing. Workflow's progress is illustrative, not measured latency. Paper's mechanism sheets are construction views, not to scale (Draft's SVG export is the true-size file); estimates stay dashed. STL/GLB exports use Studio.

`boot.js` loads `kit/presentation.js`, `kit/workflow-engine.js` and `kit/paper-engine.js` after `core.js`; hand-written script lists must include them. `kit/manifest.js` is the single list of what each engine needs. Configuration, planning, factory layout and orthographic projection helpers also run in Node/vm without a DOM. Validation: [presentations.md](presentations.md).

## The Studio look (0.10, 0.11)

- **Studio environment** (`G.studioEnvironment`): what metal reflects is an HDR product studio (overhead key softbox, broad front fill, side strips, back rim panel). `stage({ environment: 'room' })` gives back three's RoomEnvironment.
- **Surface detail** (`G.DETAIL`, named per material in `kit/parts.js`): procedural micro-detail in the shader, in object space, with no textures and no UVs. It gives fine grain (brushed streaks on machined metal, mottling on cast metal, grain on plastic, rubber and boards), large soft variation of the roughness (handling marks, about 10 mm), and edge wear (polished metal edges, rubbed paint), and it fades before it could shimmer. Metals are fully metallic; brushed metal has anisotropic highlights; paint has a clear coat.
- **Screen-space reflections**: metal reflects the parts next to it. As in Eevee, a reflection layer over the multisampled frame (shadows and edges unchanged), from three's SSRPass, metals only. On by default in renders (`render.mjs` opens pages with `?render=1`), off in live viewers; `--ssr 0` / `--ssr 1` (or `?ssr=`) overrides. At half resolution with a capped ray march (240 steps); about +15 % render time.
- **Tone map**: `agx-punchy` by default (AgX, which rolls bright highlights off like a photograph, with Blender's Punchy look restoring saturation and contrast); `--tonemap agx` or `--tonemap neutral` (the look up to 0.10, exact maker colours).
- **Path-traced stills**: `render.mjs <page> --still <t> --pathtrace 128 --blur 1 --timeout 900` renders the frame with three-gpu-pathtracer (light bounces, soft shadows and reflections from the physics), over the page's background, with the studio as environment. A raster pass on top adds what the path tracer has no notion of: the shadow on the floor, the line overlays (dashed estimate boxes, leaders) and the x-ray parts (transparent, drawn with their own material as in a film). The result then goes through the same finish as a raster frame (depth of field, bloom, tone map, Punchy). Instanced meshes are traced one instance at a time (the WebGL path tracer has no instancing). Parts dimmed by a tour stop are left out, and metals get a roughness floor of 0.2 in place of the raster's shader micro-detail (a near-mirror seen edge-on otherwise comes out black). Measured on a laptop RTX 3080 Ti at 128 samples: 1 to 1.5 minutes for a few parts, about 5.5 minutes for the 58-part hub. The cost is paid once when the image is made: the page that shows the poster loads a JPEG, and the path tracer (215 KB) loads only with `?pathtrace`. Not for films (a 30 s film would take days).

## Styles

Studio films are drawn as a **dossier** by default: a blue engineering drawing with a grid and ruler ticks, monospaced type and a data block counting how many numbers are SPEC, DERIVED and ESTIMATED. Three other styles are chosen with `--style` (or `?style=` in the viewers) and defined as one entry each in `MX.styles` (`kit/core.js`):

| Style | Look |
|---|---|
| `dossier` | The default. Blueprint grid, ruler, mono type, evidence block. |
| `paper` | Light paper, serif titles, corner-marked card. |
| `night` | The paper card in the dark. |
| `studio` | Black product-film set with a glow and rim light in the maker's colour (`brand: { accent }` in the spec). |

## Three lengths

The same spec renders three films: `--length short` (about 30 s: the plain sentence, the first checks, the explode, two parts, the receipt), `normal` (the default: verdict-first opening, every check, the tour, the evidence pages) and `extended` (longer checks, up to 12 parts in the tour). A spec can say what its short cut keeps, `director: { short: { modes: ['unpack', 'crc'], tour: ['out25', 'bookP'] } }` (a cube or a cipher keeps every phase, because their state runs through all of them), and its default with `director.length`.

The director builds the film by itself: staggered assembly, a cutaway while the mechanism runs, one mode at a time with its published number, the exploded view (held still for `director.explodedHold` seconds), a tour with a callout per part, re-assembly, and a receipt with the gate's verdict (VERIFIED, CONSISTENT or DOES NOT PASS) and every figure compared. `director.cold` opens with the question and the published answers checked one by one; `director.hold` gives the finished object a beauty shot first.

## Encoders and browser sessions

`--encoder jpeg` (the compatibility default) or `--encoder browser` (software H.264 through WebCodecs, copied into MP4; it falls back to JPEG when VideoEncoder or H.264 is missing). Its bitrate scales with frame size, fps and part count; `--bitrate <bits/s>` overrides it. Both keep stereo sound, two-pass loudness normalization and clip timing. The JPEG path converts full-range BT.601 to limited-range BT.709 with accurate rounding; both carry colour metadata in the stream and the container.

Every browser script uses an isolated profile and an OS-chosen CDP port. Render operations have a 30 s watchdog (`--timeout <seconds>`); the browser tree is stopped by its own PID and a stalled attempt is retried once from frame zero. `BROWSER_TIMEOUT_MS` configures the shared helper. For GPU-less CI, `BROWSER_SOFTWARE=1` selects SwiftShader.

`node scripts/validate-render.mjs lock winrar --out <work>/quality --encoder browser` saves lossless references and decoded frames from modes, tours and every claims/sources/receipt panel, reports RGB error and local-window SSIM, and leaves the visual review marked pending (`--video-dir <work>/films` compares already rendered films). A metric is not a visual approval.

## Visual regression

`npm test` includes four golden frames per example (mode, exploded view, claims, receipt), plus controls that inject text overflow and a floating decor part. The references are zlib-compressed 360x450 RGB, with separate Windows and Linux sets (native fonts differ). Compare with `node scripts/visual-regression.mjs`; regenerate on purpose with `--update` (optionally naming examples) and review the changed frames before accepting them. CI only compares. The threshold combines mean SSIM, the worst 8x8 tile and the fraction of changed tiles, so a small displaced part is not hidden by the background. Sampled frames do not certify every instant of a film.

Frames use a seeded GTAO denoiser texture, so ambient occlusion repeats between runs; tiny GPU raster differences can still touch edge samples, and the tests bound them instead of claiming byte-identical PNGs.

## Sound

Real recordings, not synthesis: keys, metal, glass, plastic and rubber impacts (CC0, see [THIRD_PARTY.md](../THIRD_PARTY.md)), mapped per material and size. Tooth ticks are the real tooth passes of the running gears, and an engine fires in its real order.

## Speed

On a laptop with a discrete GPU a normal Studio film takes about 2 to 3 s per second of video and the 30 s cut about a minute (`--draft` gives a quick preview). With no GPU (software WebGL) one frame takes about 7 s: use `--still`, `lint-film.mjs` and the viewer there, and render elsewhere. Workflow and Paper do not need a GPU.
