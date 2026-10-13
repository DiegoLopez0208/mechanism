<h1 align="center">mechanism</h1>

<p align="center"><b>Model a real object exactly. Take it apart. Film it.</b><br>
A skill for coding agents that researches a real product or machine, writes a spec where every number says where it came from,<br>
refuses to render when the numbers do not add up, and outputs a film, an interactive viewer and a 3D model.</p>

<p align="center">
  <a href="https://diegolopez0208.github.io/mechanism/"><b>Live page</b></a> &middot;
  <a href="https://diegolopez0208.github.io/mechanism/#touch">Try the viewers</a> &middot;
  <a href="#install">Install</a> &middot;
  <a href="#examples">Examples</a> &middot;
  <a href="#how-it-works">How it works</a>
</p>

<p align="center">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-0b7285">
  <img alt="three.js" src="https://img.shields.io/badge/three.js-0.186-23221f">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A522-0b7285">
  <img alt="Claude Code skill" src="https://img.shields.io/badge/Claude%20Code-skill-c8542a">
</p>

<p align="center"><img src="docs/media/enigma.gif" width="540" alt="Enigma I: the signal travelling through the rotors, checked against the published test vector"></p>
<p align="center">
  <img src="docs/media/rubik.gif" width="260" alt="Rubik's cube: the 20-move superflip">
  <img src="docs/media/k20a.gif" width="260" alt="Honda K20A, firing order 1-3-4-2">
  <img src="docs/media/hub.gif" width="260" alt="Three-speed planetary hub">
</p>

## What it does

Ask your agent for an exploded view of something real. It does not draw what it can look up wrong:

1. **Researches.** Searches, opens datasheets and teardowns, downloads the pictures and looks at them, measures them.
2. **Writes a spec.** Parts with real dimensions, how they move, and the evidence behind every number.
3. **Runs the gate.** The model is run against what is published. A spec that does not add up is not rendered.
4. **Renders.** A 4:5 / 9:16 / 1:1 film with real recorded sound, a live viewer, and an STL / GLB.

| Label | Meaning |
|---|---|
| `SPEC` | Published by the maker or a datasheet. |
| `MEASURED` | Measured on an official photo, scale from a published size, error stated. |
| `DERIVED` | A formula plus a cross-check against another published number. |
| `ESTIMATED` | Nobody publishes it. Drawn dashed and said out loud. |

## The gate

```
$ node scripts/check-spec.mjs examples/rubik/spec.js
Rubik's Cube  (rubik)
parts: 26   claims: 9   sources: 2
cube: 26 cubies
  phase R U R' U' x 6: 6 (24 turns)
  phase Longest period: 1260 (10 turns)  published 1,260  ok
  phase Superflip: 20 moves (20 turns)  published 20 moves  ok
  phase Positions: 43,252,003,274,489,856,000 (0 turns)  published 43,252,003,274,489,856,000  ok

PASSES
```

The cube is 26 pieces that really turn, with no permutation tables. The numbers above are read off the pieces.
Break something and it says exactly what:

```
$ node scripts/check-spec.mjs examples/k20a/spec.js      # firing order changed to 1-2-3-4
ERROR  firing order 1-2-3-4: cylinder 3 would have to fire at 360 degrees and its crank throw is at 180 (not possible with that crankshaft)
ERROR  phase Firing order: the model gives 1-2-3-4 and the published one is 1-3-4-2

DOES NOT PASS: 3 error(s)
```

It fails (exit 1) when a number has no source, a DERIVED claim has no cross-check, a MEASURED one no error, an ESTIMATED one no reason; when two meshing gears are not at the centre distance their module and teeth demand; when a mode of operation does not give the ratio the maker publishes; when a cipher disagrees with a published test; when a firing order is impossible with the crank; when the superflip does not flip 12 edges.

## Examples

Every example is a film, a live viewer (`examples/<name>/index.html?explore`, add `&theme=night`) and a model.

