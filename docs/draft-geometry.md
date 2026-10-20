# Draft 0.2: parametric vector geometry

Status: implemented on `feature/draft-parametric-02` (not merged). Scope: flat piece drawings from declared 2D geometry, with no
per-object drawing code, checked by the same gate as every other spec.

## Pipeline

```
spec.parts[kind: 'drawing'].p  (declared geometry, mm)
        │
        ▼
kit/geom2d.js  build(p) ──► errors / warnings / facts (areas) / dims (named values)
        │                     ▲
        │                     └── kit/spec-core.js (the gate, in the browser and in Node) calls the same build()
        ▼
kit/geom2d.js  viewSet(spec) ──► the plain view set (layout: 'piece')
        ▼
kit/paper-engine.js  (Canvas2D, one generic piece sheet)
```

The geometry is the source of truth. The view set is a drawing of it (view coordinates, exact arcs, hatch regions, dimension
lines); nothing is read back from it. No three.js on this path: `paperScene: { kind: 'geometry' }` is a vector path in
`kit/manifest.js`, so the page never loads the 3D stack or the mesh adapter.

## Data model (`kind: 'drawing'`)

```js
{ id: 'plate', name: 'Mounting plate', kind: 'drawing', mat: 'aluminum', conf: 'estimated', why: '...',
  info: { title, lines },
  p: {
    unit: 'mm',                                   // the only unit of 0.2; anything else is an error
    thickness: 5,                                 // stated; no side view is drawn from it
    outline:  { type: 'rect', w: 120, h: 80, r: 4 },          // the closed outer contour
    holes:    [{ id: 'h1', type: 'circle', d: 6.6, at: [-48, -28] },
               { id: 'win', type: 'rect', w: 30, h: 12, r: 2, at: [20, 10] },
               { id: 'cut', type: 'polygon', points: [[x, y], ...] }],
    patterns: [{ id: 'bolts', type: 'polar', of: { type: 'circle', d: 9 }, n: 6, pcd: 100, start: 90, at: [0, 0] },
               { id: 'row', type: 'linear', of: { type: 'circle', d: 4 }, n: 5, step: [12, 0], at: [-24, 30] }],
    lines:    [{ id: 'axis', type: 'segment', a: [x, y], b: [x, y], style: 'center' },
               { type: 'polyline', points: [...] }, { type: 'arc', at: [x, y], r, from: deg, to: deg }],
    section:  { name: 'A-A', hatch: { angle: 45, pitch: 3 } },  // the drawing is a cut: material is hatched
  },
  params: { 'outline.w': { value: 120, unit: 'mm', conf: 'spec', claim: 'c1' } } }
```

Shapes: `rect` (`w`, `h`, optional corner radius `r`, centre `at`), `circle` (`d`, centre `at`), `polygon` (`points`, closed
implicitly, either winding). `at` defaults to `[0, 0]`. A pattern expands to holes with ids `<pattern>.<k>` (1-based).

Named dimensions (`dims`), the keys `params` may compare:

| key | value |
|---|---|
| `thickness` | stated thickness |
| `outline.w`, `outline.h` | width and height of the outline's bounding box (a rect's own `w`, `h`) |
| `outline.d`, `outline.r` | circle diameter; rect corner radius |
| `<hole>.d` / `<hole>.w`, `<hole>.h` | hole size |
| `<hole>.x`, `<hole>.y` | hole centre from the datums: the left and the bottom edge of the outline's bounding box |
| `<pattern>.n`, `<pattern>.pcd`, `<pattern>.d`, `<pattern>.step` | pattern count, pitch circle, hole size, linear pitch |

## Invariants (checked by `build`, errors block the render)

- unit is `mm`; every coordinate and size is a finite number; sizes are positive; a rect's corner radius is at most half its
  shorter side; a pattern count is a positive integer.
- a polygon has at least three distinct vertices, no repeated consecutive vertex, a non-zero area and no self-intersection.
- every hole lies inside the material: a circle's centre is at least its radius inside the outline (exact signed distance for
  rect, rounded rect, circle and polygon outlines); a polygonal hole has every vertex inside and no edge crossing the outline.
- holes do not overlap or touch each other (touching would merge two contours into one).
- lines have positive length / radius and finite coordinates.

Facts (exact for the supported shapes, no tessellation): outline area, hole area, net area = outline − holes.

## Gate semantics (unchanged)

The geometry checks are internal consistency: a valid drawing is not a verified one. A dimension counts as compared only when a
`params` entry with a non-estimated claim gives the same value within its tolerance, exactly as for 3D parts; every other
dimension is drawn and listed as declared, not verified. The mesh area check (`GEOMETRY_AREA`) does not run on this path and
stays NOT RUN (`vector_scene_without_mesh_projection`); the 2D checks are part of the gate, not a replacement for it.

## What 0.2 does not do

No constraint solver, no 3D, no side view invented from a flat outline, no SVG/PDF/DXF export, no tolerances or fits. The views
are fitted to the sheet (not to scale); every drawn number is a geometry value.
