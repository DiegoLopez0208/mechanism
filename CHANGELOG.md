# Changelog

## 0.5.0 - 2026-10-13

- **Pin tumbler lock** (examples/lock): the Kwikset KW1 keying table cross-checked (pin + cut depth = .501 in for all six heights, within .003 in of the plug diameter), the right key aligns five splits on the shear line, a wrong key blocks the plug, MACS respected; blind test recognised by two judges.
- Engine: `kind: profile` (a polygon extruded: key blades, cams), `motion(step, t, phase)` so a phase can show a different case, and a fix: a part hidden with scale 0 now comes back when its motion stops asking for a scale.
- 29 tests, now including the lock.

## 0.4.0 - 2026-10-13

- **Three lengths.** `--length short|normal|extended` (and `?length=`, `director.length`, `director.short`): the short cut is about 30 s (verdict panel only, two tour stops, three phases), the extended one adds longer phases and a longer tour. Short cuts of the nine checked objects are on the page (30 s / Full switch).

## 0.3.0 - 2026-10-13

- **Provenance per dimension.** `part.params` (value, unit, conf, claim, tolerance, why): the gate compares drawn sizes with their sources, counts them as reproduced figures and reports mixed parts. The Cherry switch uses it (footprint and cutout sourced; walls, spring and stem arms estimated).
- **Register.** `scripts/registry.mjs` writes docs/registry.html, registry.json and an SVG badge per object from the gate output.
- Viewer: GUESSES and BREAK IT. Plain sentence and legend in the films (`director.what`, `director.legend`).

## 0.2.0 - 2026-10-13

- **Gate.** Rejects placeholder sources and claims (example.com, TODO), non-positive or non-finite dimensions, specs with no parts, calculated variables with no claim, expressions that give undefined / NaN / Infinity, invalid tolerances and ESTIMATED parts with no reason. New drafts from new.mjs fail until completed.
- **Verdict.** VERIFIED / INCOMPLETE / NOTHING CHECKED / DOES NOT PASS instead of a bare pass; the film receipt follows it. check-spec.mjs --json writes a reproducible report with spec and kit hashes.
- **Tests and CI.** tests/gate.test.mjs (17 cases, including a tampered RAR5 byte) and a GitHub Actions workflow that also checks that an unfilled template fails.
- **Recognisable.** spec.recognize (object, iconic features tied to parts, recorded blind test), ?bare stills and scripts/stranger.mjs. The hub and the first RAR5 film were not recognised and say so.
- **Software.** RAR5 (87 bytes rebuilt byte for byte, accepted by UnRAR) and WinRAR unpacking (DEFLATE decoded from RFC 1951 one token at a time against real WinRAR output, zlib and the stored CRC-32).
- Switch: the spring is ESTIMATED, and the force-curve note no longer implies the maker contradicts itself.
- Wording: "build inspectable models from evidence" instead of "exactly".

## 0.1.0 - 2026-10-12

First public release: the skill, the kit, the dossier look, 11 objects with films, viewers and 3D models.
