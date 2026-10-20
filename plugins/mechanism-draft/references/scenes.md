# Paper scenes (load when writing a spec for Draft)

## Vector scene: `pin-section`

The only native vector scene in Draft 0.1. It draws a pin tumbler lock in section: housing and plug hatched, pin stacks with springs, the key sliding in, each split landing on the shear line, then a wrong key. It uses no 3D model.

Every field is a number or function the spec already defines and the gate already checks (see `examples/lock/spec.js`):

| Field | Meaning | Unit |
|---|---|---|
| `kind` | `'pin-section'` | |
| `inch` | millimetres per inch (25.4) | mm |
| `first`, `pitch` | shoulder to first cut, cut spacing | in |
| `depth[]`, `pin[]` | cut depth and key-pin length per cut number | in |
| `plug` | plug diameter (the shear line) | in |
| `code[]`, `wrong[]` | cut numbers of the right key and of the wrong key | |
| `driver`, `cap`, `keyway`, `keyTop`, `tip`, `pinR`, `chamber` | drawing geometry | mm |
| `profile(code)(x)` | key profile height at `x` for a code | mm |

A spec whose `paperScene.kind` is not a kind Draft draws is not a vector scene: it goes to the mesh sheet (and needs the optional mesh pack).

## Mesh sheet (optional pack)

Any spec without a vector scene: Paper projects the compiled parts to front, top and side views, draws the tour parts in turn with numbered callouts, estimated parts dashed in amber. The views are not to scale.

## Declared 2D geometry: `kind: 'geometry'` (Draft 0.2)

Flat pieces with no 3D model and no drawing code: each part of `kind: 'drawing'` declares its geometry in `p`, `kit/geom2d.js` checks it (in the gate, in Node and in the page) and turns it into the view set Paper draws, one sheet per part. See `examples/demo-plate`, `demo-flange` and `demo-section` (synthetic demonstrations, every number ESTIMATED).

```js
parts: [{ id: 'plate', name: 'Mounting plate', kind: 'drawing', mat: 'aluminum', conf: 'estimated', claims: ['...'],
  p: { unit: 'mm', thickness: 4,
    outline: { type: 'rect', w: 160, h: 100, r: 6 },                       // or { type: 'circle', d } or { type: 'polygon', points: [[x, y], ...] }
    holes: [{ id: 'fix1', type: 'circle', d: 6.6, at: [-68, -38] }, { id: 'window', type: 'rect', w: 44, h: 22, r: 4, at: [-20, 8] }],
    patterns: [{ id: 'bolts', type: 'polar', of: { type: 'circle', d: 11 }, n: 6, pcd: 110, start: 90 },
               { id: 'vent', type: 'linear', of: { type: 'circle', d: 5 }, n: 5, step: [11, 0], at: [-22, -30] }],
    lines: [{ type: 'segment', a: [x, y], b: [x, y], style: 'center' }, { type: 'arc', at: [x, y], r, from: 0, to: 90 }],
    section: { name: 'A-A', hatch: { angle: 45, pitch: 3 } } },            // only when the drawing is a cut: the material is hatched
  params: { 'outline.w': { value: 160, unit: 'mm', conf: 'spec', claim: '...' } } }],
paperScene: { kind: 'geometry' }, presentation: { method: 'paper' }
```