| | What its model had to reproduce |
|---|---|
| [`enigma`](examples/enigma) | The Enigma I rotor stack. Wiring, notches and stepping are simulated and must match the published tests: `AAAAA` becomes `BDZGO`, with rings BBB `EWTYX`, and the middle rotor double-steps `ADU > ADV > AEW > BFX`. In the viewer you type on your keyboard. |
| [`rubik`](examples/rubik) | 26 cubies that really turn. The 20-move superflip flips all 12 edges, the longest period is 1,260 and the positions count 43,252,003,274,489,856,000. |
| [`k20a`](examples/k20a) | Honda K20A, inline four with 16 valves. A crank-slider with exact kinematics: displacement computed from bore and stroke (1,998 cc published) and the published firing order 1-3-4-2 must be possible with the crank. The connecting rod and valve timing are not published and are drawn dashed. |
| [`mos6502`](examples/mos6502) | The 6502 in its 40-pin DIP. The gate counts the address and data pins on the pinout and compares them with the published 16-bit and 8-bit buses, computes the 64 KB address space and the 105 undefined opcodes, and measures the drawn leads against the DIP standard (2.54 mm pitch, 15.24 mm rows). Two sources have to agree; the body is estimated. |
| [`rtx4090`](examples/rtx4090) | GeForce RTX 4090 Founders Edition. TFLOPS (82.58 at boost, 73.07 at base), fillrates, the 1,008 GB/s of bandwidth and the 24 GB are each computed from the published cores, clocks, bus and data rate and must match. Every variable carries its claim; the memory packages are an estimated assumption and are drawn as one. The inside of the card is not published and is dashed. |
| [`hub`](examples/hub) | Three-speed planetary hub (Sturmey-Archer AW type). The running model gives 0.75, 1.00 and 1.333 against the published 75, 100 and 133 %. |
| [`switch`](examples/switch) | Cherry MX2A Red key switch: a press, not gears. The datasheet's three force points (30, 45, 100 cN) cannot come from one linear spring, and the film plots that instead of hiding it. |
| [`s25-vs-s26`](examples/s25-vs-s26) | Galaxy S25 Ultra against S26 Ultra at the same scale, measured on the official renders. Interiors are not drawn: no readable photo, and the film says so. |
| [`phones`](examples/phones) | POCO X8 Pro Max against Galaxy S26 Ultra, measured on official photos with OpenCV, interior from the maker's spare-parts photos. |
| [`rpi4`](examples/rpi4) | Raspberry Pi 4B from the official datasheet drawing. |
| [`instruments`](examples/instruments), [`backpressure`](examples/backpressure) | A catalog photo turned into 3D plates with its limits stated; an idea from a repo built as a working machine. |

## Install

As a Claude Code skill:

```bash
# macOS / Linux
git clone https://github.com/DiegoLopez0208/mechanism ~/.claude/skills/mechanism
# Windows (PowerShell)
git clone https://github.com/DiegoLopez0208/mechanism $env:USERPROFILE\.claude\skills\mechanism
```

Then ask: *"Use mechanism to model a mechanical keyboard switch exactly, with its sources."* The agent researches, writes the spec, runs the gate and renders.

Needs Node 22+, Edge or Chrome, and `ffmpeg`. `uv` is only used to measure photos. Nothing to install to render.

## Use the toolkit directly

```bash
node scripts/new.mjs my-object --title "My object"          # a spec that already passes the gate
node scripts/check-spec.mjs examples/my-object/spec.js      # the gate
node scripts/probe.mjs "examples/my-object/index.html?explore" out/probe   # mouse-driven check of the viewer
node scripts/render.mjs examples/my-object/index.html --blur 3 --out out/my-object.mp4
node scripts/render.mjs examples/my-object/index.html --theme night --aspect 9:16 --out out/my-object-916.mp4
node scripts/render.mjs examples/my-object/index.html --from 13 --to 21 --out out/clip.mp4      # a clip
node scripts/render.mjs examples/my-object/index.html --export glb --e 1 --out out/my-object.mp4   # also: --export stl
node scripts/render.mjs examples/my-object/index.html --remux out/my-object.mp4                  # redo only the sound, in seconds
```

