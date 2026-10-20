# Evidence classes and verdicts (BH-1)

Status: implemented on `feature/draft-beta-hardening-05` (not merged). This is the contract `kit/spec-core.js` enforces and `kit/geom2d.js`,
`kit/svg2d.js` and the Paper sheet display. It came out of the first stranger test of Draft 0.4, where a spec whose only source was the
user's own request passed as VERIFIED.

## Where a number comes from

Every claim has a class (`conf`). A dimension in `params` has the class of the claim it cites.

| Class | Meaning | The claim must have | Drawn as |
|---|---|---|---|
| `spec` (SPEC) | printed by a source someone else can open | `src` pointing at a source with a `url` | teal |
| `user` (DECLARED BY USER) | given by the person who asked | `src` pointing only at sources of `kind: 'user'` | ink |
| `measured` (MEASURED) | obtained by measuring, including reading a value off a figure or photo | `error`; on a 2D drawing also `method` (how it was read) and `uncertainty` (a number, in the value's unit) | violet (SVG), ink dotted (Paper) |
| `derived` (DERIVED) | computed from other numbers | `cross`: a second figure it was checked against | blue (SVG), teal dashed (Paper) |
| `estimated` (ESTIMATED) | assumed, approximated | `why` nobody publishes it | amber |

Rules (errors unless said otherwise):

- A source is either a document (`url`, an `http(s)` address someone else can open, with `fetched`) or the request of the person who asked:
  `{ id, kind: 'user', title, received, note }`. A user source has no `url`; giving it one is an error. A source with no `url` that is not
  `kind: 'user'` is an error, and the message says to declare `kind: 'user'` instead of inventing an address.
- A SPEC or MEASURED claim may not cite a user source: a number someone gave is not a publication. A USER claim may not cite a document.
  A DERIVED claim may compute from user numbers; its provenance is still the user's request.
- Placeholder addresses are refused: `example.com`, `example.org`, `example.net` and any subdomain of them; any host under the reserved
  `.invalid`, `.test` or `.example` (RFC 2606 / 6761); `localhost` and `127.0.0.1` (a source is a page someone else can open; this was
  already the contract).
- On a 2D drawing (`kind: 'drawing'`), a SPEC or USER dimension must be a number its claim states (in its `value` or its `text`; the same length
  written in inches or centimetres counts, a multiple of another number does not). `49` cited to a claim that prints `2` and `51` is refused:
  it is DERIVED. The parts of the older 3D examples get a warning instead (their specs predate the rule).
- A dimension's class must match its claim's class (a SPEC dimension citing a DERIVED claim is refused on a drawing, warned on a 3D part).
- On a 2D drawing, a MEASURED dimension's claim must give `method` and `uncertainty`. The uncertainty is recorded as an extraction
  uncertainty; nothing turns it into a tolerance, and the drawing never prints it as one.

## What a check is, and when the verdict is VERIFIED

Every check that passes is classified:

| Kind | What it compares | Independent? |
|---|---|---|
| independent | a published figure with a value the model computed from inputs whose sources are disjoint from the figure's | yes |
| same source | the same, but the figure and the inputs share a source (or one `derives` from the other) | no |
| inputs not traced | a computed value whose inputs cite no claim the gate can follow | not established |
| transcription | a drawn dimension (`params`) with the figure it was drawn from | never: it catches a typo, not a wrong source |
| test vector | a test vector or comparison that cites no claim | not established |

Verdict, in order:

- `DOES NOT PASS`: any error, including a mismatch.
- `NOTHING CHECKED`: nothing was compared (only unit conversions: `ONLY CONVERSIONS`).
- `INCOMPLETE`: a published comparison is pending.
- `VERIFIED`: everything matched and **at least one check is independent**.
- `CONSISTENT`: everything matched, but no check is independent. The gate says why: shared sources, transcriptions (and how many of
  them are numbers the person who asked gave), untraced inputs, unclassified vectors.

The `dimensions:` line counts the dimensions in `params` by class and always ends `0 independently verified` (for example
`dimensions: 0 checked against a document, 0 derived, 0 measured (with uncertainty), 3 declared by the user, 0 estimated; 0 independently verified`):
a drawn dimension is compared only with the figure it was drawn from. Independence is counted on the `provenance:` line.

Up to Draft 0.4 the transcription checks counted as checks without being classified, and a spec whose only checks were transcriptions
(or untraced, or unclassified) reached VERIFIED. That is no longer possible.

## Effect on the shipped examples

Run on `d22a740` (before) and on this branch (after):

| Example | Before | After | Why |
|---|---|---|---|
| hub, mos6502, rar5, react, rtx4090, winrar | VERIFIED | VERIFIED | each has independent checks (3, 3, 6, 3, 2, 3) |
| lock, rpi4-board | CONSISTENT | CONSISTENT | unchanged: every check shares the source of its inputs |
| switch | VERIFIED | CONSISTENT | its 2 checks compare the stem travel with the very claim (`travel`) it was drawn from; its 4 dimensions are transcriptions |
| k20a | VERIFIED | CONSISTENT | displacement is computed from bore and stroke, and the firing order is typed: their inputs cite no claim, and bore, stroke and displacement are on one page (Wikipedia) |
| rubik | VERIFIED | CONSISTENT | the period, superflip and position count are computed by the model, whose inputs cite no claim; the figures and the notation are on one page |
| enigma | VERIFIED | CONSISTENT | its 4 test vectors cite no claim; the vectors and the rotor wiring are both from the Wikipedia rotor page |
| demo-plate, demo-flange, demo-section | NOTHING CHECKED | NOTHING CHECKED | synthetic, every number ESTIMATED |
| benchmark floppy / antikythera | VERIFIED / CONSISTENT | VERIFIED / CONSISTENT | floppy has 2 independent checks |

No claim was added and no source was changed to keep a VERIFIED. An example regains VERIFIED only by citing a figure from a source independent
of its inputs and linking those inputs to their claims.

## What it does not do

- It cannot tell that two sources are independent in fact: it trusts `derives`. Two pages that copy a third without saying so look
  independent.
- It cannot tell that a computation is faithful: a model that hard-codes the published answer and labels its inputs passes as the
  inputs' class. Reading the spec is still the review.
- A user's numbers stay the user's: the drawing can reproduce them exactly (CONSISTENT), never verify them.
