# Benchmark run 02: 3.5-inch floppy disk (1.44 MB)

Run on 2026-10-16, 00:09:42 to 00:28:33 by the machine clock (18 min 51 s). Criteria: `benchmark-criteria.md` (Addendum 2 fixed the object, the request and the version before the run). Skill: commit 8845863 (the version after the fixes that run 01 found; the repo was untouched: no diff in kit/, scripts/, examples/, SKILL.md, tests/). Agent: Claude Code general-purpose subagent with a clean context, not a fully independent session. The GPU was not contended this time. Request: "Use mechanism to model the 3.5-inch floppy disk (the 1.44 MB one) from its published sources." The object was chosen by me (run 01 was chosen by a reader).

Files: in this folder, `floppy/` (spec.js and BENCHMARK-LOG.md with the failures kept; the paths in the log were shortened to `<work>`). The agent worked in a folder outside the repository; the heavy files (short and normal MP4, STL, GLB) are assets of the `media` release.

## What I checked myself (the rest is the agent's own report)

- Gate rerun: `verdict: VERIFIED   15 reproduced (+1 unit conversions, not counted), 5 estimated, 0 unchecked`, `PASSES with 3 warning(s)` (two are an ESTIMATED dimension inside a SPEC part, one is the unit conversion). Blind test recorded as recognised.
- Preflight rerun: short cut `PASS with 1 warning(s)` (OBJECT_OFFSCREEN, 1 sample at 14 s, 66 %: camera push into the exploded stack), normal cut (151.5 s) `PASS: nothing found.`
- Short MP4: 27.5 s, 1080x1350, H.264, AAC stereo (audio not listened to). STL and GLB exist (2.1 MB, 1.1 MB), not opened in a viewer. The normal cut (41.5 MB) exists; I did not watch it.
- Four frames of the short watched: a blue 3.5-inch disk with a metal shutter, a hub and the HD mark; the "1.44 MB" label panel; the shutter close-up; a seven-row receipt with VERIFIED.
- Sources: not reopened. The agent says the primary source is ECMA-125 (1st ed., Dec 1987), an 80-page scan with no text layer, read by eye from page images rendered with PyMuPDF; Wikipedia and a commentary quoting ANSI X3.171 are secondary.

## Autonomy result: Complete, by the criteria as written

| # | Criterion | Met |
|---|-----------|-----|
| 1 | Gate passes, VERIFIED, a check that is not a unit conversion | yes (15; the one conversion is reported and not counted) |
| 2 | Tags and sources actually opened, blocked ones not cited | yes per the agent's log; not independently reopened (two failed fetches were not cited) |
| 3 | Preflight 0 FAIL, every WARN classified | yes |
| 4 | Short cut rendered with sound | yes |
| 5 | Stranger test run and recorded | yes (recognised on the first try: "3.5-inch high-density (HD, 1.44 MB) floppy disk", about 95 %) |
| 6 | STL and GLB exported | yes |
| 7 | No human input | yes |
| 8 | Inside the budget | yes (about 19 min) |

## Artifact quality: defensible for what it claims, with limits

- **Recognisable**, and the judge says it recognised the shape (clipped corner, metal shutter with a window, hub, write-protect holes) and also the "HD" mark. One judge only, and it was a Sonnet model, not the Haiku of run 01: the two recognition results are not comparable.
- **The checks are real and mostly independent of each other**: capacity 2 x 80 x 18 x 512 = 1,474,560 bytes; the "1.44 MB" label as bytes / 1024 / 1000; the bit cell (62.83 urad against 62.8) and 500 kbit/s from 300 rpm; the unformatted 2.00 MB; the head-window centre against the hub position; 7 drawn dimensions against the standard. But the capacity and data-rate checks are calc modes that do not depend on the drawn geometry, so they say nothing about whether the 3D shape is right.
- **Source risk.** Numbers from the standard were read by eye from scanned pages, so a misread digit is possible (the cross-checks that closed make it unlikely). One reading was an interpretation call: L29 = 17.5 mm as printed, which puts the hub 1.5 mm off the centre of the 94 mm length, while the agent's own reading of the (not to scale) figure gave about 16 mm.
- **Simplifications:** the shutter is drawn proud of the case, and the handling notches and the stepped shutter edge are not modelled. Five claims are ESTIMATED and drawn dashed (wall thickness, liner, shutter spring, livery and printing, label).
- **Documentation caveat.** The agent was asked to read the real clock for every step but about half of the row timestamps in its log table are approximations it typed; the log ends with a correction section that says which times were real `date` readings. The total (start and end) comes from `date`.

## Where the skill tripped the agent (findings; not fixed yet)

1. **No rectangular or non-circular holes.** `plate` takes only round holes, so the agent hand-built polygons with zero-width bridges. A bridge that started on the wrong vertex produced a silently mis-triangulated case (no hub window, no head window on one half) with no error: the gate passed and the lint said "ok"; only opening the PNG showed it.
2. **Gate and lint do not cover shape.** The gate passes on numbers independent of the drawn geometry; the lint measures "ink", not whether holes are cut.
3. **Scanned standards.** SKILL.md has no guidance for primary sources that are scans with no text layer (no OCR on the machine): the agent improvised with `uv run --with pymupdf` and read page images; Python on Windows rejects `/c/...` paths.
4. **The "do not tune only to silence a warning" rule** made legitimate readability fixes (dark-on-dark disc and tab flagged LOOK) feel suspect. The rule is about silencing without a real defect; fixing a defect you can see in the frame is allowed.

## Status of those findings (added 2026-10-16, after the run; the run itself used 8845863)

Fixed afterwards in commit bafecf8 (tests 44/44): `plate` takes rectangular holes (`[x, y, width, height]`) and `profile` takes polygon holes, so nobody needs zero-width bridges; the preflight has a new check, GEOMETRY_AREA_MISMATCH, that compares the triangulated area of every plate and profile with its outline minus its holes (FAIL above 5 %, WARN above 1 %), with no false positives on the 11 examples or on the two agent runs (a first version of it gave three false positives because of an indexing mistake of mine, found and fixed before commit); SKILL.md now has a recipe for sources that are scans and says that fixing a defect you can see in the frame is not tuning to silence a warning. Not fixed: the gate still passes numbers that do not depend on the drawn shape (calc modes); the new check only catches flat meshes that do not cover their outline, not every wrong shape. The skill version changes again after run 02: a run 03 must say which commit it used.

## Comparison with run 01 (two data points, not a trend)

Different object (a reader's request versus my choice), different skill version (6fd5295 versus 8845863), different judge model for the blind test (Haiku versus Sonnet), different GPU conditions (shared versus not). Run 01: Complete on autonomy, not recognisable. Run 02: Complete on autonomy, recognised. The difference in recognition cannot be attributed to the skill changes.

## Gate today (added 2026-10-16; the run used `8845863` and the gate of that commit)

With the stricter gate (VERIFIED needs a figure from a source independent of the model's inputs) this spec is still **VERIFIED**: 2 independent checks, 6 that share a source with their inputs, and 7 dimension and test-vector checks that are not classified. See Addendum 3 in `criteria.md`.