## How it works

One spec in, everything out:

```
spec.js  ->  film (4:5, 9:16, 1:1; paper or night; stereo)
         ->  clips cut from the film
         ->  interactive viewer (orbit, explode, measure, run the mechanism)
         ->  STL and GLB of the model
```

A part, with the evidence it stands on:

```js
{ id: 'ring', kind: 'ring', p: { m: 0.8, z: 60, ro: 27.4, width: 8 }, mat: 'steel-dark',
  at: [0, 0, 0], body: 'ring', explode: [0, 0, -12], conf: 'derived', claims: ['teeth', 'formula'] }
```

| Mechanism | Declared as | The gate checks |
|---|---|---|
| Gear trains | `mechanism.links` + modes | Willis ratios, centre distances, tooth phases, published ratios |
| Presses and slides | `mechanism.press` | the force points against a linear spring |
| Rotor ciphers | `mechanism.enigma` | every published test, letter by letter, and reciprocity |
| Crank-slider engines | `mechanism.engine` | displacement, firing order possible with the crank, piston reaches the deck |
| Puzzles | `mechanism.cube` | period of a sequence, the superflip, the number of positions |
| Calculated figures | `mechanism.calc` | every published figure that comes out of others, from variables that each name their source |

The director builds the film by itself: staggered assembly, a cutaway while the mechanism runs, one mode at a time with its published number, the exploded view, a tour with a callout per part, re-assembly, and an evidence table with the sources.

### Sound

Real recordings, not synthesis: keys, metal, glass, plastic and rubber impacts (CC0, see [THIRD_PARTY.md](THIRD_PARTY.md)), mapped per material and size. Tooth ticks are the real tooth passes of the running gears, and the engine fires in its real order.

### Repository

| Path | Role |
|---|---|
| `SKILL.md` | The skill: when to use it, the method, the rules. |
| `kit/parts.js` | Parametric parts with real dimensions: involute gears, rings, sprockets, bearings, springs, crankshafts, rods, pistons, valves, rotors, cubies. |
| `kit/kin.js`, `kit/enigma.js`, `kit/cube.js` | Gear-train kinematics (Willis), the Enigma I logic and the Rubik cube as 26 cubies. Pure: run in Node and are checked against published vectors. |
| `kit/spec-core.js`, `kit/spec.js` | Validate a spec; compile it to scene, director, panels and sound. |
| `kit/gl.js`, `kit/figure.js` | three.js stage (physical materials, glass, depth of field, ambient occlusion, bloom) and the figure engine. |
| `kit/sound.js`, `kit/samples.js` | Sound per material and size, from CC0 recordings. |
| `scripts/` | `check-spec`, `render`, `probe`, `new`, and the build scripts. |
| `examples/` | The objects above. |
| `docs/`, `index.html` | The landing page (its hero is the same parts running live in three.js). |

## Limits, stated plainly

- Mechanisms so far: gear trains (one degree of freedom), presses and slides, rotor ciphers, crank-slider engines, the Rubik cube and calculated figures. No general linkages yet.
- The hub's power path per mode is simplified: pawls and clutch are not modelled, and the film says so.
- Interiors need photos or drawings. Without them they are estimated and dashed.
- A single photo gives no millimetres: it needs a published size, a ruler or a datasheet.
- Rendering is heavy: about 6 minutes per minute of video.
- The sources can be wrong too. The spec keeps them next to each claim so you can check, and notes where a page refused to be read.

## Roadmap

pin-tumbler lock (6^5 keys), bicycle drivetrain. The rule is the same for all: numbers that can be computed and checked against what is published.

## License

MIT. three.js, Inter and Cormorant Garamond are bundled under their own licenses, and the sound samples are CC0: see [THIRD_PARTY.md](THIRD_PARTY.md). Product names identify the objects modelled and belong to their owners; their photos and datasheets are not redistributed.
