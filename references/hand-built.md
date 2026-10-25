# The hand-built route

Part of the mechanism skill (SKILL.md). Open it only when the declarative route (one `spec.js`) cannot express the object: a figure scripted by hand on `kit/figure.js`, with its own dossier, photos and sound.

## Workflow (hand-built route)

1. **Dossier** (`data/<subject>/<subject>.json`): body size, display, SoC, battery, cameras (MP, pixel pitch, format, f-number, equivalent focal length), materials, ports, buttons, sources with URLs. Keep conflicts in the file.
2. **Reference photos** (`data/<subject>/ref/`): download, view, measure. Record the result as a `layout` block in the dossier, in a stated coordinate frame (back view: x from the left edge, y from the top), with a `conf` tag and the photo it came from.
3. **Derive** (`scripts/derive-<subject>.mjs`): compute everything derivable and print the cross-checks. If a check fails, fix the model or say so. Generates `examples/<subject>/model.js`.
4. **Build the scene** on `kit/figure.js`: one `part()` per physical piece, with its own `info` (title, lines, conf tags), explode offset and material. Display stacks, boards, batteries and camera modules are separate parts so they can explode.
5. **Script the film**: `F.run({ duration, keys, script, audio })`. Camera keys `[t, view, ease]` with `dof`, per-part `arc`, `spin`, `tilt`, staggered `explodeK`, a moving key light, tour stops that focus one part and show a callout, then 2D panels (structure, interior, sensors to scale, processors, comparison, outro). Every panel shows its sources.
6. **Design the sound** with `kit/sound.js` (see below). Never reuse another figure's cue list.
7. **Check stills before rendering**: `node scripts/render.mjs <page> --still <t> --blur 1`. Look at the assembled view, an exploded tour stop, each panel, and compare the rear view with the real photos side by side.
8. **Render**: `node scripts/render.mjs <page> --duration <s> --fps 30 --blur 3 --out out/<name>.mp4` (about 6 s of wall time per second of video). Verify duration, stereo, loudness, contact sheet. Test `?explore` with `scripts/probe.mjs` (simulated mouse). For a poster or a cover image, add `--pathtrace 128 --timeout 900` to the `--still` command: a real path tracer, one to six minutes per image, never for the film (see `docs/rendering.md`).

## The engine

- `kit/vendor/three.bundle.js`: three.js 0.186 plus EffectComposer, GTAO, Bokeh, Bloom, OutputPass, RoomEnvironment. Rebuild with `scripts/build-vendor.mjs` (`tools/vendor-build`). Works from `file://`.
- `kit/gl.js`: perspective camera (fov 22; `zoom` = px per mm at the target), managed colour, AgX Punchy tone mapping, studio environment, soft shadows, MSAA 4x, screen-space reflections on metals (renders only), GTAO, depth of field via `view.dof`, bloom, path-traced stills with `?pathtrace`. `G.mat` (physical material), `G.glass` (real transmission), `G.canvasTex`, `G.rbox`. Traps: `visible = null` does not hide (use booleans), `position`/`rotation` are read-only (copy), transmission needs `transparent: false`.
- `kit/figure.js`: `MX.figure({ w, h, axes, stage, card })`, `F.add(part)`, `F.finish()`, `F.camera`, `F.shot`, `F.drift`, `F.overlay`, `F.run`, `F.explore` (orbit, wheel zoom, explode slider, view presets, layer toggles, measure between two points, tap a part). HUD helpers in `F.hud`: `dim`, `tag`, `panel`, `info`.
- `kit/core.js`: easing (`MX.E.bezier`, `outBack`, `outElastic`, `smooth`, `snap`), `MX.card`, `MX.callout`, `MX.run` (frame-exact capture with motion blur by subframes, stereo WAV).
- `kit/sound.js`: modal synthesis per material (glass, aluminum, steel, plastic, pcb, ceramic, pouch, rubber; pitch falls with the size of the part, decay differs by material), `click`, `whoosh`, `servo`, `charge`, `blip`, `tone`, `boom`, stereo pan per object, reverb, generative music bed with its own key and tempo. Map events to the physics: a part landing = impact of its own material and size; CPU cores = notes quantized to a scale by clock speed; each lens = a steel ring sized like the lens. `scripts/soundtest.mjs` measures that materials and sizes really sound different.

## Look and feel

Paper background, ink text, teal for measured and spec, ember for estimated, one accent only. Glass screens are emissive. Metals reflect the studio. Everything that is not the subject of the current shot is dimmed and defocused. Labels sit at fixed screen positions per shot. Text at 18 px or more.
