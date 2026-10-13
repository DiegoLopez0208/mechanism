# Changelog

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