| Rule | |
|---|---|
| Units | `mm` only; anything else is refused |
| Shapes | `rect` (`w`, `h`, corner `r`, centre `at`), `circle` (`d`, centre `at`), `polygon` (`points`, any winding, closed implicitly, simple) |
| Holes | every hole has an `id`, lies strictly inside the material and does not touch another; a pattern expands to `<id>.1 .. <id>.n` |
| Dimensions | named: `outline.w`, `outline.h`, `outline.d`, `outline.r`, `<hole>.d`, `<hole>.w`, `<hole>.h`, `<hole>.x`, `<hole>.y` (from the left and bottom edge of the outline's box), `<pattern>.n`, `.d`, `.pcd`, `.step`, `thickness` |
| Evidence | each dimension in `params` has the class of the claim it cites (`references/checks.md`): printed by a source (teal), derived (blue in the SVG, teal dashed in Paper), measured (violet / ink dotted), given by the user (ink, counted apart), estimated (amber); a dimension with no `params` is drawn in ink and counted as declared, not verified |
| Composite labels | a "w x h" callout carries both keys and values: `data-keys="win.w win.h" data-values="20 12"` (`data-key` / `data-value` keep the first, as in Draft 0.3) and shows the weaker evidence of the two |
| Views | only the one declared: a plan, or a section when `section` is set. No side view is deduced from a flat outline; Studio refuses a `drawing` part |

The mesh area check (`GEOMETRY_AREA`) does not run on this path and is reported `NOT RUN` (`vector_scene_without_mesh_projection`); the 2D checks above are part of the gate. Full description: `docs/draft-geometry.md` in the Mechanism repository.

### A real part: `examples/rpi4-board` (Draft 0.4)

The Raspberry Pi 4 Model B board outline (85 x 56 mm, R3 corners) and its four Ø2.7 mounting holes (3.5 mm from the edges, 58 x 49 mm apart), from Raspberry Pi's mechanical drawing (PDF RP-008343-DS-1) and DXF (RP-008342-DS-1), cited, not copied. Every drawn dimension is compared with the PDF through `params` (61.5 and 52.5, computed from the printed 3.5 + 58 and 3.5 + 49, are DERIVED and drawn as such); the hole pitch computed from the DXF coordinates is compared with the PDF's 58 and 49. The DXF is declared the same source as the PDF (`derives`): one maker, one design, so the gate says CONSISTENT, not VERIFIED. Reference only: the maker gives the size as approximate and publishes no tolerance; the copper pads, connectors, components, heights and thickness are omitted.

### SVG export (Draft 0.3)

`node scripts/export-svg.mjs <spec.js> --mode geometry-1to1|sheet-fit --out <dir> [--json] [--allow-collisions]`, no browser. `kit/svg2d.js` writes the view set of each `drawing` part (all of it from `geom2d.build()`): one element per contour (`<circle>` for circles, exact `A` arcs for rounded corners), the material as one even-odd path (hatched with a `<pattern>` in a section), centre and hidden lines, and the dimensions with `data-key` / `data-value`.

| | `geometry-1to1` | `sheet-fit` |
|---|---|---|
| `width` / `height` | the drawing's extent in mm | `297mm` x `210mm` (A4 landscape) |
| `viewBox` | in model mm (1 unit = 1 mm; y is the model's, flipped) | `0 0 297 210` (1 unit = 1 mm of paper) |
| geometry | its declared size | scaled by k, written as `SCALE 1:x (NOT 1:1)` |

Text (3.5 mm) and strokes (0.5 / 0.25 mm) are document sizes, never geometry. The 1:1 legend (view, scale, verdict, "NOT A MANUFACTURING DRAWING") wraps onto as many lines as a narrow part needs, and a legend part longer than the drawing widens the document to the right; the part never moves or scales. Labels are placed avoiding contours, dimension lines, other labels and the sheet border; if one cannot be placed the export stops and says which (`--allow-collisions` writes it anyway and reports it). Spec text is escaped, ids are slugs, nothing from the spec becomes markup; files go to `<out>/<spec id>-<part id>.svg` and never replace a file the tool did not write. Every file states the geometry is valid, how many dimensions are compared, declared or estimated, the gate's verdict, what did not run, and that it is not a manufacturing drawing.

Limits: no tolerances, fits, finish or certified material (not approved for manufacture); one view per part; 1:1 is geometric (a viewer honours the declared mm size, a printer may not: check a print with a rule); the `sheet-fit` scale is whatever fits, not a normalised drafting scale; a dense layout may be refused; no PDF or DXF.

## Extension points (for later versions)

- **New vector scenes** are entries of `MX.paperEngine.scenes` (`{ steps(scene), draw(c, a, k) }`) in `kit/paper-engine.js` and of `paperScenes` in `kit/manifest.js`; a test keeps the two lists equal.
- **New geometry** (more shapes, constraints, export to SVG/PDF/DXF) belongs in `kit/geom2d.js`, which stays the source of truth: the view set is a drawing of it and nothing is read back from it.
