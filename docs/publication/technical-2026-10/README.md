# Technical film publication

The active collection contains 34 films: 22 Studio, six Workflow and six Paper.
The first three preserve Enigma, Rubik and Cherry. Sixteen revised Studio films
comprise the bearing pilot and fifteen new native construction studies.

- [Film manifest](films-manifest.json): public asset names, hashes and viewer links.
- [Checksums](SHA256SUMS.txt): integrity of the 34 exact MP4 files.
- [Revision receipts](manifest.json): fifteen exports, source fingerprints and metadata.
- [Encoding comparisons](encoding-checks.json): 45 source/compressed frame comparisons.
- [Thread geometry](thread-geometry-check.json): actual mesh crest-phase check.

Revised studies are 12 seconds, 1600 x 900, 30 fps, silent H.264. The eighteen
preserved themes run for 32 seconds. All use the original native engines.
The rejected synthetic studies remain historical source, outside this catalogue.

These technical checks do not establish artistic acceptance, manufacturer CAD
fidelity, loads, fluid flow, friction, service life or industrial performance.
Source notes identify known data and estimated construction details.

Use `node scripts/prepare-film-release.mjs --media <media-folder> --out <new-folder>`
to verify media hashes and source fingerprints before preparing a release.
Upload those 34 films and the generated manifest/checksums to the
`technical-2026-10` GitHub release before deploying the gallery from main.
