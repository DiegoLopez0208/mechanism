# Benchmark run 01: Antikythera mechanism

Run on 2026-10-15 / 16 (23:34 to about 00:01, 27 minutes by the machine clock). Criteria: `benchmark-criteria.md` (written before the result, plus Addendum 1). Skill: commit 6fd5295, untouched (checked: no diff in kit/, scripts/, examples/, SKILL.md). Agent: Claude Code general-purpose subagent with a clean context, not a fully independent session. The GPU was shared with another render job for part of the run. Request: "Use mechanism to model the Antikythera mechanism from its published sources." (suggested by a reader of the first post).

Files: in this folder, `antikythera/` (spec.js and BENCHMARK-LOG.md with the failures kept) and `antikythera-refined/` (the human-refined version, see its README). The agent worked in a folder outside the repository; the heavy files (short and normal MP4, STL, GLB) are assets of the `media` release.

## What I checked myself (the rest is the agent's own report)

- Gate rerun on its spec.js: `verdict: VERIFIED   6 reproduced, 4 estimated, 0 unchecked`, `PASSES with 1 warning(s)`; the warning is the failed blind test.
- Preflight rerun on the short cut: `PASS: nothing found.` (the normal cut was not rerun by me; the agent reports `PASS with 1 warning(s)`, one MAIN_PART_OFFSCREEN sample it classified as camera transition).
- Short MP4: 28.5 s, 1080x1350, H.264, AAC stereo. Audio not listened to. STL and GLB exist (21.8 MB and 11.4 MB), not opened in a viewer.
- Four frames of the short watched: coherent layout, readable texts, six-row receipt, VERIFIED stamp.
- Sources: the spec lists five opened sources; I did not reopen them. The agent says the tooth counts come from a secondary thesis (Tsigkros 2015) that quotes Efstathiou et al. (not opened), cross-checked against Koetsier and the Freeth 2008 Nature supplement; blocked pages (nature.com 2021, UCL Discovery 403, a .gr site empty) were not cited.

## Autonomy result: Complete, by the criteria as written

| # | Criterion | Met |
|---|-----------|-----|
| 1 | Gate passes, VERIFIED, one check not a unit conversion | yes (six, none a conversion) |
| 2 | Tags and sources actually opened, blocked ones not cited | yes per the agent's log; not independently reopened |
| 3 | Preflight 0 FAIL, every WARN classified | yes |
| 4 | Short cut rendered with sound | yes |
| 5 | Stranger test run and recorded | yes (it FAILED; the criterion only asks that it be run and recorded) |
| 6 | STL and GLB exported | yes |
| 7 | No human input | yes (I only launched it) |
| 8 | Inside the budget | yes (about 27 min of two hours) |

The agent called its own outcome "success with intervention" because it worked around toolkit limits (a copy of stranger.mjs, a temporary folder). Those are not human interventions, so the label under the criteria is Complete.

## Artifact quality: simplified, not a defensible full reconstruction

- **Not recognisable.** Blind judge (a fresh Haiku with a neutral file name): "a mechanical gear train, most likely a clock or watch movement", 70 %. A first judge that saw the file name said Antikythera at 55 % and admitted the name was the reason, so that run was voided. The model has no zodiac ticks, crank, pointers or inscriptions.
- **Checks are weaker than "6 reproduced" sounds.** Three of the six ratios (Metonic, Olympiad, Saros) pass through lost gears (m3 = 27, n1 = 53, n3 = 57) whose tooth counts are estimates, so for those the check only shows the reconstruction is self-consistent. The lunar-orbit precession reference is the Wikipedia table's own computed column. The b1 = 223 count is not tested by any ratio (b1 and b2 share an axis and cancel); sources range 216 to 231.
- **Geometry compromises.** One module (0.509 mm, from the published 1.6 mm pitch) for every mesh because the gate demands one module per mesh; measured tip radii differ by up to 14 % (b1 is drawn at 56.8 mm against a 65 mm tip radius).
- **Not modelled:** the pin-and-slot lunar anomaly (a 1:1 link instead), the a1 crank gear, r1, the Callippic dial, all planet displays.
- Frame bars glow white under bloom and cross the title in the short cut (not fixed).

## Where the skill tripped the agent (findings, not fixed: the version stays frozen for the 20 runs)

1. `kin`/`analyze` keeps one tooth count per `body`: two gears on one arbor silently get the first gear's teeth for every mesh, giving 20 gate errors that look like data errors. Workaround: one body per gear plus `same` links. SKILL.md does not mention it.
2. `scripts/stranger.mjs` only accepts names under the repo's `examples/` and writes into the repo's `out/`; it cannot test an external work folder (lint-film and preflight can) and gives no way to avoid a file-name leak.
3. `new.mjs` refuses to start if the folder exists. A long foreground render hit the 600 s tool timeout and its log froze at frame 1140/3195; the agent killed only that process tree and reran it in the background (217 s). "Short cut about a minute" in SKILL.md is wall time, not film length.

## Status of those findings (added 2026-10-16, after the run; the run itself used 6fd5295)

All three toolkit findings and the SKILL.md wording were fixed afterwards in commit 8845863 (tests 42/42): the gate now errors when one body carries gears of different size (with the advice); `stranger.mjs` takes any page and saves a neutral-named still in a temporary folder; `new.mjs` accepts a folder that holds only a log; `render.mjs` prints film length and wall time apart. So the skill version changes after run 01: runs 02 and later must say which commit they used. The film itself (bloom on the frame bars, not recognisable) is not changed by this; a refined version would be a separate "Human-refined version" artifact.

## Observation on the criteria (no edit to them)

Criterion 5 only requires the stranger test to be run and recorded, so a model that is not recognisable still counts as Complete. For the next runs consider a second column (recognised yes/no) next to the autonomy result, as Addendum 1 already separates autonomy from artifact quality. Criterion 1 also lets a check through lost, estimated gears count as "reproduced"; the gate cannot tell a check that tests a published figure from one that tests a number the agent chose. One run is one data point, not a success rate.

## Gate today (added 2026-10-16; the run used `6fd5295` and the gate of that commit)

The gate now distinguishes a check that uses the source that fed the model from one that uses an independent source, and VERIFIED needs at least one of the second kind. This spec: 0 independent, 6 same source (the published periods and the tooth counts share a source), so today's state is **CONSISTENT**, not VERIFIED. The classification above (Complete on autonomy) is what the criteria said when the run was made; see Addendum 3 in `criteria.md`. This is the weakness already written under "Checks are weaker than "6 reproduced" sounds", now reported by the gate itself.
