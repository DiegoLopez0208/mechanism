# Draft 0.3: engineering SVG export

Status: implemented on `feature/draft-svg-03` (not merged). Scope: an SVG drawing of each 2D `drawing` part, written from the
geometry `kit/geom2d.js` validated, with its dimensions, in two explicit scales. No PDF or DXF, no tolerances.

## Pipeline

```
spec ── kit/spec-core.js validate()  (errors: nothing is exported)
  └── kit/geom2d.js viewSet()  (contours, exact arcs, lines, section, dimensions: all from build())
        └── kit/svg2d.js part()  (scale mode, label layout, collision check, escaping) ──► SVG text
scripts/export-svg.mjs  (Node, no browser): one file per drawing part, written only inside --out
```

The exporter never measures anything: every number it writes is a value of `geom2d.build()` (through the view set). It never
reads pixels or a canvas. Curves stay curves: a circle is `<circle>`, a rounded corner is an SVG arc (`A`), never segments.

## Scale modes (`--mode`, required)

| | `geometry-1to1` | `sheet-fit` |
|---|---|---|
| `width`, `height` | the drawing's extent in mm (`"184.2mm"`) | the sheet: A4 landscape, `"297mm"` x `"210mm"` |
| `viewBox` | `x y W H` in model mm: 1 user unit = 1 mm | `0 0 297 210`: 1 user unit = 1 mm of paper |
| geometry | at its declared size: a hole declared Ø6.6 is `<circle r="3.3">` | scaled by k (uniform), written on the sheet as `SCALE 1:x (NOT 1:1)` |
| text, strokes, arrows | mm of the document (3.5 mm text, 0.5 / 0.25 mm lines): not geometry, not scaled with it | mm of paper, the same sizes |

Model y points up; SVG y points down: the drawing is the geometry with y flipped (view coordinates), so a part reads the same as
on the Paper sheet. In 1:1 the origin of the viewBox is the model's own (x, -y), so a coordinate in the file is a coordinate of
the part.

A file at 1:1 keeps the nominal sizes; that alone does not make it a manufacturing drawing (no tolerances, no surface or
material specification, no fits, no check against a source unless the gate compared it). Every file says so.

## Dimensions

Three things are kept apart: the **value** (a named dimension of `build()`: `outline.w`, `fix1.d`, `bolts.pcd`, ...), the
**dimension geometry** (extension and dimension lines, leaders: placed by `viewSet()` in model units), and the **label
position** (chosen by the exporter). A label is placed at its preferred spot and then moved along the candidates it has (along
the dimension line, the other side, the other leader directions); if every candidate collides with another label, a dimension
line, the part's contours or the sheet border, the export stops and names the dimension. Nothing is overlapped silently.

Colour carries the evidence status the gate gives: compared with a source (teal), declared in the spec but not verified (black),
estimated (amber).

## Safety

- The spec cannot inject SVG: only the exporter's own elements are written; every text (title, part names, labels) is escaped
  for XML; ids are `[a-z0-9-]` slugs made unique; colours and fonts are fixed.
- Every number written is finite (checked before output) and formatted with a fixed precision: the same spec gives the same bytes.
- `export-svg.mjs` writes `<out>/<spec id>-<part id>.svg` only: names are slugs, the path is checked to stay inside `--out`, and
  a file there is overwritten only if it is an earlier export of this tool.

## Limits (what a file of this exporter is not)

- No tolerances, fits, surface finish, certified material or any manufacturing specification: not a drawing approved for manufacture.
- One view per part (the plan or the declared section); no projected views, no chain dimensioning.
- 1:1 is geometric: 1 user unit is 1 mm and `width` / `height` declare the physical size, which a viewer honours (checked in
  Chromium). Printing at true size is not guaranteed: a printer driver, "fit to page" or a viewer's zoom changes it; check the
  printed outline with a rule.
- `sheet-fit` uses whatever scale fits the sheet (written on it, e.g. 1:1.675): it is not a normalised drafting scale (1:2, 1:5).
- Label layout is a placement search, not a solver: a dense part may be refused (`--allow-collisions` writes it and reports the
  collisions). Label widths are estimated (0.62 x the text size per character for Arial / Helvetica); another font may differ.
- A leader may cross the part's outline to reach free space (never another hole or a label).
- No PDF or DXF.

## Notes in the file

`<title>`, `<desc>` and, in `sheet-fit`, the title block say what is known: the geometry is valid (closed contours, holes inside
the material, no overlap); the dimensions are internally consistent (taken from the geometry); how many are compared with a
source, declared or estimated; the gate's verdict; the checks that did not run (the 3D mesh area check); the scale.
