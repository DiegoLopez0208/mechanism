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

## Extension points (for later versions, not features of 0.1)

- **New vector scenes** are entries of `MX.paperEngine.scenes` (`{ steps(scene), draw(c, a, k) }`) in `kit/paper-engine.js` and of `paperScenes` in `kit/manifest.js`; a test keeps the two lists equal.
- **Anything drawn from geometry** goes through the plain view set the mesh adapter produces (`{ entries: [{ id, conf, anchor, views: { front|top|side: { points, bounds, offset } } }], parts }`). Dimensions, sections, SVG/PDF/DXF export and parametric geometry would be new producers or fields of that set; none exists yet.
